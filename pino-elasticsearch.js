#! /usr/bin/env node
'use strict'

const minimist = require('minimist')
const Writable = require('readable-stream').Writable
const { Client } = require('@elastic/elasticsearch')
const Parse = require('fast-json-parse')
const split = require('split2')
const pump = require('pump')
const fs = require('fs')
const path = require('path')
const toEcs = require('pino-to-ecs')

function pinoElasticSearch (opts) {
  const splitter = split(function (line) {
    var parsed = new Parse(line)
    if (parsed.err) {
      this.emit('unknown', line, parsed.err)
      return
    }
    var value = parsed.value
    if (typeof value === 'boolean') {
      this.emit('unknown', line, 'Boolean value ignored')
      return
    }
    if (value === null) {
      this.emit('unknown', line, 'Null value ignored')
      return
    }
    if (typeof value !== 'object') {
      value = {
        data: value,
        time: setDateTimeString(value)
      }
    } else {
      value.time = setDateTimeString(value)
    }

    function setDateTimeString (value) {
      if (typeof value === 'object' && value.hasOwnProperty('time')) {
        return (value.time.length > 0) ? new Date(value.time).toISOString() : new Date().toISOString()
      }
      return new Date().toISOString()
    }
    return value
  })

  const client = new Client({ node: opts.node })

  const esVersion = Number(opts['es-version']) || 7
  const useEcs = !!opts['ecs']
  const index = opts.index || 'pino'
  const type = opts.type || 'log'

  const writable = new Writable({
    objectMode: true,
    highWaterMark: opts['bulk-size'] || 500,
    writev: function (chunks, cb) {
      const docs = new Array(chunks.length * 2)
      for (var i = 0; i < docs.length; i++) {
        if (i % 2 === 0) {
          // add the header
          docs[i] = {
            index: {
              // from Elasticsearch v8 and above, types will be removed
              // while in Elasticsearch v7 types are deprecated
              _type: esVersion >= 7 ? undefined : type,
              _index: index.replace('%{DATE}', chunks[Math.floor(i / 2)].chunk.time.substring(0, 10))
            }
          }
        } else {
          // add the chunk
          if (useEcs) {
            docs[i] = toEcs(chunks[Math.floor(i / 2)].chunk)
          } else {
            docs[i] = chunks[Math.floor(i / 2)].chunk
          }
        }
      }
      client.bulk({
        body: docs
      }, function (err, result) {
        if (!err) {
          const items = result.body.items
          for (var i = 0; i < items.length; i++) {
            // depending on the Elasticsearch version, the bulk response might
            // contain fields 'create' or 'index' (> ES 5.x)
            const create = items[i].index || items[i].create
            splitter.emit('insert', create, docs[i * 2 + 1])
          }
        } else {
          splitter.emit('insertError', err)
        }
        // skip error and continue
        cb()
      })
    },
    write: function (body, enc, cb) {
      var idx = index.replace('%{DATE}', body.time.substring(0, 10))
      // from Elasticsearch v8 and above, types will be removed
      // while in Elasticsearch v7 types are deprecated
      const obj = {
        index: idx,
        type: esVersion >= 7 ? undefined : type,
        body: useEcs ? toEcs(body) : body
      }
      client.index(obj, function (err, data) {
        if (!err) {
          splitter.emit('insert', data.body, obj.body)
        } else {
          splitter.emit('insertError', err)
        }
        // skip error and continue
        cb()
      })
    }
  })

  pump(splitter, writable)

  return splitter
}

module.exports = pinoElasticSearch

function start (opts) {
  if (opts.help) {
    console.log(fs.readFileSync(path.join(__dirname, './usage.txt'), 'utf8'))
    return
  }

  if (opts.version) {
    console.log('pino-elasticsearch', require('./package.json').version)
    return
  }

  pump(process.stdin, pinoElasticSearch(opts))
}

if (require.main === module) {
  start(minimist(process.argv.slice(2), {
    alias: {
      version: 'v',
      help: 'h',
      node: 'n',
      index: 'i',
      'bulk-size': 'b',
      'trace-level': 'l'
    },
    default: {
      node: 'http://localhost:9200'
    }
  }))
}

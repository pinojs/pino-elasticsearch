#! /usr/bin/env node
'use strict'

const minimist = require('minimist')
const Writable = require('readable-stream').Writable
const elasticsearch = require('elasticsearch')
const Parse = require('fast-json-parse')
const split = require('split2')
const pump = require('pump')
const fs = require('fs')
const path = require('path')

function pinoElasticSearch (opts) {
  const splitter = split(function (line) {
    var parsed = new Parse(line)
    if (parsed.err) {
      this.emit('unknown', line, parsed.err)
      return
    }

    var value = parsed.value
    value.time = (new Date(value.time)).toISOString()

    return value
  })

  const client = new elasticsearch.Client({
    host: opts.host + ':' + opts.port,
    log: 'error'
  })

  const index = opts.index || 'pino'
  const type = opts.type || 'log'
  const consistency = opts.consistency || 'one'

  const writable = new Writable({
    objectMode: true,
    writev: function (chunks, cb) {
      const docs = new Array(chunks.length * 2)
      for (var i = 0; i < docs.length; i++) {
        if (i % 2 === 0) {
          // add the header
          docs[i] = { index: { _index: index, _type: type } }
        } else {
          // add the chunk
          docs[i] = chunks[Math.floor(i / 2)].chunk
        }
      }
      client.bulk({
        consistency,
        body: docs
      }, function (err, result) {
        if (!err) {
          const items = result.items
          for (var i = 0; i < items.length; i++) {
            const create = items[i].create
            create.body = chunks[i].chunk
            splitter.emit('insert', create)
          }
        } else {
          splitter.emit('insertError', err)
        }
        // skip error and continue
        cb()
      })
    },
    write: function (body, enc, cb) {
      const obj = {
        index,
        type,
        consistency,
        body
      }
      client.create(obj, function (err, data) {
        if (!err) {
          data.body = body
          splitter.emit('insert', data)
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
      host: 'H',
      port: 'p',
      index: 'i'
    },
    default: {
      host: 'localhost',
      port: 9200
    }
  }))
}

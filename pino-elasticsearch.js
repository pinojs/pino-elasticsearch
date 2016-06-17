'use strict'

const Writable = require('readable-stream').Writable
const elasticsearch = require('elasticsearch')
const Parse = require('fast-json-parse')
const split = require('split2')
const pump = require('pump')

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
    host: 'localhost:9200',
    log: 'error'
  })

  const index = opts.index || 'pino'
  const type = opts.type || 'log'
  const consistency = opts.consistency || 'one'

  const writable = new Writable({
    objectMode: true,
    write: function (body, enc, cb) {
      const obj = {
        index,
        type,
        consistency,
        body
      }
      console.log('upload', obj)
      client.create(obj, function (err, data) {
        if (!err) {
          data.body = body
          splitter.emit('insert', data)
        }
        cb(err)
      })
    }
  })

  pump(splitter, writable)

  return splitter
}

module.exports = pinoElasticSearch

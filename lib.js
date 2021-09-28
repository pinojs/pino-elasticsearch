'use strict'

/* eslint no-prototype-builtins: 0 */

const split = require('split2')
const { Client, Connection } = require('@elastic/elasticsearch')

function pinoElasticSearch (opts) {
  if (opts['bulk-size']) {
    process.emitWarning('The "bulk-size" option has been deprecated, "flush-bytes" instead')
    delete opts['bulk-size']
  }

  const splitter = split(function (line) {
    let value

    try {
      value = JSON.parse(line)
    } catch (error) {
      this.emit('unknown', line, error)
      return
    }

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
      if (value['@timestamp'] === undefined) {
        value.time = setDateTimeString(value)
      }
    }

    function setDateTimeString (value) {
      if (typeof value === 'object' && value.hasOwnProperty('time')) {
        if (
          (typeof value.time === 'string' && value.time.length) ||
          (typeof value.time === 'number' && value.time >= 0)
        ) {
          return new Date(value.time).toISOString()
        }
      }
      return new Date().toISOString()
    }
    return value
  }, { autoDestroy: true })

  const client = new Client({
    node: opts.node,
    auth: opts.auth,
    cloud: opts.cloud,
    ssl: { rejectUnauthorized: opts.rejectUnauthorized },
    Connection: opts.Connection || Connection
  })

  const esVersion = Number(opts['es-version']) || 7
  const index = opts.index || 'pino'
  const buildIndexName = typeof index === 'function' ? index : null
  const type = esVersion >= 7 ? undefined : (opts.type || 'log')
  const opType = esVersion >= 7 ? opts.op_type : undefined
  const b = client.helpers.bulk({
    datasource: splitter,
    flushBytes: opts['flush-bytes'] || 1000,
    flushInterval: opts['flush-interval'] || 30000,
    refreshOnCompletion: getIndexName(),
    onDocument (doc) {
      const date = doc.time || doc['@timestamp']
      if (opType === 'create') {
        doc['@timestamp'] = date
      }

      return {
        index: {
          _index: getIndexName(date),
          _type: type,
          op_type: opType
        }
      }
    },
    onDrop (doc) {
      const error = new Error('Dropped document')
      error.document = doc
      splitter.emit('insertError', error)
    }
  })

  b.then(
    (stats) => splitter.emit('insert', stats),
    (err) => splitter.emit('error', err)
  )

  splitter._destroy = function (err, cb) {
    b.then(() => cb(err), (e2) => cb(e2 || err))
  }

  function getIndexName (time = new Date().toISOString()) {
    if (buildIndexName) {
      return buildIndexName(time)
    }
    return index.replace('%{DATE}', time.substring(0, 10))
  }

  return splitter
}

module.exports = pinoElasticSearch

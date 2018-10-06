'use strict'

const pino = require('pino')
const elastic = require('../')
const tap = require('tap')
const test = require('tap').test
const elasticsearch = require('elasticsearch')
const client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
})
const index = 'pinotest'
const type = 'log'
const consistency = 'one'
const host = 'localhost'
const port = 9200
// new data in Elasticsearch is only visible after the refreshInterval
const refreshInterval = 1100 // assume ES default settings 1 second
const timeout = 5000

tap.tearDown(() => {
  client.close()
})

tap.beforeEach((done) => {
  client.indices.delete({ index }, () => {
    client.indices.create({ index }, done)
  })
})

setTimeout(function () {
  console.log('terminating, it\'s taking too long')
  process.exit(1)
}, 60 * 1000).unref()

test('store a log line', { timeout }, (t) => {
  t.plan(3)

  const instance = elastic({ index, type, consistency, host, port })
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (obj, body) => {
    t.ok(obj, 'data uploaded')

    client.get({
      index,
      type,
      id: obj._id
    }, (err, response) => {
      t.error(err)
      t.deepEqual(response._source, body, 'obj matches')
    })
  })
})

test('store an deeply nested log line', { timeout }, (t) => {
  t.plan(4)

  const instance = elastic({ index, type, consistency, host, port })
  const log = pino(instance)

  log.info({
    deeply: {
      nested: {
        hello: 'world'
      }
    }
  })

  instance.on('insert', (obj, body) => {
    t.ok(obj, 'data uploaded')
    setTimeout(function () {
      client.get({
        index,
        type,
        id: obj._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response._source, body, 'obj matches')
        t.deepEqual(response._source.deeply.nested.hello, 'world', 'obj gets linearized')
      })
    }, refreshInterval)
  })
})

test('store lines in bulk', { timeout }, (t) => {
  t.plan(15)

  const instance = elastic({ index, type, consistency, host, port })
  const log = pino(instance)

  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')

  instance.on('insert', (obj, body) => {
    t.ok(obj, 'data uploaded')
    setTimeout(function () {
      client.get({
        index,
        type,
        id: obj._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response._source, body, 'obj matches')
      })
    }, refreshInterval)
  })
})

'use strict'

const pino = require('pino')
const elastic = require('./')
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

tap.tearDown(() => {
  client.close()
})

tap.beforeEach((done) => {
  client.indices.delete({index}, () => {
    client.indices.create({index}, done)
  })
})

test('store a log line', (t) => {
  t.plan(3)

  const instance = elastic({index, type, consistency, host, port})
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (obj, body) => {
    t.ok(obj.data, 'data uploaded')

    client.get({
      index,
      type,
      id: obj.data._id
    }, (err, response) => {
      t.error(err)
      t.deepEqual(response._source, obj.body, 'obj matches')
    })
  })
})

test('store an deeply nested log line', (t) => {
  t.plan(4)

  const instance = elastic({index, type, consistency, host, port})
  const log = pino(instance)

  log.info({
    deeply: {
      nested: {
        hello: 'world'
      }
    }
  })

  instance.on('insert', (obj) => {
    t.ok(obj.data, 'data uploaded')
    setTimeout(function () {
      client.get({
        index,
        type,
        id: obj.data._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response._source, obj.body, 'obj matches')
        t.deepEqual(response._source.deeply.nested.hello, 'world', 'obj gets linearized')
      })
    }, refreshInterval)
  })
})

test('store lines in bulk', (t) => {
  t.plan(15)

  const instance = elastic({index, type, consistency, host, port})
  const log = pino(instance)

  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')

  instance.on('insert', (obj) => {
    t.ok(obj.data, 'data uploaded')
    setTimeout(function () {
      client.get({
        index,
        type,
        id: obj.data._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response._source, obj.body, 'obj matches')
      })
    }, refreshInterval)
  })
})

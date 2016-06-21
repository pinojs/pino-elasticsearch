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

tap.tearDown(() => {
  client.close()
})

tap.beforeEach((done) => {
  client.indices.delete({
    index
  }, () => {
    client.indices.create({ index }, done)
  })
})

test('store log lines', (t) => {
  t.plan(3)

  const instance = elastic({ index, type, consistency })
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (obj) => {
    t.ok(obj, 'data uploaded')

    client.get({
      index,
      type,
      id: obj._id
    }, (err, response) => {
      t.error(err)
      t.deepEqual(response._source, obj.body, 'obj matches')
    })
  })
})

test('store object-based log lines', (t) => {
  t.plan(4)

  const instance = elastic({ index, type, consistency })
  const log = pino(instance)

  log.info({
    deeply: {
      nested: {
        hello: 'world'
      }
    }
  })

  instance.on('insert', (obj) => {
    t.ok(obj, 'data uploaded')

    client.get({
      index,
      type,
      id: obj._id
    }, (err, response) => {
      t.error(err)
      t.deepEqual(response._source, obj.body, 'obj matches')
      t.deepEqual(response._source.deeply.nested.hello, 'world', 'obj gets linearized')
    })
  })
})

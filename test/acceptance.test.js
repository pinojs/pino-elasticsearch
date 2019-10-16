'use strict'

const pino = require('pino')
const IER = require('is-elasticsearch-running')
const elastic = require('../')
const tap = require('tap')
const test = require('tap').test
const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://localhost:9200' })
const index = 'pinotest'
const type = 'log'
const consistency = 'one'
const node = 'http://localhost:9200'
// new data in Elasticsearch is only visible after the refreshInterval
const refreshInterval = 1100 // assume ES default settings 1 second
const timeout = 5000

tap.tearDown(() => {
  client.close()
})

var esVersion = 7
var es

tap.beforeEach(async () => {
  if (es) {
    es = IER()
    await es.waitCluster()
  }
  const result = await client.info()
  esVersion = Number(result.body.version.number.split('.')[0])
  await client.indices.delete({ index }, { ignore: [404] })
  await client.indices.create({ index })
})

test('store a log line', { timeout }, (t) => {
  t.plan(3)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (obj, body) => {
    t.ok(obj, 'data uploaded')

    client.get({
      index,
      type: esVersion >= 7 ? undefined : type,
      id: obj._id
    }, (err, response) => {
      t.error(err)
      t.deepEqual(response.body._source, body, 'obj matches')
    })
  })
})

test('Ignores a boolean line even though it is JSON-parseable', { timeout }, (t) => {
  t.plan(2)

  const instance = elastic({ index, type, consistency, node })

  instance.on('unknown', (obj, body) => {
    t.equal(obj, 'true', 'Object is parsed')
    t.equal(body, 'Boolean value ignored', 'Message is emitted')
  })

  instance.write('true\n')
})

test('Ignores "null" being parsed as json', { timeout }, (t) => {
  t.plan(2)

  const instance = elastic({ index, type, consistency, node })

  instance.on('unknown', (obj, body) => {
    t.equal(obj, 'null', 'Object is parsed')
    t.equal(body, 'Null value ignored', 'Message is emitted')
  })

  instance.write('null\n')
})

test('Can process number being parsed as json', { timeout }, (t) => {
  t.plan(0)

  const instance = elastic({ index, type, consistency, node })

  instance.on('unknown', (obj, body) => {
    t.error(obj, body)
  })

  instance.write('12\n')
})

test('store an deeply nested log line', { timeout }, (t) => {
  t.plan(4)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
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
        type: esVersion >= 7 ? undefined : type,
        id: obj._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response.body._source, body, 'obj matches')
        t.deepEqual(response.body._source.deeply.nested.hello, 'world', 'obj gets linearized')
      })
    }, refreshInterval)
  })
})

test('store lines in bulk', { timeout }, (t) => {
  t.plan(15)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
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
        type: esVersion >= 7 ? undefined : type,
        id: obj._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response.body._source, body, 'obj matches')
      })
    }, refreshInterval)
  })
})

test('replaces date in index', { timeout }, (t) => {
  t.plan(3)
  const index = 'pinotest-%{DATE}'

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (obj, body) => {
    t.ok('data uploaded')

    client.get({
      index: index.replace('%{DATE}', new Date().toISOString().substring(0, 10)),
      type: esVersion >= 7 ? undefined : type,
      id: obj._id
    }, (err, response) => {
      t.error(err)
      t.deepEqual(response.body._source, body, 'obj matches')
    })
  })
})

test('replaces date in index during bulk insert', { timeout }, (t) => {
  t.plan(15)

  const index = 'pinotest-%{DATE}'
  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
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
        index: index.replace('%{DATE}', new Date().toISOString().substring(0, 10)),
        type: esVersion >= 7 ? undefined : type,
        id: obj._id
      }, (err, response) => {
        t.error(err)
        t.deepEqual(response.body._source, body, 'obj matches')
      })
    }, refreshInterval)
  })
})

test('Use ecs format', { timeout }, (t) => {
  t.plan(15)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion, ecs: true })
  const log = pino(instance)

  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')

  instance.on('insert', (obj, body) => {
    t.deepEqual(body.ecs, { version: '1.0.0' })
    t.type(body['@timestamp'], 'string')
    t.assertNot(body.time)
  })
})

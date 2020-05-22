'use strict'

const pino = require('pino')
const IER = require('is-elasticsearch-running')
const elastic = require('../')
const tap = require('tap')
const test = require('tap').test
const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://localhost:9200' })
const EcsFormat = require('@elastic/ecs-pino-format')
const index = 'pinotest'
const type = 'log'
const consistency = 'one'
const node = 'http://localhost:9200'
const timeout = 5000

tap.tearDown(() => {
  client.close()
})

var esVersion = 7
var es

tap.beforeEach(async () => {
  if (es) {
    es = IER()
    if (!await es.isRunning()) {
      await es.waitCluster()
    }
  }
  const result = await client.info()
  esVersion = Number(result.body.version.number.split('.')[0])
  await client.indices.delete({ index }, { ignore: [404] })
  await client.indices.create({ index })
})

test('store a log line', { timeout }, (t) => {
  t.plan(2)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (stats) => {
    t.strictEqual(stats.total, 1)

    client.helpers
      .search({
        index,
        type: esVersion >= 7 ? undefined : type,
        body: {
          query: { match_all: {} }
        }
      })
      .then(documents => {
        t.strictEqual(documents[0].msg, 'hello world')
      })
      .catch(err => t.fail(err))
  })

  instance.end()
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
  t.plan(2)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info({
    deeply: {
      nested: {
        hello: 'world'
      }
    }
  })

  instance.on('insert', (stats) => {
    t.strictEqual(stats.total, 1)

    client.helpers
      .search({
        index,
        type: esVersion >= 7 ? undefined : type,
        body: {
          query: { match_all: {} }
        }
      })
      .then(documents => {
        t.strictEqual(documents[0].deeply.nested.hello, 'world', 'obj gets linearized')
      })
      .catch(err => t.fail(err))
  })

  instance.end()
})

test('store lines in bulk', { timeout }, (t) => {
  t.plan(6)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')

  instance.on('insert', (stats) => {
    t.strictEqual(stats.total, 5)

    client.helpers
      .search({
        index,
        type: esVersion >= 7 ? undefined : type,
        body: {
          query: { match_all: {} }
        }
      })
      .then(documents => {
        for (const doc of documents) {
          t.strictEqual(doc.msg, 'hello world')
        }
      })
      .catch(err => t.fail(err))
  })

  instance.end()
})

test('replaces date in index', { timeout }, (t) => {
  t.plan(3)
  const index = 'pinotest-%{DATE}'

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  client.indices.delete({
    index: index.replace('%{DATE}', new Date().toISOString().substring(0, 10))
  }, { ignore: [404] }, (err) => {
    t.error(err)
    log.info('hello world')

    instance.on('insert', (stats) => {
      t.strictEqual(stats.total, 1)

      client.helpers
        .search({
          index: index.replace('%{DATE}', new Date().toISOString().substring(0, 10)),
          type: esVersion >= 7 ? undefined : type,
          body: {
            query: { match_all: {} }
          }
        })
        .then(documents => {
          t.strictEqual(documents[0].msg, 'hello world')
        })
        .catch(err => t.fail(err))
    })

    instance.end()
  })
})

test('replaces date in index during bulk insert', { timeout }, (t) => {
  t.plan(7)

  const index = 'pinotest-%{DATE}'
  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)
  client.indices.delete({
    index: index.replace('%{DATE}', new Date().toISOString().substring(0, 10))
  }, { ignore: [404] }, (err) => {
    t.error(err)
    log.info('hello world')
    log.info('hello world')
    log.info('hello world')
    log.info('hello world')
    log.info('hello world')

    instance.on('insert', (stats) => {
      t.strictEqual(stats.total, 5)

      client.helpers
        .search({
          index: index.replace('%{DATE}', new Date().toISOString().substring(0, 10)),
          type: esVersion >= 7 ? undefined : type,
          body: {
            query: { match_all: {} }
          }
        })
        .then(documents => {
          for (const doc of documents) {
            t.strictEqual(doc.msg, 'hello world')
          }
        })
        .catch(err => t.fail(err))
    })

    instance.end()
  })
})

test('Use ecs format', { timeout }, (t) => {
  t.plan(2)

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const ecsFormat = EcsFormat()
  const log = pino({ ...ecsFormat }, instance)

  log.info('hello world')

  instance.on('insert', (stats) => {
    t.strictEqual(stats.total, 1)

    client.helpers
      .search({
        index,
        type: esVersion >= 7 ? undefined : type,
        body: {
          query: { match_all: {} }
        }
      })
      .then(documents => {
        t.type(documents[0]['@timestamp'], 'string')
      })
      .catch(err => t.fail(err))
  })

  instance.end()
})

test('dynamic index name', { timeout }, (t) => {
  t.plan(2)

  let indexNameGenerated
  const index = function (time) {
    t.like(time, new Date().toISOString().substring(0, 10))
    indexNameGenerated = `dynamic-index-${Math.random()}`
    return indexNameGenerated
  }

  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info('hello world')

  instance.on('insert', (stats) => {
    t.strictEqual(stats.total, 1)

    client.helpers
      .search({
        index: indexNameGenerated,
        type: esVersion >= 7 ? undefined : type,
        body: {
          query: { match_all: {} }
        }
      })
      .then(documents => {
        t.type(documents[0]['@timestamp'], 'string')
      })
      .catch(err => t.fail(err))
  })

  instance.end()
})

test('dynamic index name during bulk insert', { timeout }, (t) => {
  t.plan(12)

  let indexNameGenerated
  const index = function (time) {
    t.like(time, new Date().toISOString().substring(0, 10)) // called 5 times

    if (!indexNameGenerated) {
      indexNameGenerated = `dynamic-index-${Math.random()}`
    }
    return indexNameGenerated
  }
  const instance = elastic({ index, type, consistency, node, 'es-version': esVersion })
  const log = pino(instance)

  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')
  log.info('hello world')

  instance.on('insert', (stats) => {
    t.strictEqual(stats.total, 5)

    client.helpers
      .search({
        index: indexNameGenerated,
        type: esVersion >= 7 ? undefined : type,
        body: {
          query: { match_all: {} }
        }
      })
      .then(documents => {
        for (const doc of documents) {
          t.strictEqual(doc.msg, 'hello world')
        }
      })
      .catch(err => t.fail(err))
  })

  instance.end()
})

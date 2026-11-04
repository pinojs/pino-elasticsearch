'use strict'

const { once } = require('node:events')
const { createServer } = require('node:http')
const { test } = require('node:test')
const pino = require('pino')
const EcsFormat = require('@elastic/ecs-pino-format')
const elastic = require('../')
const fix = require('./fixtures')

const matchISOString = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
const options = {
  index: 'pinotest',
  type: 'log',
  node: 'http://127.0.0.1:9200'
}

const dsOptions = {
  ...options,
  opType: 'create'
}

test('make sure date format is valid', (t) => {
  t.assert.equal(typeof fix.datetime.object, 'string')
  t.assert.equal(fix.datetime.object, fix.datetime.string)
})

test('make sure log is a valid json', (t, done) => {
  t.plan(4)

  const Client = function (config) {
    t.assert.equal(config.node, options.node)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.ok(chunk)
        t.assert.equal(typeof chunk.time, 'string')
        t.assert.match(chunk.time, matchISOString)
      }

      done()
    }
  }

  const instance = elastic(options, { Client })
  const log = pino(instance)

  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)

  setImmediate(() => instance.end())
})

test('date can be a number', (t, done) => {
  t.plan(1)

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }

  const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000
  const time = new Date(Date.now() - threeDaysInMillis)

  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.equal(chunk.time, time.toISOString())
      }

      done()
    }
  }

  const instance = elastic(options, { Client })
  const log = pino(instance)

  log.info({ time: time.getTime() })

  setImmediate(() => instance.end())
})

test('Uses the type parameter only with ES < 7 / 1', (t, done) => {
  t.plan(2)

  const Client = function (config) {
    t.assert.equal(config.node, options.node)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const action = opts.onDocument(chunk)

        t.assert.equal(action.index._type, 'log')
      }

      done()
    }
  }

  const instance = elastic({ ...options, esVersion: 6 }, { Client })
  const log = pino(instance)

  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)

  setImmediate(() => instance.end())
})

test('Uses the type parameter only with ES < 7 / 1, even with the deprecated `esVersion` option', (t, done) => {
  t.plan(2)

  const Client = function (config) {
    t.assert.equal(config.node, options.node)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const action = opts.onDocument(chunk)

        t.assert.equal(action.index._type, 'log')
      }

      done()
    }
  }

  const instance = elastic({ ...options, esVersion: 6 }, { Client })
  const log = pino(instance)

  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)

  setImmediate(() => instance.end())
})

test('Uses the type parameter only with ES < 7 / 2', (t, done) => {
  t.plan(2)

  const Client = function (config) {
    t.assert.equal(config.node, options.node)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const action = opts.onDocument(chunk)

        t.assert.equal(action.index._type, undefined)
      }

      done()
    }
  }

  const instance = elastic({ ...options, esVersion: 7 }, { Client })
  const log = pino(instance)

  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)

  setImmediate(() => instance.end())
})

test('Uses the type parameter only with ES < 7 / 2, even with the deprecate `esVersion` option', (t, done) => {
  t.plan(2)

  const Client = function (config) {
    t.assert.equal(config.node, options.node)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const action = opts.onDocument(chunk)

        t.assert.equal(action.index._type, undefined)
      }

      done()
    }
  }

  const instance = elastic({ ...options, esVersion: 7 }, { Client })
  const log = pino(instance)

  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)

  setImmediate(() => instance.end())
})

test('ecs format', (t, done) => {
  t.plan(5)

  const prettyLog = 'some logs goes here.\n  another log...'
  const Client = function (config) {
    t.assert.equal(config.node, options.node)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.ok(chunk)
        t.assert.equal(typeof chunk['@timestamp'], 'string')
        t.assert.equal(chunk.message, prettyLog)
        t.assert.match(chunk['@timestamp'], matchISOString)
      }

      done()
    }
  }

  const instance = elastic({ ...options, ecs: true }, { Client })
  const ecsFormat = EcsFormat()
  const log = pino({ ...ecsFormat }, instance)

  log.info(['info'], prettyLog)

  setImmediate(() => instance.end())
})

test('invalid timestamps do not stop bulk processing', async (t) => {
  const documents = [
    { '@timestamp': { invalid: true }, message: 'invalid timestamp' },
    { '@timestamp': 0, message: 'epoch timestamp' },
    { '@timestamp': '2024-01-02T03:04:05.000Z', message: 'valid timestamp' },
    { '@timestamp': '2024-02-03T04:05:06.000Z', message: 'CRITICAL subsequent log' }
  ]
  const indexed = []
  const Client = function (config) {}

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const document of opts.datasource) {
        indexed.push({
          index: opts.onDocument(document).index._index,
          message: document.message
        })
      }

      return { successful: indexed.length }
    }
  }

  const instance = elastic({ ...options, index: 'pinotest-%{DATE}' }, { Client })
  const inserted = once(instance, 'insert')

  instance.end(documents.map(JSON.stringify).join('\n'))
  await inserted

  t.assert.deepEqual(indexed.map(({ message }) => message), documents.map(({ message }) => message))
  t.assert.match(indexed[0].index, /^pinotest-\d{4}-\d{2}-\d{2}$/)
  t.assert.equal(indexed[1].index, 'pinotest-1970-01-01')
  t.assert.equal(indexed[2].index, 'pinotest-2024-01-02')
  t.assert.equal(indexed[3].index, 'pinotest-2024-02-03')
})

test('auth and cloud parameters are properly passed to client', (t, done) => {
  t.plan(3)

  const opts = {
    ...options,
    auth: {
      username: 'user',
      password: 'pass'
    },
    cloud: {
      id: 'name:aHR0cHM6Ly9leGFtcGxlLmNvbQ=='
    }
  }

  const Client = function (config) {
    t.assert.equal(config.node, opts.node)
    t.assert.equal(config.auth, opts.auth)
    t.assert.equal(config.cloud, opts.cloud)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = { async bulk () { } }

  elastic(opts, { Client })

  done()
})

test('apiKey is passed through auth param properly to client', (t, done) => {
  t.plan(2)

  const opts = {
    ...options,
    auth: {
      apiKey: 'aHR0cHM6Ly9leGFtcGxlLmNvbQ'
    }
  }

  const Client = function (config) {
    t.assert.equal(config.node, opts.node)
    t.assert.equal(config.auth, opts.auth)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = { async bulk () { } }

  elastic(opts, { Client })

  done()
})

test('make sure `flushInterval` is passed to bulk request', (t, done) => {
  t.plan(2)

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.equal(opts.flushInterval, 12345)
        t.assert.ok(chunk)
      }
      done()
    }
  }

  const instance = elastic({ ...options, flushInterval: 12345 }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('make sure deprecated `flush-interval` is passed to bulk request', (t, done) => {
  t.plan(2)

  const flushInterval = 12345
  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.equal(opts.flushInterval, flushInterval)
        t.assert.ok(chunk)
      }
      done()
    }
  }

  const instance = elastic({ ...options, 'flush-interval': flushInterval }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('make sure `flushBytes` is passed to bulk request', (t, done) => {
  t.plan(2)

  const flushBytes = true

  const Client = function (config) {}
  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.equal(opts.flushBytes, flushBytes)
        t.assert.ok(chunk)
      }
      done()
    }
  }

  const instance = elastic({ ...options, flushBytes }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('make sure deprecated `flush-bytes` is passed to bulk request', (t, done) => {
  t.plan(2)

  const flushBytes = true

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.assert.equal(opts.flushBytes, flushBytes)
        t.assert.ok(chunk)
      }
      done()
    }
  }

  const instance = elastic({ ...options, 'flush-bytes': flushBytes }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('make sure `opType` is passed to bulk onDocument request', (t, done) => {
  t.plan(2)

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => { } }
  Client.prototype.connectionPool = { resurrect: () => { } }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const result = opts.onDocument(chunk)
        t.assert.equal(result.index._index, dsOptions.index, `_index should be correctly set to \`${dsOptions.index}\``)
        t.assert.equal(result.index.op_type, dsOptions.opType, `\`op_type\` should be set to \`${dsOptions.opType}\``)
      }
      done()
    }
  }

  const instance = elastic(dsOptions, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('make sure deprecated `op_type` is passed to bulk onDocument request', (t, done) => {
  t.plan(2)

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const result = opts.onDocument(chunk)
        t.assert.equal(result.index._index, dsOptions.index, `_index should be correctly set to \`${dsOptions.index}\``)
        t.assert.equal(result.index.op_type, dsOptions.opType, `\`op_type\` should be set to \`${dsOptions.opType}\``)
      }
      done()
    }
  }

  const { opType, ...rest } = dsOptions
  const instance = elastic({ ...rest, op_type: opType }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('make sure `@timestamp` is correctly set when `opType` is `create`', (t, done) => {
  t.plan(1)

  const Client = function (config) {}
  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        opts.onDocument(chunk)
        t.assert.equal(chunk['@timestamp'], chunk.time, 'Document @timestamp does not equal the provided timestamp')
      }
      done()
    }
  }

  const instance = elastic(dsOptions, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  setImmediate(() => instance.end())
})

test('resurrect client connection pool when datasource split is destroyed', (t, done) => {
  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.helpers = { async bulk () { } }
  Client.prototype.connectionPool = {
    resurrect: function () {
      done()
    }
  }

  const instance = elastic({ ...options }, { Client })
  const log = pino(instance)

  log.info(['info'], 'Example of a log')

  instance.destroy()
})

test('restart bulk helper on the same stream after a failed bulk request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })

  const received = []
  let calls = 0

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      calls++
      for await (const chunk of opts.datasource) {
        received.push(chunk.msg)
        if (calls === 1) {
          throw new Error('bulk request failed')
        }
      }

      return { successful: received.length }
    }
  }

  const instance = elastic(options, { Client })
  const log = pino(instance)
  const failed = once(instance, 'error')

  log.info('before the failure')
  const [error] = await failed
  await new Promise((resolve) => setImmediate(resolve))
  t.mock.timers.tick(1000)
  log.info('after the failure')

  const inserted = once(instance, 'insert')
  instance.end()
  await inserted

  t.assert.equal(error.message, 'bulk request failed')
  t.assert.equal(calls, 2)
  t.assert.deepEqual(received, ['before the failure', 'after the failure'])
})

test('failed bulk helper does not crash the process without an error listener', (t, done) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })

  let calls = 0

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      calls++
      if (calls === 2) {
        done()
        return
      }

      for await (const chunk of opts.datasource) {
        if (chunk) {
          throw new Error('bulk request failed')
        }
      }
    }
  }

  const instance = elastic(options, { Client })
  const log = pino(instance)

  log.info('before the failure')

  setImmediate(() => t.mock.timers.tick(1000))
})

test('restarting bulk helper does not leave listeners on the stream', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        if (chunk) {
          throw new Error('bulk request failed')
        }
      }
    }
  }

  const instance = elastic(options, { Client })
  const log = pino(instance)
  const events = ['readable', 'end', 'finish', 'close', 'error']
  const listeners = () => events.map((event) => instance.listenerCount(event))
  const initial = listeners()

  for (let i = 0; i < 3; i++) {
    const failed = once(instance, 'error')
    log.info(`line ${i}`)
    await failed
    await new Promise((resolve) => setImmediate(resolve))
    t.mock.timers.tick(1000)
  }

  t.assert.deepEqual(listeners(), initial)
})

test('do not restart bulk helper after the stream has ended', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })

  let calls = 0

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      calls++
      for await (const chunk of opts.datasource) {
        t.assert.ok(chunk)
      }

      return { successful: 1 }
    }
  }

  const instance = elastic(options, { Client })
  const inserted = once(instance, 'insert')

  instance.end(JSON.stringify({ msg: 'only line' }))
  await inserted
  t.mock.timers.tick(1000)

  t.assert.equal(calls, 1)
})

test('resurrect does not start a second bulk helper while one is running', async (t) => {
  let resurrect
  let calls = 0

  const Client = function (config) { }

  Client.prototype.diagnostic = {
    on: (event, handler) => {
      resurrect = handler
    }
  }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      calls++
      for await (const chunk of opts.datasource) {
        t.assert.ok(chunk)
      }

      return { successful: 0 }
    }
  }

  const instance = elastic(options, { Client })

  resurrect()
  t.assert.equal(calls, 1)

  const inserted = once(instance, 'insert')
  instance.end()
  await inserted
})

test('ship logs again after Elasticsearch recovers from a failed bulk request', async (t) => {
  let failing = true
  let onIndexed
  const indexed = new Promise((resolve) => {
    onIndexed = resolve
  })

  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      res.setHeader('x-elastic-product', 'Elasticsearch')
      res.setHeader('content-type', 'application/json')
      if (!req.url.includes('_bulk')) {
        res.end('{}')
        return
      }

      if (failing) {
        res.statusCode = 503
        res.end(JSON.stringify({ error: 'unavailable', status: 503 }))
        return
      }

      const documents = body.trim().split('\n').filter((line, i) => i % 2 === 1)
      res.end(JSON.stringify({ took: 1, errors: false, items: documents.map(() => ({ index: { status: 201 } })) }))
      onIndexed(documents.length)
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => server.close())

  const instance = elastic({ ...options, node: `http://127.0.0.1:${server.address().port}`, flushInterval: 50 })
  const log = pino(instance)
  const failed = once(instance, 'error')
  const traffic = setInterval(() => log.info('a log line'), 10)

  await failed
  failing = false
  const count = await indexed
  clearInterval(traffic)

  const inserted = once(instance, 'insert')
  instance.end()
  await inserted

  t.assert.ok(count > 0)
})

test('make sure deprecated `rejectUnauthorized` is passed to client constructor', (t, done) => {
  t.plan(1)

  const rejectUnauthorized = true

  const Client = function (config) {
    t.assert.equal(config.tls.rejectUnauthorized, rejectUnauthorized)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = { async bulk () { } }

  const instance = elastic({ ...options, rejectUnauthorized }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  done()
})

test('make sure `tls.rejectUnauthorized` is passed to client constructor', (t, done) => {
  t.plan(1)

  const tls = { rejectUnauthorized: true }

  const Client = function (config) {
    t.assert.equal(config.tls.rejectUnauthorized, tls.rejectUnauthorized)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = { async bulk () { } }

  const instance = elastic({ ...options, tls }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  done()
})

test('make sure `tls.rejectUnauthorized` overrides deprecated `rejectUnauthorized`', (t, done) => {
  t.plan(1)

  const rejectUnauthorized = true
  const tls = { rejectUnauthorized: false }

  const Client = function (config) {
    t.assert.equal(config.tls.rejectUnauthorized, tls.rejectUnauthorized)
  }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.connectionPool = { resurrect: () => {} }
  Client.prototype.helpers = { async bulk () { } }

  const instance = elastic({ ...options, rejectUnauthorized, tls }, { Client })
  const log = pino(instance)

  log.info(['info'], 'abc')

  done()
})

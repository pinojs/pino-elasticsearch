'use strict'

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
  let isResurrected = false

  const Client = function (config) { }

  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.helpers = {
    bulk: async function (opts) {
      if (!isResurrected) {
        opts.datasource.destroy()
      }
    }
  }
  Client.prototype.connectionPool = {
    resurrect: function () {
      isResurrected = true

      done()
    }
  }

  const instance = elastic({ ...options }, { Client })
  const log = pino(instance)

  log.info(['info'], 'Example of a log')
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

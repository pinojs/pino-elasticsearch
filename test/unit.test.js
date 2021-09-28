'use strict'

const pino = require('pino')
const proxyquire = require('proxyquire')
const test = require('tap').test
const fix = require('./fixtures')
const EcsFormat = require('@elastic/ecs-pino-format')

const matchISOString = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
const options = {
  index: 'pinotest',
  type: 'log',
  consistency: 'one',
  node: 'http://localhost:9200'
}

const dsOptions = {
  index: 'logs-pino-test',
  type: 'log',
  consistency: 'one',
  node: 'http://localhost:9200',
  op_type: 'create'
}

test('make sure date format is valid', (t) => {
  t.type(fix.datetime.object, 'string')
  t.equal(fix.datetime.object, fix.datetime.string)
  t.end()
})

test('make sure log is a valid json', (t) => {
  t.plan(4)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.ok(chunk, true)
        t.type(chunk.time, 'string')
        t.match(chunk.time, matchISOString)
      }
    }
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  const instance = elastic(options)
  const log = pino(instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

test('date can be a number', (t) => {
  t.plan(1)
  const Client = function (config) {}

  const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000
  const time = new Date(Date.now() - threeDaysInMillis)

  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.equal(chunk.time, time.toISOString())
      }
    }
  }

  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  const instance = elastic(options)
  const log = pino(instance)
  log.info({
    time: time.getTime()
  })
})

test('Uses the type parameter only with ES < 7 / 1', (t) => {
  t.plan(2)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }

  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const action = opts.onDocument(chunk)
        t.equal(action.index._type, 'log')
      }
    }
  }

  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  const instance = elastic(Object.assign(options, { 'es-version': 6 }))
  const log = pino(instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

test('Uses the type parameter only with ES < 7 / 2', (t) => {
  t.plan(2)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        const action = opts.onDocument(chunk)
        t.equal(action.index._type, undefined)
      }
    }
  }

  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  const instance = elastic(Object.assign(options, { 'es-version': 7 }))
  const log = pino(instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

test('ecs format', (t) => {
  t.plan(5)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        t.ok(chunk, true)
        t.type(chunk['@timestamp'], 'string')
        t.equal(chunk.message, prettyLog)
        t.match(chunk['@timestamp'], matchISOString)
      }
    }
  }

  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  const instance = elastic(Object.assign(options, { ecs: true }))
  const ecsFormat = EcsFormat()
  const log = pino({ ...ecsFormat }, instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

test('auth and cloud parameters are properly passed to client', (t) => {
  const opts = {
    index: 'pinotest',
    type: 'log',
    consistency: 'one',
    node: 'http://localhost:9200',
    auth: {
      username: 'user',
      password: 'pass'
    },
    cloud: {
      id: 'name:aHR0cHM6Ly9leGFtcGxlLmNvbQ=='
    }
  }

  t.plan(3)
  const Client = function (config) {
    t.equal(config.node, opts.node)
    t.equal(config.auth, opts.auth)
    t.equal(config.cloud, opts.cloud)
  }
  Client.prototype.helpers = {
    async bulk (opts) {}
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  elastic(opts)
})

test('apikey is passed through auth param properly to client', (t) => {
  const opts = {
    index: 'pinotest',
    type: 'log',
    consistency: 'one',
    node: 'http://localhost:9200',
    auth: {
      apiKey: 'aHR0cHM6Ly9leGFtcGxlLmNvbQ'
    }
  }

  t.plan(2)
  const Client = function (config) {
    t.equal(config.node, opts.node)
    t.equal(config.auth, opts.auth)
  }
  Client.prototype.helpers = {
    async bulk (opts) {}
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  elastic(opts)
})

test('make sure `flush-interval` is passed to bulk request', (t) => {
  t.plan(2)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }
  Client.prototype.helpers = {
    async bulk (opts) {
      t.equal(opts.flushInterval, 12345)
      t.end()
    }
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })

  options['flush-interval'] = 12345
  const instance = elastic(options)
  const log = pino(instance)
  log.info(['info'], 'abc')
})

test('make sure `op_type` is passed to bulk onDocument request', (t) => {
  t.plan(2)

  const Client = function (config) {}

  Client.prototype.helpers = {
    async bulk (opts) {
      const result = opts.onDocument({})
      t.equal(result.index._index, 'logs-pino-test', '_index should be correctly set to `logs-pino-test`')
      t.equal(result.index.op_type, 'create', '`op_type` should be set to `create`')
      t.end()
    }
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })

  const instance = elastic(dsOptions)
  const log = pino(instance)
  log.info(['info'], 'abc')
})

test('make sure `@timestamp` is correctly set when `op_type` is `create`', (t) => {
  t.plan(1)

  const document = {
    time: '2021-09-01T01:01:01.038Z'
  }
  const Client = function (config) {}

  Client.prototype.helpers = {
    async bulk (opts) {
      opts.onDocument(document)
      t.equal(document['@timestamp'], '2021-09-01T01:01:01.038Z', 'Document @timestamp does not equal the provided timestamp')
      t.end()
    }
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })

  const instance = elastic(dsOptions)
  const log = pino(instance)
  log.info(['info'], 'abc')
})

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const pino = require('pino')
const proxyquire = require('proxyquire')
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
  assert.equal(typeof fix.datetime.object, 'string')
  assert.equal(fix.datetime.object, fix.datetime.string)
})

test('make sure log is a valid json', (t, end) => {
  t.plan(4)
  const Client = function (config) {
    process._rawDebug('!!! config')
    t.assert.equal(config.node, options.node)
  }
  Client.prototype.diagnostic = { on: () => {} }
  Client.prototype.helpers = {
    async bulk (opts) {
      for await (const chunk of opts.datasource) {
        process._rawDebug('!!! bulk.loop')
        t.assert.equal(typeof chunk, 'object')
        t.assert.equal(typeof chunk.time, 'string')
        t.assert.match(chunk.time, matchISOString)
      }
      process._rawDebug('!!! bulk.end')
      end()
    }
  }
  const instance = elastic(options, { Client })
  const log = pino(instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

// test('date can be a number', (t) => {
//   t.plan(1)
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000
//   const time = new Date(Date.now() - threeDaysInMillis)
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       for await (const chunk of opts.datasource) {
//         t.assert.equal(chunk.time, time.toISOString())
//       }
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   const instance = elastic(options)
//   const log = pino(instance)
//   log.info({
//     time: time.getTime()
//   })
// })
//
// test('Uses the type parameter only with ES < 7 / 1', (t) => {
//   t.plan(2)
//
//   const Client = function (config) {
//     t.assert.equal(config.node, options.node)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       for await (const chunk of opts.datasource) {
//         const action = opts.onDocument(chunk)
//         t.assert.equal(action.index._type, 'log')
//       }
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   const instance = elastic(Object.assign(options, { esVersion: 6 }))
//   const log = pino(instance)
//   const prettyLog = `some logs goes here.
//   another log...`
//   log.info(['info'], prettyLog)
// })
//
// test('Uses the type parameter only with ES < 7 / 1, even with the deprecated `esVersion` option', (t) => {
//   t.plan(2)
//
//   const Client = function (config) {
//     t.assert.equal(config.node, options.node)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       for await (const chunk of opts.datasource) {
//         const action = opts.onDocument(chunk)
//         t.assert.equal(action.index._type, 'log')
//       }
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   const instance = elastic(Object.assign(options, { esVersion: 6 }))
//   const log = pino(instance)
//   const prettyLog = `some logs goes here.
//   another log...`
//   log.info(['info'], prettyLog)
// })
//
// test('Uses the type parameter only with ES < 7 / 2', (t) => {
//   t.plan(2)
//
//   const Client = function (config) {
//     t.assert.equal(config.node, options.node)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       for await (const chunk of opts.datasource) {
//         const action = opts.onDocument(chunk)
//         t.assert.equal(action.index._type, undefined)
//       }
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   const instance = elastic(Object.assign(options, { esVersion: 7 }))
//   const log = pino(instance)
//   const prettyLog = `some logs goes here.
//   another log...`
//   log.info(['info'], prettyLog)
// })
//
// test('Uses the type parameter only with ES < 7 / 2, even with the deprecate `esVersion` option', (t) => {
//   t.plan(2)
//   const Client = function (config) {
//     t.assert.equal(config.node, options.node)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       for await (const chunk of opts.datasource) {
//         const action = opts.onDocument(chunk)
//         t.assert.equal(action.index._type, undefined)
//       }
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   const instance = elastic(Object.assign(options, { esVersion: 7 }))
//   const log = pino(instance)
//   const prettyLog = `some logs goes here.
//   another log...`
//   log.info(['info'], prettyLog)
// })
//
// test('ecs format', (t) => {
//   t.plan(5)
//   const Client = function (config) {
//     t.assert.equal(config.node, options.node)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       for await (const chunk of opts.datasource) {
//         t.assert.equal(chunk, true)
//         t.assert.equal(typeof chunk['@timestamp'], 'string')
//         t.assert.equal(chunk.message, prettyLog)
//         t.match(chunk['@timestamp'], matchISOString)
//       }
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   const instance = elastic(Object.assign(options, { ecs: true }))
//   const ecsFormat = EcsFormat()
//   const log = pino({ ...ecsFormat }, instance)
//   const prettyLog = `some logs goes here.
//   another log...`
//   log.info(['info'], prettyLog)
// })
//
// test('auth and cloud parameters are properly passed to client', (t) => {
//   const opts = {
//     ...options,
//     auth: {
//       username: 'user',
//       password: 'pass'
//     },
//     cloud: {
//       id: 'name:aHR0cHM6Ly9leGFtcGxlLmNvbQ=='
//     }
//   }
//
//   t.plan(3)
//   const Client = function (config) {
//     t.assert.equal(config.node, opts.node)
//     t.assert.equal(config.auth, opts.auth)
//     t.assert.equal(config.cloud, opts.cloud)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = {
//     async bulk (opts) {}
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   elastic(opts)
// })
//
// test('apiKey is passed through auth param properly to client', (t) => {
//   const opts = {
//     ...options,
//     auth: {
//       apiKey: 'aHR0cHM6Ly9leGFtcGxlLmNvbQ'
//     }
//   }
//
//   t.plan(2)
//   const Client = function (config) {
//     t.assert.equal(config.node, opts.node)
//     t.assert.equal(config.auth, opts.auth)
//   }
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = {
//     async bulk (opts) {}
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//   elastic(opts)
// })
//
// test('make sure `flushInterval` is passed to bulk request', (t) => {
//   t.plan(1)
//
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       t.assert.equal(opts.flushInterval, 12345)
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   options.flushInterval = 12345
//   const instance = elastic(options)
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure deprecated `flushInterval` is passed to bulk request', (t) => {
//   t.plan(1)
//
//   const flushInterval = 12345
//
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       t.assert.equal(opts.flushInterval, flushInterval)
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options, flushInterval })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure `flushBytes` is passed to bulk request', (t) => {
//   t.plan(1)
//
//   const flushBytes = true
//
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       t.assert.equal(opts.flushBytes, flushBytes)
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options, flushBytes })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure deprecated `flush-bytes` is passed to bulk request', (t) => {
//   t.plan(1)
//
//   const flushBytes = true
//
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       t.assert.equal(opts.flushBytes, flushBytes)
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options, 'flush-bytes': flushBytes })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure `opType` is passed to bulk onDocument request', (t) => {
//   t.plan(2)
//
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       const result = opts.onDocument({})
//       t.assert.equal(result.index._index, dsOptions.index, `_index should be correctly set to \`${dsOptions.index}\``)
//       t.assert.equal(result.index.op_type, dsOptions.opType, `\`op_type\` should be set to \`${dsOptions.opType}\``)
//       t.end()
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic(dsOptions)
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure deprecated `op_type` is passed to bulk onDocument request', (t) => {
//   t.plan(2)
//
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       const result = opts.onDocument({})
//       t.assert.equal(result.index._index, dsOptions.index, `_index should be correctly set to \`${dsOptions.index}\``)
//       t.assert.equal(result.index.op_type, dsOptions.opType, `\`op_type\` should be set to \`${dsOptions.opType}\``)
//       t.end()
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const { opType, ...rest } = dsOptions
//
//   const instance = elastic({ ...rest, op_type: opType })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure `@timestamp` is correctly set when `opType` is `create`', (t) => {
//   t.plan(1)
//
//   const document = {
//     time: '2021-09-01T01:01:01.038Z'
//   }
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     async bulk (opts) {
//       opts.onDocument(document)
//       t.assert.equal(document['@timestamp'], '2021-09-01T01:01:01.038Z', 'Document @timestamp does not equal the provided timestamp')
//       t.end()
//     }
//   }
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic(dsOptions)
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('resurrect client connection pool when datasource split is destroyed', (t) => {
//   let isResurrected = false
//   const Client = function (config) {}
//   Client.prototype.diagnostic = { on: () => {} }
//
//   Client.prototype.helpers = {
//     bulk: async function (opts) {
//       if (!isResurrected) {
//         opts.datasource.destroy()
//       }
//     }
//   }
//
//   Client.prototype.connectionPool = {
//     resurrect: function () {
//       isResurrected = true
//       t.end()
//     }
//   }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options })
//   const log = pino(instance)
//
//   const prettyLog = 'Example of a log'
//   log.info(['info'], prettyLog)
// })
//
// test('make sure deprecated `rejectUnauthorized` is passed to client constructor', (t) => {
//   t.plan(1)
//
//   const rejectUnauthorized = true
//
//   const Client = function (config) {
//     t.assert.equal(config.tls.rejectUnauthorized, rejectUnauthorized)
//   }
//
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = { async bulk () {} }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options, rejectUnauthorized })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure `tls.rejectUnauthorized` is passed to client constructor', (t) => {
//   t.plan(1)
//
//   const tls = { rejectUnauthorized: true }
//
//   const Client = function (config) {
//     t.assert.equal(config.tls.rejectUnauthorized, tls.rejectUnauthorized)
//   }
//
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = { async bulk () {} }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options, tls })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })
//
// test('make sure `tls.rejectUnauthorized` overrides deprecated `rejectUnauthorized`', (t) => {
//   t.plan(1)
//
//   const rejectUnauthorized = true
//   const tls = { rejectUnauthorized: false }
//
//   const Client = function (config) {
//     t.assert.equal(config.tls.rejectUnauthorized, tls.rejectUnauthorized)
//   }
//
//   Client.prototype.diagnostic = { on: () => {} }
//   Client.prototype.helpers = { async bulk () {} }
//
//   const elastic = proxyquire('../', {
//     '@elastic/elasticsearch': { Client }
//   })
//
//   const instance = elastic({ ...options, rejectUnauthorized, tls })
//   const log = pino(instance)
//   log.info(['info'], 'abc')
// })

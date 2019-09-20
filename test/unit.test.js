'use strict'

const pino = require('pino')
const proxyquire = require('proxyquire')
const es = require('is-elasticsearch-running')()
const test = require('tap').test
const fix = require('./fixtures')

const matchISOString = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
const options = {
  index: 'pinotest',
  type: 'log',
  consistency: 'one',
  node: 'http://localhost:9200'
}

test('Wait for elasticsearch', async t => {
  await es.waitCluster()
  t.pass('Elasticsearch is up and running')
})

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
  Client.prototype.index = (obj, cb) => {
    t.ok(obj, true)
    t.type(obj.body.time, 'string')
    t.match(obj.body.time, matchISOString)
    cb(null, {})
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

test('Uses the type parameter only with ES < 7 / 1', (t) => {
  t.plan(2)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }
  Client.prototype.index = (obj, cb) => {
    t.strictEqual(obj.type, 'log')
    cb(null, {})
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
  Client.prototype.index = (obj, cb) => {
    t.strictEqual(obj.type, undefined)
    cb(null, {})
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
  t.plan(6)
  const Client = function (config) {
    t.equal(config.node, options.node)
  }
  Client.prototype.index = (obj, cb) => {
    t.ok(obj, true)
    t.deepEqual(obj.body.ecs, { version: '1.0.0' })
    t.type(obj.body['@timestamp'], 'string')
    t.assertNot(obj.body.time)
    t.match(obj.body['@timestamp'], matchISOString)
    cb(null, {})
  }
  const elastic = proxyquire('../', {
    '@elastic/elasticsearch': { Client }
  })
  const instance = elastic(Object.assign(options, { ecs: true }))
  const log = pino(instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

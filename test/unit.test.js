'use strict'

const pino = require('pino')
const proxyquire = require('proxyquire')
const test = require('tap').test
const fix = require('./fixtures')

const matchISOString = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/
const options = {
  index: 'pinotest',
  type: 'log',
  consistency: 'one',
  host: 'localhost',
  port: 9200
}

test('make sure date format is valid', (t) => {
  t.type(fix.datetime.object, 'string')
  t.equal(fix.datetime.object, fix.datetime.string)
  t.end()
})
test('make sure log is a valid json', (t) => {
  t.plan(4)
  const Client = function (config) {
    t.equal(config.host, `${options.host}:${options.port}`)
  }
  Client.prototype.index = (obj, cb) => {
    t.ok(obj, true)
    t.type(obj.body.time, 'string')
    t.match(obj.body.time, matchISOString)
    cb(null, {})
  }
  const elastic = proxyquire('../', {
    elasticsearch: {
      Client: Client
    }
  })
  const instance = elastic(options)
  const log = pino(instance)
  const prettyLog = `some logs goes here.
  another log...`
  log.info(['info'], prettyLog)
})

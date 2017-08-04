'use strict'

const pino = require('pino')

const proxyquire = require('proxyquire')

const test = require('tap').test
const options = {
  index: 'pinotest',
  type: 'log',
  consistency: 'one',
  host: 'localhost',
  port: 9200
}
test('make sure log is a valid json', (t) => {
  t.plan(2)
  const Client = function (config) {
    t.equal(config.host, `${options.host}:${options.port}`)
  }
  Client.prototype.index = (obj, cb) => {
    t.ok(obj, true)
    cb(null, {})
  }
  // TODO: test it better
  // Client.prototype.bulk = (obj, cb) => {
  //   cb(null, {})
  // }
  const elastic = proxyquire('../', {
    elasticsearch: {
      Client: Client
    }
  })
  const instance = elastic(options)
  const log = pino(instance)
  const prettyLog = JSON.stringify({ service: 'test', msg: 'testing' })
  log.info(['info'], prettyLog)
})

'use strict'

const pinoJs = require('pino')
const elastic = require('./lib')({
  index: 'pinotest',
  node: 'http://localhost:9200',
  auth: {
    apiKey: 'someKey'
  },
  consistency: 'one',
  'es-version': 7,
  'flush-bytes': 1000
})

const level = 'trace'
const pino = pinoJs({ level }, pinoJs.multistream([
  { level, stream: elastic },
  { level, stream: process.stdout }
]))

pino.trace('test')
setInterval(function () {
  pino.trace('test')
}, 10000)

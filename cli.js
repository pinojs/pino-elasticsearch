#! /usr/bin/env node
'use strict'

const minimist = require('minimist')
const pump = require('pump')
const fs = require('fs')
const path = require('path')
const pinoElasticSearch = require('./lib')

function start (opts) {
  if (opts.help) {
    console.log(fs.readFileSync(path.join(__dirname, './usage.txt'), 'utf8'))
    return
  }

  if (opts.version) {
    console.log('pino-elasticsearch', require('./package.json').version)
    return
  }

  pump(process.stdin, pinoElasticSearch(opts))
}

start(minimist(process.argv.slice(2), {
  alias: {
    version: 'v',
    help: 'h',
    node: 'n',
    index: 'i',
    'bulk-size': 'b',
    'trace-level': 'l'
  },
  default: {
    node: 'http://localhost:9200'
  }
}))

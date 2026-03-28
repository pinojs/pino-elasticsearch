'use strict'

const { defineConfig } = require('eslint/config')
const neostandard = require('neostandard')

module.exports = defineConfig([
  neostandard({
    ts: true,
  }),
])

# pino-elasticsearch&nbsp;&nbsp;[![Build Status](https://github.com/pinojs/pino-elasticsearch/workflows/CI/badge.svg)](https://github.com/pinojs/pino-elasticsearch/actions)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/pinojs/pino-elasticsearch/badge.svg?branch=master)](https://coveralls.io/github/pinojs/pino-elasticsearch?branch=master)

Load [pino](https://github.com/pinojs/pino) logs into
[Elasticsearch](https://www.elastic.co/products/elasticsearch).

## Install

```
npm install pino-elasticsearch -g
```

## Usage

```
  pino-elasticsearch

  To send pino logs to elasticsearch:

     cat log | pino-elasticsearch --node http://localhost:9200

  Flags
  -h  | --help              Display Help
  -v  | --version           display Version
  -n  | --node              the URL where Elasticsearch is running
  -i  | --index             the name of the index to use; default: pino
                            will replace %{DATE} with the YYYY-MM-DD date
  -t  | --type              the name of the type to use; default: log
  -b  | --size              the number of documents for each bulk insert
  -l  | --trace-level       trace level for the elasticsearch client, default 'error' (info, debug, trace).
      | --ecs               format the logs with Elastic Common Schema
      | --es-version        specify the major version number of Elasticsearch (eg: 5, 6, 7)
                            (this is needed only if you are using Elasticsearch <= 7)

```

### Usage as module

```js
const pino = require('pino')
const pinoElastic = require('pino-elasticsearch')

const streamToElastic = pinoElastic({
  index: 'an-index',
  type: 'log',
  consistency: 'one',
  node: 'http://localhost:9200',
  'es-version': 6,
  'bulk-size': 200,
  ecs: true
})

const logger = pino({ level: 'info' }, streamToElastic)

logger.info('hello world')
// ...
```

You can then use [Kibana](https://www.elastic.co/products/kibana) to
browse and visualize your logs.  
**Note:** This transport works only with Elasticsearch version ≥ 5.

#### Dynamic index

It is possible to customize the index name for every log line just providing a function to the `index` option:

```js
const pino = require('pino')
const pinoElastic = require('pino-elasticsearch')

const streamToElastic = pinoElastic({
  index: function (logTime) {
    // the logTime is a ISO 8601 formatted string of the log line
    return `awesome-app-${logTime.substring(5, 10)}`
  },
  consistency: 'one',
  node: 'http://localhost:9200'
})
// ...
```

The function **must** be sync, doesn't throw and return a string.

### Authentication
If you need to use basic authentication to connect with the Elasticsearch cluster, pass the credentials in the URL:
```
cat log | pino-elasticsearch --node https://user:pwd@localhost:9200
```
## Setup and Testing

Setting up pino-elasticsearch is easy, and you can use the bundled
`docker-compose.yml` file to bring up both
[Elasticsearch](https://www.elastic.co/products/elasticsearch) and
[Kibana](https://www.elastic.co/products/kibana).

You will need [docker](https://www.docker.com/) and
[docker-compose](https://docs.docker.com/compose/), then in this project
folder, launch `docker-compose up`.

You can test it by launching `node example | pino-elasticsearch`, in
this project folder. You will need to have `pino-elasticsearch`
installed globally.

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

Licensed under [MIT](./LICENSE).

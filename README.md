# pino-elasticsearch&nbsp;&nbsp;[![Build Status](https://travis-ci.org/pinojs/pino-elasticsearch.svg)](https://travis-ci.org/pinojs/pino-elasticsearch)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/pinojs/pino-elasticsearch/badge.svg?branch=master)](https://coveralls.io/github/pinojs/pino-elasticsearch?branch=master)

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

     cat log | pino-elasticsearch --host 192.168.1.42

  If using AWS Elasticsearch:
    cat log | pino-elasticsearch  --host https://your-url.us-east-1.es.amazonaws.com --port 443 -c ./aws_config.json

  Flags
  -h  | --help              Display Help
  -v  | --version           display Version
  -H  | --host              the IP address of elasticsearch; default: 127.0.0.1
  -p  | --port              the port of elasticsearch; default: 9200
  -i  | --index             the name of the index to use; default: pino
                            will replace %{DATE} with the YYYY-MM-DD date
  -t  | --type              the name of the type to use; default: log
  -b  | --size              the number of documents for each bulk insert
  -l  | --trace-level       trace level for the elasticsearch client, default 'error' (info, debug, trace).
  -c  | --aws-credentials   path to aws_config.json (is using AWS Elasticsearch)

```

You can then use [Kibana](https://www.elastic.co/products/kibana) to
browse and visualize your logs.

## Use as a module

use pino-elasticsearch as a module is simple, use [pino-multi-stream](https://www.npmjs.com/package/pino-multi-stream) to send log to multi transport, for example:

```js
const pinoms = require('pino-multi-stream')
const pinoEs = require('pino-elasticsearch')({
    host: '192.168.1.220',
    index: 'zb',
    port: '9200'
})

const logger = pinoms({
    streams: [
      {level: 'error', stream: process.stderr}, // an "error" level destination stream
      {level: 'info', stream: process.stdout}, // an "info" level destination stream
      {stream: pinoEs}
    ]
  })


logger.info({'msg': {'info': 'info'}})
logger.debug('debug')
logger.warn('warn')
logger.error('error')

```

*** Notice, the `host` and `port` parameters of `pino-elasticsearch` are required ***

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

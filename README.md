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
  -f  | --flush-bytes       the number of bytes for each bulk insert; default: 1000
  -b  | --bulk-size         the number of documents for each bulk insert [DEPRECATED]
  -l  | --trace-level       trace level for the elasticsearch client, default 'error' (info, debug, trace).
      | --es-version        specify the major version number of Elasticsearch (eg: 5, 6, 7)
                            (this is needed only if you are using Elasticsearch <= 7)
  -u  | --username          Username to specify with authentication method
                            (can only be used in tandem with the 'password' flag)
  -p  | --password          Password to specify with authentication method
                            (can only be used in tandem with the 'username' flag)
  -k  | --api-key           Api key for authentication instead of username/password combination
  -c  | --cloud             Id of the elastic cloud node to connect to

```

### Usage as module

```js
const pino = require('pino')
const pinoElastic = require('pino-elasticsearch')

const streamToElastic = pinoElastic({
  index: 'an-index',
  consistency: 'one',
  node: 'http://localhost:9200',
  'es-version': 7,
  'flush-bytes': 1000
})

const logger = pino({ level: 'info' }, streamToElastic)

logger.info('hello world')
// ...
```

### ECS support

If you want to use [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html), you should install [`@elastic/ecs-pino-format`](https://github.com/elastic/ecs-logging-js/tree/master/loggers/pino), as the `ecs` option of this module has been removed.

```js
const pino = require('pino')
const ecsFormat = require('@elastic/ecs-pino-format')()
const pinoElastic = require('pino-elasticsearch')

const streamToElastic = pinoElastic({
  index: 'an-index',
  consistency: 'one',
  node: 'http://localhost:9200',
  'es-version': 7,
  'flush-bytes': 1000
})

const logger = pino({ level: 'info',  ...ecsFormat  }, streamToElastic)

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

Alternatively you can supply a combination of `username` and `password` OR `api-key`:
```
cat log | pino-elasticsearch --node https://localhost:9200 -u user -p pwd
```
```
cat log | pino-elasticsearch --node https://localhost:9200 --api-key=base64EncodedKey
```

Elastic cloud option `cloud` is also supported:
```sh
cat log | pino-elasticsearch --cloud=name:bG9jYWxob3N0JGFiY2QkZWZnaA== --api-key=base64EncodedKey
```

Note: When using the cli, if you pass username/password AND an apiKey the apiKey will take precedence over the username/password combination.

You can also include the `auth` field in your configuration like so:
```js
const pinoElastic = require('pino-elasticsearch')

const streamToElastic = pinoElastic({
  index: 'an-index',
  consistency: 'one',
  node: 'http://localhost:9200',
  auth: {
    username: 'user',
    password: 'pwd'
  },
  'es-version': 7,
  'flush-bytes': 1000
})
```

Alternatively you can pass an `apiKey` instead:
```js
const pinoElastic = require('pino-elasticsearch')

const streamToElastic = pinoElastic({
  index: 'an-index',
  consistency: 'one',
  node: 'http://localhost:9200',
  cloud: {
    id: 'name:bG9jYWxob3N0JGFiY2QkZWZnaA=='
  },
  auth: {
    apiKey: 'apikey123'
  },
  'es-version': 7,
  'flush-bytes': 1000
})
```

For a full list of authentication options when using elastic, check out the [authentication configuration docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/auth-reference.html)

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

# pino-elasticsearch&nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/pino-elasticsearch.svg)](https://travis-ci.org/mcollina/pino-elasticsearch)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/mcollina/pino-elasticsearch/badge.svg?branch=master)](https://coveralls.io/github/mcollina/pino-elasticsearch?branch=master)

Load [pino](https://github.com/mcollina/pino) logs into
[ElasticSearch](https://www.elastic.co/products/elasticsearch).

## Install

```
npm install pino-elasticsearch -g
```

## Usage

```
  pino-elasticsearch

  To send pino logs to elasticsearch:

     cat log | pino-elasticsearch --host 192.168.1.42

  Flags
  -h  | --help              Display Help
  -v  | --version           display Version
  -H  | --host              the IP address of elasticsearch; default: 127.0.0.1
  -p  | --port              the port of elasticsearch; default: 9200
  -i  | --index             the name of the index to use; default: pino
  -t  | --type              the name of the type to use; default: log
  -c  | --consistency       the consistency of the write; default: one
```

You can then use [Kibana](https://www.elastic.co/products/kibana) to
browse and visualize your logs.

## Acknowledgements

This project was kindly sponsored by [nearForm](http://nearform.com).

## License

Licensed under [MIT](./LICENSE).

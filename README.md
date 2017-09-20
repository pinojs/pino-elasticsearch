# pino-elasticsearch-aws&nbsp;&nbsp;

## Install

```
npm install pino-elasticsearch-aws -g
```

## Usage

```
  pino-elasticsearch-aws

  To send pino logs to elasticsearch:

     cat log | pino-elasticsearch-aws --host 192.168.1.42

  Flags
  -h  | --help              Display Help
  -v  | --version           display Version
  -H  | --host              the IP address of elasticsearch; default: 127.0.0.1
  -p  | --port              the port of elasticsearch; default: 9200
  -i  | --index             the name of the index to use; default: pino
  -t  | --type              the name of the type to use; default: log
  -b  | --size              the number of documents for each bulk insert
  -l  | --trace-level       trace level for the elasticsearch client, default 'error' (info, debug, trace).

```

You can then use [Kibana](https://www.elastic.co/products/kibana) to
browse and visualize your logs.

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

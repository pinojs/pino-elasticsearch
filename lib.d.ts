import type { Transform } from 'stream'
import type { ClientOptions } from '@elastic/elasticsearch'

export default pinoElasticsearch

declare function pinoElasticsearch(options: Options): DestinationStream

export type DestinationStream = Transform & {
  on(event: 'unknown', handler: (line: string, error: string) => void): void
  on(event: 'insertError', handler: (error: Error & { document: Record<string, any> }) => void): void
  on(event: 'insert', handler: (stats: Record<string, any>) => void): void
  on(event: 'error', handler: (error: Error) => void): void
}

// TODO(roman, now): add unit tests for the new props

export type Options = Pick<ClientOptions, 'node' | 'auth' | 'cloud' | 'caFingerprint' | 'Connection' | 'ConnectionPool'> & {
  index?: Index

  type?: string

  /** @deprecated use `opType` instead */
  op_type?: OpType;
  opType?: OpType;

  /** @deprecated use `flushBytes` instead */
  'flush-bytes'?: number | undefined
  flushBytes?: number | undefined

  /** @deprecated use `flushInterval` instead */
  'flush-interval'?: number | undefined
  flushInterval?: number | undefined

  /** @deprecated use `esVersion` instead */
  'es-version'?: number | undefined
  esVersion?: number | undefined

  rejectUnauthorized?: boolean
}

export type Index = string | `${string | ''}%{DATE}${string | ''}` | ((logTime: string) => string)

export type OpType = 'create' | 'index'
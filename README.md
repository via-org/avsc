# avsc

A via-specific pure JavaScript implementation of the [Avro specification](https://avro.apache.org/docs/current/spec.html). Used for [bundling data](https://github.com/joshbenaron/arweave-standards/blob/ans104/ans/ANS-104.md).

## Features

- Isomorphic: no reliance on node built-ins

## Installation

```bash
$ npm install @via-org/avsc
# or
$ yarn add @via-org/avsc
```

## Example

```js
import { createSchema } from '@via-org/avsc'

const tagParser = createSchema({
  type: 'record',
  name: 'Tag',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'value', type: 'string' },
  ],
})

export const tagsParser = createSchema({
  type: 'array',
  items: tagParser,
})

// Encode
const tags = [{ name: 'Tag-Name', value: 'Tag-Value' }]
const encodedTags = tagsParser.toBuffer(tags) // encodedTags instanceof Uint8Array

// Decode
const decodedTags = tagsParser.fromBuffer(encodedTags) // decodedTags === tags
```

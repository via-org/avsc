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
import { createType } from '@via-org/avsc'

export const Tags = createType({
  type: 'array',
  items: createType({
    type: 'record',
    name: 'Tag',
    fields: [
      { name: 'name', type: 'string' },
      { name: 'value', type: 'string' },
    ],
  }),
})

// Encode
const tags = [{ name: 'Tag-Name', value: 'Tag-Value' }]
const encodedTags = Tags.toBuffer(tags) // encodedTags instanceof Uint8Array

// Decode
const decodedTags = Tags.fromBuffer(encodedTags) // decodedTags === tags
```

# avsc

An stripped-down Avro implementation. Used for [bundling data](https://github.com/joshbenaron/arweave-standards/blob/ans104/ans/ANS-104.md).

## Features

- Isomorphic: no reliance on node built-ins

## Installation

```bash
$ npm install @hbauer/avsc
# or
$ yarn add @hbauer/avsc
```

## Example

```js
// Initialize a schema:
import { createSchema } from '@hbauer/avro'

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
const decodedTags = tagsParser.fromBuffer(Uint8ArrayBuffer) // decodedTags === tags
```

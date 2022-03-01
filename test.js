import test from 'ava'

import { createType } from './src/index.js'

test.before(t => {
  t.context.Tags = createType({
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
  t.context.sampleTags = [
    { name: 'App-Name', value: 'BUIDL' },
    { name: 'App-Version', value: '0.0.0' },
  ]
})

test('Once created, a schema should encode an object to a Uint8Array', t => {
  const { Tags, sampleTags } = t.context

  const encoded = Tags.toBuffer(sampleTags)

  t.true(encoded instanceof Uint8Array)
})

test('Once created, a schema should decode a buffer to an object', t => {
  const { Tags, sampleTags } = t.context

  const encoded = Tags.toBuffer(sampleTags)
  const decoded = Tags.fromBuffer(encoded)

  t.true(decoded instanceof Object)
})

test('Once created, a schema should decode an encoded object back to the same value', t => {
  const { Tags, sampleTags } = t.context

  const encoded = Tags.toBuffer(sampleTags)
  const decoded = Tags.fromBuffer(encoded)

  t.true(
    sampleTags.every(
      ({ name, value }, i) =>
        name === decoded[i].name && value === decoded[i].value
    )
  )
})

test('Once created, a schema should detect when an invalid object is supplied', t => {
  const { tagsParser } = t.context

  const invalidTags = [{ name: 'Invalid', value: true }]

  t.throws(() => tagsParser.isValid(invalidTags))
})

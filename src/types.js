// @ts-nocheck

import { Tap, impliedNamespace } from './utils.js'

// Encoding tap (shared for performance).
// const TAP = new Tap(new buffer.SlowBuffer(1024))
const TAP = new Tap(new Uint8Array(1024))

/**
 * "Abstract" base Avro type.
 *
 * This class' constructor will register any named types to support recursive
 * schemas. All type values are represented in memory similarly to their JSON
 * representation, except for:
 *
 * + `bytes` and `fixed` which are represented as `Buffer`s.
 * + `union`s which will be "unwrapped" unless the `wrapUnions` option is set.
 *
 *  See individual subclasses for details.
 */
const Type = function () {}

Type.forSchema = (schema, opts = {}) => {
  opts.registry = opts.registry || {}

  if (Type.isType(schema)) {
    return schema
  }

  if (typeof schema == 'string') {
    return (opts.registry[schema] = Type.forSchema({ type: schema }, opts))
  }

  return new TYPES[schema.type](schema, opts)
}

Type.isType = function (/* any, [prefix] ... */) {
  let argsLength = arguments.length

  const any = arguments[0]
  if (!any || typeof any._update != 'function') {
    return false
  }

  if (argsLength === 1) {
    return true
  }

  const typeName = any.typeName
  for (let i = 1; i < argsLength; i++) {
    if (typeName.indexOf(arguments[i]) === 0) {
      return true
    }
  }
  return false
}

Object.defineProperty(Type.prototype, 'branchName', {
  enumerable: true,
  get() {
    var type = Type.isType(this, 'logical') ? this.underlyingType : this
    return Type.isType(type, 'union') ? undefined : type.typeName
  },
})

Type.prototype.fromBuffer = function (buf, resolver, noCheck) {
  const tap = new Tap(buf)
  const val = readValue(this, tap, resolver, noCheck)
  if (!tap.isValid()) {
    throw new Error('truncated buffer')
  }
  if (!noCheck && tap.pos < buf.length) {
    throw new Error('trailing data')
  }
  return val
}

Type.prototype.schema = function (opts) {
  // Copy the options to avoid mutating the original options object when we add
  // the registry of dereferenced types.
  return this._attrs({
    exportAttrs: !!(opts && opts.exportAttrs),
    noDeref: !!(opts && opts.noDeref),
  })
}

Type.prototype.toBuffer = function (val) {
  TAP.pos = 0
  this._write(TAP, val)
  return Uint8Array.from(TAP.buf.slice(0, TAP.pos))
}

Type.prototype._attrs = function (opts) {
  let schema = {}
  var derefedSchema = this._deref(schema, opts)
  if (derefedSchema !== undefined) {
    schema = derefedSchema
  }
  return schema
}

/**
 * Base primitive Avro type.
 *
 * Most of the primitive types share the same cloning and resolution
 * mechanisms, provided by this class. This class also lets us conveniently
 * check whether a type is a primitive using `instanceof`.
 */
class PrimitiveType extends Type {
  constructor() {
    super()
  }
  _deref() {
    return this.typeName
  }
}

/** Strings. */
class StringType extends PrimitiveType {
  _read(tap) {
    return tap.readString()
  }
  _write(tap, val) {
    if (typeof val != 'string') {
      throwInvalidError(val, this)
    }
    tap.writeString(val)
  }

  get typeName() {
    return 'string'
  }
}

/** Avro array. Represented as vanilla arrays. */
class ArrayType extends Type {
  constructor(schema, opts) {
    super()

    this.itemsType = Type.forSchema(schema.items, opts)
    Object.freeze(this)
  }

  _read(tap) {
    const items = this.itemsType
    let i = 0
    let val, n
    while ((n = tap.readLong())) {
      val = val || new Array(n)
      while (n--) {
        val[i++] = items._read(tap)
      }
    }
    return val
  }

  _write(tap, val) {
    const items = this.itemsType
    const n = val.length
    if (n) {
      tap.writeLong(n)
      for (let i = 0; i < n; i++) {
        items._write(tap, val[i])
      }
    }
    tap.writeLong(0)
  }
}

/**
 * Avro record.
 *
 * Values are represented as instances of a programmatically generated
 * constructor (similar to a "specific record"), available via the
 * `getRecordConstructor` method. This "specific record class" gives
 * significant speedups over using generics objects.
 *
 * Note that vanilla objects are still accepted as valid as long as their
 * fields match (this makes it much more convenient to do simple things like
 * update nested records).
 *
 * This type is also used for errors (similar, except for the extra `Error`
 * constructor call) and for messages (see comment below).
 */
class RecordType extends Type {
  constructor(schema, opts) {
    super()

    // Save the namespace to restore it as we leave this record's scope.
    const namespace = opts.namespace
    const ns = impliedNamespace(schema.name)

    if (ns !== undefined) {
      opts.namespace = ns
    }

    Type.call(this, schema, opts)

    this._fieldsByName = {}
    this.fields = Object.freeze(
      schema.fields.map(function (f) {
        const field = new Field(f, opts)
        this._fieldsByName[field.name] = field
        return field
      }, this)
    )

    this.recordConstructor = this._createConstructor(
      opts.errorStackTraces,
      opts.omitRecordMethods
    )

    this._read = this._createReader()
    this._write = this._createWriter()

    opts.namespace = namespace
    Object.freeze(this)
  }

  _getConstructorName() {
    return 'Record$'
  }

  _createConstructor() {
    const outerArgs = []
    const innerArgs = []
    let innerBody = ''
    let field, name
    for (let i = 0, l = this.fields.length; i < l; i++) {
      field = this.fields[i]
      name = field.name
      innerArgs.push('v' + i)
      innerBody += 'this.' + name + ' = v' + i + ';\n'
    }
    let outerBody = 'return function ' + this._getConstructorName() + '('
    outerBody += innerArgs.join() + ') {\n' + innerBody + '};'
    return new Function(outerArgs.join(), outerBody).apply(undefined, [])
  }

  _createReader() {
    const names = []
    const values = [this.recordConstructor]
    for (let i = 0, l = this.fields.length; i < l; i++) {
      names.push('t' + i)
      values.push(this.fields[i].type)
    }
    const name = this._getConstructorName()
    let body = 'return function read' + name + '(t) {\n'
    body += '  return new ' + name + '(\n    '
    body += names.map(s => s + '._read(t)').join(',\n    ')
    body += '\n  );\n};'
    names.unshift(name)
    return new Function(names.join(), body).apply(undefined, values)
  }

  _createWriter() {
    const args = []
    const name = this._getConstructorName()
    let body = 'return function write' + name + '(t, v) {\n'
    const values = []
    var field
    for (let i = 0, l = this.fields.length; i < l; i++) {
      field = this.fields[i]
      args.push('t' + i)
      values.push(field.type)
      body += '  '
      body += 't' + i + '._write(t, v.' + field.name + ');\n'
    }
    body += '}'
    return new Function(args.join(), body).apply(undefined, values)
  }

  _update() {}
}

// General helpers.

/** A record field. */
function Field(schema, opts) {
  this.name = schema.name
  this.type = Type.forSchema(schema.type, opts)
  Object.freeze(this)
}

/**
 * Read a value from a tap.
 */
const readValue = (type, tap) => type._read(tap)

function throwInvalidError(val, type) {
  throw new Error(`invalid "${type.schema()}": ${val}`)
}

const TYPES = {
  array: ArrayType,
  record: RecordType,
  string: StringType,
}

export const createSchema = Type.forSchema

/**
 * Return the namespace implied by a name.
 * @param {string} name Full or short name. If short, the returned
 *  namespace will be empty.
 */
const impliedNamespace = name => {
  const match = /^(.*)\.[^.]+$/.exec(name)
  return match ? match[1] : undefined
}

class Tap {
  /**
   * A tap is a buffer which remembers what has been already read. It is
   * optimized for performance, at the cost of failing silently when
   * overflowing the buffer. This is a purposeful trade-off given the
   * expected rarity of this case and the large performance hit
   * necessary to enforce validity. See `isValid` below for more
   * information.
   * @param {Uint8Array} buf
   * @param {number} pos
   */
  constructor(buf, pos) {
    this.buf = buf
    this.pos = pos | 0
    if (this.pos < 0) {
      throw new Error('negative offset')
    }
  }

  isValid() {
    return this.pos <= this.buf.length
  }

  readInt() {
    return this.readLong()
  }

  readLong() {
    let n = 0
    let k = 0
    const buf = this.buf
    let b, h

    do {
      b = buf[this.pos++]
      h = b & 0x80
      n |= (b & 0x7f) << k
      k += 7
    } while (h && k < 28)

    return (n >> 1) ^ -(n & 1)
  }

  /** @param {number} n */
  writeInt(n) {
    return this.writeLong(n)
  }

  /** @param {number} n */
  writeLong(n) {
    const buf = this.buf

    let m = n >= 0 ? n << 1 : (~n << 1) | 1
    do {
      buf[this.pos] = m & 0x7f
      m >>= 7
    } while (m && (buf[this.pos++] |= 0x80))

    this.pos++
  }

  readString() {
    const len = this.readLong()
    const pos = this.pos
    this.pos += len
    const u8 = new Uint8Array(this.buf).slice(pos, pos + len)
    return new TextDecoder().decode(u8)
  }

  /** @param {string} s */
  writeString(s) {
    const len = new TextEncoder().encode(s).byteLength
    const buf = this.buf
    this.writeLong(len)
    let pos = this.pos
    this.pos += len

    for (let i = 0, l = len, c; i < l; i++) {
      c = s.charCodeAt(i)
      buf[pos++] = c
    }
  }
}

export { impliedNamespace, Tap }

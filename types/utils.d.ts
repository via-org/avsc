/**
 * Return the namespace implied by a name.
 * @param {string} name Full or short name. If short, the returned
 *  namespace will be empty.
 */
export function impliedNamespace(name: string): string
export class Tap {
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
  constructor(buf: Uint8Array, pos: number)
  buf: Uint8Array
  pos: number
  isValid(): boolean
  readInt(): number
  readLong(): number
  /** @param {number} n */
  writeInt(n: number): void
  /** @param {number} n */
  writeLong(n: number): void
  readString(): string
  /** @param {string} s */
  writeString(s: string): void
}

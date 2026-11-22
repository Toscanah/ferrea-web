// Writes the PNG icons from the Iron rise glyph, with no image library: the glyph is a hexagon with a
// chevron cut out, rasterised with 3x3 supersampling and encoded as PNG with zlib.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const hex = [[54, 24], [80, 39], [80, 69], [54, 84], [28, 69], [28, 39]]
const chevron = [[41.92, 65.74], [54, 52.85], [66.08, 65.74], [71.92, 60.26], [54, 41.15], [36.08, 60.26]]
const INK = [0x2a, 0x2a, 0x2a]
const PAPER = [0xf4, 0xf4, 0xf2]

function inside(poly, x, y) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// scale: how much of the 72-unit canvas the glyph fills (1 = as drawn, smaller leaves a safe margin).
function png(size, scale) {
  const rows = []
  const ss = 3
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let px = 0; px < size; px++) {
      let hits = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          // Map the pixel into the glyph's 18..90 coordinate space, scaled around the centre (54, 54).
          const u = 18 + ((px + (sx + 0.5) / ss) / size) * 72
          const v = 18 + ((py + (sy + 0.5) / ss) / size) * 72
          const x = 54 + (u - 54) / scale
          const y = 54 + (v - 54) / scale
          if (inside(hex, x, y) && !inside(chevron, x, y)) hits++
        }
      }
      const t = hits / (ss * ss)
      for (let k = 0; k < 3; k++) row[1 + px * 3 + k] = Math.round(PAPER[k] + (INK[k] - PAPER[k]) * t)
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(join(out, 'icon-192.png'), png(192, 1))
writeFileSync(join(out, 'icon-512.png'), png(512, 1))
writeFileSync(join(out, 'icon-maskable-512.png'), png(512, 0.78))
writeFileSync(join(out, 'apple-touch-icon.png'), png(180, 0.9))
console.log('icons written to', out)

// The PNG decoder must give back the exact bytes the pipeline wrote (no colour management, no premultiply).
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodePng } from "@/lib/data/png";

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  // CRC is not checked by the decoder; zeros keep the helper small.
  return Buffer.concat([len, Buffer.from(type), data, Buffer.alloc(4)]);
}

/** Encode RGBA pixels, using the given filter type on each row (0 None, 1 Sub, 2 Up, 3 Average, 4 Paeth). */
function encode(width: number, height: number, rgba: number[], filters: number[]): Uint8Array {
  const bpp = 4;
  const stride = width * bpp;
  const raw = Buffer.alloc((stride + 1) * height);
  const px = (y: number, i: number) => (y < 0 || i < 0 ? 0 : rgba[y * stride + i]);
  for (let y = 0; y < height; y++) {
    const f = filters[y % filters.length];
    raw[y * (stride + 1)] = f;
    for (let i = 0; i < stride; i++) {
      const x = px(y, i), a = px(y, i - bpp), b = px(y - 1, i), c = px(y - 1, i - bpp);
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 3) pred = Math.floor((a + b) / 2);
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      raw[y * (stride + 1) + 1 + i] = (x - pred) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const z = deflateSync(raw);
  // Split IDAT in two to check the decoder joins chunks.
  const half = Math.floor(z.length / 2);
  return new Uint8Array(Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", z.subarray(0, half)),
    chunk("IDAT", z.subarray(half)),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

describe("decodePng", () => {
  const width = 5, height = 6;
  const rgba = Array.from({ length: width * height * 4 }, (_, i) => (i * 37 + (i >> 3) * 11) & 255);

  it("decodes every filter type to the exact bytes", async () => {
    const png = await decodePng(encode(width, height, rgba, [0, 1, 2, 3, 4]));
    expect(png.width).toBe(width);
    expect(png.height).toBe(height);
    expect(Array.from(png.rgba)).toEqual(rgba);
  });

  it("rejects bytes that are not a PNG", async () => {
    await expect(decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).rejects.toThrow(/not a PNG/);
  });
});

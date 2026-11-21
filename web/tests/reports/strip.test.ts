// Photo metadata stripping on hand-built JPEG and PNG byte arrays.
import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, PhotoError, stripMetadata } from "@/lib/reports/strip";

// ---------- JPEG helpers ----------

/** A marker segment: FF <marker> <length hi> <length lo> <payload>. Length counts itself plus the payload. */
function seg(marker: number, payload: number[]): number[] {
  const len = payload.length + 2;
  return [0xff, marker, len >> 8, len & 0xff, ...payload];
}
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
const APP0 = seg(0xe0, [...ascii("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const APP1_EXIF = seg(0xe1, [...ascii("Exif"), 0, 0, ...ascii("GPS 28.05N 82.41W")]);
const APP1_XMP = seg(0xe1, [...ascii("http://ns.adobe.com/xap/1.0/"), 0, ...ascii("<x:xmpmeta/>")]);
const APP13 = seg(0xed, [...ascii("Photoshop 3.0"), 0, 1, 2, 3]);
const APP2 = seg(0xe2, [...ascii("ICC_PROFILE"), 0, 9, 9]);
const DQT = seg(0xdb, [0, ...new Array<number>(64).fill(1)]);
const SOF0 = seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
// Scan header, then entropy-coded data containing a stuffed FF 00 and a restart marker.
const SOS = seg(0xda, [1, 1, 0, 0, 63, 0]);
const SCAN = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56];

const jpeg = (...parts: number[][]) => new Uint8Array(parts.flat());

describe("stripMetadata: JPEG", () => {
  it("drops APP1 (EXIF and XMP) and APP13 and keeps every other byte in order", () => {
    const input = jpeg(SOI, APP0, APP1_EXIF, APP1_XMP, APP13, APP2, DQT, SOF0, SOS, SCAN, EOI);
    const out = stripMetadata(input);
    expect(out.mimeType).toBe("image/jpeg");
    expect(out.ext).toBe("jpg");
    expect([...out.bytes]).toEqual([...jpeg(SOI, APP0, APP2, DQT, SOF0, SOS, SCAN, EOI)]);
  });

  it("leaves a JPEG without metadata unchanged", () => {
    const input = jpeg(SOI, APP0, DQT, SOF0, SOS, SCAN, EOI);
    expect([...stripMetadata(input).bytes]).toEqual([...input]);
  });

  it("skips fill bytes before a marker", () => {
    const input = jpeg(SOI, [0xff, 0xff], APP1_EXIF, DQT, SOS, SCAN, EOI);
    expect([...stripMetadata(input).bytes]).toEqual([...jpeg(SOI, DQT, SOS, SCAN, EOI)]);
  });

  it("rejects a JPEG whose segment runs past the end", () => {
    const input = jpeg(SOI, [0xff, 0xe1, 0x10, 0x00, 1, 2, 3]);
    expect(() => stripMetadata(input)).toThrow(PhotoError);
  });

  it("rejects a JPEG with no image scan", () => {
    const input = jpeg(SOI, APP0, DQT, EOI);
    expect(() => stripMetadata(input)).toThrow(PhotoError);
  });
});

// ---------- PNG helpers ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: number[]): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
function chunk(type: string, data: number[]): number[] {
  const typed = [...ascii(type), ...data];
  return [...u32(data.length), ...typed, ...u32(crc32(typed))];
}

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const IHDR = chunk("IHDR", [...u32(1), ...u32(1), 8, 2, 0, 0, 0]);
const SRGB = chunk("sRGB", [0]);
const TEXT = chunk("tEXt", [...ascii("Author"), 0, ...ascii("someone")]);
const ITXT = chunk("iTXt", [...ascii("XML:com.adobe.xmp"), 0, 0, 0, 0, 0, ...ascii("<x/>")]);
const ZTXT = chunk("zTXt", [...ascii("Comment"), 0, 0, 0x78, 0x9c]);
const EXIF = chunk("eXIf", [0x4d, 0x4d, 0, 42]);
const IDAT = chunk("IDAT", [0x78, 0x9c, 0x63, 0x60, 0, 0, 0, 2, 0, 1]);
const IEND = chunk("IEND", []);

const png = (...parts: number[][]) => new Uint8Array(parts.flat());

describe("stripMetadata: PNG", () => {
  it("drops eXIf, tEXt, iTXt and zTXt and keeps the other chunks byte for byte", () => {
    const input = png(SIG, IHDR, SRGB, TEXT, ITXT, EXIF, IDAT, ZTXT, IEND);
    const out = stripMetadata(input);
    expect(out.mimeType).toBe("image/png");
    expect(out.ext).toBe("png");
    expect([...out.bytes]).toEqual([...png(SIG, IHDR, SRGB, IDAT, IEND)]);
  });

  it("drops anything after IEND", () => {
    const input = png(SIG, IHDR, IDAT, IEND, [1, 2, 3, 4]);
    expect([...stripMetadata(input).bytes]).toEqual([...png(SIG, IHDR, IDAT, IEND)]);
  });

  it("rejects a PNG whose chunk runs past the end", () => {
    const input = png(SIG, IHDR, [0, 0, 1, 0, ...ascii("IDAT"), 1, 2]);
    expect(() => stripMetadata(input)).toThrow(PhotoError);
  });

  it("rejects a PNG with no IEND", () => {
    expect(() => stripMetadata(png(SIG, IHDR, IDAT))).toThrow(PhotoError);
  });
});

describe("stripMetadata: other input", () => {
  it("rejects other types with 415", () => {
    const gif = new Uint8Array([...ascii("GIF89a"), 0, 0]);
    const heic = new Uint8Array([0, 0, 0, 24, ...ascii("ftypheic"), 0, 0, 0, 0]);
    for (const bytes of [gif, heic, new Uint8Array(0)]) {
      try {
        stripMetadata(bytes);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(PhotoError);
        expect((err as PhotoError).status).toBe(415);
      }
    }
  });

  it("rejects more than 10 MB with 413", () => {
    expect(MAX_PHOTO_BYTES).toBe(10 * 1024 * 1024);
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set(SOI);
    try {
      stripMetadata(big);
      expect.unreachable();
    } catch (err) {
      expect((err as PhotoError).status).toBe(413);
    }
  });
});

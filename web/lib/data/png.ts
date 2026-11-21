// A small PNG decoder that runs the same in the browser and in node (vitest).
// It uses DecompressionStream for the zlib data, so no canvas is involved: canvas decoding can apply colour
// management or premultiplied alpha, which would corrupt the packed height and bowl-id values.
// Supports 8-bit, non-interlaced greyscale, grey+alpha, RGB and RGBA; always returns RGBA.

export interface DecodedPng {
  width: number;
  height: number;
  /** width * height * 4 bytes, row-major, top row first */
  rgba: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

async function inflate(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export async function decodePng(bytes: Uint8Array, name = "PNG"): Promise<DecodedPng> {
  if (bytes.length < 8 || SIGNATURE.some((v, i) => bytes[i] !== v)) throw new Error(`${name}: not a PNG file`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      bitDepth = bytes[pos + 16];
      colorType = bytes[pos + 17];
      interlace = bytes[pos + 20];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = CHANNELS[colorType];
  if (!width || !height || channels === undefined) throw new Error(`${name}: missing or unsupported IHDR (colour type ${colorType})`);
  if (bitDepth !== 8) throw new Error(`${name}: bit depth ${bitDepth} is not supported (need 8)`);
  if (interlace !== 0) throw new Error(`${name}: interlaced PNGs are not supported`);

  const total = idat.reduce((s, c) => s + c.length, 0);
  const joined = new Uint8Array(new ArrayBuffer(total));
  let off = 0;
  for (const c of idat) {
    joined.set(c, off);
    off += c.length;
  }
  const raw = await inflate(joined);
  const stride = width * channels;
  if (raw.length < (stride + 1) * height) throw new Error(`${name}: image data is shorter than ${width} x ${height}`);

  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? px[row + i - channels] : 0;
      const b = y > 0 ? px[row - stride + i] : 0;
      const c = i >= channels && y > 0 ? px[row - stride + i - channels] : 0;
      let pred: number;
      if (filter === 0) pred = 0;
      else if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) pred = paeth(a, b, c);
      else throw new Error(`${name}: unknown filter type ${filter} on row ${y}`);
      px[row + i] = (raw[src + i] + pred) & 255;
    }
  }
  if (channels === 4) return { width, height, rgba: px };

  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const s = p * channels, d = p * 4;
    if (channels === 3) {
      rgba[d] = px[s]; rgba[d + 1] = px[s + 1]; rgba[d + 2] = px[s + 2]; rgba[d + 3] = 255;
    } else {
      const g = px[s];
      rgba[d] = g; rgba[d + 1] = g; rgba[d + 2] = g; rgba[d + 3] = channels === 2 ? px[s + 1] : 255;
    }
  }
  return { width, height, rgba };
}

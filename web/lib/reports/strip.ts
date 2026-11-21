// Server only. Removes embedded metadata (GPS position, camera, author) from report photos before they
// are stored or shown to Gemini. No image library: JPEG marker segments and PNG chunks are copied or dropped.
//   JPEG: drops APP1 (EXIF, XMP) and APP13 (Photoshop/IPTC); everything else is copied as is.
//   PNG:  drops eXIf, tEXt, iTXt and zTXt chunks; everything else is copied with its original CRC.
// Anything else is refused with 415, over 10 MB with 413, a broken file with 400.

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(
    readonly status: 400 | 413 | 415,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PhotoError";
  }
}

export interface CleanPhoto {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
  ext: "jpg" | "png";
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt"]);
const JPEG_DROP = new Set([0xe1, 0xed]); // APP1, APP13

const broken = (what: string) => new PhotoError(400, "bad_photo", `The photo is not a valid ${what} file`);

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function stripJpeg(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let pos = 2;
  while (pos < b.length) {
    if (b[pos] !== 0xff) throw broken("JPEG");
    // Any number of 0xFF fill bytes may come before a marker.
    while (pos < b.length && b[pos] === 0xff) pos++;
    if (pos >= b.length) throw broken("JPEG");
    const marker = b[pos];
    pos++;
    if (marker === 0xd9) throw broken("JPEG"); // end of image before any scan
    // Markers without a length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(new Uint8Array([0xff, marker]));
      continue;
    }
    if (pos + 2 > b.length) throw broken("JPEG");
    const len = (b[pos] << 8) | b[pos + 1];
    if (len < 2 || pos + len > b.length) throw broken("JPEG");
    const end = pos + len;
    if (marker === 0xda) {
      // Start of scan: the header and the compressed data follow, up to the end-of-image marker.
      // Inside compressed data 0xFF is always followed by 0x00 or a restart marker, so the first
      // FF D9 is the real end. Anything after it (vendor trailers) is dropped.
      let eoi = -1;
      for (let i = end; i + 1 < b.length; i++) {
        if (b[i] === 0xff && b[i + 1] === 0xd9) {
          eoi = i + 2;
          break;
        }
      }
      parts.push(new Uint8Array([0xff, marker]), b.subarray(pos, eoi === -1 ? b.length : eoi));
      return concat(parts);
    }
    if (!JPEG_DROP.has(marker)) parts.push(new Uint8Array([0xff, marker]), b.subarray(pos, end));
    pos = end;
  }
  throw broken("JPEG");
}

function stripPng(b: Uint8Array): Uint8Array {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let pos = 8;
  while (pos + 12 <= b.length) {
    const len = view.getUint32(pos);
    const end = pos + 12 + len;
    if (end > b.length) throw broken("PNG");
    const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
    if (!PNG_DROP.has(type)) parts.push(b.subarray(pos, end));
    pos = end;
    if (type === "IEND") return concat(parts);
  }
  throw broken("PNG");
}

/** Detects the type from the bytes themselves (never the declared type) and strips its metadata. */
export function stripMetadata(bytes: Uint8Array): CleanPhoto {
  if (bytes.length > MAX_PHOTO_BYTES) throw new PhotoError(413, "too_large", "The photo is larger than 10 MB");
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { bytes: stripJpeg(bytes), mimeType: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length >= 8 && PNG_SIGNATURE.every((v, i) => bytes[i] === v)) {
    return { bytes: stripPng(bytes), mimeType: "image/png", ext: "png" };
  }
  throw new PhotoError(415, "unsupported_type", "The photo must be a JPEG or PNG (convert HEIC to JPEG first)");
}

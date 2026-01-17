import read from "exif-reader";

export function parseExif(data: ArrayBufferLike | Buffer) {
  return read(Buffer.isBuffer(data) ? data : Buffer.from(data));
}

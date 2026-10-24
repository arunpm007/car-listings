import { describe, expect, it } from "vitest";
import { stripJpegMetadata } from "../jpeg";

const segment = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
const SOI = [0xff, 0xd8];
const JFIF = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]);
const EXIF = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3, 4]);
const COMMENT = segment(0xfe, [0x68, 0x69]);
const QUANT = segment(0xdb, [0, 1, 2]);
const SCAN = [0xff, 0xda, 0, 2, 9, 9, 9, 0xff, 0xd9];

describe("stripJpegMetadata", () => {
  it("drops EXIF and comments, keeps the picture", () => {
    const input = new Uint8Array([...SOI, ...JFIF, ...EXIF, ...COMMENT, ...QUANT, ...SCAN]);
    expect(Array.from(stripJpegMetadata(input)!)).toEqual([...SOI, ...JFIF, ...QUANT, ...SCAN]);
  });

  it("leaves a clean JPEG as it is", () => {
    const input = new Uint8Array([...SOI, ...JFIF, ...QUANT, ...SCAN]);
    expect(Array.from(stripJpegMetadata(input)!)).toEqual(Array.from(input));
  });

  it("rejects things that aren't JPEGs", () => {
    expect(stripJpegMetadata(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(stripJpegMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    // Header that claims more bytes than there are.
    expect(stripJpegMetadata(new Uint8Array([...SOI, 0xff, 0xe1, 0xff, 0xff, 1]))).toBeNull();
  });
});

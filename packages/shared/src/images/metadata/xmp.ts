import { XMLParser } from 'fast-xml-parser';
import { wrapArray } from '../../utilities.js';

export function parseXmp(buffer: ArrayBufferLike | string) {
  const decoder = new TextDecoder('utf-8');
  const text =
    buffer instanceof ArrayBuffer
      ? decoder.decode(buffer)
      : buffer instanceof SharedArrayBuffer
        ? decoder.decode(new Uint8Array(buffer))
        : buffer;

  const parser = new XMLParser({
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    attributeValueProcessor: (name, val) =>
      isValidTagProcessor(name) ? tagProcessors[name](val) : val,
  });
  const document = parser.parse(text) as Record<string, any>;

  return Object.entries(
    document?.['x:xmpmeta']?.['rdf:RDF']?.['rdf:Description'] ?? {},
  )
    .filter(([key]) => key.startsWith('dc:') || key.startsWith('@_'))
    .map(([key, value]) => {
      if (key.startsWith('@_')) {
        return [key.slice(2), value] as const;
      }

      if (typeof value === 'object' && value !== null) {
        value = extractTextContent(value);
      }

      return [key, value] as const;
    })
    .filter((entry): entry is readonly [XmpNamespaceName, XmpPropertyValue] =>
      isValidNamespace(entry[0].split(':', 1)?.at(0)),
    )
    .reduce<XmpMetadata>((acc, [key, value]) => {
      const [namespace, property] = key.split(':', 2) as [
        XmpNamespaceName,
        string,
      ];

      if (!acc[namespace]) {
        acc[namespace] = {};
      }

      if (property in acc[namespace]) {
        const existingValues = wrapArray(acc[namespace][property]);
        const values = wrapArray(value);
        acc[namespace][property] = [...existingValues, ...values];
      } else {
        acc[namespace][property] = value;
      }

      return acc;
    }, {});
}

const namespaces = [
  'dc',
  'exif',
  'exifEX',
  'tiff',
  'xmp',
  'pdf',
  'photoshop',
] satisfies XmpNamespaceName[];

function isValidNamespace(
  name: string | XmpNamespaceName | undefined,
): name is XmpNamespaceName {
  return namespaces.includes(name as XmpNamespaceName);
}

const tagProcessors = {
  'dc:Date': parseDate,
  'exif:ApertureValue': parseRational,
  'exif:BrightnessValue': parseRational,
  'exif:CompressedBitsPerPixel': parseRational,
  'exif:DateTimeOriginal': parseDate,
  'exif:DigitalZoomRatio': parseRational,
  'exif:ExposureBiasValue': parseRational,
  'exif:ExposureIndex': parseRational,
  'exif:ExposureTime': parseRational,
  'exif:Fired': parseBoolean,
  'exif:FlashEnergy': parseRational,
  'exif:FNumber': parseRational,
  'exif:FocalLength': parseRational,
  'exif:FocalPlaneXResolution': parseRational,
  'exif:FocalPlaneYResolution': parseRational,
  'exif:Function': parseBoolean,
  'exif:GPSAltitude': parseRational,
  'exif:GPSDestBearing': parseRational,
  'exif:GPSDestDistance': parseRational,
  'exif:GPSDestLatitude': parseGPSCoordinate,
  'exif:GPSDestLongitude': parseGPSCoordinate,
  'exif:GPSDOP': parseRational,
  'exif:GPSImgDirection': parseRational,
  'exif:GPSLatitude': parseGPSCoordinate,
  'exif:GPSLongitude': parseGPSCoordinate,
  'exif:GPSSpeed': parseRational,
  'exif:GPSTimeStamp': parseDate,
  'exif:GPSTrack': parseRational,
  'exif:MaxApertureValue': parseRational,
  'exif:RedEyeMode': parseBoolean,
  'exif:ShutterSpeedValue': parseRational,
  'exif:SubjectDistance': parseRational,
  'exifEX:Gamma': parseRational,
  'exifEX:GPSHPositioningError': parseRational,
  'exifEX:LensSpecification': parseRational,
  'pdf:Trapped': parseBoolean,
  'tiff:DateTime': parseDate,
  'tiff:PrimaryChromaticities': parseRational,
  'tiff:ReferenceBlackWhite': parseRational,
  'tiff:WhitePoint': parseRational,
  'tiff:XResolution': parseRational,
  'tiff:YCbCrCoefficients': parseRational,
  'tiff:YResolution': parseRational,
  'xmp:CreateDate': parseDate,
  'xmp:MetadataDate': parseDate,
  'xmp:ModifyDate': parseDate,
};

function isValidTagProcessor(name: string): name is keyof typeof tagProcessors {
  return name in tagProcessors;
}

function extractTextContent(node: Record<string, any>): string {
  if (Array.isArray(node)) {
    return node.map((item) => item['#text'] ?? item).join(' ');
  }

  if (typeof node === 'object') {
    return Object.values(node)
      .map((item) =>
        typeof item === 'string' ? item : extractTextContent(item),
      )
      .join(' ');
  }

  return node;
}

function parseDate(value: string) {
  if (value.charAt(10) === 'T') {
    return new Date(value);
  }

  return new Date(value.replace(/^(\d{4}):(\d\d):(\d\d) /, '$1-$2-$3T'));
}

function parseBoolean(value: string) {
  return value.toLowerCase() === 'true';
}

function parseRational(value: string) {
  const p = value.indexOf('/');

  if (p === -1) {
    return NaN;
  }

  return Number(value.slice(0, p)) / Number(value.slice(p + 1));
}

function parseGPSCoordinate(value: string) {
  let coordinate = value.match(/^(\d+),(\d+)[,.](\d+)([NSWE])$/);

  if (coordinate !== null) {
    // from text content
    const [, a, b, c, d] = coordinate;
    const deg = Number(a) + Number(b) / 60 + Number(c) / 3600;

    return d === 'S' || d === 'W' ? -deg : deg;
  }

  coordinate = value.match(/^(-?\d+)\/(\d+) (-?\d+)\/(\d+) (-?\d+)\/(\d+)$/);

  if (coordinate === null) {
    throw new Error(`Invalid GPS Coordinate: ${value}`);
  }

  // from attribute value
  const [, a, b, c, d, e, f] = coordinate;

  return (
    Number(a) / Number(b) +
    Number(c) / Number(d) / 60 +
    Number(e) / Number(f) / 3600
  );
}

type XmpBasePropertyValue = string | number | boolean | Date;
type XmpPropertyValue = XmpBasePropertyValue | XmpBasePropertyValue[];
type XmpNamespaceName =
  | 'dc'
  | 'exif'
  | 'exifEX'
  | 'tiff'
  | 'xmp'
  | 'pdf'
  | 'photoshop';
type XmpNamespace = Record<string, XmpPropertyValue | XmpPropertyValue[]>;
export type XmpMetadata = Partial<Record<XmpNamespaceName, XmpNamespace>>;

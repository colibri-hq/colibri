import {
  extended,
  type ExtendedHeader,
  index,
  mobi,
  type MobiHeader,
  palmDb,
  type PalmDbHeader,
  palmDoc,
} from "./parser.js";
import { resolveLocaleByTag } from "./locale.js";

function parseMetadata(
  buffer: Uint8Array<ArrayBufferLike>,
  mobiHeader: MobiHeader,
): ExtendedHeader | undefined {
  if (!mobiHeader.hasExtendedHeader) {
    return undefined;
  }

  const exthBuffer = buffer.slice(16 + mobiHeader.length);
  const { records } = extended.parse(exthBuffer);

  type ExtendedHeaderRecord<
    K extends keyof ExtendedHeader = keyof ExtendedHeader,
  > = {
    record: {
      field: K;
      value: ExtendedHeader[K] extends Array<infer T> ? T : ExtendedHeader[K];
    };
  };

  const metadata = (records as ExtendedHeaderRecord[])
    .map(({ record: { field, value } }) => [field, value] as const)
    .reduce((metadata, [field, value]) => {
      return {
        ...metadata,
        [field]:
          field in metadata
            ? Array.isArray(metadata[field])
              ? [...metadata[field], value]
              : [metadata[field], value]
            : value,
      };
    }, {} as ExtendedHeader);

  if (mobiHeader.locale) {
    metadata.locale = mobiHeader.locale;
  }

  if (metadata.locale && !metadata.language) {
    metadata.language = metadata.locale.tag;
  } else if (!metadata.locale && metadata.language) {
    const locale = resolveLocaleByTag(metadata.language);

    if (locale) {
      metadata.locale = locale;
    }
  }

  if (!metadata.locale && mobiHeader.inputLanguage) {
    metadata.locale = mobiHeader.inputLanguage;
    metadata.language = mobiHeader.inputLanguage.tag;
  }

  // If the metadata contains a UUID in the ASIN field, convert it to UUID format
  // and remove the ASIN field.
  if (metadata.asin && metadata.asin.length === 36) {
    metadata.uuid = metadata.asin;
    delete metadata.asin;
  }

  return metadata;
}

function parseIndexHeader(
  buffer: Uint8Array<ArrayBufferLike>,
  records: PalmDbHeader["recordInfoList"],
  mobiHeader: MobiHeader,
) {
  if (mobiHeader.firstIndexRecordNumber === undefined) {
    return undefined;
  }

  const indexRecord = records.at(mobiHeader.firstIndexRecordNumber);
  const indexBuffer = buffer.slice(indexRecord?.offset);

  if (!indexBuffer) {
    return undefined;
  }

  try {
    return index.parse(indexBuffer);
  } catch (error) {
    throw new Error(
      `Failed to parse index header: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

export async function parse(file: File) {
  const fileBuffer = await file.bytes();
  const {
    recordInfoList: [infoRecord, ...records],
    ...pdbHeader
  } = palmDb.parse(fileBuffer);

  const firstRecordBuffer = fileBuffer.slice(infoRecord.offset);
  const palmDocHeader = palmDoc.parse(firstRecordBuffer.slice(0, 16));
  const mobiHeader = mobi.parse(firstRecordBuffer.slice(16));
  const metadata = parseMetadata(firstRecordBuffer, mobiHeader);
  const indexHeader = parseIndexHeader(fileBuffer, records, mobiHeader);

  return {
    pdbHeader,
    palmDocHeader,
    mobiHeader,
    indexHeader,
    title: mobiHeader.fullName ?? pdbHeader.identifier,
    extraRecordDataFlags: mobiHeader.extraRecordDataFlags,
    ...metadata,
    get coverImage() {
      return extractCoverImage(fileBuffer, records, mobiHeader, metadata);
    },
  };
}

function extractCoverImage(
  buffer: Uint8Array<ArrayBufferLike>,
  records: PalmDbHeader["recordInfoList"],
  mobiHeader: MobiHeader,
  metadata: ExtendedHeader | undefined,
) {
  if (!mobiHeader.firstImageIndex || !metadata?.coverOffset) {
    return undefined;
  }

  const index = mobiHeader.firstImageIndex + metadata.coverOffset;
  const [record, nextRecord] = records.slice(index, index + 2);

  if (!record) {
    console.warn(`Cover image PDB record index ${index} is out of bounds.`);

    return undefined;
  }

  const startOffset = record.offset;
  const endOffset = nextRecord?.offset;

  return buffer.slice(startOffset, endOffset);
}

import { Parser } from "binary-parser";
import { type Locale, resolveLocaleById } from "./locale.js";

// region Helpers

/**
 * Parse a PDB timestamp
 *
 * The original PDB format used times counting in seconds from January 1st, 1904. This is the base
 * time used by the original macOS, and there were close links between Palm OS and macOS.
 * Using an unsigned 32-bit integer, this will overflow sometime in 2040.
 *
 * However, the PDB tool written for Perl says that the time should be counted from 1st January 1970
 * (the Unix base time) and uses a signed 32-bit integer which will overflow sometime in 2038.
 *
 * This conflict is unfortunate, but there's a simple way to sort out what's been done in a file you
 * are examining:
 *
 *  - If the time has the top bit set, it's an unsigned 32-bit number counting from 1st Jan 1904
 *  - If the time has the top bit clear, it's a signed 32-bit number counting from 1st Jan 1970.
 *
 * This can be stated this with some confidence, as otherwise the time would be before 1972 or
 * before 1970, depending on the interpretation, and the PDB format wasn't around then.
 *
 * For either system, overflow will occur in around 30 years of time. Hopefully by then everyone
 * will be on some properly documented eBook standard.
 *
 * @param timestamp The timestamp to parse, either as a string or a number.
 * @return A Date object representing the timestamp, or undefined if the timestamp is invalid.
 * @see https://wiki.mobileread.com/wiki/PDB#PDB_Times
 */
function parseTimestamp(timestamp: string | number) {
  if (typeof timestamp === "string") {
    timestamp = Number(timestamp);
  }

  if (!timestamp || isNaN(timestamp)) {
    return undefined;
  }

  // Force to unsigned 32-bit to mimic what you'd see in a binary file
  const uint32 = timestamp >>> 0;
  const isMacEpoch = (uint32 & 0x80_00_00_00) !== 0;

  const seconds = isMacEpoch
    ? uint32 // unsigned seconds since 1904
    : timestamp << 0; // force signed 32-bit integer

  const epoch = isMacEpoch
    ? Date.UTC(1904, 0, 1) // 1904-01-01T00:00:00Z
    : Date.UTC(1970, 0, 1); // 1970-01-01T00:00:00Z

  return new Date(epoch + seconds * 1_000);
}

function resolveMobiPocketFileType(value: number) {
  if (!(value in mobiPocketFileTypes)) {
    return value;
  }

  return mobiPocketFileTypes[value as keyof typeof mobiPocketFileTypes];
}

function highPassFilter(value: number) {
  return value < 0xff_ff_ff_ff ? value : undefined;
}

function lowPassFilter(value: number) {
  return value > 0 ? value : undefined;
}

function parseEncoding(value: number) {
  if (value === 65001) {
    return "utf-8";
  }

  if (value === 1252) {
    return "windows-1252";
  }

  console.log("Unknown encoding:", value);
  return undefined;
}

// endregion

// region PalmDB Header

/**
 * Palm Database (PDB) header parser
 *
 * Multibyte numerical fields are stored in big-endian order, with the most significant byte first.
 *
 * @see https://wiki.mobileread.com/wiki/PDB#Palm_Database_Format
 */
export const palmDb = Parser.start()

  // Offset 0, 0x00, 4 Bytes: Database name. This name is zero-terminated in the field and will be
  // used as the file name on a computer. For eBooks this usually contains the title and may have
  // the author depending on the length available
  .string("identifier", {
    length: 32,
    encoding: "utf8",
    stripNull: true,
  })

  // Offset 32, 0x20, 2 Bytes: File Attribute bits:
  //  - 0x0002: Read-Only
  //  - 0x0004: Dirty AppInfoArea
  //  - 0x0008: Back up this database (i.e., no conduit exists)
  //  - 0x0010: (16 decimal) Okay to install newer over existing copy, if present on PalmPilot
  //  - 0x0020: (32 decimal) Force the PalmPilot to reset after this database is installed
  //  - 0x0040: (64 decimal) Don't allow copies of the file to be beamed to another PalmPilot
  .uint16be("attributes", {
    formatter: (value) => ({
      readOnly: (value & 0x00_02) !== 0,
      dirtyAppInfoArea: (value & 0x00_04) !== 0,
      backup: (value & 0x00_08) !== 0,
      allowOverwrite: (value & 0x00_10) !== 0,
      forceReset: (value & 0x00_20) !== 0,
      noBeam: (value & 0x00_40) !== 0,
    }),
  })

  // Offset 34, 0x22, 2 Bytes: File Version
  .uint16be("version")

  // Offset 36, 0x24, 4 Bytes: Time of creation, in seconds since the start of January 1, 1904.
  .uint32be("creationTime", {
    formatter: parseTimestamp,
  })

  // Offset 40, 0x28, 4 Bytes: Time of the last modification, in seconds since the start of January
  // 1, 1904.
  .uint32be("modificationTime", {
    formatter: parseTimestamp,
  })

  // Offset 44, 0x2C, 4 Bytes: Time of the last backup, in seconds since the start of January
  // 1, 1904.
  .uint32be("lastBackupTime", {
    formatter: parseTimestamp,
  })

  // Offset 48, 0x30, 4 Bytes: Unknown
  .uint32be("modificationNumber", { formatter: lowPassFilter })

  // Offset 52, 0x34, 4 Bytes: Offset to the Application Info record (if present)
  .uint32be("appInfoOffset", { formatter: lowPassFilter })

  // Offset 56, 0x38, 4 Bytes: Offset to the Sort Info record (if present)
  .uint32be("sortInfoOffset")

  // Offset 60, 0x3C, 4 Bytes: Database file type. This is usually "BOOK" for eBooks.
  .string("type", { length: 4, assert: "BOOK" })

  // Offset 64, 0x40, 4 Bytes: Creator of the database file. This is usually "MOBI" for eBooks.
  .string("creator", { length: 4, assert: "MOBI" })

  // Offset 68, 0x44, 4 Bytes: Used internally to identify records
  .uint32be("uniqueIdSeed")

  // Offset 72, 0x48, 4 Bytes: Only used when in-memory on Palm OS. Always set to zero in
  // stored files.
  .seek(4)

  // Offset 76, 0x4C, 2 Bytes: Number of records in the database file
  .uint16be("numberOfRecords")
  .array("recordInfoList", {
    type: Parser.start<RecordInfo>()

      // Offset 0, 0x00, 4 Bytes: The offset of record [n] from the start of this record
      .uint32be("offset")

      // Offset 4, 0x04, 1 Byte: The attributes of record [n]. The least significant four bits are
      // used to represent the category values. These are the categories used to split the databases
      // for viewing on the screen. A few of the 16 categories are predefined, but the user can add
      // their own. There is an undefined category for use if the user or programmer hasn't
      // set this.
      //  - 0x10 (16 decimal) Secret record bit.
      //  - 0x20 (32 decimal) Record in use (busy bit).
      //  - 0x40 (64 decimal) Dirty record bit.
      //  - 0x80 (128, unsigned decimal) Delete record on next HotSync.
      .uint8("attributes", {
        formatter(value) {
          return {
            secret: (value & 0x10) !== 0,
            inUse: (value & 0x20) !== 0,
            dirty: (value & 0x40) !== 0,
            deleteOnNextSync: (value & 0x80) !== 0,
            categories: value & 0x0f, // The least significant four bits
          };
        },
      })

      // Offset 5, 0x05, 3 Bytes: The unique ID for this record. Often just a sequential count.
      // See here for more information:
      // https://palm.wiki/development/docs/601/PalmOSCompanion/FilesAndDatabases.html
      .buffer("id", {
        length: 3,
        formatter(value) {
          const view = new DataView(value.buffer);

          return (
            (view.getUint8(0) << 16) |
            (view.getUint8(1) << 8) |
            view.getUint8(2)
          );
        },
      }),
    length: "numberOfRecords",
  });

type RecordInfo = {
  offset: number;
  attributes: {
    secret: boolean;
    inUse: boolean;
    dirty: boolean;
    deleteOnNextSync: boolean;
    categories: number;
  };
  id: number;
};
export type PalmDbHeader = ReturnType<typeof palmDb.parse>;
// endregion

// region PalmDoc Header

export const palmDoc = Parser.start()

  // Offset 0, 0x00, 4 Bytes: Compression type
  .uint16be("compression", {
    formatter(value) {
      return (
        {
          1: "none",
          2: "PalmDOC",
          17480: "HUFF/CDIC",
        }[value] ?? "unknown"
      );
    },
  })

  // Offset 2, 0x02, 2 Bytes: Unused, always zero
  .seek(2)

  // Offset 4, 0x04, 4 Bytes: Uncompressed length of the entire book's text
  .uint32be("length")

  // Offset 8, 0x08, 2 Bytes: Number of PDB records used for the text of the book
  .uint16be("recordCount")

  // Offset 10, 0x0A, 2 Bytes: Maximum size of each record containing text, always 4096
  .uint16be("recordSize")

  // Offset 12, 0x0C, 2 Bytes: Encryption method used
  .uint16be("encryptionType", {
    formatter(value) {
      return (
        {
          0: "none",
          1: "legacy",
          2: "Mobipocket",
        }[value] ?? "unknown"
      );
    },
  })
  .seek(2);

export type PalmDocHeader = ReturnType<typeof palmDoc.parse>;

// endregion

// region MOBI Header

const mobiPocketFileTypes = {
  2: "Mobipocket Book",
  3: "PalmDoc Book",
  4: "Audio",
  232: "mobipocket",
  248: "KF8",
  257: "News",
  258: "News_Feed",
  259: "News_Magazine",
  513: "PICS",
  514: "WORD",
  515: "XLS",
  516: "PPT",
  517: "TEXT",
  518: "HTML",
} as const;

export const mobi = Parser.start()

  // Offset 16, 0x10, 4 Bytes: the characters "MOBI"
  .string("magic", { length: 4, assert: "MOBI" })

  // Offset 20, 0x14, 4 Bytes: the length of the MOBI header, including the previous 4 bytes
  .uint32be("length")

  // Offset 24, 0x18, 4 Bytes: The kind of Mobipocket file this is
  .uint32be("type", { formatter: resolveMobiPocketFileType })

  // Offset 28, 0x1C, 4 Bytes: Content Text Encoding
  .uint32be("encoding", { formatter: parseEncoding })

  // Offset 32, 0x20, 4 Bytes: The unique identifier of the MOBI file
  .uint32be("uniqueId")

  // Offset 36, 0x24, 4 Bytes: Version of the Mobipocket format
  .uint32be("fileVersion")

  // Offset 40, 0x28, 4 Bytes: Section number of the orthographic meta-index
  .uint32be("orthographicIndex", { formatter: highPassFilter })

  // Offset 44, 0x2C, 4 Bytes: Section number of the inflection meta-index
  .uint32be("inflectionIndex", { formatter: highPassFilter })

  // Offset 48, 0x30, 4 Bytes: Index Names
  .uint32be("indexNames", { formatter: highPassFilter })

  // Offset 52, 0x34, 4 Bytes: Index Keys
  .uint32be("indexKeys", { formatter: highPassFilter })

  // Offset 56, 0x38, 4 Bytes: Section number of extra meta-index 0
  .uint32be("extraIndex0", { formatter: highPassFilter })

  // Offset 60, 0x3C, 4 Bytes: Section number of extra meta-index 1
  .uint32be("extraIndex1", { formatter: highPassFilter })

  // Offset 64, 0x40, 4 Bytes: Section number of extra meta-index 2
  .uint32be("extraIndex2", { formatter: highPassFilter })

  // Offset 68, 0x44, 4 Bytes: Section number of extra meta-index 3
  .uint32be("extraIndex3", { formatter: highPassFilter })

  // Offset 72, 0x48, 4 Bytes: Section number of extra meta-index 4
  .uint32be("extraIndex4", { formatter: highPassFilter })

  // Offset 76, 0x4C, 4 Bytes: Section number of extra meta-index 5
  .uint32be("extraIndex5", { formatter: highPassFilter })

  // Offset 80, 0x50, 4 Bytes: First record number (starting with 0) that's not the book's text
  .uint32be("firstNonBookIndex")

  // Offset 84, 0x54, 4 Bytes: Offset in record 0 (not from the start of the file) of the full name
  // of the book
  .uint32be("fullNameOffset")

  // Offset 88, 0x58, 4 Bytes: Length in bytes of the book's full name
  .uint32be("fullNameLength")

  .pointer("fullName", {
    offset(context) {
      return context.fullNameOffset - 16;
    },
    formatter: ({ value }) => value,
    type: Parser.start().string("value", {
      encoding: "utf-8",
      length(context) {
        return context.fullNameLength;
      },
    }),
  })

  // Offset 92, 0x5C, 4 Bytes: Book locale code as an LCID. Low byte is the main language (e.g.,
  // 09: English), the next byte is dialect (e.g., 08: British or 04: US). Thus, American English is
  // 1033, while British English is 2057.
  // See:
  // Microsoft Docs: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/70feba9f-294e-491e-b6eb-56532684c37f
  // Reference: https://winprotocoldoc.z19.web.core.windows.net/MS-LCID/%5bMS-LCID%5d.pdf
  // Raw JSON Data: https://gist.github.com/Radiergummi/7c75e06feec5e1e4df85ec419ddbb9a9
  .uint32be("locale", { formatter: resolveLocaleById })

  // Offset 96, 0x60, 4 Bytes: Input language for a dictionary
  .uint32be("inputLanguage", { formatter: resolveLocaleById })

  // Offset 100, 0x64, 4 Bytes: Output language for a dictionary
  .uint32be("outputLanguage", { formatter: resolveLocaleById })

  // Offset 104, 0x68, 4 Bytes: Minimum mobipocket version support needed to read this file
  .uint32be("minVersion")

  // Offset 108, 0x6C, 4 Bytes: First record number (starting with 0) that contains an image.
  // Image records should be sequential
  .uint32be("firstImageIndex")

  // Offset 112, 0x70, 4 Bytes: The record number of the first huffman compression record.
  .uint32be("huffmanRecordOffset")

  // Offset 116, 0x74, 4 Bytes: The number of huffman compression records.
  .uint32be("huffmanRecordCount")

  // Offset 120, 0x78, 4 Bytes
  .uint32be("huffmanTableOffset")

  // Offset 124, 0x7C, 4 Bytes
  .uint32be("huffmanTableLength")

  // Offset 128, 0x80, 4 Bytes: Bitfield; if bit 6 (0x40) is set, then there's an EXTH record
  .uint32be("hasExtendedHeader", {
    formatter: (value) => (value & 0x40) !== 0,
  })

  // Offset 132–167, 0x84–0xA7, 36 Bytes: Unknown
  .seek(36)

  // Offset 168, 0xA8, 4 Bytes: Offset to DRM key info in DRMed files
  .uint32be("drmOffset", { formatter: highPassFilter })

  // Offset 172, 0xAC, 4 Bytes: Number of entries in DRM info
  .uint32be("drmCount", { formatter: highPassFilter })

  // Offset 176, 0xB0, 4 Bytes: Number of bytes in DRM info.
  .uint32be("drmSize")

  // Offset 180, 0xB4, 4 Bytes: DRM flags
  .uint32be("drmFlags")

  // Offset 184–191, 0xB8–0xBF, 8 Bytes: Bytes to the end of the MOBI header, including the
  // following if the header length >= 228 (244 from start of record).
  .seek(8)

  // Offset 192, 0xC0, 2 Bytes: Number of the first text record. Normally 1.
  .uint16be("firstContentRecordNumber")

  // Offset 194, 0xC2, 2 Bytes: Number of the last image record or number of the last text record if
  // it contains no images. Includes Image, DATP, HUFF, DRM.
  .uint16be("lastContentRecordNumber")
  .seek(4)
  .uint32be("fcisRecordNumber")
  .seek(4)
  .uint32be("flisRecordNumber")
  .seek(28)

  // Offset 240, 0xF0, 4 Bytes: A set of binary flags, some of which indicate extra data at the end
  // of each text block. This only seems valid for Mobipocket format version 5 and 6 (and higher?),
  // when the header length is 228 (0xE4) or 232 (0xE8).
  //     bit 1 (0x1): `<extra multibyte bytes><size>`
  //     bit 2 (0x2): `<TBS indexing description of this HTML record><size>`
  //     bit 3 (0x4): `<uncrossable breaks><size>`
  // Setting bit 2 (0x2) disables `<guide><reference type="start">` functionality.
  .uint32be("extraRecordDataFlags", {
    formatter(value) {
      return {
        hasExtraMultibyteBytes: (value & 0x1) !== 0,
        hasTbsIndexingDescription: (value & 0x2) !== 0,
        hasUncrossableBreaks: (value & 0x4) !== 0,
      };
    },
  })

  // Offset 244, 0xF4, 4 Bytes: Number of the first INDX record
  .uint32be("firstIndexRecordNumber", { formatter: highPassFilter });

export type MobiHeader = ReturnType<typeof mobi.parse>;

// endregion

// region EXTH Header

const exthStringParser = (
  name: string,
  options?: Partial<Parameters<Parser<object, object>["string"]>[1]>,
) =>
  Parser.start<object, object>().string(name, {
    encoding: "utf-8",
    length() {
      return this.$parent.$parent.length - 8;
    },
    ...options,
  });

/**
 * EXTH record parser
 *
 * Parses a single EXTH record, which contains metadata about the MOBI file.
 */
const exthRecordParser = Parser.start()

  // Offset 0, 0x00, 4 Bytes: EXTH Record type. A number identifying what's stored in this record
  .uint32be("type")

  // Offset 4, 0x04, 4 Bytes: Length of the EXTH record, including the previous 8 bytes
  .uint32be("length")

  // Offset 8, 0x08, variable length: The value of the EXTH record. This is a variable-length
  // value, which can be either a UTF-8 string or a number, depending on the type.
  .nest("record", {
    // Transform all records into objects with a "field" and "value" property for easier iteration
    formatter({ $root: _a, $parent: _b, value: { ...result } }) {
      const [type, value] = Object.entries(result).at(0)!;
      const field = type !== "fallback" ? type : (this as any).type;

      return { field, value } as {
        field: keyof ExtendedHeader;
        value: ExtendedHeader[keyof ExtendedHeader];
      };
    },

    // Choice parser to pick the correct parser based on the type of the record
    // @ts-ignore
    type: Parser.start<
      ExtendedHeader,
      {
        type: number;
        length: number;
      }
    >().choice("value", {
      tag: function () {
        return this.$parent.type;
      },

      // See here for a reference of known EXTH record types:
      // https://wiki.mobileread.com/wiki/MOBI#EXTH_Header
      choices: {
        1: exthStringParser("drmServerId"),
        2: exthStringParser("drmCommerceId"),
        3: exthStringParser("drmEbookbaseBookId"),

        /**
         * An entity primarily responsible for making the resource.
         *
         * Examples of a Creator include a person, an organization, or a service. Typically, the
         * name of a Creator should be used to indicate the entity.
         * Additional contributors whose contributions are secondary to those listed in creator
         * elements should be named in contributor elements.
         * Publications with multiple co-authors should provide multiple creator elements, each
         * containing one author. The order of creator elements is presumed to define the order in
         * which the creators' names should be presented by the Reading System.
         *
         * @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.2
         * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/creator/
         */
        100: exthStringParser("creator"),

        /**
         * An entity responsible for making the resource available.
         *
         * Examples of a Publisher include a person, an organization, or a service.
         * Typically, the name of a Publisher should be used to indicate the entity.
         *
         * @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.5
         * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/publisher/
         */
        101: exthStringParser("publisher"),
        102: exthStringParser("imprint"),

        /**
         *  Description of the publication's content.
         *
         * Description may include but is not limited to: an abstract, a table of contents, a
         * graphical representation, or a free-text account of the resource.
         *
         * @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.4
         * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/description/
         */
        103: exthStringParser("synopsis"),

        /**
         * The International Standard Book Number (ISBN) is a unique identifier for books.
         *
         * @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.10
         */
        104: exthStringParser("isbn"),

        /**
         * @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.3
         */
        105: exthStringParser("subject"),

        /**
         * Date of publication, in the format defined by "Date and Time Formats" at
         * http://www.w3.org/TR/NOTE-datetime and by ISO 8601 on which it is based. In particular,
         * dates without times are represented in the form `YYYY[-MM[-DD]]`: a required 4-digit
         * year, an optional 2-digit month, and if the month is given, an optional 2-digit day
         * of the month.
         *
         * @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.7
         * @see www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/date/
         */
        106: exthStringParser("publishingDate", {
          formatter: (date) => new Date(date),
        }),
        107: exthStringParser("review"),

        /**
         * An entity responsible for making contributions to the resource.
         *
         * The guidelines for using names of persons or organizations as creators also apply
         * to contributors. Typically, the name of a Contributor should be used to indicate
         * the entity.
         *
         * Note: Books exported from Calibre often have the contributor field set to
         * "calibre <version> [https://calibre-ebook.com]". This is a placeholder and should
         * be ignored.
         */
        108: exthStringParser("contributor"),

        /**
         * Information about rights held in and over the resource.
         *
         * Typically, rights information includes a statement about various property rights
         * associated with the resource, including intellectual property rights.
         *
         * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/rights/
         */
        109: exthStringParser("rights"),
        110: exthStringParser("subjectCode"),

        /**
         * The nature or genre of the resource.
         *
         * Type includes terms describing general categories, functions, genres, or aggregation
         * levels for content. The advised best practice is to select a value from a
         * controlled vocabulary.
         *
         *  @see https://idpf.org/epub/20/spec/OPF_2.0_final_spec.html#Section2.2.8
         *  @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/type/
         */
        111: exthStringParser("type"),

        /**
         * A related resource from which the described resource is derived.
         *
         * The described resource may be derived from the related resource in whole or in part.
         * The recommended best practice is to identify the related resource with a string
         * conforming to a formal identification system.
         *
         * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/elements11/source/
         */
        112: exthStringParser("source"),

        /**
         * The Amazon Standard Identification Number (ASIN) is a unique identifier for products in
         * the Amazon marketplace In the context of MOBI files, the ASIN is used to identify the
         * book in the Amazon catalog.
         *
         * Note: Kindle Paperwhite labels books with "Personal" if they don't have this record.
         */
        113: exthStringParser("asin"),
        114: exthStringParser("version"),

        /**
         * Whether this book is a sample of a full book.
         */
        115: Parser.start<object, object>().uint32be("isSample", {
          formatter: (value) => value === 1,
        }),
        116: Parser.start<object, object>().uint32be("startReading"),

        /**
         * Whether this book is intended for adults.
         */
        117: exthStringParser("isAdult", {
          formatter: (value) => value === "yes",
        }),
        118: exthStringParser("retailPrice", { formatter: Number }),
        119: exthStringParser("retailPriceCurrency"),
        121: Parser.start<object, object>().uint32be("kf8BoundaryOffset"),
        122: exthStringParser("isFixedLayout", {
          formatter: (value) => value === "true",
        }),

        /**
         * @example "comic", "graphicNovel", "textbook", "magazine", "novel"
         */
        123: exthStringParser("bookType"),

        /**
         * @example "none", "portrait", "landscape"
         */
        124: exthStringParser("orientationLock"),
        125: Parser.start<object, object>().uint32be("resourceCount"),
        126: exthStringParser("originalResolution", {
          formatter(value) {
            const [x = NaN, y = NaN] = value.split("x", 2);

            return [Number(x), Number(y)] as const;
          },
        }),
        127: exthStringParser("zeroGutter", {
          formatter: (value) => value === "true",
        }),
        128: exthStringParser("zeroMargin", {
          formatter: (value) => value === "true",
        }),
        129: exthStringParser("coverURI"),
        131: Parser.start<object, object>().uint32be("__unknown_131__"),
        132: exthStringParser("regionMagnification"),
        200: exthStringParser("dictionaryShortName"),
        201: Parser.start<object, object>().uint32be("coverOffset"),
        202: Parser.start<object, object>().uint32be("thumbnailOffset"),
        203: Parser.start<object, object>().uint32be("hasFakeCover", {
          formatter: (value) => value > 0,
        }),
        204: Parser.start<object, object>().uint32be("generator", {
          formatter(value) {
            const labels = {
              1: "mobigen",
              2: "Mobipocket Creator",
              200: "kindlegen (Windows)",
              201: "kindlegen (Linux)",
              202: "kindlegen (Mac)",
            };

            return value in labels
              ? labels[value as keyof typeof labels]
              : `Unknown (${value})`;
          },
        }),
        205: Parser.start<object, object>().uint32be("generatorMajorVersion"),
        206: Parser.start<object, object>().uint32be("generatorMinorVersion"),
        207: Parser.start<object, object>().uint32be("generatorBuildNumber"),
        208: exthStringParser("watermark"),
        209: exthStringParser("tamperProofKeys"),
        300: Parser.start<object, object>().buffer("fontSignature", {
          length() {
            return this.$parent.$parent.length - 8;
          },
        }),
        401: Parser.start<object, object>().uint32be("clippingLimit"),
        402: Parser.start<object, object>().uint32be("publisherLimit"),
        404: Parser.start<object, object>().uint32be("textToSpeechEnabled", {
          formatter: (value) => value > 0,
        }),
        405: Parser.start<object, object>().uint32be("isRental", {
          formatter: (value) => value > 0,
        }),
        406: exthStringParser("rentalExpirationDate", {
          formatter: (date) => new Date(date),
        }),
        501: exthStringParser("documentType", {
          formatter(value) {
            return (
              {
                PDOC: "Personal",
                EBOK: "eBook",
                EBSP: "eBook Sample",
              }[value] ?? "unknown"
            );
          },
        }),
        502: exthStringParser("lastUpdateTime", {
          formatter: (date) => new Date(date),
        }),
        503: exthStringParser("title"),
        504: exthStringParser("asin504"),
        508: exthStringParser("titleFileAs"),
        517: exthStringParser("creatorFileAs"),
        522: exthStringParser("publisherFileAs"),
        524: exthStringParser("language"),
        525: exthStringParser("writingMode"),
        527: exthStringParser("pageProgressionDirection", {
          assert: (value) => ["rtl", "ltr"].includes(value),
        }),
        528: exthStringParser("overrideFonts", {
          formatter: (value) => value === "true",
        }),
        529: exthStringParser("originalSourceDescription"),
        535: exthStringParser("kindlegenBuildRevisionNumber"),

        /**
         * Calibre series name - custom EXTH record added by Calibre
         * @see https://wiki.mobileread.com/wiki/Calibre_User_Manual#MOBI_Output_Metadata
         */
        536: exthStringParser("calibreSeries"),

        /**
         * Calibre series index/position - custom EXTH record added by Calibre
         * Format is usually a decimal number (e.g., "1.0", "2.5")
         */
        537: exthStringParser("calibreSeriesIndex", {
          formatter: (value) => {
            const parsed = Number.parseFloat(value);
            return Number.isNaN(parsed) ? undefined : parsed;
          },
        }),
      },
      defaultChoice: Parser.start<object, object>().buffer("fallback", {
        length() {
          return this.$parent.$parent.length - 8;
        },
      }),
    }),
  });

export type ExtendedHeader = {
  asin?: string;
  uuid?: string;
  bookType?: string;
  calibreSeries?: string;
  calibreSeriesIndex?: number;
  clippingLimit?: number;
  contributor?: string;
  coverOffset?: number;
  coverURI?: string;
  creator?: string;
  creatorFileAs?: string;
  dictionaryShortName?: string;
  documentType?: "Personal" | "eBook" | "eBook Sample" | "unknown";
  drmCommerceId?: string;
  drmEbookbaseBookId?: string;
  drmServerId?: string;
  fontSignature?: string;
  generator?:
    | "mobigen"
    | "Mobipocket Creator"
    | "kindlegen (Windows)"
    | "kindlegen (Linux)"
    | "kindlegen (Mac)"
    | string;
  generatorBuildNumber?: number;
  generatorMajorVersion?: number;
  generatorMinorVersion?: number;
  hasFakeCover?: boolean;
  imprint?: string;
  isAdult?: boolean;
  isFixedLayout?: number;
  isRental?: boolean;
  isSample?: boolean;
  isbn?: string;
  kf8BoundaryOffset?: number;
  kindlegenBuildRevisionNumber?: string;
  language?: string;
  lastUpdateTime?: Date;
  locale?: Locale;
  orientationLock?: string;
  originalResolution?: readonly [number, number];
  originalSourceDescription?: string;
  pageProgressionDirection?: "rtl" | "ltr";
  publisher?: string;
  publisherFileAs?: string;
  publisherLimit?: number;
  publishingDate?: Date;
  regionMagnification?: string;
  rentalExpirationDate?: Date;
  resourceCount?: number;
  retailPrice?: number;
  retailPriceCurrency?: string;
  review?: string;
  rights?: string;
  source?: string;
  startReading?: string;
  subject?: string | string[];
  subjectCode?: string;
  synopsis?: string;
  tamperProofKeys?: string;
  textToSpeechEnabled?: boolean;
  thumbnailOffset?: number;
  title?: string;
  titleFileAs?: string;
  type?: string;
  version?: string;
  watermark?: string;
  writingMode?: string;
  zeroGutter?: boolean;
  zeroMargin?: boolean;
};

export const extended = Parser.start()
  .useContextVars()

  // Offset 0, 0x00, 4 Bytes: the characters "EXTH"
  .string("magic", { length: 4, assert: "EXTH" })

  // Offset 4, 0x04, 4 Bytes: Length of the EXTH header, including the previous 4 bytes, but not
  // including the final padding
  .uint32be("length")

  // Offset 8, 0x08, 4 Bytes: The number of records in the EXTH header
  .uint32be("count")

  // Offset 12, 0x0C, 4 Bytes: Repeated EXTH records to the end of the EXTH length
  .array("records", {
    type: exthRecordParser,
    length: "count",
  });

// endregion

// region INDX Header

export const index = Parser.start()

  // Offset 0, 0x00, 4 Bytes: the characters "INDX"
  .string("magic", {
    encoding: "utf-8",
    assert: "INDX",
    length: 4,
  })

  // Offset 4, 0x04, 4 Bytes: Length of the INDX header, including the previous 4 bytes
  .uint32be("length")

  // Offset 8, 0x08, 4 Bytes: The type of index. 0 for normal, 2 for inflections.
  .uint32be("type", {
    formatter: (value) =>
      ({
        0: "normal",
        2: "inflections",
      })[value] ?? "unknown",
  })

  // Offset 12–19, 0x0C–0x13, 8 Bytes: Unknown
  .seek(8)

  // Offset 20, 0x14, 4 Bytes: The offset to the IDXT section
  .uint32be("idxtOffset")

  // Offset 24, 0x18, 4 Bytes: The number of index records
  .uint32be("recordCount")

  // Offset 28, 0x1C, 4 Bytes: The index encoding. 1252 for Windows-1252, 65001 for UTF-8.
  .uint32be("encoding", { formatter: parseEncoding })

  // Offset 32, 0x20, 4 Bytes: The language code of the index
  .uint32be("language", { formatter: resolveLocaleById })

  // Offset 36, 0x24, 4 Bytes: The number of index entries
  .uint32be("entryCount")

  // Offset 40, 0x28, 4 Bytes: The offset to the ORDT section
  .uint32be("ordtOffset")

  // Offset 44, 0x2C, 4 Bytes: The offset to the LIGT section
  .uint32be("ligtOffset")

  // Offset 48, 0x30, 4 Bytes: The offset to the LITX section
  .uint32be("litxOffset")

  // Offset 52, 0x34, 4 Bytes: The offset to the LITR section
  .uint32be("litrOffset");

// endregion

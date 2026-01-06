/**
 * Tests for MARC parser utilities
 */

import { describe, expect, it } from "vitest";
import {
  extractAuthors,
  extractBibliographicData,
  extractIsbns,
  extractLanguage,
  extractPhysicalDescription,
  extractPublicationInfo,
  extractSeries,
  extractSruRecordCount,
  extractSubjects,
  extractSubtitle,
  extractTitle,
  getAllSubfields,
  getControlField,
  getDataField,
  getDataFields,
  getFirstSubfield,
  getSubfield,
  getSubfieldValues,
  type MarcRecord,
  parseMarcXmlRecords,
} from "./marc-parser.js";

// Sample MARC XML for testing
const SAMPLE_MARC_RECORD = `
<record xmlns="http://www.loc.gov/MARC21/slim">
  <leader>01234nam a22002890i 4500</leader>
  <controlfield tag="001">12345678</controlfield>
  <controlfield tag="008">200615s2020    nyu      b    001 0 eng d</controlfield>
  <datafield tag="020" ind1=" " ind2=" ">
    <subfield code="a">9780571089895</subfield>
  </datafield>
  <datafield tag="020" ind1=" " ind2=" ">
    <subfield code="a">0571089895 (pbk.)</subfield>
  </datafield>
  <datafield tag="100" ind1="1" ind2=" ">
    <subfield code="a">Tolkien, J. R. R.,</subfield>
    <subfield code="d">1892-1973.</subfield>
  </datafield>
  <datafield tag="245" ind1="1" ind2="4">
    <subfield code="a">The hobbit, or, There and back again /</subfield>
    <subfield code="b">by J.R.R. Tolkien.</subfield>
  </datafield>
  <datafield tag="250" ind1=" " ind2=" ">
    <subfield code="a">75th anniversary edition.</subfield>
  </datafield>
  <datafield tag="260" ind1=" " ind2=" ">
    <subfield code="a">Boston :</subfield>
    <subfield code="b">Houghton Mifflin,</subfield>
    <subfield code="c">2012.</subfield>
  </datafield>
  <datafield tag="300" ind1=" " ind2=" ">
    <subfield code="a">xiv, 300 p. :</subfield>
    <subfield code="b">ill. ;</subfield>
    <subfield code="c">22 cm.</subfield>
  </datafield>
  <datafield tag="490" ind1="1" ind2=" ">
    <subfield code="a">Middle-earth saga ;</subfield>
    <subfield code="v">1</subfield>
  </datafield>
  <datafield tag="520" ind1=" " ind2=" ">
    <subfield code="a">A hobbit named Bilbo Baggins embarks on an adventure.</subfield>
  </datafield>
  <datafield tag="650" ind1=" " ind2="0">
    <subfield code="a">Fantasy fiction.</subfield>
  </datafield>
  <datafield tag="650" ind1=" " ind2="0">
    <subfield code="a">Middle Earth (Imaginary place)</subfield>
    <subfield code="v">Fiction.</subfield>
  </datafield>
  <datafield tag="700" ind1="1" ind2=" ">
    <subfield code="a">Anderson, Douglas A.</subfield>
  </datafield>
</record>
`;

const SAMPLE_SRU_RESPONSE = `
<searchRetrieveResponse>
  <numberOfRecords>1</numberOfRecords>
  <records>
    ${SAMPLE_MARC_RECORD}
  </records>
</searchRetrieveResponse>
`;

describe("MARC XML Parser", () => {
  describe("parseMarcXmlRecords", () => {
    it("should parse single record from SRU response", () => {
      const records = parseMarcXmlRecords(SAMPLE_SRU_RESPONSE);
      expect(records.length).toBe(1);
    });

    it("should extract leader", () => {
      const records = parseMarcXmlRecords(SAMPLE_MARC_RECORD);
      expect(records[0].leader).toBe("01234nam a22002890i 4500");
    });

    it("should extract control fields", () => {
      const records = parseMarcXmlRecords(SAMPLE_MARC_RECORD);
      expect(records[0].controlFields.length).toBe(2);
      expect(records[0].controlFields[0].tag).toBe("001");
      expect(records[0].controlFields[0].value).toBe("12345678");
    });

    it("should extract data fields", () => {
      const records = parseMarcXmlRecords(SAMPLE_MARC_RECORD);
      const record = records[0];

      // Should have multiple data fields
      expect(record.dataFields.length).toBeGreaterThan(5);

      // Check 245 field
      const titleField = record.dataFields.find((df) => df.tag === "245");
      expect(titleField).toBeDefined();
      expect(titleField!.indicator1).toBe("1");
      expect(titleField!.indicator2).toBe("4");
    });

    it("should extract subfields", () => {
      const records = parseMarcXmlRecords(SAMPLE_MARC_RECORD);
      const record = records[0];

      const titleField = record.dataFields.find((df) => df.tag === "245");
      expect(titleField).toBeDefined();
      expect(titleField!.subfields.length).toBe(2);
      expect(titleField!.subfields[0].code).toBe("a");
      expect(titleField!.subfields[0].value).toContain("hobbit");
    });

    it("should handle empty input", () => {
      const records = parseMarcXmlRecords("");
      expect(records.length).toBe(0);
    });

    it("should handle malformed XML gracefully", () => {
      const records = parseMarcXmlRecords("<invalid>not valid marc</invalid>");
      expect(records.length).toBe(0);
    });
  });

  describe("extractSruRecordCount", () => {
    it("should extract record count from SRU response", () => {
      expect(extractSruRecordCount(SAMPLE_SRU_RESPONSE)).toBe(1);
    });

    it("should return 0 for response without count", () => {
      expect(extractSruRecordCount("<response></response>")).toBe(0);
    });
  });
});

describe("Field Access Helpers", () => {
  let record: MarcRecord;

  beforeAll(() => {
    const records = parseMarcXmlRecords(SAMPLE_MARC_RECORD);
    record = records[0];
  });

  describe("getControlField", () => {
    it("should get control field by tag", () => {
      expect(getControlField(record, "001")).toBe("12345678");
    });

    it("should return undefined for missing field", () => {
      expect(getControlField(record, "999")).toBeUndefined();
    });
  });

  describe("getDataField", () => {
    it("should get first data field by tag", () => {
      const field = getDataField(record, "245");
      expect(field).toBeDefined();
      expect(field!.tag).toBe("245");
    });

    it("should return undefined for missing field", () => {
      expect(getDataField(record, "999")).toBeUndefined();
    });
  });

  describe("getDataFields", () => {
    it("should get all data fields by tag", () => {
      const fields = getDataFields(record, "650");
      expect(fields.length).toBe(2);
    });

    it("should return empty array for missing tag", () => {
      const fields = getDataFields(record, "999");
      expect(fields).toEqual([]);
    });
  });

  describe("getSubfield", () => {
    it("should get subfield value from data field", () => {
      const field = getDataField(record, "245")!;
      const value = getSubfield(field, "a");
      expect(value).toContain("hobbit");
    });

    it("should return undefined for missing subfield", () => {
      const field = getDataField(record, "245")!;
      expect(getSubfield(field, "z")).toBeUndefined();
    });
  });

  describe("getAllSubfields", () => {
    it("should get all subfield values with code", () => {
      const field = getDataFields(record, "650")[1];
      const values = getAllSubfields(field, "a");
      expect(values.length).toBe(1);
      expect(values[0]).toContain("Middle Earth");
    });
  });

  describe("getSubfieldValues", () => {
    it("should get subfield values from all matching fields", () => {
      const values = getSubfieldValues(record, "020", ["a"]);
      expect(values.length).toBe(2);
    });

    it("should handle multiple subfield codes", () => {
      const values = getSubfieldValues(record, "260", ["a", "b", "c"]);
      expect(values.length).toBe(3);
    });
  });

  describe("getFirstSubfield", () => {
    it("should get first subfield value by tag and code", () => {
      const value = getFirstSubfield(record, "100", "a");
      expect(value).toContain("Tolkien");
    });

    it("should return undefined for missing combination", () => {
      expect(getFirstSubfield(record, "999", "a")).toBeUndefined();
    });
  });
});

describe("High-Level Extraction Functions", () => {
  let record: MarcRecord;

  beforeAll(() => {
    const records = parseMarcXmlRecords(SAMPLE_MARC_RECORD);
    record = records[0];
  });

  describe("extractTitle", () => {
    it("should extract title from 245$a", () => {
      const title = extractTitle(record);
      expect(title).toContain("hobbit");
      // Should remove trailing punctuation
      expect(title).not.toMatch(/\/$/);
    });
  });

  describe("extractSubtitle", () => {
    it("should extract subtitle from 245$b", () => {
      const subtitle = extractSubtitle(record);
      expect(subtitle).toContain("J.R.R. Tolkien");
    });
  });

  describe("extractAuthors", () => {
    it("should extract primary and additional authors", () => {
      const authors = extractAuthors(record);
      expect(authors.length).toBe(2);
      // Should convert "Tolkien, J. R. R." to "J. R. R. Tolkien"
      expect(authors[0]).toContain("Tolkien");
      expect(authors[1]).toContain("Anderson");
    });

    it("should remove dates from author names", () => {
      const authors = extractAuthors(record);
      expect(authors[0]).not.toContain("1892");
    });
  });

  describe("extractIsbns", () => {
    it("should extract ISBNs from 020$a", () => {
      const isbns = extractIsbns(record);
      expect(isbns.length).toBe(2);
      expect(isbns).toContain("9780571089895");
      expect(isbns).toContain("0571089895");
    });

    it("should remove qualifiers from ISBNs", () => {
      const isbns = extractIsbns(record);
      // Should not contain "(pbk.)"
      expect(isbns.every((isbn) => !isbn.includes("("))).toBe(true);
    });
  });

  describe("extractPublicationInfo", () => {
    it("should extract publisher", () => {
      const info = extractPublicationInfo(record);
      expect(info.publisher).toBe("Houghton Mifflin");
    });

    it("should extract publication year", () => {
      const info = extractPublicationInfo(record);
      expect(info.year).toBe(2012);
    });

    it("should extract publication place", () => {
      const info = extractPublicationInfo(record);
      expect(info.place).toBe("Boston");
    });
  });

  describe("extractLanguage", () => {
    it("should extract language from 008 field", () => {
      const language = extractLanguage(record);
      expect(language).toBe("en"); // Normalized from "eng" to ISO 639-1
    });
  });

  describe("extractSubjects", () => {
    it("should extract subjects from 650 fields", () => {
      const subjects = extractSubjects(record);
      expect(subjects.length).toBeGreaterThanOrEqual(2);
      expect(subjects.some((s) => s.includes("Fantasy"))).toBe(true);
      expect(subjects.some((s) => s.includes("Middle Earth"))).toBe(true);
    });
  });

  describe("extractPhysicalDescription", () => {
    it("should extract page count", () => {
      const phys = extractPhysicalDescription(record);
      expect(phys.pageCount).toBe(300);
    });

    it("should extract dimensions", () => {
      const phys = extractPhysicalDescription(record);
      expect(phys.dimensions).toBe("22 cm");
    });
  });

  describe("extractSeries", () => {
    it("should extract series name from 490", () => {
      const series = extractSeries(record);
      expect(series.name).toContain("Middle-earth");
    });

    it("should extract series position", () => {
      const series = extractSeries(record);
      expect(series.position).toBe("1");
    });
  });

  describe("extractBibliographicData", () => {
    it("should extract comprehensive bibliographic data", () => {
      const data = extractBibliographicData(record);

      expect(data.title).toContain("hobbit");
      expect(data.authors.length).toBeGreaterThan(0);
      expect(data.isbns.length).toBeGreaterThan(0);
      expect(data.publisher).toBeDefined();
      expect(data.publicationYear).toBe(2012);
      expect(data.language).toBe("en"); // Normalized from "eng" to ISO 639-1
      expect(data.subjects.length).toBeGreaterThan(0);
      expect(data.pageCount).toBe(300);
      expect(data.seriesName).toBeDefined();
      expect(data.edition).toContain("anniversary");
      expect(data.description).toContain("Bilbo");
      expect(data.controlNumber).toBe("12345678");
    });

    it("should extract leader information", () => {
      const data = extractBibliographicData(record);
      expect(data.recordType).toBe("a"); // Language material
      expect(data.bibliographicLevel).toBe("m"); // Monograph
    });
  });
});

describe("Integration: Different MARC sources", () => {
  // DNB-style record (German National Library)
  const DNB_RECORD = `
<record>
  <leader>00000nam a2200000   4500</leader>
  <controlfield tag="001">1234567890</controlfield>
  <controlfield tag="008">200101s2020    gw       b    000 0 ger d</controlfield>
  <datafield tag="020" ind1=" " ind2=" ">
    <subfield code="a">978-3-518-42930-8</subfield>
  </datafield>
  <datafield tag="100" ind1="1" ind2=" ">
    <subfield code="a">Müller, Hans</subfield>
    <subfield code="0">(DE-588)12345678X</subfield>
  </datafield>
  <datafield tag="245" ind1="1" ind2="0">
    <subfield code="a">Ein deutsches Buch</subfield>
  </datafield>
  <datafield tag="264" ind1=" " ind2="1">
    <subfield code="a">Frankfurt am Main</subfield>
    <subfield code="b">Suhrkamp</subfield>
    <subfield code="c">2020</subfield>
  </datafield>
  <datafield tag="300" ind1=" " ind2=" ">
    <subfield code="a">350 Seiten</subfield>
  </datafield>
</record>
`;

  it("should parse DNB-style records", () => {
    const records = parseMarcXmlRecords(DNB_RECORD);
    expect(records.length).toBe(1);

    const data = extractBibliographicData(records[0]);
    expect(data.title).toBe("Ein deutsches Buch");
    expect(data.authors[0]).toContain("Müller");
    expect(data.publisher).toBe("Suhrkamp");
    expect(data.publicationYear).toBe(2020);
    expect(data.language).toBe("de"); // Normalized from "ger" to ISO 639-1
    expect(data.pageCount).toBe(350);
    expect(data.gndIds).toContain("(DE-588)12345678X");
  });

  // Record using 264 field (RDA) instead of 260 (AACR2)
  const RDA_RECORD = `
<record xmlns="http://www.loc.gov/MARC21/slim">
  <leader>00000nam a2200000 i 4500</leader>
  <controlfield tag="001">test123</controlfield>
  <datafield tag="264" ind1=" " ind2="1">
    <subfield code="a">New York :</subfield>
    <subfield code="b">Penguin Press,</subfield>
    <subfield code="c">[2021]</subfield>
  </datafield>
</record>
`;

  it("should handle RDA 264 field for publication info", () => {
    const records = parseMarcXmlRecords(RDA_RECORD);
    const info = extractPublicationInfo(records[0]);

    expect(info.place).toBe("New York");
    expect(info.publisher).toBe("Penguin Press");
    expect(info.year).toBe(2021);
  });
});

describe("Edge Cases", () => {
  it("should handle record with minimal fields", () => {
    const minimal = `
<record xmlns="http://www.loc.gov/MARC21/slim">
  <leader>00000nam a2200000   4500</leader>
  <datafield tag="245" ind1="0" ind2="0">
    <subfield code="a">Title only</subfield>
  </datafield>
</record>
`;
    const records = parseMarcXmlRecords(minimal);
    const data = extractBibliographicData(records[0]);

    expect(data.title).toBe("Title only");
    expect(data.authors).toEqual([]);
    expect(data.isbns).toEqual([]);
  });

  it("should handle XML entities in content", () => {
    const withEntities = `
<record xmlns="http://www.loc.gov/MARC21/slim">
  <leader>00000nam a2200000   4500</leader>
  <datafield tag="245" ind1="0" ind2="0">
    <subfield code="a">Tom &amp; Jerry</subfield>
  </datafield>
</record>
`;
    const records = parseMarcXmlRecords(withEntities);
    const title = extractTitle(records[0]);

    expect(title).toBe("Tom & Jerry");
  });

  it("should handle multiple records in response", () => {
    const multiRecord = `
<response>
  <record xmlns="http://www.loc.gov/MARC21/slim">
    <leader>00000nam</leader>
    <datafield tag="245" ind1="0" ind2="0"><subfield code="a">Book One</subfield></datafield>
  </record>
  <record xmlns="http://www.loc.gov/MARC21/slim">
    <leader>00000nam</leader>
    <datafield tag="245" ind1="0" ind2="0"><subfield code="a">Book Two</subfield></datafield>
  </record>
</response>
`;
    const records = parseMarcXmlRecords(multiRecord);
    expect(records.length).toBe(2);
    expect(extractTitle(records[0])).toBe("Book One");
    expect(extractTitle(records[1])).toBe("Book Two");
  });
});

import { describe, it, expect } from "vitest";
import { normalizeCreatorName, normalizePublisherName } from "./normalize.js";

describe("normalizeCreatorName", () => {
  describe("initials and punctuation", () => {
    it("should normalize names with periods in initials", () => {
      expect(normalizeCreatorName("J.K. Rowling")).toBe("jk rowling");
      expect(normalizeCreatorName("J. K. Rowling")).toBe("jk rowling");
      expect(normalizeCreatorName("J.R.R. Tolkien")).toBe("jrr tolkien");
      expect(normalizeCreatorName("T.S. Eliot")).toBe("ts eliot");
    });

    it("should normalize names with commas (Last, First format)", () => {
      expect(normalizeCreatorName("Rowling, J.K.")).toBe("jk rowling");
      expect(normalizeCreatorName("Tolkien, J.R.R.")).toBe("jrr tolkien");
      expect(normalizeCreatorName("Smith, John")).toBe("john smith");
      expect(normalizeCreatorName("O'Brien, Sean")).toBe("sean obrien");
    });

    it("should handle apostrophes in names", () => {
      expect(normalizeCreatorName("O'Brien")).toBe("obrien");
      expect(normalizeCreatorName("O'Neill")).toBe("oneill");
      expect(normalizeCreatorName("D'Angelo")).toBe("dangelo");
    });

    it("should preserve hyphenated names", () => {
      expect(normalizeCreatorName("Jean-Paul Sartre")).toBe("jean-paul sartre");
      expect(normalizeCreatorName("Mary-Kate Olsen")).toBe("mary-kate olsen");
    });
  });

  describe("titles and honorifics", () => {
    it("should remove Dr. prefix", () => {
      expect(normalizeCreatorName("Dr. John Smith")).toBe("john smith");
      expect(normalizeCreatorName("Dr John Smith")).toBe("john smith");
    });

    it("should remove Prof./Professor prefix", () => {
      expect(normalizeCreatorName("Prof. Jane Doe")).toBe("jane doe");
      expect(normalizeCreatorName("Professor Jane Doe")).toBe("jane doe");
    });

    it("should remove Sir/Dame/Lord/Lady prefixes", () => {
      expect(normalizeCreatorName("Sir Arthur Conan Doyle")).toBe(
        "arthur conan doyle",
      );
      expect(normalizeCreatorName("Dame Agatha Christie")).toBe(
        "agatha christie",
      );
      expect(normalizeCreatorName("Lord Byron")).toBe("byron");
      expect(normalizeCreatorName("Lady Mary")).toBe("mary");
    });

    it("should remove religious titles", () => {
      expect(normalizeCreatorName("Father Brown")).toBe("brown");
      expect(normalizeCreatorName("Rev. Martin Luther King")).toBe(
        "martin luther king",
      );
      expect(normalizeCreatorName("Saint Augustine")).toBe("augustine");
      expect(normalizeCreatorName("St. Thomas Aquinas")).toBe("thomas aquinas");
    });
  });

  describe("suffixes", () => {
    it("should remove Jr. suffix", () => {
      expect(normalizeCreatorName("Martin Luther King Jr.")).toBe(
        "martin luther king",
      );
      expect(normalizeCreatorName("John Smith Jr")).toBe("john smith");
    });

    it("should remove Sr. suffix", () => {
      expect(normalizeCreatorName("John Smith Sr.")).toBe("john smith");
      expect(normalizeCreatorName("Robert Brown Senior")).toBe("robert brown");
    });

    it("should remove Roman numeral suffixes", () => {
      expect(normalizeCreatorName("Henry VIII")).toBe("henry");
      expect(normalizeCreatorName("Louis XIV")).toBe("louis");
      expect(normalizeCreatorName("Pope John Paul II")).toBe("john paul");
    });

    it("should remove academic suffixes", () => {
      expect(normalizeCreatorName("Jane Doe, PhD")).toBe("jane doe");
      expect(normalizeCreatorName("John Smith MD")).toBe("john smith");
      expect(normalizeCreatorName("Robert Jones, Esq.")).toBe("robert jones");
    });
  });

  describe("complex cases", () => {
    it("should handle multiple transformations", () => {
      expect(normalizeCreatorName("Dr. Martin Luther King, Jr.")).toBe(
        "martin luther king",
      );
      expect(normalizeCreatorName("Prof. John O'Brien III")).toBe(
        "john obrien",
      );
      expect(normalizeCreatorName("Sir J.R.R. Tolkien")).toBe("jrr tolkien");
    });

    it("should handle extra whitespace", () => {
      expect(normalizeCreatorName("  John   Smith  ")).toBe("john smith");
      expect(normalizeCreatorName("J.K.  Rowling")).toBe("jk rowling");
    });

    it("should be case-insensitive", () => {
      expect(normalizeCreatorName("JOHN SMITH")).toBe("john smith");
      expect(normalizeCreatorName("john SMITH")).toBe("john smith");
      expect(normalizeCreatorName("JoHn SmItH")).toBe("john smith");
    });
  });

  describe("edge cases", () => {
    it("should handle single-word names", () => {
      expect(normalizeCreatorName("Madonna")).toBe("madonna");
      expect(normalizeCreatorName("Voltaire")).toBe("voltaire");
    });

    it("should handle empty or whitespace-only strings", () => {
      expect(normalizeCreatorName("")).toBe("");
      expect(normalizeCreatorName("   ")).toBe("");
    });

    it("should handle names with special characters", () => {
      expect(normalizeCreatorName("José García Márquez")).toBe(
        "jose garcia marquez",
      );
      expect(normalizeCreatorName("François-Marie Voltaire")).toBe(
        "francois-marie voltaire",
      );
    });
  });
});

describe("normalizePublisherName", () => {
  describe("business suffixes", () => {
    it("should remove Ltd./Limited", () => {
      expect(normalizePublisherName("Penguin Books Ltd.")).toBe("penguin");
      expect(normalizePublisherName("Random House Ltd")).toBe("random house");
    });

    it("should remove Inc./Incorporated", () => {
      expect(normalizePublisherName("HarperCollins Publishers Inc.")).toBe(
        "harpercollins",
      );
      expect(normalizePublisherName("Macmillan Publishing Inc")).toBe(
        "macmillan",
      );
    });

    it("should remove Corp./Corporation", () => {
      expect(normalizePublisherName("Scholastic Corporation")).toBe(
        "scholastic",
      );
      expect(normalizePublisherName("Simon & Schuster Corp.")).toBe(
        "simon schuster",
      );
    });

    it("should remove Co./Company", () => {
      expect(normalizePublisherName("Oxford University Press & Co.")).toBe(
        "oxford university",
      );
      expect(normalizePublisherName("Publishing Company")).toBe("");
    });

    it("should remove Publishing/Publishers", () => {
      expect(normalizePublisherName("Penguin Publishing")).toBe("penguin");
      expect(normalizePublisherName("Random House Publishers")).toBe(
        "random house",
      );
    });

    it("should remove Books/Press", () => {
      expect(normalizePublisherName("Penguin Books")).toBe("penguin");
      expect(normalizePublisherName("Cambridge University Press")).toBe(
        "cambridge university",
      );
    });

    it("should remove Group/International/Worldwide", () => {
      expect(normalizePublisherName("Hachette Book Group")).toBe("hachette");
      expect(normalizePublisherName("Pearson International")).toBe("pearson");
      expect(normalizePublisherName("McGraw-Hill Worldwide")).toBe(
        "mcgraw-hill",
      );
    });
  });

  describe("formatting", () => {
    it("should remove parenthetical content", () => {
      expect(normalizePublisherName("Penguin (US)")).toBe("penguin");
      expect(normalizePublisherName("Random House (UK)")).toBe("random house");
      expect(normalizePublisherName("O'Reilly Media (Canada)")).toBe(
        "oreilly media",
      );
    });

    it("should remove 'The' at the beginning", () => {
      expect(normalizePublisherName("The Penguin Press")).toBe("penguin");
      expect(normalizePublisherName("THE RANDOM HOUSE")).toBe("random house");
    });

    it("should remove punctuation", () => {
      expect(normalizePublisherName("O'Reilly Media, Inc.")).toBe(
        "oreilly media",
      );
      expect(normalizePublisherName("Simon & Schuster")).toBe("simon schuster");
      expect(normalizePublisherName("Wiley-Blackwell")).toBe("wiley-blackwell");
    });

    it("should handle extra whitespace", () => {
      expect(normalizePublisherName("  Penguin   Books  ")).toBe("penguin");
      expect(normalizePublisherName("Random  House")).toBe("random house");
    });

    it("should be case-insensitive", () => {
      expect(normalizePublisherName("PENGUIN BOOKS")).toBe("penguin");
      expect(normalizePublisherName("Penguin BOOKS")).toBe("penguin");
      expect(normalizePublisherName("PeNgUiN bOoKs")).toBe("penguin");
    });
  });

  describe("complex cases", () => {
    it("should handle multiple transformations", () => {
      expect(normalizePublisherName("The Penguin Publishing Group, Inc.")).toBe(
        "penguin",
      );
      expect(normalizePublisherName("HarperCollins Publishers Ltd. (UK)")).toBe(
        "harpercollins",
      );
      expect(normalizePublisherName("Random House Books Corporation")).toBe(
        "random house",
      );
    });

    it("should handle publishers with apostrophes", () => {
      expect(normalizePublisherName("O'Reilly Media")).toBe("oreilly media");
      expect(normalizePublisherName("St. Martin's Press")).toBe("st martins");
    });

    it("should preserve meaningful hyphens", () => {
      expect(normalizePublisherName("McGraw-Hill Education")).toBe(
        "mcgraw-hill education",
      );
      expect(normalizePublisherName("Wiley-Blackwell")).toBe("wiley-blackwell");
    });
  });

  describe("edge cases", () => {
    it("should handle single-word publishers", () => {
      expect(normalizePublisherName("Penguin")).toBe("penguin");
      expect(normalizePublisherName("Scholastic")).toBe("scholastic");
    });

    it("should handle empty or whitespace-only strings", () => {
      expect(normalizePublisherName("")).toBe("");
      expect(normalizePublisherName("   ")).toBe("");
    });

    it("should handle publishers that are all suffixes", () => {
      expect(normalizePublisherName("Publishing Company Inc.")).toBe("");
      expect(normalizePublisherName("Books Press Ltd.")).toBe("");
    });
  });

  describe("real-world examples", () => {
    it("should normalize common publishers consistently", () => {
      // Penguin variants
      expect(normalizePublisherName("Penguin Books")).toBe("penguin");
      expect(normalizePublisherName("Penguin Publishing")).toBe("penguin");
      expect(normalizePublisherName("The Penguin Press")).toBe("penguin");

      // HarperCollins variants
      expect(normalizePublisherName("HarperCollins")).toBe("harpercollins");
      expect(normalizePublisherName("HarperCollins Publishers")).toBe(
        "harpercollins",
      );
      expect(normalizePublisherName("HarperCollins Publishers Inc.")).toBe(
        "harpercollins",
      );

      // Random House variants
      expect(normalizePublisherName("Random House")).toBe("random house");
      expect(normalizePublisherName("Random House Publishing")).toBe(
        "random house",
      );
      expect(normalizePublisherName("Random House, Inc.")).toBe("random house");
    });
  });
});

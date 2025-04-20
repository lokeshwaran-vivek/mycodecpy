import journalsWithNoUsername, {
  NoUsernameEntry,
} from "./journalsWithNoUsername";
import { describe, test, expect } from "@jest/globals";

describe("journalsWithNoUsername", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "User Prepared": "", // No username
      "Entry Date": new Date("2024-03-17"),
    },
    {
      "Journal Entry Number": "JE002",
      "User Prepared": "Alice", // Has username
      "Entry Date": new Date("2024-03-18"),
    },
    {
      "Journal Entry Number": "JE003",
      "User Prepared": "   ", // Blank (with spaces)
      "Entry Date": new Date("2024-03-17"),
    },
    {
      "Journal Entry Number": "JE004",
      "User Prepared": "David", // Has username
      "Entry Date": new Date("2024-03-19"),
    },
  ];

  // Test Cases
  test("identifies entries with no username", () => {
    const result = journalsWithNoUsername(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          entryDate: new Date("2024-03-17"),
        }),
        expect.objectContaining({
          journalEntryNumber: "JE003",
          entryDate: new Date("2024-03-17"),
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = journalsWithNoUsername([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "User Prepared": index % 2 === 0 ? "" : `User${index}`, // Empty username for even indices
        "Entry Date": new Date(2024, 2, 17 + (index % 7)),
      }));
    const result = journalsWithNoUsername(largeData);
    expect(result.summary.length).toBe(500); // Half of the entries should have no username
    expect(
      result.summary.every(
        (entry) =>
          parseInt(entry.journalEntryNumber.replace("JE", "")) % 2 === 0,
      ),
    ).toBe(true);
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = journalsWithNoUsername(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles whitespace in User Prepared field", () => {
    const whitespaceData = [
      {
        "Journal Entry Number": "JE001",
        "User Prepared": "     ", // Only whitespace
        "Entry Date": new Date("2024-03-17"),
      },
    ];
    const result = journalsWithNoUsername(whitespaceData);
    expect(result.summary.length).toBe(1);
    expect(result.results).toEqual(whitespaceData);
    expect(result.errors).toEqual([]);
  });
});

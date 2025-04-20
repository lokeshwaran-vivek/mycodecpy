import recordWithNoApprovals, {
  UnapprovedEntry,
} from "./recordWithNoApprovals";
import { describe, test, expect } from "@jest/globals";

describe("recordWithNoApprovals", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "User Prepared": "John",
      "User Approved": "", // No approval
      "Entry Date": new Date("2024-03-17"),
    },
    {
      "Journal Entry Number": "JE002",
      "User Prepared": "Alice",
      "User Approved": "Bob", // Has approval
      "Entry Date": new Date("2024-03-18"),
    },
    {
      "Journal Entry Number": "JE003",
      "User Prepared": "Charlie",
      "User Approved": "   ", // Blank (with spaces)
      "Entry Date": new Date("2024-03-17"),
    },
    {
      "Journal Entry Number": "JE004",
      "User Prepared": "David",
      "User Approved": "Eve", // Has approval
      "Entry Date": new Date("2024-03-19"),
    },
  ];

  // Test Cases
  test("identifies entries with no approvals", () => {
    const result = recordWithNoApprovals(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          userPrepared: "John",
          entryDate: new Date("2024-03-17"),
        }),
        expect.objectContaining({
          journalEntryNumber: "JE003",
          userPrepared: "Charlie",
          entryDate: new Date("2024-03-17"),
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = recordWithNoApprovals([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "User Prepared": `User${index}`,
        "User Approved": index % 2 === 0 ? "" : `Approver${index}`, // Empty approval for even indices
        "Entry Date": new Date(2024, 2, 17 + (index % 7)),
      }));
    const result = recordWithNoApprovals(largeData);
    expect(result.summary.length).toBe(500); // Half of the entries should have no approval
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
    const result = recordWithNoApprovals(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles whitespace in User Approved field", () => {
    const whitespaceData = [
      {
        "Journal Entry Number": "JE001",
        "User Prepared": "John",
        "User Approved": "     ", // Only whitespace
        "Entry Date": new Date("2024-03-17"),
      },
    ];
    const result = recordWithNoApprovals(whitespaceData);
    expect(result.summary.length).toBe(1);
    expect(result.results).toEqual(whitespaceData);
    expect(result.errors).toEqual([]);
  });
});

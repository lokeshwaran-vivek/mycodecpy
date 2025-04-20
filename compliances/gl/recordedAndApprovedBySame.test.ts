import recordedAndApprovedBySame, {
  SameUserEntry,
} from "./recordedAndApprovedBySame";
import { describe, test, expect } from "@jest/globals";

describe("recordedAndApprovedBySame", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "User Prepared": "John",
      "User Approved": "John", // Same user
    },
    {
      "Journal Entry Number": "JE002",
      "User Prepared": "Alice",
      "User Approved": "Bob", // Different users
    },
    {
      "Journal Entry Number": "JE003",
      "User Prepared": "Charlie",
      "User Approved": "Charlie", // Same user
    },
    {
      "Journal Entry Number": "JE004",
      "User Prepared": "David",
      "User Approved": "Eve", // Different users
    },
  ];

  // Test Cases
  test("identifies entries recorded and approved by same user", () => {
    const result = recordedAndApprovedBySame(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          userName: "John",
        }),
        expect.objectContaining({
          journalEntryNumber: "JE003",
          userName: "Charlie",
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = recordedAndApprovedBySame([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "User Prepared": `User${index % 2}`,
        "User Approved": `User${index % 2}`, // Same user for even indices
      }));
    const result = recordedAndApprovedBySame(largeData);
    expect(result.summary.length).toBe(1000);
    expect(
      result.summary.every(
        (entry) => entry.userName === "User0" || entry.userName === "User1",
      ),
    ).toBe(true);
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = recordedAndApprovedBySame(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format: Journal Entry Number is missing",
        row: { wrongField: "test" },
      }),
      expect.objectContaining({
        message: "Invalid GL entry format: User Prepared is missing",
        row: { wrongField: "test" },
      }),
      expect.objectContaining({
        message: "Invalid GL entry format: User Approved is missing",
        row: { wrongField: "test" },
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles case sensitivity correctly", () => {
    const caseSensitiveData = [
      {
        "Journal Entry Number": "JE001",
        "User Prepared": "John",
        "User Approved": "JOHN", // Different case
      },
    ];
    const result = recordedAndApprovedBySame(caseSensitiveData);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual(caseSensitiveData);
    expect(result.errors).toEqual([]);
  });
});

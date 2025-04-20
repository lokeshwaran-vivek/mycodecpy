import repeatingNumbersJournal, {
  RepeatingNumberEntry,
  RepeatingNumbersConfig,
} from "./repeatingNumbersJournal";
import { describe, test, expect } from "@jest/globals";

describe("repeatingNumbersJournal", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "Entry Date": new Date("2024-03-17"),
      "Debit In Reporting Currency": 123455555, // Last 5 digits are all 5s
      "Credit In Reporting Currency": 987654321, // No repeating last digits
      "User Prepared": "John",
    },
    {
      "Journal Entry Number": "JE002",
      "Entry Date": new Date("2024-03-18"),
      "Debit In Reporting Currency": 123456789, // No repeating last digits
      "Credit In Reporting Currency": 654333333, // Last 5 digits are all 3s
      "User Prepared": "Alice",
    },
    {
      "Journal Entry Number": "JE003",
      "Entry Date": new Date("2024-03-17"),
      "Debit In Reporting Currency": 123454444, // Last 4 digits are all 4s
      "Credit In Reporting Currency": 87644444, // Last 5 digits are not all the same
      "User Prepared": "Bob",
    },
    {
      "Journal Entry Number": "JE004",
      "Entry Date": new Date("2024-03-19"),
      "Debit In Reporting Currency": 33333, // All 5 digits are 3s
      "Credit In Reporting Currency": 99999, // All 5 digits are 9s
      "User Prepared": "Charlie",
    },
  ];

  // Test Cases
  test("identifies entries with repeating last n digits", () => {
    const result = repeatingNumbersJournal(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          entryDate: new Date("2024-03-17"),
          userPrepared: "John",
          debitAmount: 123455555,
          creditAmount: 987654321,
          repeatingDigits: {
            debit: "55555",
            credit: null,
          },
        }),
        expect.objectContaining({
          journalEntryNumber: "JE002",
          entryDate: new Date("2024-03-18"),
          userPrepared: "Alice",
          debitAmount: 123456789,
          creditAmount: 654333333,
          repeatingDigits: {
            debit: null,
            credit: "33333",
          },
        }),
        expect.objectContaining({
          journalEntryNumber: "JE004",
          entryDate: new Date("2024-03-19"),
          userPrepared: "Charlie",
          debitAmount: 33333,
          creditAmount: 99999,
          repeatingDigits: {
            debit: "33333",
            credit: "99999",
          },
        }),
      ]),
    );
    expect(result.errors).toEqual([]);
  });

  test("handles custom digit count", () => {
    const config: RepeatingNumbersConfig = { digitCount: 4 };
    const result = repeatingNumbersJournal(sampleGLData, config);
    
    // Should now include JE003 since it has 4 repeating 4s at the end
    expect(result.summary).toContainEqual(
      expect.objectContaining({
        journalEntryNumber: "JE003",
        repeatingDigits: {
          debit: "4444",
          credit: null,
        },
      })
    );
    
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = repeatingNumbersJournal([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "Entry Date": new Date(2024, 2, 17 + (index % 7)),
        "Debit In Reporting Currency": index % 2 === 0 ? 123455555 : 987654321,
        "Credit In Reporting Currency": index % 3 === 0 ? 876543333 : 987654321,
        "User Prepared": `User${index}`,
      }));
    const result = repeatingNumbersJournal(largeData);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(
      result.summary.every(
        (entry) =>
          entry.repeatingDigits.debit !== null ||
          entry.repeatingDigits.credit !== null,
      ),
    ).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = repeatingNumbersJournal(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid configuration", () => {
    const result = repeatingNumbersJournal(sampleGLData, { digitCount: 0 });
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "digitCount must be greater than 0",
      }),
    ]);
  });
});

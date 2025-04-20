import holidayEntries, {
  HolidayEntriesConfig,
  HolidayEntry,
} from "./holidayEntries";
import { describe, test, expect } from "@jest/globals";

describe("holidayEntries", () => {
  // Test Data
  const sampleGLData = [
    {
      "Journal Entry Number": "JE001",
      "Entry Date": new Date("2024-03-17"), // Sunday
      "User Prepared": "John",
    },
    {
      "Journal Entry Number": "JE002",
      "Entry Date": new Date("2024-03-18"), // Monday
      "User Prepared": "Alice",
    },
    {
      "Journal Entry Number": "JE003",
      "Entry Date": new Date("2024-03-23"), // Saturday
      "User Prepared": "Bob",
    },
    {
      "Journal Entry Number": "JE004",
      "Entry Date": new Date("2024-03-24"), // Sunday
      "User Prepared": "Charlie",
    },
  ];

  // Test Cases
  test("identifies entries made on Sundays (default)", () => {
    const result = holidayEntries(sampleGLData);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryNumber: "JE001",
          entryDate: new Date("2024-03-17"),
          userPrepared: "John",
          dayOfWeek: "Sunday",
          isHoliday: true,
          isSunday: true,
        }),
        expect.objectContaining({
          journalEntryNumber: "JE004",
          entryDate: new Date("2024-03-24"),
          userPrepared: "Charlie",
          dayOfWeek: "Sunday",
          isHoliday: true,
          isSunday: true,
        }),
      ]),
    );
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("identifies entries made on specified holidays", () => {
    const config: HolidayEntriesConfig = { holidayDays: [6] }; // Saturday
    const result = holidayEntries(sampleGLData, config);
    expect(result.summary).toEqual([
      expect.objectContaining({
        journalEntryNumber: "JE003",
        entryDate: new Date("2024-03-23"),
        userPrepared: "Bob",
        dayOfWeek: "Saturday",
        isHoliday: true,
        isSunday: false,
      }),
    ]);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles multiple holiday days", () => {
    const config: HolidayEntriesConfig = { holidayDays: [0, 6] }; // Saturday and Sunday
    const result = holidayEntries(sampleGLData, config);
    expect(result.summary.length).toBe(3);
    expect(
      result.summary.every(
        (entry) =>
          entry.dayOfWeek === "Sunday" || entry.dayOfWeek === "Saturday",
      ),
    ).toBe(true);
    expect(result.results).toEqual(sampleGLData);
    expect(result.errors).toEqual([]);
  });

  test("handles empty input array", () => {
    const result = holidayEntries([]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test("handles large dataset", () => {
    const largeData = Array(1000)
      .fill(null)
      .map((_, index) => ({
        "Journal Entry Number": `JE${index}`,
        "Entry Date": new Date(2024, 2, 17 + (index % 7)), // Starting from a Sunday
        "User Prepared": `User${index}`,
      }));
    const result = holidayEntries(largeData);
    expect(result.summary.every((entry) => entry.dayOfWeek === "Sunday")).toBe(
      true,
    );
    expect(result.results).toEqual(largeData);
    expect(result.errors).toEqual([]);
  });

  test("handles invalid input", () => {
    const invalidData = [{ wrongField: "test" }] as any;
    const result = holidayEntries(invalidData);
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "Invalid GL entry format",
      }),
    ]);
    expect(result.summary).toEqual([]);
    expect(result.results).toEqual([]);
  });

  test("handles invalid holiday days", () => {
    const result = holidayEntries(sampleGLData, { holidayDays: [7] });
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "holidayDays must be between 0 and 6",
      }),
    ]);
  });

  test("handles empty holiday days array", () => {
    const result = holidayEntries(sampleGLData, { holidayDays: [] });
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: "holidayDays must be a non-empty array",
      }),
    ]);
  });
});

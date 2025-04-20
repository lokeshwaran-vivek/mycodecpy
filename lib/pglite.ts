import { PGlite } from "@electric-sql/pglite";
import { removeSpacesAndAddUnderscore } from "./utils";
import { formatDate } from "date-fns";

// Singleton instance
let pgliteInstance: PGlite | null = null;

export const initializePGLite = async () => {
  if (!pgliteInstance) {
    try {
      pgliteInstance = new PGlite();
    } catch (error) {
      console.error("Error initializing PGlite:", error);
      throw error;
    }
  }
  return pgliteInstance;
};

const getSqlType = (type: string) => {
  const lowerType = type.toLowerCase();
  switch (lowerType) {
    case "string":
    case "text":
    case "json":
    case "array":
    case "object":
      return "TEXT";
    case "number":
    case "integer":
      return "INTEGER";
    case "boolean":
      return "BOOLEAN";
    case "date":
    case "datetime":
      return "DATE";
    case "float":
    case "double":
    case "decimal":
    case "real":
      return "REAL";
    case "blob":
      return "BLOB";
    case "null":
      return "NULL";
    default:
      return "TEXT"; // Default to TEXT for unknown types
  }
};

const formatDateForSql = (date: Date | string) => {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return formatDate(dateObj, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return null; // Or handle the error as needed, e.g., return null or a default date string
  }
};

export const createTable = async (
  db: PGlite,
  tableName: string,
  fields: { name: string; type: string }[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[][],
) => {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY, ${fields
      .map(
        (field) =>
          `${removeSpacesAndAddUnderscore(field.name)} ${getSqlType(field.type)}`,
      )
      .join(", ")})`;
    await db.exec(sql);

    for (const row of data) {
      const values = row.map((item, index) => {
        const field = fields[index];
        if (item === undefined || item === null || item === "") {
          return "null";
        }

        const fieldType = field.type.toLowerCase();
        if (fieldType === "date" || fieldType === "datetime") {
          const formattedDate = formatDateForSql(item);
          return formattedDate ? `'${formattedDate}'` : "null"; // Handle date formatting errors
        } else if (fieldType === "number" || fieldType === "integer") {
          const num = parseFloat(String(item).replace(/,/g, ""));
          return isNaN(num) ? "null" : num; // Handle invalid numbers
        } else {
          return `'${String(item).replace(/'/g, "''")}'`; // Escape single quotes in strings
        }
      });

      const sql = `INSERT INTO ${tableName} (${fields
        .map((field) => removeSpacesAndAddUnderscore(field.name))
        .join(", ")}) VALUES (${values.join(", ")})`;
      await db.exec(sql);
    }
  } catch (error) {
    console.error("Error creating table or inserting data:", error);
    // Handle error appropriately, e.g., throw error, return error status, etc.
    throw error; // Re-throwing for now to propagate the error
  }
};

export const extractSchema = async (db: PGlite, tableName: string) => {
  const query = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
  `;

  const result = await db.exec(query);
  return result[0]?.rows || [];
};

export const executeQuery = async (db: PGlite, query: string) => {
  const result = await db.exec(query);
  return result[0]?.rows || [];
};

export const flushDatabase = async (db: PGlite) => {
  try {
    // Get all tables in the current schema
    const tablesQuery = `
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    const result = await db.exec(tablesQuery);
    const tables = result[0]?.rows || [];

    // Drop each table
    for (const tableRow of tables) {
      const tableName = tableRow.tablename;
      if (tableName) {
        // Use CASCADE to automatically drop dependent objects (like constraints)
        await db.exec(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      }
    }

    // Reset all sequences
    const sequencesQuery = `
      SELECT c.relname as name
      FROM pg_class c
      WHERE c.relkind = 'S'
    `;
    const sequencesResult = await db.exec(sequencesQuery);
    const sequences = sequencesResult[0]?.rows || [];

    for (const seqRow of sequences) {
      const seqName = seqRow.name;
      if (seqName) {
        await db.exec(`ALTER SEQUENCE "${seqName}" RESTART WITH 1`);
      }
    }
  } catch (error) {
    console.error("Error flushing database:", error);
    // Silently fail rather than throwing another error during cleanup
  }
};

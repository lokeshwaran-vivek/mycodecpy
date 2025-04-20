import * as fs from "fs";
import * as os from "os";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import { parse as csvParse } from "csv-parse";
import ExcelJS from "exceljs";
import { log } from "./utils/log";
import archiver from "archiver";

// Initialize S3 client with increased timeout
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  requestHandler: {
    timeout: 300000, // 5 minute timeout for large files
  },
});

// Helper function to convert a stream to a buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// Function to validate Excel file format
async function validateExcelFile(filePath: string): Promise<{
  isValid: boolean;
  fileType: "xlsx" | "xls" | "unknown";
  message: string;
}> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        fileType: "unknown",
        message: "File does not exist",
      };
    }

    // Check file size (should be more than a few bytes)
    const stats = fs.statSync(filePath);
    if (stats.size < 100) {
      return {
        isValid: false,
        fileType: "unknown",
        message: "File too small to be valid Excel file",
      };
    }

    // Read first few bytes to determine file type
    const fileHandle = await fs.promises.open(filePath, "r");
    const headerBuffer = Buffer.alloc(8);
    await fileHandle.read(headerBuffer, 0, 8, 0);

    // For ZIP file validation, check for the End of Central Directory Record
    // It's near the end of the file and has a specific signature (0x06054b50)
    // This check helps identify truncated or corrupted ZIP files
    if (headerBuffer[0] === 0x50 && headerBuffer[1] === 0x4b) {
      // Check for ZIP central directory signature
      // Start looking from the end of the file
      const maxReadSize = Math.min(stats.size, 4096); // Read at most 4KB from the end
      const endBuffer = Buffer.alloc(maxReadSize);

      // Read the last chunk of the file to look for the central directory signature
      await fileHandle.read(
        endBuffer,
        0,
        maxReadSize,
        Math.max(0, stats.size - maxReadSize)
      );
      await fileHandle.close();

      // Search for end of central directory signature (0x06054b50 in little-endian)
      let hasCentralDirSignature = false;
      for (let i = 0; i < endBuffer.length - 4; i++) {
        if (
          endBuffer[i] === 0x50 &&
          endBuffer[i + 1] === 0x4b &&
          endBuffer[i + 2] === 0x05 &&
          endBuffer[i + 3] === 0x06
        ) {
          hasCentralDirSignature = true;
          break;
        }
      }

      if (!hasCentralDirSignature) {
        return {
          isValid: false,
          fileType: "xlsx",
          message:
            "ZIP file structure is corrupted - missing end of central directory. The file may be incomplete or corrupted.",
        };
      }

      // Additional check - try to read as workbook
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        return { isValid: true, fileType: "xlsx", message: "Valid XLSX file" };
      } catch (error) {
        // The file might be a ZIP file but not a valid XLSX
        return {
          isValid: false,
          fileType: "xlsx",
          message: `File has XLSX signature but cannot be read: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }
    // XLS files start with D0CF11E0 (OLE compound document)
    else if (
      headerBuffer[0] === 0xd0 &&
      headerBuffer[1] === 0xcf &&
      headerBuffer[2] === 0x11 &&
      headerBuffer[3] === 0xe0
    ) {
      await fileHandle.close();
      return {
        isValid: false,
        fileType: "xls",
        message:
          "XLS format detected - this older format is not supported by ExcelJS. Please convert to XLSX.",
      };
    } else {
      await fileHandle.close();
      return {
        isValid: false,
        fileType: "unknown",
        message: "File does not appear to be an Excel file",
      };
    }
  } catch (error) {
    return {
      isValid: false,
      fileType: "unknown",
      message: `Error validating file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Function to get headers from a file in S3
export const getFileHeadersFromS3 = async (
  bucket: string,
  key: string
): Promise<string[]> => {
  const fileName = path.basename(key).toLowerCase();

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty file body received from S3");
    }

    if (fileName.endsWith(".csv")) {
      // For CSV, we can stream and just read the first line
      const stream = response.Body as Readable;
      let firstLine = "";

      // Create a transform stream that will capture just the first line
      const firstLineTransform = new Transform({
        transform(chunk, encoding, callback) {
          const data = chunk.toString();
          const newlineIndex = data.indexOf("\n");

          if (newlineIndex !== -1) {
            // We found a newline, so we have our header
            firstLine += data.slice(0, newlineIndex);
            // End the stream early - we only need the header
            this.push(null);
            callback(null, null);
          } else {
            // No newline yet, keep accumulating
            firstLine += data;
            callback(null, null);
          }
        },
      });

      try {
        await pipeline(stream, firstLineTransform);
        const headers = firstLine
          .split(",")
          .map((header: string) => header.trim());
        return headers;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to read CSV headers: ${errorMessage}`);
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      try {
        console.log(`Processing Excel file: ${key}`);

        // Create a temp file path
        const tmpDir = os.tmpdir();
        const tempFilePath = path.join(
          tmpDir,
          `excel-header-${Date.now()}.xlsx`
        );

        try {
          // Stream directly to temp file
          await streamS3ToFile(response.Body as Readable, tempFilePath);
          console.log(`Excel file saved to temp location: ${tempFilePath}`);

          // Validate the Excel file before processing
          const validation = await validateExcelFile(tempFilePath);
          console.log(`File validation result: ${validation.message}`);

          if (!validation.isValid) {
            if (validation.fileType === "xls") {
              throw new Error(
                "Legacy XLS format is not supported. Please convert the file to XLSX format before uploading."
              );
            } else {
              throw new Error(`Invalid Excel file: ${validation.message}`);
            }
          }

          // Now read the headers using ExcelJS from the file
          const workbook = new ExcelJS.Workbook();

          // Use basic options - ExcelJS doesn't support many optimization options
          await workbook.xlsx.readFile(tempFilePath);

          console.log(
            `Workbook loaded with ${workbook.worksheets.length} worksheets`
          );

          // Get the first worksheet
          const worksheet = workbook.worksheets[0];

          if (!worksheet) {
            throw new Error("Excel worksheet not found");
          }

          console.log(`Processing worksheet: ${worksheet.name}`);

          // Extract headers from the first row
          const headers: string[] = [];

          // Get the first row (headers)
          const headerRow = worksheet.getRow(1);

          // Extract cell values
          headerRow.eachCell((cell) => {
            headers.push(cell.value ? String(cell.value).trim() : "");
          });

          console.log(
            `Successfully extracted ${headers.length} headers from Excel file`
          );

          return headers;
        } finally {
          // Clean up the temp file
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log(`Temp header file removed: ${tempFilePath}`);
            }
          } catch (cleanupError) {
            console.error("Failed to clean up temp header file:", cleanupError);
          }
        }
      } catch (error: unknown) {
        console.error("Excel header extraction error details:", error);

        // Add information about the error type
        let errorInfo = "Unknown error";
        if (error instanceof Error) {
          errorInfo = `${error.name}: ${error.message}`;
          if (error.stack) {
            console.error("Error stack:", error.stack);
          }
        } else {
          errorInfo = String(error);
        }

        throw new Error(`Failed to parse Excel headers: ${errorInfo}`);
      }
    } else {
      throw new Error("Unsupported file type");
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process file from S3: ${errorMessage}`);
  }
};

// Server-side function to process uploaded files from S3
export const processS3File = async (
  bucket: string,
  key: string
): Promise<string[]> => {
  // Add cache for headers to avoid multiple downloads for the same file
  const cacheKey = `${bucket}:${key}:headers`;
  const cachedHeaders = globalHeadersCache.get(cacheKey);
  if (cachedHeaders) {
    return cachedHeaders as string[];
  }

  try {
    // Instead of retrying the full operation, we'll fetch the headers directly with minimal processing
    // This is much faster for UI responsiveness
    const fileName = path.basename(key).toLowerCase();

    if (fileName.endsWith(".csv")) {
      try {
        const headers = await fetchCsvHeaders(bucket, key);
        globalHeadersCache.set(cacheKey, headers, 60 * 5); // Cache for 5 minutes
        return headers;
      } catch (error) {
        log({
          message: `Failed to fetch CSV headers: ${error}`,
          type: "error",
        });
        // If CSV fast path fails, fall back to old method
        const headers = await getFileHeadersFromS3(bucket, key);
        globalHeadersCache.set(cacheKey, headers, 60 * 5);
        return headers;
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      try {
        const headers = await fetchExcelHeadersOptimized(bucket, key);
        globalHeadersCache.set(cacheKey, headers, 60 * 5);
        return headers;
      } catch (error) {
        log({
          message: `Failed to fetch Excel headers: ${error}`,
          type: "error",
        });
        // If optimized method fails, fall back to old method
        const headers = await getFileHeadersFromS3(bucket, key);
        globalHeadersCache.set(cacheKey, headers, 60 * 5);
        return headers;
      }
    } else {
      throw new Error(
        "Unsupported file type. Only CSV and Excel files are supported."
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error processing S3 file: ${errorMessage}`);
  }
};

// Simple in-memory cache with TTL
class SimpleCache {
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();

  set(key: string, value: unknown, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const globalHeadersCache = new SimpleCache();

// Optimized function to fetch CSV headers with minimal processing
async function fetchCsvHeaders(bucket: string, key: string): Promise<string[]> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    Range: "bytes=0-8192", // Get only first 8KB to parse headers
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error("Empty file body received from S3");
  }

  const stream = response.Body as Readable;
  const buffer = await streamToBuffer(stream);
  const content = buffer.toString("utf-8");

  // Find the first line break
  const firstLineEnd = content.indexOf("\n");
  if (firstLineEnd === -1) {
    // If no line break found, use the whole content (small file)
    return content.split(",").map((h: string) => h.trim());
  }

  // Extract just the header line
  const headerLine = content.substring(0, firstLineEnd);
  return headerLine.split(",").map((h: string) => h.trim());
}

// Optimized function to stream S3 data to a file with better performance
async function streamS3ToFile(
  stream: Readable,
  filePath: string,
  timeoutMs: number = 60000
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(
        new Error(`File download timed out after ${timeoutMs / 1000} seconds`)
      );
    }, timeoutMs);

    // Create write stream with high watermark for better performance
    const fileStream = fs.createWriteStream(filePath, {
      highWaterMark: 1024 * 1024, // 1MB buffer for better performance
    });

    // Handle stream events
    stream.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    fileStream.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    fileStream.on("finish", () => {
      clearTimeout(timeout);
      resolve();
    });

    // Pipe with backpressure handling
    stream.pipe(fileStream);
  });
}

// Optimized function to fetch Excel headers with minimal file operations
async function fetchExcelHeadersOptimized(
  bucket: string,
  key: string
): Promise<string[]> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error("Empty file body received from S3");
  }

  // Create a temp file path with more unique name to avoid conflicts
  const tmpDir = os.tmpdir();
  const uniqueId =
    Date.now() + "-" + Math.random().toString(36).substring(2, 15);
  const tempFilePath = path.join(tmpDir, `excel-header-${uniqueId}.xlsx`);

  try {
    // Stream directly to temp file with reduced logging and faster performance
    await streamS3ToFile(response.Body as Readable, tempFilePath, 30000); // 30 second timeout for headers

    // Read only the first worksheet's first row using ExcelJS with optimized options
    const workbook = new ExcelJS.Workbook();

    // Use basic options - ExcelJS doesn't support many optimization options
    await workbook.xlsx.readFile(tempFilePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Excel worksheet not found");
    }

    // Extract headers from the first row
    const headers: string[] = [];

    // Get the first row (headers)
    const headerRow = worksheet.getRow(1);

    // Extract cell values
    headerRow.eachCell((cell) => {
      headers.push(cell.value ? String(cell.value).trim() : "");
    });

    return headers;
  } finally {
    // Clean up the temp file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      log({
        message: `Failed to clean up temp file: ${cleanupError}`,
        type: "error",
      });
    }
  }
}

/**
 * Process CSV file from S3 using streaming
 * @param bucket S3 bucket name
 * @param key S3 object key
 * @param processChunk Function to process each chunk of data
 * @param onComplete Function called when processing is complete
 */
export const processCsvStreamFromS3 = async (
  bucket: string,
  key: string,
  processChunk: (rows: Record<string, string>[]) => Promise<void>,
  onComplete?: (totalRows: number) => Promise<void>
): Promise<void> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty file body received from S3");
    }

    const stream = response.Body as Readable;

    // Create parser stream
    const parser = csvParse({
      columns: true, // Auto-detect columns from header row
      trim: true, // Trim whitespace
      skip_empty_lines: true,
    });

    // Track batch of records and total row count
    let batch: Record<string, string>[] = [];
    const BATCH_SIZE = 1000; // Process in batches of 1000 records
    let totalRows = 0;

    // Create transform stream to process records in batches
    const processingStream = new Transform({
      objectMode: true,
      async transform(row, encoding, callback) {
        // Clean up row data
        const processedRow: Record<string, string> = {};
        for (const key in row) {
          if (Object.prototype.hasOwnProperty.call(row, key)) {
            let value = row[key];
            if (value === "-" || value === "0") {
              value = "0";
            }
            processedRow[key.trim()] = value;
          }
        }

        batch.push(processedRow);
        totalRows++;

        // When batch size is reached, process the batch
        if (batch.length >= BATCH_SIZE) {
          try {
            await processChunk([...batch]);
            batch = []; // Clear batch after processing
            callback(null, null); // Don't pass data downstream, just process
          } catch (error: unknown) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            callback(err);
          }
        } else {
          callback(null, null);
        }
      },
      async flush(callback) {
        // Process any remaining records in the batch
        if (batch.length > 0) {
          try {
            await processChunk([...batch]);
            batch = [];
          } catch (error: unknown) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            return callback(err);
          }
        }

        // Call onComplete if provided
        if (onComplete) {
          try {
            await onComplete(totalRows);
          } catch (error: unknown) {
            const err =
              error instanceof Error ? error : new Error(String(error));
            return callback(err);
          }
        }

        callback(null);
      },
    });

    // Run the pipeline
    await pipeline(stream, parser, processingStream);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process CSV stream from S3: ${errorMessage}`);
  }
};

/**
 * Process Excel file from S3 using ExcelJS
 */
export const processExcelFromS3 = async (
  bucket: string,
  key: string,
  processChunk: (rows: Record<string, string>[]) => Promise<void>,
  onComplete?: (totalRows: number) => Promise<void>
): Promise<void> => {
  try {
    // First, get the headers to understand the structure
    const headers = await getFileHeadersFromS3(bucket, key);
    console.log(`Headers extracted: ${headers.join(", ")}`);

    // Set up the S3 command
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty file body received from S3");
    }

    // For Excel, we need to:
    // 1. Stream to a temporary file (large files can't be processed in memory)
    // 2. Use ExcelJS to process it with row streaming

    // Create a temp file path
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `excel-${Date.now()}.xlsx`);

    try {
      // Stream to temp file
      await streamS3ToFile(response.Body as Readable, tempFilePath);
      console.log(`Excel file saved to temp location: ${tempFilePath}`);

      // Validate the Excel file before processing
      const validation = await validateExcelFile(tempFilePath);
      console.log(`File validation result: ${validation.message}`);

      if (!validation.isValid) {
        if (validation.fileType === "xls") {
          throw new Error(
            "Legacy XLS format is not supported. Please convert the file to XLSX format before uploading."
          );
        } else {
          throw new Error(`Invalid Excel file: ${validation.message}`);
        }
      }

      // Process the Excel file using ExcelJS's stream reader
      const workbook = new ExcelJS.Workbook();

      // Validate the file exists
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temp file not found: ${tempFilePath}`);
      }

      // Load the workbook
      await workbook.xlsx.readFile(tempFilePath);

      console.log(
        `Workbook loaded with ${workbook.worksheets.length} worksheets`
      );

      let totalRows = 0;

      // Process each worksheet
      for (const worksheet of workbook.worksheets) {
        console.log(`Processing worksheet: ${worksheet.name}`);

        // Get the header row
        const headerRow = worksheet.getRow(1);
        const sheetHeaders: string[] = [];

        // Extract header values
        headerRow.eachCell((cell) => {
          sheetHeaders.push(cell.value ? String(cell.value).trim() : "");
        });

        // Check if headers match (ignoring case and whitespace)
        const normalizedSheetHeaders = sheetHeaders.map((h) => h.toLowerCase());
        const normalizedInputHeaders = headers.map((h) => h.toLowerCase());

        const headersMatch =
          normalizedInputHeaders.length === normalizedSheetHeaders.length &&
          normalizedInputHeaders.every(
            (h, i) => normalizedSheetHeaders[i] === h
          );

        if (headersMatch) {
          console.log(`Found matching headers in worksheet: ${worksheet.name}`);

          // Process in batches
          const BATCH_SIZE = 500;
          let currentBatch: Record<string, string>[] = [];

          // Go through rows (starting from row 2 to skip headers)
          for (
            let rowNumber = 2;
            rowNumber <= worksheet.rowCount;
            rowNumber++
          ) {
            const row = worksheet.getRow(rowNumber);

            // Skip empty rows
            if (row.cellCount === 0) continue;

            const rowData: Record<string, string> = {};

            // Map each cell to its corresponding header
            for (let i = 0; i < sheetHeaders.length; i++) {
              // Excel columns are 1-indexed
              const cell = row.getCell(i + 1);
              let value = "";

              // Handle different types of cell values
              if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === "object" && "result" in cell.value) {
                  // Formula result
                  value = String(cell.value.result || "");
                } else if (
                  typeof cell.value === "object" &&
                  "text" in cell.value
                ) {
                  // Rich text
                  value = String(cell.value.text || "");
                } else if (cell.value instanceof Date) {
                  // Format dates as ISO strings
                  value = cell.value.toISOString().split("T")[0]; // YYYY-MM-DD
                } else {
                  // Normal value
                  value = String(cell.value);
                }
              }

              // Clean up value
              if (value === "-" || value === "0") {
                value = "0";
              }

              rowData[sheetHeaders[i]] = value.trim();
            }

            // Add to current batch
            currentBatch.push(rowData);

            // Process batch if it reaches the limit
            if (currentBatch.length >= BATCH_SIZE) {
              await processChunk([...currentBatch]);
              totalRows += currentBatch.length;
              currentBatch = [];

              // Let the event loop breathe
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }

          // Process any remaining rows
          if (currentBatch.length > 0) {
            await processChunk([...currentBatch]);
            totalRows += currentBatch.length;
          }
        }
      }

      // Call onComplete callback if provided
      if (onComplete) {
        await onComplete(totalRows);
      }

      console.log(
        `Excel processing complete. Total rows processed: ${totalRows}`
      );
    } finally {
      // Clean up the temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`Temp file removed: ${tempFilePath}`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to delete temp file: ${errorMessage}`);
      }
    }
  } catch (error: unknown) {
    console.error("Excel processing error details:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process Excel file from S3: ${errorMessage}`);
  }
};

// Add a specialized function for large Excel files
export const processLargeExcelFile = async (
  bucket: string,
  key: string,
  processChunk: (rows: Record<string, string>[]) => Promise<void>,
  onComplete?: (totalRows: number) => Promise<void>
): Promise<void> => {
  try {
    console.log(`Processing large Excel file: ${key}`);

    // Get the S3 object
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty file body received from S3");
    }

    // Create a temp file path
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `large-excel-${Date.now()}.xlsx`);

    try {
      // Stream directly to disk with progress reporting
      console.log(`Downloading file to temp location: ${tempFilePath}`);
      await streamS3ToFile(response.Body as Readable, tempFilePath, 900000); // 15 minute timeout
      console.log(`Download complete: ${tempFilePath}`);

      // Get file size
      const stats = fs.statSync(tempFilePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);

      // For very large files, we need a different approach
      const LARGE_FILE_THRESHOLD = 30; // MB

      if (fileSizeMB > LARGE_FILE_THRESHOLD) {
        console.log(
          `File exceeds ${LARGE_FILE_THRESHOLD}MB, using row-by-row processing`
        );

        // For large files, process in smaller chunks with more aggressive GC
        // and use a more memory-efficient approach
        let totalRows = 0;

        // First, read the headers only
        const workbook = new ExcelJS.Workbook();

        // Read the workbook with default options - ExcelJS will handle memory efficiency
        await workbook.xlsx.readFile(tempFilePath);

        for (const worksheet of workbook.worksheets) {
          console.log(`Processing large worksheet: ${worksheet.name}`);

          // Get headers from the first row
          const headers: string[] = [];
          worksheet.getRow(1).eachCell((cell) => {
            headers.push(cell.value ? String(cell.value).trim() : "");
          });

          if (headers.length === 0) {
            console.warn(
              `No headers found in worksheet: ${worksheet.name}, skipping`
            );
            continue;
          }

          console.log(`Headers: ${headers.join(", ")}`);

          // Process in small batches to avoid memory issues
          const SMALL_BATCH_SIZE = 100;
          let currentBatch: Record<string, string>[] = [];

          // Process row by row starting from row 2 (after headers)
          for (
            let rowNumber = 2;
            rowNumber <= worksheet.rowCount;
            rowNumber++
          ) {
            const row = worksheet.getRow(rowNumber);

            // Skip truly empty rows
            if (row.cellCount === 0) continue;

            const rowData: Record<string, string> = {};
            let hasData = false;

            // Map each cell to its corresponding header
            for (let i = 0; i < headers.length; i++) {
              // Excel columns are 1-indexed
              const cell = row.getCell(i + 1);
              let value = "";

              // Handle different cell value types
              if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === "object" && "result" in cell.value) {
                  value = String(cell.value.result || "");
                } else if (
                  typeof cell.value === "object" &&
                  "text" in cell.value
                ) {
                  value = String(cell.value.text || "");
                } else if (cell.value instanceof Date) {
                  value = cell.value.toISOString().split("T")[0];
                } else {
                  value = String(cell.value);
                }

                if (value.trim()) {
                  hasData = true;
                }
              }

              // Clean up value
              if (value === "-" || value === "0") {
                value = "0";
              }

              rowData[headers[i]] = value.trim();
            }

            // Only add non-empty rows
            if (hasData) {
              currentBatch.push(rowData);
            }

            // Process batch if it reaches the limit
            if (currentBatch.length >= SMALL_BATCH_SIZE) {
              await processChunk([...currentBatch]);
              totalRows += currentBatch.length;
              currentBatch = [];

              // Force garbage collection if available
              if (global.gc) {
                try {
                  global.gc();
                } catch {
                  // Ignore if gc is not available
                }
              }

              // Let the event loop breathe
              await new Promise((resolve) => setTimeout(resolve, 0));

              // Log progress for large files
              if (totalRows % 5000 === 0) {
                console.log(`Processed ${totalRows} rows so far...`);
              }
            }
          }

          // Process any remaining rows
          if (currentBatch.length > 0) {
            await processChunk([...currentBatch]);
            totalRows += currentBatch.length;
            currentBatch = [];
          }
        }

        // Call onComplete callback if provided
        if (onComplete) {
          await onComplete(totalRows);
        }

        console.log(
          `Large Excel processing complete. Total rows processed: ${totalRows}`
        );
      } else {
        // Use normal processing for smaller files
        await processExcelFromS3(bucket, key, processChunk, onComplete);
      }
    } finally {
      // Clean up the temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`Temp file removed: ${tempFilePath}`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to delete temp file: ${errorMessage}`);
      }
    }
  } catch (error: unknown) {
    console.error("Large Excel processing error details:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process large Excel file: ${errorMessage}`);
  }
};

// Update the main processLargeFileFromS3 function to use our specialized handler
export const processLargeFileFromS3 = async (
  bucket: string,
  key: string,
  processChunk: (rows: Record<string, string>[]) => Promise<void>,
  onComplete?: (totalRows: number) => Promise<void>
): Promise<void> => {
  const fileName = path.basename(key).toLowerCase();

  try {
    if (fileName.endsWith(".csv")) {
      // Use streaming approach for CSV
      await processCsvStreamFromS3(bucket, key, processChunk, onComplete);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Use our new specialized handler for large Excel files
      await processLargeExcelFile(bucket, key, processChunk, onComplete);
    } else {
      throw new Error(
        "Unsupported file type. Only CSV and Excel files are supported."
      );
    }
  } catch (error: unknown) {
    console.error("Large file processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process large file: ${errorMessage}`);
  }
};

/**
 * Reads and processes the entire content of a file from S3
 * NOTE: This method is not recommended for large files (>100MB).
 * Use processLargeFileFromS3 instead for large files.
 */
export const readContentFromS3 = async (
  bucket: string,
  key: string
): Promise<Record<string, string>[] | null> => {
  const fileName = path.basename(key).toLowerCase();

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty file body received from S3");
    }

    if (fileName.endsWith(".csv")) {
      // Process CSV file with streaming approach
      const tmpDir = os.tmpdir();
      const tempFilePath = path.join(tmpDir, `csv-read-${Date.now()}.csv`);

      try {
        // Stream directly to temp file
        await streamS3ToFile(response.Body as Readable, tempFilePath);
        console.log(
          `CSV file saved to temp location for reading: ${tempFilePath}`
        );

        // Read the file contents
        const data = fs.readFileSync(tempFilePath, "utf-8");
        let lines = data.split("\n");

        if (lines.length === 0) {
          return null;
        }

        const headers = lines[0]
          .split(",")
          .map((header: string) => header.trim());

        if (headers.length === 0) {
          throw new Error("Could not parse headers from CSV");
        }

        lines = lines.slice(1); // Remove header line
        const jsonData: Record<string, string>[] = [];

        for (const line of lines) {
          if (line.trim() === "") {
            continue; // Skip empty lines
          }

          const cells = line.split(",").map((cell) => cell.trim());
          const rowObject: Record<string, string> = {};

          for (let i = 0; i < headers.length; i++) {
            let cellValue = cells[i] || "";
            if (cellValue === "-" || cellValue === "0") {
              cellValue = "0";
            }
            rowObject[headers[i]] = cellValue;
          }

          jsonData.push(rowObject);
        }

        return jsonData;
      } finally {
        // Clean up the temp file
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Temp CSV file removed: ${tempFilePath}`);
          }
        } catch (cleanupError) {
          console.error("Failed to clean up temp CSV file:", cleanupError);
        }
      }
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Create a temp file path for Excel processing
      const tmpDir = os.tmpdir();
      const tempFilePath = path.join(tmpDir, `excel-read-${Date.now()}.xlsx`);

      try {
        // Stream directly to temp file
        await streamS3ToFile(response.Body as Readable, tempFilePath);
        console.log(
          `Excel file saved to temp location for reading: ${tempFilePath}`
        );

        // Validate the Excel file before processing
        const validation = await validateExcelFile(tempFilePath);
        console.log(`File validation result: ${validation.message}`);

        if (!validation.isValid) {
          if (validation.fileType === "xls") {
            throw new Error(
              `This file appears to be in the older XLS format which is not supported. Please convert the file to XLSX format using Microsoft Excel or another spreadsheet application before uploading.`
            );
          } else if (validation.message.includes("central directory")) {
            throw new Error(
              `The Excel file appears to be corrupted or incomplete. The ZIP file structure that contains the Excel data is damaged. Please try re-saving or re-exporting the file before uploading.`
            );
          } else {
            throw new Error(
              `Invalid Excel file: ${validation.message}. Please ensure the file is a valid Excel workbook in XLSX format.`
            );
          }
        }

        // Process Excel file using ExcelJS from the file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(tempFilePath);

        // Get the headers from the first sheet
        const firstSheet = workbook.worksheets[0];

        if (!firstSheet) {
          throw new Error("Excel worksheet not found");
        }

        // Get the first row (headers)
        const headerRow = firstSheet.getRow(1);
        const firstSheetHeaders: string[] = [];

        // Extract header values
        headerRow.eachCell((cell) => {
          firstSheetHeaders.push(cell.value ? String(cell.value).trim() : "");
        });

        const allData: Record<string, string>[] = [];

        // Process each worksheet
        for (const worksheet of workbook.worksheets) {
          // Get the header row of this sheet
          const sheetHeaderRow = worksheet.getRow(1);
          const sheetHeaders: string[] = [];

          // Extract header values
          sheetHeaderRow.eachCell((cell) => {
            sheetHeaders.push(cell.value ? String(cell.value).trim() : "");
          });

          // Check if headers match (ignoring case and whitespace)
          const normalizedSheetHeaders = sheetHeaders.map((h) =>
            h.toLowerCase()
          );
          const normalizedFirstHeaders = firstSheetHeaders.map((h) =>
            h.toLowerCase()
          );

          const headersMatch =
            normalizedFirstHeaders.length === normalizedSheetHeaders.length &&
            normalizedFirstHeaders.every(
              (h, i) => normalizedSheetHeaders[i] === h
            );

          if (headersMatch) {
            // Process all rows except the header
            const sheetData: Record<string, string>[] = [];

            // Go through rows (starting from row 2 to skip headers)
            for (
              let rowNumber = 2;
              rowNumber <= worksheet.rowCount;
              rowNumber++
            ) {
              const row = worksheet.getRow(rowNumber);

              // Skip empty rows
              if (row.cellCount === 0) continue;

              const rowData: Record<string, string> = {};

              // Map each cell to its corresponding header
              for (let i = 0; i < sheetHeaders.length; i++) {
                // Excel columns are 1-indexed
                const cell = row.getCell(i + 1);
                let value = "";

                // Handle different types of cell values
                if (cell.value !== null && cell.value !== undefined) {
                  if (
                    typeof cell.value === "object" &&
                    "result" in cell.value
                  ) {
                    // Formula result
                    value = String(cell.value.result || "");
                  } else if (
                    typeof cell.value === "object" &&
                    "text" in cell.value
                  ) {
                    // Rich text
                    value = String(cell.value.text || "");
                  } else if (cell.value instanceof Date) {
                    // Format dates as ISO strings
                    value = cell.value.toISOString().split("T")[0]; // YYYY-MM-DD
                  } else {
                    // Normal value
                    value = String(cell.value);
                  }
                }

                // Clean up value
                if (value === "-" || value === "0") {
                  value = "0";
                }

                rowData[sheetHeaders[i]] = value.trim();
              }

              sheetData.push(rowData);
            }

            // Add data from this sheet to the combined data
            allData.push(...sheetData);
          }
        }

        return allData;
      } finally {
        // Clean up the temp file
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Temp read file removed: ${tempFilePath}`);
          }
        } catch (cleanupError) {
          console.error("Failed to clean up temp read file:", cleanupError);
        }
      }
    } else {
      throw new Error("Unsupported file type");
    }
  } catch (error: unknown) {
    console.error("Error reading content from S3:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read content from S3 file: ${errorMessage}`);
  }
};

/**
 * Wrapper function to process the full content of a file from S3
 * NOTE: This method is not recommended for large files (>100MB).
 */
export const processS3FileContent = async (
  bucket: string,
  key: string
): Promise<Record<string, string>[] | null> => {
  try {
    return await readContentFromS3(bucket, key);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error processing S3 file content: ${errorMessage}`);
  }
};

/**
 * Utility function to diagnose Excel file issues
 * This can be called from application code to verify file formats before processing
 */
export const diagnoseExcelFile = async (
  bucket: string,
  key: string
): Promise<{
  isValid: boolean;
  fileType: string;
  message: string;
  canProcess: boolean;
}> => {
  try {
    console.log(`Diagnosing Excel file: ${key}`);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return {
        isValid: false,
        fileType: "unknown",
        message: "Empty file body received from S3",
        canProcess: false,
      };
    }

    // Create a temp file path
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `excel-diag-${Date.now()}.xlsx`);

    try {
      // Stream directly to temp file
      await streamS3ToFile(response.Body as Readable, tempFilePath);

      // Validate the Excel file
      const validation = await validateExcelFile(tempFilePath);

      return {
        isValid: validation.isValid,
        fileType: validation.fileType,
        message: validation.message,
        canProcess: validation.isValid && validation.fileType === "xlsx",
      };
    } finally {
      // Clean up the temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error("Failed to clean up diagnostic temp file:", cleanupError);
      }
    }
  } catch (error: unknown) {
    return {
      isValid: false,
      fileType: "unknown",
      message: `Error diagnosing file: ${error instanceof Error ? error.message : "Unknown error"}`,
      canProcess: false,
    };
  }
};

/**
 * Utility function to get Excel file information including
 * file format, size, and worksheet information for debugging
 */
export const getExcelFileInfo = async (
  bucket: string,
  key: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any> | null> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return null;
    }

    // Create a temp file path
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `excel-info-${Date.now()}.xlsx`);

    try {
      // Stream directly to temp file
      await streamS3ToFile(response.Body as Readable, tempFilePath);

      // Get basic file info
      const stats = fs.statSync(tempFilePath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileInfo: Record<string, any> = {
        fileName: path.basename(key),
        fileSizeBytes: stats.size,
        fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        mimeType: key.endsWith(".xlsx")
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : key.endsWith(".xls")
            ? "application/vnd.ms-excel"
            : "unknown",
      };

      // Read file signature
      const fileHandle = await fs.promises.open(tempFilePath, "r");
      const signature = Buffer.alloc(8);
      await fileHandle.read(signature, 0, 8, 0);
      await fileHandle.close();

      fileInfo.fileSignature = signature.toString("hex").substring(0, 8);

      // Check if it's a ZIP file (XLSX)
      if (signature[0] === 0x50 && signature[1] === 0x4b) {
        fileInfo.detectedFormat = "XLSX (ZIP container)";

        // Try to read as workbook
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(tempFilePath);

          // Get worksheet information
          fileInfo.isReadable = true;
          fileInfo.worksheetCount = workbook.worksheets.length;
          fileInfo.worksheets = workbook.worksheets.map((sheet) => ({
            name: sheet.name,
            rowCount: sheet.rowCount,
            columnCount: sheet.columnCount,
          }));
        } catch (error) {
          fileInfo.isReadable = false;
          fileInfo.readError =
            error instanceof Error ? error.message : "Unknown error";
        }
      }
      // Check if it's an OLE file (XLS)
      else if (
        signature[0] === 0xd0 &&
        signature[1] === 0xcf &&
        signature[2] === 0x11 &&
        signature[3] === 0xe0
      ) {
        fileInfo.detectedFormat = "XLS (OLE Compound Document)";
        fileInfo.isReadable = false;
        fileInfo.readError = "XLS format not supported by ExcelJS";
      } else {
        fileInfo.detectedFormat = "Unknown format";
        fileInfo.isReadable = false;
      }

      return fileInfo;
    } finally {
      // Clean up the temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error("Failed to clean up info temp file:", cleanupError);
      }
    }
  } catch (error: unknown) {
    console.error("Error getting Excel file info:", error);
    return null;
  }
};

/**
 * Direct entry point for processing large Excel files specifically
 * This function can be used to directly access optimized Excel processing
 */
export const readLargeExcelFromS3 = async (
  bucket: string,
  key: string
): Promise<Record<string, string>[] | null> => {
  try {
    console.log(`Reading large Excel file: ${key}, using optimized processing`);

    const allData: Record<string, string>[] = [];

    // Use the specialized large file handler but collect all data in memory
    await processLargeExcelFile(
      bucket,
      key,
      async (rows) => {
        // Add each batch to our collection
        allData.push(...rows);
      },
      async (totalRows) => {
        console.log(`Completed reading ${totalRows} rows from Excel file`);
      }
    );

    return allData.length > 0 ? allData : null;
  } catch (error: unknown) {
    console.error("Error reading large Excel file:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read large Excel file: ${errorMessage}`);
  }
};

/**
 * Creates a zip file containing Excel workbooks for compliance results
 * @param results Array of compliance results
 * @param projectName Optional project name for the ZIP file name
 * @returns Path to the temporary zip file
 */
export const createComplianceResultsZip = async (
  results: {
    id: string;
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results?: any; // Detailed results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary?: any; // Summary
    testId: string;
    analysis: {
      name: string;
    };
  }[],
  projectName: string = "compliance-results"
): Promise<string> => {
  try {
    // Create a temp directory for the Excel files
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const workDir = path.join(tmpDir, `compliance-export-${timestamp}`);
    const zipFilePath = path.join(tmpDir, `${projectName}-${timestamp}.zip`);

    // Create the work directory if it doesn't exist
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    // Create a zip archive
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Set up archive pipe
    const archivePromise = new Promise<void>((resolve, reject) => {
      output.on("close", () => {
        console.log(`ZIP archive created: ${zipFilePath} (${archive.pointer()} bytes)`);
        resolve();
      });
      output.on("error", (err) => {
        reject(err);
      });
      archive.on("error", (err) => {
        reject(err);
      });
    });

    // Pipe archive data to the output file
    archive.pipe(output);

    // Generate Excel files for each compliance result
    for (const result of results) {
      if (!result || !result.id) continue;

      // Create a workbook for this result
      const workbook = new ExcelJS.Workbook();
      const testId = result.testId || "unknown-test";
      const analysisName = result.analysis?.name || "Compliance Test";
      
      // Sanitize filename to avoid issues
      const safeTestId = testId.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50);
      const excelFilePath = path.join(workDir, `${safeTestId}-${result.id.substring(0, 8)}.xlsx`);
      
      // Add test information sheet
      const testSheet = workbook.addWorksheet("Test");
      
      // Add test information
      testSheet.addRow(["Test Information"]);
      testSheet.addRow(["Test ID", testId]);
      testSheet.addRow(["Analysis Name", analysisName]);
      testSheet.addRow(["Status", result.status]);
      testSheet.addRow(["Result ID", result.id]);
      
      // Format the test sheet
      testSheet.getColumn(1).width = 30;
      testSheet.getColumn(2).width = 70;
      testSheet.getRow(1).font = { bold: true, size: 14 };
      
      // Add summary worksheet
      const summarySheet = workbook.addWorksheet("Summary");
      
      if (result.summary) {
        if (Array.isArray(result.summary)) {
          // If summary is an array of objects
          if (result.summary.length > 0 && typeof result.summary[0] === "object") {
            // Extract headers from the first object
            const headers = Object.keys(result.summary[0]);
            summarySheet.addRow(headers);
            
            // Add data rows - one for each object in the array
            result.summary.forEach((item) => {
              const rowData = headers.map((header) => {
                const value = item[header];
                if (typeof value === "object" && value !== null) {
                  return JSON.stringify(value);
                }
                return value;
              });
              summarySheet.addRow(rowData);
            });

            // Format the headers
            summarySheet.getRow(1).font = { bold: true };
            headers.forEach((_, index) => {
              summarySheet.getColumn(index + 1).width = 20;
            });
          } else {
            // Simple array without objects
            summarySheet.addRow(["Index", "Value"]);
            result.summary.forEach((value, index) => {
              summarySheet.addRow([index, String(value)]);
            });
            
            summarySheet.getColumn(1).width = 15;
            summarySheet.getColumn(2).width = 70;
          }
        } else if (typeof result.summary === "object") {
          // If summary is a single object, show as key-value pairs
          summarySheet.addRow(["Property", "Value"]);
          
          Object.entries(result.summary).forEach(([key, value]) => {
            let displayValue = value;
            if (typeof value === "object" && value !== null) {
              displayValue = JSON.stringify(value);
            }
            summarySheet.addRow([key, displayValue]);
          });
          
          // Format the columns
          summarySheet.getColumn(1).width = 30;
          summarySheet.getColumn(2).width = 70;
          summarySheet.getRow(1).font = { bold: true };
        } else {
          // If summary is neither array nor object, add as simple text
          summarySheet.addRow(["Summary"]);
          summarySheet.addRow([String(result.summary)]);
        }
      } else {
        summarySheet.addRow(["No summary data available"]);
      }
      
      // Add results worksheet with dynamic columns
      const resultsSheet = workbook.addWorksheet("Results");
      
      if (result.results) {
        if (Array.isArray(result.results)) {
          // If results is an array of objects
          if (result.results.length > 0 && typeof result.results[0] === "object") {
            // Extract headers from the first object
            const headers = Object.keys(result.results[0]);
            resultsSheet.addRow(headers);
            
            // Add data rows
            result.results.forEach((row) => {
              const rowData = headers.map((header) => {
                const value = row[header];
                if (typeof value === "object" && value !== null) {
                  return JSON.stringify(value);
                }
                return value;
              });
              resultsSheet.addRow(rowData);
            });

            // Format the headers
            resultsSheet.getRow(1).font = { bold: true };
            headers.forEach((_, index) => {
              resultsSheet.getColumn(index + 1).width = 20;
            });
          } else {
            // Simple array without objects
            resultsSheet.addRow(["Index", "Value"]);
            result.results.forEach((value, index) => {
              resultsSheet.addRow([index, String(value)]);
            });
            
            resultsSheet.getColumn(1).width = 15;
            resultsSheet.getColumn(2).width = 70;
          }
        } else if (typeof result.results === "object") {
          // Extract all keys from the object
          resultsSheet.addRow(["Property", "Value"]);
          
          // Add each property as a row
          Object.entries(result.results).forEach(([key, value]) => {
            let displayValue = value;
            if (typeof value === "object" && value !== null) {
              displayValue = JSON.stringify(value);
            }
            resultsSheet.addRow([key, displayValue]);
          });
          
          // Format the columns
          resultsSheet.getColumn(1).width = 30;
          resultsSheet.getColumn(2).width = 70;
          resultsSheet.getRow(1).font = { bold: true };
        } else {
          // If results is neither array nor object, add as simple text
          resultsSheet.addRow(["Results"]);
          resultsSheet.addRow([String(result.results)]);
        }
      } else {
        resultsSheet.addRow(["No results data available"]);
      }
      
      // Save the workbook
      await workbook.xlsx.writeFile(excelFilePath);
      
      // Add the Excel file to the archive
      archive.file(excelFilePath, { 
        name: path.basename(excelFilePath) 
      });
    }
    
    // Finalize the archive
    archive.finalize();
    
    // Wait for the archive to complete
    await archivePromise;
    
    // Clean up the temporary directory
    try {
      const files = fs.readdirSync(workDir);
      for (const file of files) {
        fs.unlinkSync(path.join(workDir, file));
      }
      fs.rmdirSync(workDir);
    } catch (cleanupError) {
      console.error("Error cleaning up temp directory:", cleanupError);
    }
    
    return zipFilePath;
  } catch (error) {
    console.error("Error creating zip file:", error);
    throw new Error(`Failed to create compliance results zip: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";
import { Readable } from "stream";
import { customAlphabet } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object into a readable format
 * @param date Date string or object to format
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(dateObj);
}

export function generateCode(prefix: string, length: number = 6) {
  let randomNumber = "";
  for (let i = 0; i < length; i++) {
    randomNumber += Math.floor(Math.random() * 10).toString();
  }
  return `${prefix}-${randomNumber}`;
}

export function generatePassword() {
  const length = 20;
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let password = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    password += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return password;
}

export function generateToken(length: number = 32) {
  const randomBytes = crypto.randomBytes(Math.ceil(length / 2));
  return randomBytes.toString("hex").slice(0, length);
}

export function removeSpacesAndAddUnderscore(str: string) {
  return str.replace(/\s+/g, "_").toLowerCase();
}

/**
 * Converts a readable stream to a buffer
 * @param stream Readable stream (like from S3 GetObject)
 * @returns Promise resolving to a Buffer
 */
export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    
    stream.on("error", (error: Error) => {
      reject(error);
    });
  });
};

export const removePrecedingZeros = (str: string) => {
  return str.replace(/^0+/, "");
};

export const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
); // 7-character random string
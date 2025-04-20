import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs";
import path from "path";
export const Bucket = process.env.AWS_BUCKET_NAME;

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const s3uploadFile = async (file: File, filePath: string) => {
  const fileBuffer = await file.arrayBuffer();
  
  const fileKey = `${filePath}/${file.name}`;
  const hash = crypto.createHash("sha256").update(Buffer.from(fileBuffer)).digest("base64");

  const uploadParams = {
    Bucket: Bucket,
    Key: fileKey,
    Body: Buffer.from(fileBuffer),
    ChecksumSHA256: hash,
  };

  const command = new PutObjectCommand(uploadParams);
  const response = await s3Client.send(command);

  return response;
};

/**
 * Upload a local file to S3 from a file path
 * @param localFilePath Path to the local file
 * @param s3Path Path within S3 bucket (without filename)
 * @returns Object with S3 response and the generated file key
 */
export const s3uploadFromPath = async (localFilePath: string, s3Path: string) => {
  // Read the file from disk
  const fileBuffer = fs.readFileSync(localFilePath);
  
  // Extract the filename from the path
  const fileName = path.basename(localFilePath);
  
  // Generate S3 key (path + filename)
  const fileKey = s3Path ? `${s3Path}/${fileName}` : fileName;
  
  // Calculate hash for integrity check
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("base64");
  
  // Prepare upload parameters
  const uploadParams = {
    Bucket: Bucket,
    Key: fileKey,
    Body: fileBuffer,
    ChecksumSHA256: hash,
    ContentType: "application/zip", // Assuming we're using this for zip files
    ContentDisposition: `attachment; filename="${fileName}"`, // Make it download when accessed
  };
  
  // Execute the upload
  const command = new PutObjectCommand(uploadParams);
  const response = await s3Client.send(command);
  
  return {
    response,
    fileKey,
  };
};

export const s3deleteFile = async (filePath: string) => {
  const command = new DeleteObjectCommand({
    Bucket: Bucket,
    Key: filePath,
  });

  const response = await s3Client.send(command);

  return response;
};

/**
 * Generate a signed URL for temporary access to an S3 object
 * @param filePath Path to the file in S3
 * @param expiresIn Time in seconds until the signed URL expires (default: 15 minutes)
 * @returns A pre-signed URL for temporary access
 */
export const s3getSignedUrl = async (filePath: string, expiresIn = 900) => {
  const command = new GetObjectCommand({
    Bucket: Bucket,
    Key: filePath,
  });

  // Generate a signed URL that will work for temporary access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signedUrl = await getSignedUrl(s3Client as any, command as any, { 
    expiresIn: expiresIn // URL expires in 15 minutes by default
  });

  return signedUrl;
};

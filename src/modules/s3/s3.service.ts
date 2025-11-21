import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    // Check if required environment variables are set
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.AWS_S3_BUCKET_NAME
    ) {
      throw new Error(
        "AWS S3 configuration is missing. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME environment variables."
      );
    }

    this.region = process.env.AWS_REGION || "us-east-1";
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Upload a file to S3
   * @param file Buffer content
   * @param key S3 object key
   * @param contentType MIME type of the file
   * @returns S3 URL of the uploaded file
   */
  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        ACL: "private", // Make files private by default
      });

      await this.s3Client.send(command);

      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to upload file to S3: ${error?.message || "Unknown error"}`
      );
    }
  }

  /**
   * Upload file buffer to S3
   * @param fileBuffer File buffer from multer
   * @param key S3 object key
   * @returns S3 URL of the uploaded file
   */
  async uploadFileBuffer(
    fileBuffer: { buffer: Buffer; mimetype: string; originalname: string },
    key: string
  ): Promise<string> {
    try {
      return await this.uploadFile(fileBuffer.buffer, key, fileBuffer.mimetype);
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to upload file buffer: ${error?.message || "Unknown error"}`
      );
    }
  }

  /**
   * Upload multiple files to S3
   * @param files Array of file buffers from multer
   * @param keys Array of S3 object keys (must match files length)
   * @returns Array of S3 URLs
   */
  async uploadFiles(
    files: Array<{ buffer: Buffer; mimetype: string; originalname: string }>,
    keys: string[]
  ): Promise<string[]> {
    if (files.length !== keys.length) {
      throw new BadRequestException(
        "Files and keys arrays must have the same length"
      );
    }

    const uploadPromises = files.map((file, index) =>
      this.uploadFileBuffer(file, keys[index])
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   * @param key S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      console.error(
        `Failed to delete file from S3: ${error?.message || "Unknown error"}`
      );
      throw new HttpException(
        `Failed to delete file from S3: ${error?.message || "Unknown error"}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete multiple files from S3
   * @param keys Array of S3 object keys
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Generate a unique key for S3 upload
   * @param folder Folder path (e.g., 'user/personal-document')
   * @param userId User ID
   * @param originalName Original filename
   * @param customName Optional custom name (without extension)
   * @returns Unique S3 key
   */
  generateS3Key(
    folder: string,
    userId: string,
    originalName: string,
    customName?: string
  ): string {
    const timestamp = Date.now();
    const extension = originalName.split(".").pop() || "pdf";
    const fileName = customName || timestamp;
    return `${folder}/${userId}/${fileName}.${extension}`;
  }

  /**
   * Extract key from S3 URL
   * @param url Full S3 URL
   * @returns S3 object key
   */
  extractKeyFromUrl(url: string): string {
    if (url.includes(".amazonaws.com/")) {
      return url.split(".amazonaws.com/")[1];
    }
    return url;
  }

  /**
   * Generate a presigned URL for file download
   * @param key S3 object key
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to generate presigned URL: ${error?.message || "Unknown error"}`
      );
    }
  }

  /**
   * Generate presigned URL from S3 URL
   * @param url Full S3 URL
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async generatePresignedUrlFromUrl(
    url: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const key = this.extractKeyFromUrl(url);
    return this.generatePresignedUrl(key, expiresIn);
  }

  /**
   * Get S3 URL for a given key
   * @param key S3 object key
   * @returns Full S3 URL
   */
  getFileUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { Readable } from "stream";

export interface S3File {
  key: string;
  size: number;
  lastModified?: Date;
}

export class S3_Client {
  private bucket: string;
  private prefix: string;
  private s3Client: S3Client;

  constructor(bucket: string, prefix: string) {
    this.bucket = bucket;
    this.prefix = prefix;

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
    });
  }

  /* -----------------------------
     List Files (Single Page)
  ------------------------------ */

  async listFiles(token?: string) {
    const response = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix,
        ContinuationToken: token,
        MaxKeys: 50,
      })
    );

    const files: S3File[] =
      response.Contents?.map((item) => ({
        key: item.Key ?? "",
        size: item.Size ?? 0,
        lastModified: item.LastModified,
      })) ?? [];

    return {
      files,
      nextToken: response.NextContinuationToken ?? null,
    };
  }

  async *readFileParagraphs(key: string): AsyncGenerator<string> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!response.Body) return;

    const stream = response.Body as Readable;

    let buffer = "";

    for await (const chunk of stream) {
      buffer += chunk.toString("utf-8");
      const paragraphs = buffer.split(/\n\s*\n/);
      buffer = paragraphs.pop() ?? "";

      for (const p of paragraphs) {
        const clean = p.trim();
        if (clean) {
          yield clean;
        }
      }
    }
    const remaining = buffer.trim();
    if (remaining) {
      yield remaining;
    }
  }



  async processFilesInBatches(
    batchSize: number,
    paragraphHandler: (fileKey: string, paragraph: string) => Promise<void>
  ) {
    let token: string | undefined = undefined;

    do {
      const { files, nextToken } = await this.listFiles(token);

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            for await (const paragraph of this.readFileParagraphs(file.key)) {
              await paragraphHandler(file.key, paragraph);
            }
          })
        );
      }

      token = nextToken ?? undefined;
    } while (token);
  }
}

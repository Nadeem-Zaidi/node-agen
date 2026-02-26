import { GetObjectCommand, ListObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Chunk, IFilereader } from "../llm/interfaces/filereader/ifilereader";
import { Readable } from "stream";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { size } from "zod";


export interface S3File {
    key: string;
    size: number;
    lastModified?: Date;

}

export class S3Reader implements IFilereader {
    private bucket: string;
    private prefix: string;
    private s3Client: S3Client;
    private token: string;

    constructor(bucket: string, prefix: string, s3Client: S3Client, token: string) {
        this.bucket = bucket;
        this.prefix = prefix;
        this.s3Client = s3Client
        this.token = token;
    }
    list_files(): Promise<Array<string>> {
        throw new Error("Method not implemented.");
    }

    async *read_txt_files(workerCount: number): AsyncGenerator<{ file: string; paragraph: string }> {

        let continuationToken: string | undefined = this.token;
        let allFiles: S3File[] = [];
        do {
            const listResponse:any = await this.s3Client.send(new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: this.prefix,
                ContinuationToken: continuationToken,
                MaxKeys: 50,
            }));

            const pages = listResponse.Contents?.map((item:any) => ({
                key: item.Key ?? "",
                size: item.Size ?? 0,
                lastModified: item.LastModified
            })) ?? [];

            allFiles.push(...pages);

            continuationToken = listResponse.IsTruncated
                ? listResponse.NextContinuationToken
                : undefined;

        } while (continuationToken);

        const fileQueue = allFiles.filter(f => f.key.endsWith(".txt"));

        const buffer: { file: string; paragraph: string }[] = [];
        let done = false;
        let waiter: (() => void) | null = null;

        const wake = () => {
            waiter?.();
            waiter = null;
        };

        const push = (item: { file: string; paragraph: string }) => {
            buffer.push(item);
            wake();
        };

        const worker = async () => {
            while (true) {
                const file = fileQueue.shift();
                if (!file) break;

                const res = await this.s3Client.send(new GetObjectCommand({
                    Bucket: this.bucket,
                    Key: file.key
                }));

                if (!res.Body) continue;

                const stream = res.Body as Readable;

                let carry = "";

                for await (const chunk of stream) {
                    carry += chunk.toString("utf-8");

                    const parts = carry.split("\n\n");
                    carry = parts.pop()!;

                    for (const p of parts) {
                        if (p.trim()) {
                            push({ file: file.key, paragraph: p });
                        }
                    }
                }

                if (carry.trim()) {
                    push({ file: file.key, paragraph: carry });
                }
            }
        };

        const workers = Promise.all(
            Array.from({ length: workerCount }, worker)
        ).then(() => {
            done = true;
            wake(); // final wake
        });

        while (!done || buffer.length > 0) {
            if (buffer.length > 0) {
                yield buffer.shift()!;
            } else {
                await new Promise<void>(r => waiter = r);
            }
        }

        await workers;
    }

    async *read_md_files(): AsyncGenerator<Chunk> {
        function extractNode(node: any): string {
            if (node.type === "text" || node.type === "inlineCode") return node.value;
            if (!node.children) return "";
            return node.children.map((child: any) => extractNode(child)).join("");
        }

        function buildChunksFromTree(tree: any): Chunk[] {
            const chunks: Chunk[] = [];
            let current: Chunk = { heading: "", level: 0, content: "", codeBlocks: [] };

            for (const node of tree.children) {
                if (node.type === "heading") {
                    if (current.content.trim() || current.codeBlocks.length > 0) {
                        chunks.push(current);
                    }
                    current = {
                        heading: extractNode(node),
                        level: node.depth,
                        content: "",
                        codeBlocks: []
                    };
                } else if (node.type === "paragraph") {
                    current.content += extractNode(node) + "\n";
                } else if (node.type === "code") {
                    current.codeBlocks.push({
                        lang: (node as any).lang || "",
                        value: node.value
                    });
                } else if (node.type === "list") {
                    for (const item of (node as any).children) {
                        const itemText = item.children
                            .map((child: any) => extractNode(child))
                            .join(" ");
                        current.content += `- ${itemText}\n`;
                    }
                }
            }
            if (current.content.trim() || current.codeBlocks.length > 0) {
                chunks.push(current);
            }

            return chunks;
        }
        const allFiles: S3File[] = [];
        let continuationToken: string | undefined = this.token || undefined;

        do {
            const listResponse: any = await this.s3Client.send(
                new ListObjectsV2Command({
                    Bucket: this.bucket,
                    Prefix: this.prefix,
                    ContinuationToken: continuationToken,
                    MaxKeys: 50,
                })
            );

            const page = listResponse.Contents?.map((item: any) => ({
                key: item.Key ?? "",
                size: item.Size ?? 0,
                lastModified: item.LastModified,
            })) ?? [];

            allFiles.push(...page);

            continuationToken = listResponse.IsTruncated
                ? listResponse.NextContinuationToken
                : undefined;

        } while (continuationToken);

        const filesQueue = allFiles.filter((f) => f.key.endsWith(".md"));

        const chunkQueue: Chunk[] = [];
        let done = false;
        let resolve: (() => void) | null = null;

        function push(item: Chunk) {
            chunkQueue.push(item);
            resolve?.();
        }

        async function worker(self: S3Reader) {
            while (filesQueue.length > 0) {
                const file = filesQueue.shift();
                if (!file) continue;

                try {
                    const fileResponse = await self.s3Client.send(
                        new GetObjectCommand({ Bucket: self.bucket, Key: file.key })
                    );

                    if (!fileResponse.Body) continue;

                    let fileContent = "";
                    for await (const chunk of fileResponse.Body as Readable) {
                        fileContent += chunk.toString("utf-8");
                    }

                    const tree = unified().use(remarkParse).parse(fileContent);
                    const chunks = buildChunksFromTree(tree);
                    chunks.forEach(push);

                } catch (err) {
                    console.error(`Failed to process S3 file "${file.key}":`, err);
                }
            }
        }

        const workersPromise = Promise.all(
            Array.from({ length: 4 }, () => worker(this))
        ).then(() => {
            done = true;
            resolve?.();
        });

        while (!done || chunkQueue.length > 0) {
            if (chunkQueue.length > 0) {
                yield chunkQueue.shift()!;
            } else {
                await new Promise<void>((r) => (resolve = r));
            }
        }
        await workersPromise;
    }

}
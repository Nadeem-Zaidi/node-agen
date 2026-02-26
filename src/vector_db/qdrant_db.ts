import { QdrantClient } from "@qdrant/js-client-rest";
import { IVectorDb } from "../llm/interfaces/vectordb/ivector";
import { Chunk } from "../llm/interfaces/filereader/ifilereader";

export class QDrant_Db implements IVectorDb {
    private client: QdrantClient;
    private size: number;
    private collectionName: string;

    constructor(client: QdrantClient, size: number, collectionName: string) {
        this.client = client;
        this.size = size;
        this.collectionName = collectionName;
    }

    async ensureCollection(): Promise<void> {
        const result = await this.client.collectionExists(this.collectionName);
        if (!result.exists) {
            await this.client.createCollection(this.collectionName, {
                vectors: {
                    size: this.size,
                    distance: "Cosine"
                }
            });
        }
    }

    async upsert(id: string, vector: number[], payload: Record<string, any>): Promise<void> {
        await this.client.upsert(this.collectionName, {
            wait: true,
            points: [
                {
                    id: id,
                    vector: vector,
                    payload: payload
                }
            ]
        });
    }

    // upsert a Chunk — embeds text content, stores code blocks as metadata
    async upsertChunk(id: string, vector: number[], chunk: Chunk): Promise<void> {
        const payload: Record<string, any> = {
            heading: chunk.heading,
            level: chunk.level,
            // plain text stored for retrieval context
            text: chunk.content,
            // code blocks stored separately as metadata
            codeBlocks: chunk.codeBlocks.map(cb => ({
                lang: cb.lang,
                value: cb.value
            }))
        };

        await this.client.upsert(this.collectionName, {
            wait: true,
            points: [
                {
                    id: id,
                    vector: vector,   // embed only heading + plain text
                    payload: payload  // store full chunk including code blocks
                }
            ]
        });
    }

    async upsertManyChunks(chunks: Array<{ id: string; vector: number[]; chunk: Chunk }>): Promise<void> {
        const points = chunks.map(({ id, vector, chunk }) => ({
            id: id,
            vector: vector,
            payload: {
                heading: chunk.heading,
                level: chunk.level,
                text: chunk.content,
                codeBlocks: chunk.codeBlocks.map(cb => ({
                    lang: cb.lang,
                    value: cb.value
                }))
            }
        }));

        await this.client.upsert(this.collectionName, {
            wait: true,
            points: points
        });
    }

    upsertMany(ids: string, vectors: number[][], payloads: Array<Record<string, any>>): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async search(vector: number[], limit?: number, withPayload?: boolean): Promise<any> {
    const results = await this.client.query(this.collectionName, {
        query: vector,
        limit: Number(10),        // ✅ force convert to number
        with_payload: withPayload
    });

    const context = results.points
        .map((point: any) => {
            const payload = point.payload;
            if (!payload) return null;

            let content = payload.heading ? `## ${payload.heading}\n` : "";
            content += payload.text ?? "";

            if (Array.isArray(payload.codeBlocks)) {
                for (const cb of payload.codeBlocks) {
                    content += `\`\`\`${cb.lang}\n${cb.value}\n\`\`\`\n`;
                }
            }

            return content;
        })
        .filter(Boolean)
        .join("\n\n---\n\n");

    return context;
}

    delete(ids: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
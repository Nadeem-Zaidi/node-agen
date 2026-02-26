import { Chunk } from "../filereader/ifilereader";

export interface IVectorDb{
    upsert(id:string,vector:number[],payload:Record<string,any>):Promise<void>;
    ensureCollection():Promise<void>;
    upsertMany(ids:string,vectors:number[][],payloads:Array<Record<string,any>>):Promise<void>;
    search(vector:number[],limit?:number,withPayload?:boolean):Promise<any>
    delete(ids:string[]):Promise<void>
    upsertChunk(id: string, vector: number[], chunk: Chunk):Promise<void>
}
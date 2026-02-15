import OpenAI from "openai"
import { readFilesInDir } from "./file_reader_in_dir"
import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: "http://127.0.0.1:6333" // URL of your Qdrant instance
});


const openAi=new OpenAI()
async function generateSaveEmbeddings(directory:string,ext:string){
    if(!directory || !ext) return
    const results=readFilesInDir(directory,ext)
    for await (const paragraph of results){
        const embedding=openAi.embeddings.create({
            model:"text-embedding-3-small",
            input:paragraph
        })
        
    }



}


export interface IFilereader{
    list_files():Promise<Array<string>>;
    read_txt_files(workerCount: number):AsyncGenerator<{ file: string, paragraph: string }>;
    read_md_files():AsyncGenerator<any>
     
}

export interface CodeBlock {
    lang: string;
    value: string;
}

export interface Chunk {
    heading: string;
    level: number;
    content: string;        // plain text only → use this for embedding
    codeBlocks: CodeBlock[]; // code blocks → store as metadata
}
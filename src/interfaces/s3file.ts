export interface S3File{
    key:string;
    size:number;
    lastModified?:Date;

}

export interface ListResult{
    files:S3File[];
    nextToken:string|null
}
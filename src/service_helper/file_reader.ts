

import * as fs from 'fs';
import { Path } from 'typescript';
import readline from "readline";

export async function* fileReader(filenamePath: fs.PathLike) {
    const fileStream = fs.createReadStream(filenamePath, { encoding: "utf-8" })
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    })
    let buffer: string[] = []

    for await (const line of rl) {
        if (line.trim()) {
            buffer.push(line.trimEnd())
        } else {
            if (buffer.length > 0) {
                yield buffer.join(" ")
            }

        }
    }
    if (buffer.length >0) yield buffer.join(" ")
    
}
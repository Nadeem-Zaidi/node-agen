import * as fs from "fs";
import path from "path";
import { fileReader } from "./file_reader";

export async function* readFilesInDir(directory: string, extensionToRead: string) {
  if (!directory) return;

  const files = await fs.promises.readdir(directory);

  if (files.length === 0) return; // only stop if truly empty

  for (const file of files) {
    if (file.endsWith(extensionToRead)) {
      const filePath = path.join(directory, file);
      yield* fileReader(filePath); // stream chunks from each file
    }
  }
}

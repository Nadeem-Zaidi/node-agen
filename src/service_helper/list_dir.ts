import * as fs from "fs";
import path from "path";

export async function listDirectory(dir: string): Promise<string[]> {
  const resolvedPath = path.resolve(dir);

  const stats = await fs.promises.stat(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error("Provided path is not a directory");
  }

  const files = await fs.promises.readdir(resolvedPath);
  return files;
}

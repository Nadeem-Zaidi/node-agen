import path from "path";
import { MCPClient } from "./client/client";
async function main() {
  const client = new MCPClient();
  const serverPath = path.resolve("./dist/index.js"); 

  await client.connectServer(serverPath);

  console.log("✅ Connected to MCP server");
  await client.chatLoop();
}

main().catch((err) => {
  console.error("Client error:", err);
});

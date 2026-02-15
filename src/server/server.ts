import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodTypeAny } from "zod";
import { IServer } from "../interfaces/iserver";

import { S3_Client } from "../s3_client/s3_client";

export class MServer implements IServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: "rag_system",
      version: "1.1.0",
    },
);
  }
    
  registerTools(
    toolName: string,
    configuration: { description: string; inputSchema: ZodTypeAny },
    func: (args: any) => Promise<{
      content: { type: "text"; text: string }[];
      isError?: boolean;
    }>
  ): void {
    this.server.registerTool(toolName, configuration, func);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log(" MCP Server running...");
  }
}







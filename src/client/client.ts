import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types";
import OpenAI from "openai";
import dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

export class MCPClient {
  private transport: StdioClientTransport | null = null;
  private mcpClient: Client;
  private tools: Tool[] = [];
  private openai: OpenAI;
  private model = "gpt-4o-mini";

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.mcpClient = new Client({ name: "nadeem-demo", version: "1" });
  }

  // 🔌 Connect to MCP server
  async connectServer(serverScriptPath: string) {
    const isJs = serverScriptPath.endsWith(".js");
    const isPy = serverScriptPath.endsWith(".py");

    if (!isJs && !isPy) {
      throw new Error("Server script must be a .js or .py file");
    }

    const command = isPy
      ? process.platform === "win32"
        ? "python"
        : "python3"
      : process.execPath;

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });

    await this.mcpClient.connect(this.transport);

    const toolsResult = await this.mcpClient.listTools();
    this.tools = toolsResult.tools;

    console.log("🛠 MCP Tools Loaded:", this.tools.map(t => t.name));
  }

  // 🔄 Convert MCP tools → OpenAI tools
  private convertToolsForOpenAI(mcpTools: Tool[]) {
    return mcpTools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema as any,
      },
    }));
  }

  // 🤖 Ask OpenAI + handle tool calling
  async processQuery(query: string): Promise<string> {
    const openAITools = this.convertToolsForOpenAI(this.tools);

   const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a coding assistant with access to filesystem tools. " +
      "If the user asks to list, read, or explore files or folders, you MUST use the provided tools instead of giving manual shell instructions.",
  },
  { role: "user", content: query },
];

    const firstResponse = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      tools: openAITools,
      tool_choice: "auto",
    });

    const finalText: string[] = [];
    const message = firstResponse.choices[0].message;

    if (message.content) {
      finalText.push(message.content);
    }

    if (message.tool_calls) {
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") continue;

        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

        console.log("🔧 Calling MCP tool:", toolName, toolArgs);

        const result = await this.mcpClient.callTool({
          name: toolName,
          arguments: toolArgs,
        }) as { content?: { text?: string }[] };

        const toolResultText =
          result.content?.[0]?.text ?? "Tool returned no output";

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResultText,
        });
      }

      const finalResponse = await this.openai.chat.completions.create({
        model: this.model,
        messages,
      });

      const finalMessage = finalResponse.choices[0].message.content;
      if (finalMessage) finalText.push(finalMessage);
    }

    return finalText.join("\n");
  }

  // 💬 Terminal chat loop
  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = (query: string) =>
      new Promise<string>(resolve => rl.question(query, resolve));

    try {
      console.log("\n🤖 MCP + OpenAI Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await ask("\nQuery: ");

        if (message.trim().toLowerCase() === "quit") break;

        const response = await this.processQuery(message);
        console.log("\n💬 Response:\n" + response);
      }
    } catch (err) {
      console.error("Chat loop error:", err);
    } finally {
      rl.close();
      await this.cleanup();
    }
  }

  // 🧹 Cleanup MCP connection
  async cleanup() {
    console.log("🧹 Closing MCP connection...");
    await this.mcpClient.close();
  }
}

// mhttp/mhttpserver.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { ZodTypeAny } from "zod";
import { IServer } from "../interfaces/iserver";
import dotenv from "dotenv";
import { ILLM, LLMMessage, Tool } from "../llm/interfaces/illm";
import { LLMFactory } from "../llm/llm_factory/llm_factory";

dotenv.config();

export class MHTTPServer implements IServer {
    private server: McpServer;
    private app: express.Application;
    private port: number;
    private registeredTools: Map<string, any> = new Map();
    private llm: ILLM;

    constructor(port: number = 3000) {
        this.port = port;
        this.app = express();
        this.llm = LLMFactory.createFromEnv();
        console.log(`🤖 Using LLM: ${this.llm.getProvider()} - ${this.llm.getModel()}`);

        this.app.use(cors({
            origin: [
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:3001",
                "*"
            ],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "Accept"],
            credentials: false,
        }));

        this.app.use(express.json({ limit: '50mb' })); // ✅ increased limit for base64 images
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }));
        this.app.use(express.static('public'));

        this.server = new McpServer({
            name: "rag_system",
            version: "1.1.0",
        });

        this.setupRoutes();
        console.log("📋 Initializing MHTTPServer...");
    }

    private setupRoutes() {
        // Health check
        this.app.get("/health", (req: Request, res: Response) => {
            res.json({
                status: "ok",
                timestamp: new Date().toISOString(),
                registeredTools: Array.from(this.registeredTools.keys()),
                llmProvider: this.llm.getProvider(),
                llmModel: this.llm.getModel(),
            });
        });

        // ✅ Main chat endpoint with image support
        this.app.post("/api/chat/chat_stream", async (req: Request, res: Response) => {
            const { question, history, images } = req.body;

            // ✅ Allow image-only messages (no text required)
            if (!question && (!images || images.length === 0)) {
                return res.status(400).json({ error: "Question or images are required" });
            }

            console.log(`💬 User question: ${question}`);
            console.log(`🖼️  Images received: ${images?.length || 0}`);

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            try {
                await this.handleWithLLMAndMCP(question || "", history || [], images || [], res);
            } catch (error: any) {
                console.error("❌ Chat error:", error);
                res.write(`data: ${JSON.stringify("Sorry, I encountered an error: " + error.message)}\n\n`);
                res.write(`data: [DONE]\n\n`);
                res.end();
            }
        });

        // List available tools
        this.app.get("/api/tools", async (req: Request, res: Response) => {
            try {
                const tools = Array.from(this.registeredTools.entries()).map(([name, tool]) => ({
                    name,
                    description: tool.config.description,
                }));
                res.json({
                    tools,
                    llmProvider: this.llm.getProvider(),
                    llmModel: this.llm.getModel(),
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    // ✅ Updated to accept images
    private async handleWithLLMAndMCP(
        question: string,
        history: Array<{ role: string; content: string }>,
        images: Array<{ data: string; mediaType: string }>,
        res: Response
    ): Promise<void> {

        const tools: Tool[] = Array.from(this.registeredTools.entries()).map(
            ([name, tool]) => ({
                type: 'function' as const,
                function: {
                    name,
                    description: tool.config.description,
                    parameters: this.zodToJsonSchema(tool.config.inputSchema),
                },
            })
        );

        console.log(`🤖 Sending to ${this.llm.getProvider()} with ${tools.length} tools available`);

        // ✅ Build vision-compatible user message content
        const userMessageContent: any[] = [];

        // Add images first if present
        if (images && images.length > 0) {
            images.forEach(img => {
                userMessageContent.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${img.mediaType};base64,${img.data}`,
                    },
                });
            });
        }

        // Add text content if present
        if (question) {
            userMessageContent.push({
                type: "text",
                text: question,
            });
        }

        const messages: LLMMessage[] = [
            {
                role: 'system',
                content: `You are a helpful work order management assistant.
                            You have access to tools that can query work orders, generate statistics, and create visual reports with charts.
                            When users ask about work orders, always use the appropriate tools to get accurate real-time data.
                            When users ask for charts, graphs, pie charts, bar charts, or visual reports, always use the generate_workorder_report_with_charts tool.
                            Always provide helpful, accurate responses based on the actual data from the tools.
                            Format your responses clearly using markdown.`,
            },
            // Include conversation history
            ...history.map((msg) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            {
                role: 'user' as const,
                // ✅ Use array content when images are present, plain string otherwise
                content: images.length > 0 ? userMessageContent : question,
            },
        ];

        let continueLoop = true;

        while (continueLoop) {
            for await (const chunk of this.llm.streamChat(messages, tools)) {

                if (chunk.content) {
                    res.write(`data: ${JSON.stringify(chunk.content)}\n\n`);
                }

                if (chunk.isToolCall && chunk.toolCalls) {
                    // Add assistant message with tool calls
                    messages.push({
                        role: 'assistant',
                        content: '',
                        tool_calls: chunk.toolCalls,
                    });

                    // Execute each tool
                    for (const toolCall of chunk.toolCalls) {
                        const toolName = toolCall.function.name;
                        let toolInput: any;

                        try {
                            toolInput = JSON.parse(toolCall.function.arguments);
                        } catch (parseError) {
                            console.error(`Failed to parse tool arguments for ${toolName}:`, toolCall.function.arguments);
                            toolInput = {};
                        }

                        console.log(`🔧 Calling tool: ${toolName}`);
                        console.log(`📥 Tool input:`, toolInput);

                        const toolMsg = `\n\n*🔧 Using tool: ${toolName}...*\n\n`;
                        res.write(`data: ${JSON.stringify(toolMsg)}\n\n`);

                        let toolResultContent = "";

                        try {
                            const tool = this.registeredTools.get(toolName);
                            if (!tool) throw new Error(`Tool ${toolName} not found`);

                            const toolResult = await tool.func(toolInput);
                            toolResultContent = toolResult.content[0]?.text || "No result";

                            console.log(`✅ Tool ${toolName} completed successfully`);
                        } catch (toolError: any) {
                            console.error(`❌ Tool ${toolName} failed:`, toolError);
                            toolResultContent = `Error executing tool: ${toolError.message}`;
                        }

                        messages.push({
                            role: 'tool',
                            content: toolResultContent,
                            tool_call_id: toolCall.id,
                        });
                    }
                }

                if (chunk.isDone) {
                    continueLoop = chunk.isToolCall;
                    break;
                }
            }
        }

        res.write(`data: [DONE]\n\n`);
        res.end();
        console.log(`✅ Response complete`);
    }

    private zodToJsonSchema(zodSchema: ZodTypeAny): Record<string, unknown> {
        try {
            const schemaDef = zodSchema._def as any;
            const shape = schemaDef?.shape;

            if (!shape) {
                return { type: "object", properties: {} };
            }

            const properties: Record<string, Record<string, unknown>> = {};
            const required: string[] = [];

            for (const [key, value] of Object.entries(shape)) {
                const fieldDef = (value as any)._def;
                const description = fieldDef?.description || "";

                let fieldType = "string";
                let fieldSchema: Record<string, unknown> = {};
                let isOptional = false;

                const typeName = fieldDef?.typeName as string;

                switch (typeName) {
                    case "ZodOptional":
                        isOptional = true;
                        const innerDef = fieldDef?.innerType?._def;
                        const innerTypeName = innerDef?.typeName as string;
                        switch (innerTypeName) {
                            case "ZodNumber":   fieldType = "number";  break;
                            case "ZodBoolean":  fieldType = "boolean"; break;
                            case "ZodArray":    fieldType = "array";   break;
                            case "ZodEnum":
                                fieldType = "string";
                                fieldSchema["enum"] = innerDef?.values;
                                break;
                            default: fieldType = "string";
                        }
                        break;
                    case "ZodNumber":   fieldType = "number";  break;
                    case "ZodBoolean":  fieldType = "boolean"; break;
                    case "ZodArray":    fieldType = "array";   break;
                    case "ZodEnum":
                        fieldType = "string";
                        fieldSchema["enum"] = fieldDef?.values;
                        break;
                    case "ZodString":
                    default:
                        fieldType = "string";
                        break;
                }

                properties[key] = { type: fieldType, description, ...fieldSchema };

                if (!isOptional) required.push(key);
            }

            const schema: Record<string, unknown> = { type: "object", properties };
            if (required.length > 0) schema["required"] = required;

            return schema;

        } catch (error) {
            console.error("Error converting Zod schema:", error);
            return { type: "object", properties: {} };
        }
    }

    registerTools(
        toolName: string,
        configuration: { description: string; inputSchema: ZodTypeAny },
        func: (args: any) => Promise<{
            content: { type: "text"; text: string }[];
            isError?: boolean;
        }>
    ): void {
        this.registeredTools.set(toolName, { config: configuration, func });
        this.server.registerTool(toolName, configuration, func);
        console.log(`✅ Registered tool: ${toolName}`);
    }

    async start() {
        this.app.listen(this.port, () => {
            console.log(`\n🚀 HTTP MCP Server running on http://localhost:${this.port}`);
            console.log(`🤖 LLM Provider: ${this.llm.getProvider()}`);
            console.log(`🎯 Model: ${this.llm.getModel()}`);
            console.log(`💬 Chat endpoint: POST http://localhost:${this.port}/api/chat/chat_stream`);
            console.log(`📋 Tools endpoint: GET http://localhost:${this.port}/api/tools`);
            console.log(`❤️  Health check: GET http://localhost:${this.port}/health`);
            console.log(`\n📦 Registered ${this.registeredTools.size} tools:`);
            Array.from(this.registeredTools.keys()).forEach((tool, index) => {
                console.log(`   ${index + 1}. ${tool}`);
            });
        });
    }
}
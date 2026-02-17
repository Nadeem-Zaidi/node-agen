// mhttp/mhttpserver.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { ZodTypeAny } from "zod";
import { IServer } from "../interfaces/iserver";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();


export class MHTTPServer implements IServer {
    private server: McpServer;
    private app: express.Application;
    private port: number;
    private registeredTools: Map<string, any> = new Map();
    private openai: OpenAI;

    constructor(port: number = 3000) {
        this.port = port;
        this.app = express();
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

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
        this.app.use(express.json());

        // Serve static files
        this.app.use(express.static('public'));

        this.server = new McpServer({
            name: "rag_system",
            version: "1.1.0",
        });

        this.setupRoutes();
        console.log("📋 Initializing MHTTPServer with OpenAI...");
    }

    private setupRoutes() {
        this.app.get("/health", (req: Request, res: Response) => {
            res.json({
                status: "ok",
                timestamp: new Date().toISOString(),
                registeredTools: Array.from(this.registeredTools.keys()),
            });
        });
        this.app.post("/sse", async (req: Request, res: Response) => {
            console.log("📡 New SSE connection established");

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            try {
                const transport = new SSEServerTransport("/message", res);
                await this.server.connect(transport);
                console.log("✅ MCP Server connected via SSE");
            } catch (error) {
                console.error("❌ SSE connection error:", error);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Failed to establish SSE connection" });
                }
            }
        });
        this.app.get("/message", (req: Request, res: Response) => {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.write(": ping\n\n");
            const keepAlive = setInterval(() => {
                res.write(": ping\n\n");
            }, 30000);

            req.on("close", () => {
                clearInterval(keepAlive);
            });
        });

        this.app.post("/api/chat/chat_stream", async (req: Request, res: Response) => {
            const { question } = req.body;

            if (!question) {
                return res.status(400).json({ error: "Question is required" });
            }

            console.log(`💬 User question: ${question}`);

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            try {
                await this.handleWithOpenAIAndMCP(question, res);
            } catch (error: any) {
                console.error("❌ Chat error:", error);
                res.write(`data: ${JSON.stringify("Sorry, I encountered an error: " + error.message)}\n\n`);
                res.write(`data: [DONE]\n\n`);
                res.end();
            }
        });
        this.app.get("/api/tools", async (req: Request, res: Response) => {
            try {
                const tools = Array.from(this.registeredTools.entries()).map(([name, tool]) => ({
                    name,
                    description: tool.config.description,
                }));
                res.json({ tools });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    private async handleWithOpenAIAndMCP(question: string, res: Response): Promise<void> {
        const openAITools: OpenAI.Chat.ChatCompletionTool[] = Array.from(
            this.registeredTools.entries()
        ).map(([name, tool]) => ({
            type: "function" as const,
            function: {
                name: name,
                description: tool.config.description,
                parameters: this.zodToJsonSchema(tool.config.inputSchema) as OpenAI.FunctionParameters,
            },
        }));
        console.log(`🤖 Sending to OpenAI with ${openAITools.length} tools available`);
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: `You are a helpful work order management assistant.
                        You have access to tools that can query work orders, generate statistics, and create visual reports with charts.
                        When users ask about work orders, always use the appropriate tools to get accurate real-time data.
                        When users ask for charts, graphs, pie charts, bar charts, or visual reports, always use the generate_workorder_report_with_charts tool.
                        Always provide helpful, accurate responses based on the actual data from the tools.
                        Format your responses clearly using markdown.`,
            },
            {
                role: "user",
                content: question,
            },
        ];

        let continueLoop = true;

        while (continueLoop) {
            // Step 3: Call OpenAI with tools
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                tools: openAITools,
                tool_choice: "auto",
                max_tokens: 4096,
            });

            const responseMessage = response.choices[0].message;
            const finishReason = response.choices[0].finish_reason;

            console.log(`OpenAI response - Finish reason: ${finishReason}`);
            messages.push(responseMessage);

            if (finishReason === "tool_calls" && responseMessage.tool_calls) {
                if (responseMessage.content) {
                    const words = responseMessage.content.split(' ');
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i] + (i < words.length - 1 ? ' ' : '');
                        res.write(`data: ${JSON.stringify(word)}\n\n`);
                        await new Promise(resolve => setTimeout(resolve, 20));
                    }
                }
                for (const toolCall of responseMessage.tool_calls) {
                    if (toolCall.type !== "function") continue;

                    const toolName = toolCall.function.name;
                    const toolInput = JSON.parse(toolCall.function.arguments);

                    console.log(`🔧 OpenAI calling tool: ${toolName}`);
                    console.log(`📥 Tool input:`, toolInput);
                    const toolMsg = `\n\n*🔧 Using tool: ${toolName}...*\n\n`;
                    res.write(`data: ${JSON.stringify(toolMsg)}\n\n`);

                    let toolResultContent = "";

                    try {
                        const tool = this.registeredTools.get(toolName);
                        if (!tool) {
                            throw new Error(`Tool ${toolName} not found`);
                        }

                        const toolResult = await tool.func(toolInput);
                        toolResultContent = toolResult.content[0]?.text || "No result";

                        console.log(`✅ Tool ${toolName} completed successfully`);
                    } catch (toolError: any) {
                        console.error(`Tool ${toolName} failed:`, toolError);
                        toolResultContent = `Error executing tool: ${toolError.message}`;
                    }

                    // Add tool result to messages
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: toolResultContent,
                    });
                }

            } else if (finishReason === "stop") {
                if (responseMessage.content) {
                    const words = responseMessage.content.split(' ');
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i] + (i < words.length - 1 ? ' ' : '');
                        res.write(`data: ${JSON.stringify(word)}\n\n`);
                        await new Promise(resolve => setTimeout(resolve, 20));
                    }
                }
                continueLoop = false;
            } else {
                continueLoop = false;
            }
        }

        res.write(`data: [DONE]\n\n`);
        res.end();
        console.log(`✅ Response complete`);
    }

    private zodToJsonSchema(zodSchema: ZodTypeAny): Record<string, unknown> {
        try {
            const schemaDef = zodSchema._def as any;
            const shape = schemaDef?.shape?.();

            if (!shape) {
                return {
                    type: "object",
                    properties: {},
                };
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
                            case "ZodNumber":
                                fieldType = "number";
                                break;
                            case "ZodBoolean":
                                fieldType = "boolean";
                                break;
                            case "ZodEnum":
                                fieldType = "string";
                                fieldSchema["enum"] = innerDef?.values;
                                break;
                            case "ZodArray":
                                fieldType = "array";
                                break;
                            default:
                                fieldType = "string";
                        }
                        break;

                    case "ZodNumber":
                        fieldType = "number";
                        break;

                    case "ZodBoolean":
                        fieldType = "boolean";
                        break;

                    case "ZodArray":
                        fieldType = "array";
                        break;

                    case "ZodEnum":
                        fieldType = "string";
                        fieldSchema["enum"] = fieldDef?.values;
                        break;

                    case "ZodString":
                    default:
                        fieldType = "string";
                        break;
                }

                properties[key] = {
                    type: fieldType,
                    description,
                    ...fieldSchema,
                };
                if (!isOptional) {
                    required.push(key);
                }
            }

            const schema: Record<string, unknown> = {
                type: "object",
                properties,
            };

            if (required.length > 0) {
                schema["required"] = required;
            }

            return schema;

        } catch (error) {
            console.error("Error converting Zod schema:", error);
            return {
                type: "object",
                properties: {},
            };
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
        this.registeredTools.set(toolName, {
            config: configuration,
            func: func,
        });

        this.server.registerTool(toolName, configuration, func);

        console.log(`Registered tool: ${toolName}`);
    }

    async start() {
        this.app.listen(this.port, () => {
            console.log(`\n HTTP MCP Server running on http://localhost:${this.port}`);
            console.log(`SSE endpoint: POST http://localhost:${this.port}/sse`);
            console.log(`Chat endpoint: POST http://localhost:${this.port}/api/chat/chat_stream`);
            console.log(`Tools endpoint: GET http://localhost:${this.port}/api/tools`);
            console.log(` Health check: GET http://localhost:${this.port}/health`);
            console.log(`\nRegistered ${this.registeredTools.size} tools:`);
            Array.from(this.registeredTools.keys()).forEach((tool, index) => {
                console.log(`   ${index + 1}. ${tool}`);
            });
        });
    }
}

// src/llm/providers/openai.ts
import OpenAI from 'openai';
import {
    ILLM,
    LLMMessage,
    Tool,
    LLMResponse,
    StreamChunk,
    LLMConfig,
    ToolCall,
} from '../interfaces/illm';

export class OpenAIProvider implements ILLM {
    private client: OpenAI;
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = {
            temperature: 0.7,
            maxTokens: 4096,
            ...config,
        };

        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        });
    }

    getProvider(): string {
        return 'openai';
    }

    getModel(): string {
        return this.config.model;
    }
    private toOpenAIMessages(
        messages: LLMMessage[]
    ): OpenAI.Chat.ChatCompletionMessageParam[] {
        return messages.map((msg) => {
            if (msg.role === 'tool') {
                return {
                    role: 'tool' as const,
                    content: msg.content,
                    tool_call_id: msg.tool_call_id!,
                };
            }

            if (msg.tool_calls) {
                const functionToolCalls = msg.tool_calls
                    .filter(tc => tc.type === 'function')
                    .map(tc => ({
                        id: tc.id,
                        type: 'function' as const,
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments,
                        },
                    }));

                return {
                    role: 'assistant' as const,
                    content: msg.content,
                    tool_calls: functionToolCalls,
                };
            }

            return {
                role: msg.role as 'system' | 'user' | 'assistant',
                content: msg.content,
            };
        });
    }

    async chat(messages: LLMMessage[], tools?: Tool[]): Promise<LLMResponse> {
        const openAIMessages = this.toOpenAIMessages(messages);

        const response = await this.client.chat.completions.create({
            model: this.config.model,
            messages: openAIMessages,
            tools: tools as OpenAI.Chat.ChatCompletionTool[],
            tool_choice: tools ? 'auto' : undefined,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        });

        const choice = response.choices[0];
        const message = choice.message;

        // 🔥 Fix: Filter and check type before accessing .function
        const toolCalls: ToolCall[] | null = message.tool_calls
            ? message.tool_calls
                .filter((tc) => tc.type === 'function') // 🔥 Type guard
                .map((tc) => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    },
                }))
            : null;

        return {
            content: message.content,
            toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : null,
            finishReason: choice.finish_reason as any,
        };
    }

    async *streamChat(
        messages: LLMMessage[],
        tools?: Tool[]
    ): AsyncGenerator<StreamChunk, void, unknown> {
        const openAIMessages = this.toOpenAIMessages(messages);

        const stream = await this.client.chat.completions.create({
            model: this.config.model,
            messages: openAIMessages,
            tools: tools as OpenAI.Chat.ChatCompletionTool[],
            tool_choice: tools ? 'auto' : undefined,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            stream: true,
        });

        let accumulatedToolCalls: Map<number, ToolCall> = new Map();

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            const finishReason = chunk.choices[0]?.finish_reason;

            // Handle content
            if (delta?.content) {
                yield {
                    content: delta.content,
                    isToolCall: false,
                    isDone: false,
                };
            }

            // Handle tool calls
            if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                    if (toolCall.type && toolCall.type !== 'function') continue;

                    const index = toolCall.index;

                    if (!accumulatedToolCalls.has(index)) {
                        accumulatedToolCalls.set(index, {
                            id: toolCall.id || '',
                            type: 'function',
                            function: {
                                name: toolCall.function?.name || '',
                                arguments: toolCall.function?.arguments || '',
                            },
                        });
                    } else {
                        const existing = accumulatedToolCalls.get(index)!;
                        if (toolCall.function?.name) {
                            existing.function.name += toolCall.function.name;
                        }
                        if (toolCall.function?.arguments) {
                            existing.function.arguments += toolCall.function.arguments;
                        }
                    }
                }
            }

            // Check if done
            if (finishReason) {
                const toolCallsArray = Array.from(accumulatedToolCalls.values());
                yield {
                    content: '',
                    isToolCall: toolCallsArray.length > 0,
                    toolCalls: toolCallsArray.length > 0 ? toolCallsArray : undefined,
                    isDone: true,
                };
            }
        }
    }

    /**
     * Generate embeddings
     */
    async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;
    }
}
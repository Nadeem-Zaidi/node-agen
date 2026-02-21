// src/llm/interface/illm.ts

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | any[];  // ✅ allow array for vision messages
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface LLMResponse {
    content: string | null;
    toolCalls: ToolCall[] | null;
    finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | null;
}

export interface StreamChunk {
    content: string;
    isToolCall: boolean;
    toolCalls?: ToolCall[];
    isDone: boolean;
}

export interface LLMConfig {
    model: string;
    apiKey?: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface ILLM {
    /**
     * Send a non-streaming chat completion request
     */
    chat(
        messages: LLMMessage[],
        tools?: Tool[]
    ): Promise<LLMResponse>;

    /**
     * Send a streaming chat completion request
     */
    streamChat(
        messages: LLMMessage[],
        tools?: Tool[]
    ): AsyncGenerator<StreamChunk, void, unknown>;

    /**
     * Generate embeddings for text
     */
    generateEmbedding?(text: string): Promise<number[]>;

    /**
     * Get provider name
     */
    getProvider(): string;

    /**
     * Get model name
     */
    getModel(): string;
}
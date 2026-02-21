// // src/llm/factory/llm_factory.ts

// import { ILLM, LLMConfig } from "../interfaces/illm";
// import { OpenAIProvider } from "../llms/open_ai";

// export type LLMProvider = 'openai' | 'ollama' | 'anthropic';

// export class LLMFactory {
//     static create(provider: LLMProvider, config: LLMConfig): ILLM {
//         switch (provider) {
//             case 'openai':
//                 return new OpenAIProvider(config);
            
//             default:
//                 throw new Error(`Unknown LLM provider: ${provider}`);
//         }
//     }

//     /**
//      * Create from environment variables
//      */
//     static createFromEnv(): ILLM {
//         const useLocalLLM = process.env.USE_LOCAL_LLM === 'true';

//         if (useLocalLLM) {
//             return LLMFactory.create('ollama', {
//                 model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
//                 baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
//             });
//         } else {
//             return LLMFactory.create('openai', {
//                 model: process.env.OPENAI_MODEL || 'gpt-4o',
//                 apiKey: process.env.OPENAI_API_KEY!,
//             });
//         }
//     }
// }

// src/llm/factory/llm_factory.ts

import { ILLM, LLMConfig } from "../interfaces/illm";
import { OpenAIProvider } from "../llms/open_ai";

export type LLMProvider = "openai" | "ollama" | "anthropic" | "gemma";

export class LLMFactory {
    static create(provider: LLMProvider, config: LLMConfig): ILLM {
        switch (provider) {
            case "openai":
                return new OpenAIProvider(config);

            // case "ollama":
            // case "gemma":
            //     return new GemmaProvider(config);

            default:
                throw new Error(`Unknown LLM provider: ${provider}`);
        }
    }

    /**
     * Create from environment variables.
     *
     * Relevant env vars:
     *   USE_LOCAL_LLM=true          → uses Ollama/Gemma
     *   OLLAMA_MODEL                → defaults to "gemma:1b"
     *   OLLAMA_BASE_URL             → defaults to "http://localhost:11434"
     *   OPENAI_MODEL                → defaults to "gpt-4o"
     *   OPENAI_API_KEY              → required when not using local LLM
     *   LLM_TEMPERATURE             → optional, float
     *   LLM_MAX_TOKENS              → optional, integer
     */
    static createFromEnv(): ILLM {
        const useLocalLLM  = process.env.USE_LOCAL_LLM === "true";
        const temperature  = process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : undefined;
        const maxTokens    = process.env.LLM_MAX_TOKENS  ? parseInt(process.env.LLM_MAX_TOKENS, 10) : undefined;

        if (useLocalLLM) {
            return LLMFactory.create("gemma", {
                model:       process.env.OLLAMA_MODEL    || "gemma:1b",
                baseURL:     process.env.OLLAMA_BASE_URL || "http://localhost:11434",
                temperature,
                maxTokens,
            });
        }

        return LLMFactory.create("openai", {
            model:       process.env.OPENAI_MODEL || "gpt-4o",
            apiKey:      process.env.OPENAI_API_KEY!,
            temperature,
            maxTokens,
        });
    }
}
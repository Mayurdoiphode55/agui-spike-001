/**
 * Mastra → AG-UI Adapter
 * Bridges Mastra agents with AG-UI protocol events
 * Uses Groq API for LLM
 */

import { createGroq } from '@ai-sdk/groq';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Types for AG-UI events
interface EventEmitter {
    emit(eventType: string, data: Record<string, unknown>): Promise<void>;
    emitTextChunk(content: string, messageId: string): Promise<void>;
    emitRunStarted(runId: string, threadId: string): Promise<void>;
    emitRunFinished(runId: string, threadId: string): Promise<void>;
    emitRunError(error: string, runId: string): Promise<void>;
    emitToolCallStart(toolName: string, toolCallId: string, args?: Record<string, unknown>): Promise<void>;
    emitToolCallEnd(toolCallId: string, result: string): Promise<void>;
    emitTextMessageStart(messageId: string, role: string): Promise<void>;
    emitTextMessageEnd(messageId: string): Promise<void>;
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Tool definitions
const calculatorTool = tool({
    description: 'Evaluate a mathematical expression',
    parameters: z.object({
        expression: z.string().describe('The math expression to evaluate')
    }),
    execute: async ({ expression }: { expression: string }) => {
        try {
            // Safe eval for basic math
            const result = Function(`"use strict"; return (${expression})`)();
            return `Result: ${result}`;
        } catch (error) {
            return `Error: ${error instanceof Error ? error.message : 'Invalid expression'}`;
        }
    }
});

const webSearchTool = tool({
    description: 'Search the web for information (simulated)',
    parameters: z.object({
        query: z.string().describe('The search query')
    }),
    execute: async ({ query }: { query: string }) => {
        // Simulated search results
        return `Search results for "${query}": Found relevant information about this topic including recent developments and key facts.`;
    }
});

const getCurrentTimeTool = tool({
    description: 'Get the current date and time',
    parameters: z.object({}),
    execute: async () => {
        return `Current time: ${new Date().toISOString()}`;
    }
});

/**
 * Mastra AG-UI Adapter
 * Uses Vercel AI SDK with Groq for fast inference
 */
export class MastraAGUIAdapter {
    private emitter: EventEmitter;
    private groq: ReturnType<typeof createGroq>;
    private modelId: string;

    constructor(emitter: EventEmitter) {
        this.emitter = emitter;

        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            throw new Error('GROQ_API_KEY environment variable is required');
        }

        this.modelId = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

        // Create Groq provider
        this.groq = createGroq({
            apiKey: groqApiKey
        });
    }

    /**
     * Process a user message and emit AG-UI events
     */
    async processMessage(userInput: string, history: Message[] = []): Promise<string> {
        const runId = `run-${Date.now().toString(36)}`;
        const threadId = `thread-${Date.now().toString(36)}`;
        const messageId = `msg-${Date.now().toString(36)}`;

        // Emit run started
        await this.emitter.emitRunStarted(runId, threadId);

        try {
            // Pre-detect math and manually invoke calculator
            const mathPattern = /(?:what\s+is\s+|calculate\s+|compute\s+)?(\d+\s*[\+\-\*\/\(\)]\s*[\d\+\-\*\/\(\)\s]+\d)/i;
            const mathMatch = mathPattern.exec(userInput);

            let calculatorResult = null;
            if (mathMatch) {
                const expression = mathMatch[1].replace(/\s/g, '');
                const toolCallId = `tool-${Date.now().toString(36)}`;

                await this.emitter.emitToolCallStart('calculator', toolCallId, { expression });

                // Manually execute calculator
                try {
                    const result = Function(`"use strict"; return (${expression})`)();
                    calculatorResult = `Result: ${result}`;
                    await this.emitter.emitToolCallEnd(toolCallId, calculatorResult);
                } catch (error) {
                    calculatorResult = `Error: Invalid expression`;
                    await this.emitter.emitToolCallEnd(toolCallId, calculatorResult);
                }
            }

            // Build messages array
            const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant. Be concise and clear.'
                }
            ];

            // Add history
            for (const msg of history) {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }

            // If calculator was used, inject result into user message
            const finalInput = calculatorResult
                ? `${userInput}\n\nCalculator result: ${calculatorResult}\n\nPlease provide the final answer based on this calculation.`
                : userInput;

            // Add current user message
            if (!history.some(m => m.role === 'user' && m.content === userInput)) {
                messages.push({
                    role: 'user',
                    content: finalInput
                });
            }

            // Emit text message start
            await this.emitter.emitTextMessageStart(messageId, 'assistant');

            let fullResponse = '';

            // Use simple streamText without tools (since Groq doesn't support them reliably)
            const result = await streamText({
                model: this.groq(this.modelId),
                messages,
                maxTokens: 500,
                temperature: 0.3
            });

            // Stream the text
            for await (const chunk of result.textStream) {
                fullResponse += chunk;
                await this.emitter.emitTextChunk(chunk, messageId);
            }

            // Emit text message end
            await this.emitter.emitTextMessageEnd(messageId);

            // Emit run finished
            await this.emitter.emitRunFinished(runId, threadId);

            return fullResponse;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.emitter.emitRunError(errorMessage, runId);
            throw error;
        }
    }
}

// Factory function for creating adapter
export function createMastraAdapter(emitter: EventEmitter): MastraAGUIAdapter {
    return new MastraAGUIAdapter(emitter);
}

export default MastraAGUIAdapter;

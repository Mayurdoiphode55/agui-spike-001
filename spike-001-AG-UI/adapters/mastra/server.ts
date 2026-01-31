/**
 * Mastra AG-UI Server
 * Express server with SSE streaming for AG-UI events
 * Uses Groq API for LLM
 * Includes UI Action support
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MASTRA_PORT || 8001;

// Verify Groq API key
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    console.error('ERROR: GROQ_API_KEY environment variable is required');
    process.exit(1);
}

// Initialize Groq
const groq = createGroq({
    apiKey: groqApiKey
});
const modelId = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// SSE Event helper
function sendSSE(res: Response, eventType: string, data: Record<string, unknown>) {
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...data
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Parse UI actions from text
function parseUIActions(text: string): Array<{ action: string, args: Record<string, unknown> }> {
    const actions: Array<{ action: string, args: Record<string, unknown> }> = [];

    // Simple pattern matching for UI commands
    const lowerText = text.toLowerCase();

    // Background color patterns
    const colorMatch = lowerText.match(/(?:change|set|make).*(?:background|bg).*(?:to|color)?\s*(blue|red|green|yellow|purple|pink|orange|black|white|gray|#[0-9a-f]{3,6})/i);
    if (colorMatch) {
        actions.push({
            action: 'changeBackgroundColor',
            args: { color: colorMatch[1] }
        });
    }

    // Theme patterns  
    if (lowerText.includes('light theme') || lowerText.includes('light mode')) {
        actions.push({ action: 'changeTheme', args: { theme: 'light' } });
    } else if (lowerText.includes('dark theme') || lowerText.includes('dark mode')) {
        actions.push({ action: 'changeTheme', args: { theme: 'dark' } });
    }

    // Notification patterns
    const notifyMatch = lowerText.match(/(?:show|display).*notification.*(?:saying|with|message)?\s*['""]?(.+?)['""]?$/i);
    if (notifyMatch) {
        actions.push({
            action: 'showNotification',
            args: { message: notifyMatch[1], type: 'info' }
        });
    }

    // Reset pattern
    if (lowerText.includes('reset') && (lowerText.includes('ui') || lowerText.includes('default'))) {
        actions.push({ action: 'resetUI', args: {} });
    }

    return actions;
}

// Main AG-UI endpoint
app.post('/api/copilotkit', async (req: Request, res: Response) => {
    const { messages } = req.body;

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const runId = `run-${Date.now().toString(36)}`;
    const threadId = `thread-${Date.now().toString(36)}`;
    const messageId = `msg-${Date.now().toString(36)}`;

    try {
        // Emit run started
        sendSSE(res, 'RUN_STARTED', { runId, threadId });

        // Get the last user message
        const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').pop();
        const userInput = lastUserMsg?.content || '';

        // Check for UI actions in user input
        const uiActions = parseUIActions(userInput);

        // If UI actions detected, emit them
        for (const action of uiActions) {
            sendSSE(res, 'TOOL_CALL_START', {
                toolCallId: `tool-${Date.now().toString(36)}`,
                toolName: action.action
            });
            sendSSE(res, 'UI_ACTION', {
                action: action.action,
                args: action.args
            });
            sendSSE(res, 'TOOL_CALL_END', {
                toolCallId: `tool-${Date.now().toString(36)}`
            });
        }

        // Build messages for Groq
        const groqMessages = [
            {
                role: 'system' as const,
                content: `You are a helpful AI assistant that can control the UI.
When the user asks to change colors, themes, or show notifications, confirm that you've done it.
Examples:
- "Change background to blue" -> "I've changed the background to blue!"
- "Switch to light mode" -> "Done! Switched to light theme."
- "Reset the UI" -> "UI has been reset to default settings."

Be helpful and concise.`
            },
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }))
        ];

        // Emit text message start
        sendSSE(res, 'TEXT_MESSAGE_START', { messageId, role: 'assistant' });

        // Generate response
        const result = await generateText({
            model: groq(modelId),
            messages: groqMessages
        });

        // Stream the response word by word
        const text = result.text;
        const words = text.split(' ');

        for (let i = 0; i < words.length; i++) {
            const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
            sendSSE(res, 'TEXT_MESSAGE_CONTENT', {
                messageId,
                delta: chunk
            });
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        // Emit completion events
        sendSSE(res, 'TEXT_MESSAGE_END', { messageId });
        sendSSE(res, 'RUN_FINISHED', { runId, threadId });

    } catch (error) {
        console.error('Mastra error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sendSSE(res, 'RUN_ERROR', { runId, message: errorMessage });
    } finally {
        sendSSE(res, 'DONE', {});
        res.end();
    }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', adapter: 'mastra', model: modelId });
});

// Root
app.get('/', (_req: Request, res: Response) => {
    res.json({
        name: 'Mastra AG-UI Adapter',
        version: '1.0.0',
        provider: 'Groq',
        model: modelId,
        uiActionsSupported: ['changeBackgroundColor', 'changeTheme', 'showNotification', 'resetUI']
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Mastra AG-UI Server running at http://localhost:${PORT}`);
    console.log(`   Model: ${modelId}`);
    console.log(`   Provider: Groq`);
    console.log(`   UI Actions: Enabled`);
});

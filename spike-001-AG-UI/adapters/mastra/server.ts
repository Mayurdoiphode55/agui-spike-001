/**
 * Mastra AG-UI Server
 * Express server with SSE streaming for AG-UI events
 * Uses Groq API for LLM with keyword-based routing
 * Includes Weather Card, Planning Checklist, UI Action support
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createGroq } from '@ai-sdk/groq';
import { generateText, streamText } from 'ai';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MASTRA_PORT || process.env.PORT || 8001;

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
console.log(`🧠 Mastra adapter using model: ${modelId}`);

// SSE Event helper
function sendSSE(res: Response, eventType: string, data: Record<string, unknown>) {
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...data
    };
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// ============ FEATURE IMPLEMENTATIONS ============

// Weather data (simulated but realistic)
function getWeatherData(location: string) {
    const weatherData: Record<string, { temp: number; condition: string; humidity: number; wind: number; feelsLike: number }> = {
        'mumbai': { temp: 32, condition: 'Humid', humidity: 85, wind: 8, feelsLike: 38 },
        'delhi': { temp: 28, condition: 'Sunny', humidity: 45, wind: 12, feelsLike: 30 },
        'new york': { temp: 15, condition: 'Cloudy', humidity: 60, wind: 20, feelsLike: 12 },
        'london': { temp: 8, condition: 'Rainy', humidity: 80, wind: 15, feelsLike: 5 },
        'tokyo': { temp: 18, condition: 'Clear', humidity: 55, wind: 10, feelsLike: 17 },
        'paris': { temp: 12, condition: 'Partly Cloudy', humidity: 65, wind: 14, feelsLike: 10 },
        'bangalore': { temp: 26, condition: 'Pleasant', humidity: 50, wind: 6, feelsLike: 25 },
        'pune': { temp: 29, condition: 'Warm', humidity: 55, wind: 8, feelsLike: 31 },
    };

    const key = location.toLowerCase();
    if (weatherData[key]) {
        return weatherData[key];
    }
    return {
        temp: Math.floor(Math.random() * 30) + 5,
        condition: ['Sunny', 'Cloudy', 'Rainy', 'Clear'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 50) + 30,
        wind: Math.floor(Math.random() * 20) + 5,
        feelsLike: Math.floor(Math.random() * 30) + 5
    };
}

function createWeatherComponent(location: string): string {
    const weather = getWeatherData(location);
    const componentData = {
        location: location.charAt(0).toUpperCase() + location.slice(1),
        temperature: weather.temp,
        condition: weather.condition,
        humidity: weather.humidity,
        wind: weather.wind,
        feelsLike: weather.feelsLike
    };
    return `COMPONENT:WeatherCard:${JSON.stringify(componentData)}`;
}

function createPlanComponent(topic: string): string {
    const topicLower = topic.toLowerCase();
    let title = `Plan for: ${topic}`;
    let tasks: { id: string; label: string; checked: boolean }[] = [];

    if (topicLower.includes('software') || topicLower.includes('app') || topicLower.includes('web') || topicLower.includes('mobile')) {
        title = 'Software Development Plan';
        tasks = [
            { id: '1', label: 'Define requirements and scope', checked: true },
            { id: '2', label: 'Design architecture', checked: true },
            { id: '3', label: 'Set up project structure', checked: false },
            { id: '4', label: 'Implement core features', checked: false },
            { id: '5', label: 'Test and deploy', checked: false }
        ];
    } else if (topicLower.includes('product') || topicLower.includes('launch') || topicLower.includes('market')) {
        title = 'Product Launch Plan';
        tasks = [
            { id: '1', label: 'Initial research and analysis', checked: true },
            { id: '2', label: 'Define strategy and goals', checked: true },
            { id: '3', label: 'Execute phase 1', checked: false },
            { id: '4', label: 'Review progress', checked: false },
            { id: '5', label: 'Finalize and deliver', checked: false }
        ];
    } else {
        tasks = [
            { id: '1', label: 'Research and gather requirements', checked: true },
            { id: '2', label: 'Create detailed plan', checked: false },
            { id: '3', label: 'Execute main tasks', checked: false },
            { id: '4', label: 'Review and iterate', checked: false },
            { id: '5', label: 'Complete and document', checked: false }
        ];
    }

    const componentData = { title, tasks };
    return `COMPONENT:TaskChecklist:${JSON.stringify(componentData)}`;
}

function executePlan(planTitle: string, steps: string[]): string {
    let result = `## ✨ Executing: ${planTitle}\n\n`;
    result += "I'm now working through your approved steps:\n\n";

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepLower = step.toLowerCase();
        result += `### Step ${i + 1}: ${step}\n`;

        if (stepLower.includes('research') || stepLower.includes('analysis')) {
            result += "📊 Conducting comprehensive research and gathering relevant data.\n\n";
        } else if (stepLower.includes('design') || stepLower.includes('architecture')) {
            result += "🎨 Creating detailed design specifications and system architecture.\n\n";
        } else if (stepLower.includes('strategy') || stepLower.includes('goals')) {
            result += "🎯 Defining clear objectives with measurable KPIs.\n\n";
        } else if (stepLower.includes('implement') || stepLower.includes('execute') || stepLower.includes('develop')) {
            result += "💻 Building and implementing the core functionality.\n\n";
        } else if (stepLower.includes('test') || stepLower.includes('deploy')) {
            result += "🚀 Running comprehensive tests and preparing for deployment.\n\n";
        } else {
            result += "✅ Working on this step with full attention to detail.\n\n";
        }
    }

    result += "---\n";
    result += `🎉 **All ${steps.length} steps are now in progress!**\n`;
    return result;
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
        sendSSE(res, 'RUN_STARTED', { runId, threadId });

        const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').pop();
        const userInput = lastUserMsg?.content || '';
        const userLower = userInput.toLowerCase();

        let responseText = '';
        let useKeywordResponse = false;

        // ============ KEYWORD-BASED ROUTING ============

        // Check for EXECUTE_PLAN command
        if (userInput.startsWith('EXECUTE_PLAN:')) {
            try {
                const jsonStart = userInput.indexOf(':[');
                if (jsonStart !== -1) {
                    const planTitle = userInput.substring('EXECUTE_PLAN:'.length, jsonStart);
                    const stepsJson = userInput.substring(jsonStart + 1);
                    const steps = JSON.parse(stepsJson) as string[];
                    responseText = executePlan(planTitle, steps);
                    useKeywordResponse = true;
                }
            } catch (e) {
                responseText = `Error executing plan: ${e instanceof Error ? e.message : 'Unknown error'}`;
                useKeywordResponse = true;
            }
        }

        // Check for PLANNING requests
        if (!useKeywordResponse) {
            const planningKeywords = ['plan ', 'plan a ', 'create a plan', 'steps to', 'checklist', 'how to', 'steps for'];
            if (planningKeywords.some(kw => userLower.includes(kw))) {
                let topic = userInput;
                for (const prefix of ['plan ', 'plan a ', 'create a plan for ', 'steps to ', 'checklist for ']) {
                    if (userLower.startsWith(prefix)) {
                        topic = userInput.substring(prefix.length);
                        break;
                    }
                }
                responseText = createPlanComponent(topic);
                useKeywordResponse = true;
            }
        }

        // Check for WEATHER requests
        if (!useKeywordResponse) {
            const weatherKeywords = ['weather in', 'weather like in', 'weather for', 'temperature in'];
            if (weatherKeywords.some(kw => userLower.includes(kw))) {
                const locationMatch = userInput.match(/(?:weather in|weather like in|weather for|temperature in)\s+(.+?)(?:\?|$)/i);
                const location = locationMatch ? locationMatch[1].trim() : 'Unknown';
                responseText = createWeatherComponent(location);
                useKeywordResponse = true;
            }
        }

        // Check for TIME requests
        if (!useKeywordResponse) {
            const timeKeywords = ['what time', 'current time', 'time is it', 'time now'];
            if (timeKeywords.some(kw => userLower.includes(kw))) {
                const now = new Date();
                responseText = `Current time: ${now.toISOString().replace('T', ' ').split('.')[0]}`;
                useKeywordResponse = true;
            }
        }

        // Check for UI ACTION: Theme change
        if (!useKeywordResponse) {
            const themeKeywords = ['light theme', 'light mode', 'dark theme', 'dark mode'];
            if (themeKeywords.some(kw => userLower.includes(kw))) {
                const theme = userLower.includes('light') ? 'light' : 'dark';
                sendSSE(res, 'UI_ACTION', { action: 'changeTheme', args: { theme } });
                responseText = `Switched to ${theme} theme! ✨`;
                useKeywordResponse = true;
            }
        }

        // Check for UI ACTION: Reset UI
        if (!useKeywordResponse) {
            const resetKeywords = ['reset ui', 'reset the ui', 'default ui', 'restore ui'];
            if (resetKeywords.some(kw => userLower.includes(kw))) {
                sendSSE(res, 'UI_ACTION', { action: 'resetUI', args: {} });
                responseText = 'UI reset to defaults! 🔄';
                useKeywordResponse = true;
            }
        }

        // Check for UI ACTION: Background color
        if (!useKeywordResponse) {
            const bgKeywords = ['background to', 'background color', 'background colour', 'change background', 'make background'];
            if (bgKeywords.some(kw => userLower.includes(kw))) {
                const colorMatch = userInput.match(/\bto\s+(\w+)\s*$/i);
                let color = 'blue';
                if (colorMatch) {
                    color = colorMatch[1];
                } else {
                    const words = userInput.split(' ');
                    color = words[words.length - 1].replace(/[?!.]/g, '') || 'blue';
                }
                sendSSE(res, 'UI_ACTION', { action: 'changeBackgroundColor', args: { color } });
                responseText = `Background changed to ${color}! 🎨`;
                useKeywordResponse = true;
            }
        }

        // Check for GREETINGS
        if (!useKeywordResponse) {
            const greetings = ['hello', 'hi', 'hey', 'hi there', 'hello there'];
            if (greetings.includes(userLower.trim()) || userLower.startsWith('hello,') || userLower.startsWith('hi,')) {
                responseText = "Hello! 👋 I'm your AI assistant (Mastra). I can help you with:\n• Weather info (try: 'What's the weather in Mumbai?')\n• Planning tasks (try: 'Plan a product launch')\n• UI changes (try: 'Change background to blue')\n• Calculations, time, and more!\n\nHow can I help you today?";
                useKeywordResponse = true;
            }
        }

        // Emit response
        sendSSE(res, 'TEXT_MESSAGE_START', { messageId, role: 'assistant' });

        if (useKeywordResponse) {
            // Keyword-routed response - send directly
            sendSSE(res, 'TEXT_MESSAGE_CONTENT', { messageId, delta: responseText });
        } else {
            // Fallback to LLM for other queries
            const groqMessages = [
                {
                    role: 'system' as const,
                    content: 'You are a helpful AI assistant. Be concise and clear.'
                },
                ...messages.map((m: { role: string; content: string }) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                }))
            ];

            const result = await generateText({
                model: groq(modelId),
                messages: groqMessages
            });

            responseText = result.text;

            // Stream the response word by word
            const words = responseText.split(' ');
            for (let i = 0; i < words.length; i++) {
                const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
                sendSSE(res, 'TEXT_MESSAGE_CONTENT', { messageId, delta: chunk });
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }

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
        features: ['Weather Card', 'Planning Checklist', 'UI Actions', 'Time', 'Greetings'],
        uiActionsSupported: ['changeBackgroundColor', 'changeTheme', 'showNotification', 'resetUI']
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Mastra AG-UI Server running at http://localhost:${PORT}`);
    console.log(`   Model: ${modelId}`);
    console.log(`   Provider: Groq`);
    console.log(`   Features: Weather, Planning, UI Actions, Time`);
});

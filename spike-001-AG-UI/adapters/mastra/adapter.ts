/**
 * Mastra → AG-UI Adapter
 * Bridges Mastra agents with AG-UI protocol events
 * Uses Groq API for LLM with keyword-based routing for reliability
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
    emitUIAction?(action: string, args: Record<string, unknown>): Promise<void>;
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// ============ TOOL IMPLEMENTATIONS ============

// Weather data (simulated but realistic)
function getWeatherData(location: string) {
    const weatherData: Record<string, any> = {
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
    // Default random weather for unknown locations
    return {
        temp: Math.floor(Math.random() * 30) + 5,
        condition: ['Sunny', 'Cloudy', 'Rainy', 'Clear'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 50) + 30,
        wind: Math.floor(Math.random() * 20) + 5,
        feelsLike: Math.floor(Math.random() * 30) + 5
    };
}

// Create weather component response
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

// Create planning checklist component
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
        // Generic plan
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

// Execute plan steps
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
        } else if (stepLower.includes('review') || stepLower.includes('progress')) {
            result += "📋 Evaluating current progress against goals.\n\n";
        } else {
            result += "✅ Working on this step with full attention to detail.\n\n";
        }
    }

    result += "---\n";
    result += `🎉 **All ${steps.length} steps are now in progress!**\n`;
    return result;
}

// Get current time
function getCurrentTime(): string {
    const now = new Date();
    return `Current time: ${now.toISOString().replace('T', ' ').split('.')[0]}`;
}

// Document Search
function createDocSearchComponent(query: string): string {
    const docs = [
        { title: "AG-UI Protocol Overview", snippet: "The AG-UI protocol defines a standard set of events for AI-to-UI communication. It enables framework-agnostic integration through events like RUN_STARTED, TEXT_MESSAGE_CONTENT, TOOL_CALL_START, and UI_ACTION.", category: "architecture", keywords: ["agui", "protocol", "events", "overview", "architecture", "sse", "streaming"] },
        { title: "REST API Endpoints Guide", snippet: "The backend exposes POST /api/copilotkit as the main endpoint. It accepts messages in JSON format and returns an SSE stream. Additional endpoints include GET /health and GET /api/adapters.", category: "api", keywords: ["api", "endpoints", "rest", "http", "post", "get", "routes", "copilotkit"] },
        { title: "Adapter Pattern Implementation", snippet: "Adapters translate framework-specific events into AG-UI protocol events. Each adapter implements process_message() and emits standardized events through an EventEmitter.", category: "architecture", keywords: ["adapter", "pattern", "langchain", "mastra", "crewai", "implementation", "design"] },
        { title: "Authentication & Security Guide", snippet: "API keys are managed through environment variables. CORS is configured to allow frontend origins. In production, implement rate limiting and token-based authentication.", category: "security", keywords: ["security", "authentication", "auth", "api key", "cors", "token", "rate limit"] },
        { title: "Frontend Component Architecture", snippet: "The React frontend uses a hook-based architecture (useAGUI) to manage SSE connections. Components like WeatherCard, TaskChecklist, and DocSearchCard render structured data.", category: "frontend", keywords: ["frontend", "react", "component", "hook", "useagui", "state", "ui"] },
        { title: "Database Schema & Data Models", snippet: "Currently uses in-memory data structures. For production, recommended PostgreSQL with conversation_logs, user_sessions tables. Use Redis for caching.", category: "database", keywords: ["database", "schema", "data", "model", "postgresql", "redis", "storage"] },
        { title: "Deployment Guide", snippet: "Deploy Python backend with uvicorn behind nginx. Mastra runs on Node.js. Use Docker Compose for containerized deployment.", category: "deployment", keywords: ["deploy", "deployment", "docker", "production", "nginx", "uvicorn", "hosting"] },
        { title: "UI Actions & Theme System", snippet: "AI can control UI through UI_ACTION events. Supported actions: changeBackgroundColor, changeTheme, showNotification, and resetUI.", category: "frontend", keywords: ["ui", "actions", "theme", "background", "notification", "dark mode", "light mode"] },
        { title: "Testing & Quality Assurance", snippet: "Run unit tests with pytest for Python adapters. Frontend tests use Vitest and React Testing Library. Performance benchmarks evaluate 7 parameters.", category: "testing", keywords: ["testing", "test", "pytest", "vitest", "quality", "benchmark", "performance"] },
        { title: "Event Emitter & SSE Streaming", snippet: "The EventEmitter class manages AG-UI event emission using asyncio queues. Events are serialized to JSON and sent as SSE data frames.", category: "architecture", keywords: ["event", "emitter", "sse", "streaming", "asyncio", "queue", "real-time"] },
    ];

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    const scoredResults: { title: string; snippet: string; relevance: number; category: string }[] = [];

    for (const doc of docs) {
        let score = 0;
        for (const word of queryWords) {
            if (doc.title.toLowerCase().includes(word)) score += 30;
            for (const kw of doc.keywords) {
                if (word.includes(kw) || kw.includes(word)) score += 20;
            }
            if (doc.snippet.toLowerCase().includes(word)) score += 10;
        }
        if (score > 0) {
            scoredResults.push({ title: doc.title, snippet: doc.snippet, relevance: Math.min(98, score), category: doc.category });
        }
    }

    scoredResults.sort((a, b) => b.relevance - a.relevance);
    const topResults = scoredResults.slice(0, 5);
    if (topResults.length === 0) {
        topResults.push({ title: "No Results Found", snippet: `No documents matching '${query}' found. Try 'API', 'deployment', 'security', 'architecture', or 'testing'.`, relevance: 0, category: "general" });
    }

    return `COMPONENT:DocSearchCard:${JSON.stringify({ query, results: topResults, totalFound: scoredResults.length })}`;
}

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
        console.log(`🧠 Mastra adapter using model: ${this.modelId}`);

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
            const userLower = userInput.toLowerCase();

            // ============ KEYWORD-BASED ROUTING FOR RELIABLE FEATURES ============

            // Check for EXECUTE_PLAN command
            if (userInput.startsWith('EXECUTE_PLAN:')) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                try {
                    const jsonStart = userInput.indexOf(':[');
                    if (jsonStart !== -1) {
                        const planTitle = userInput.substring('EXECUTE_PLAN:'.length, jsonStart);
                        const stepsJson = userInput.substring(jsonStart + 1);
                        const steps = JSON.parse(stepsJson) as string[];
                        const result = executePlan(planTitle, steps);
                        await this.emitter.emitTextChunk(result, messageId);
                        await this.emitter.emitTextMessageEnd(messageId);
                        await this.emitter.emitRunFinished(runId, threadId);
                        return result;
                    }
                } catch (e) {
                    const error = `Error executing plan: ${e instanceof Error ? e.message : 'Unknown error'}`;
                    await this.emitter.emitTextChunk(error, messageId);
                    await this.emitter.emitTextMessageEnd(messageId);
                    await this.emitter.emitRunFinished(runId, threadId);
                    return error;
                }
            }

            // Check for PLANNING requests
            const planningKeywords = ['plan ', 'plan a ', 'create a plan', 'steps to', 'checklist', 'how to', 'steps for'];
            if (planningKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                let topic = userInput;
                for (const prefix of ['plan ', 'plan a ', 'create a plan for ', 'steps to ', 'checklist for ']) {
                    if (userLower.startsWith(prefix)) {
                        topic = userInput.substring(prefix.length);
                        break;
                    }
                }
                const result = createPlanComponent(topic);
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for WEATHER requests
            const weatherKeywords = ['weather in', 'weather like in', 'weather for', 'temperature in'];
            if (weatherKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                const locationMatch = userInput.match(/(?:weather in|weather like in|weather for|temperature in)\s+(.+?)(?:\?|$)/i);
                const location = locationMatch ? locationMatch[1].trim() : 'Unknown';
                const result = createWeatherComponent(location);
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for DOC SEARCH requests
            const docSearchKeywords = ['search docs', 'doc search', 'search documentation', 'find docs', 'search for docs', 'search in docs'];
            if (docSearchKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                let searchQuery = userInput;
                for (const prefix of ['search docs for ', 'search docs ', 'doc search ', 'search documentation for ', 'find docs for ', 'find docs about ', 'search in docs for ']) {
                    if (userLower.startsWith(prefix)) {
                        searchQuery = userInput.substring(prefix.length);
                        break;
                    }
                }
                const result = createDocSearchComponent(searchQuery);
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for TIME requests
            const timeKeywords = ['what time', 'current time', 'time is it', 'time now'];
            if (timeKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                const result = getCurrentTime();
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for UI ACTION: Theme change
            const themeKeywords = ['light theme', 'light mode', 'dark theme', 'dark mode'];
            if (themeKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                const theme = userLower.includes('light') ? 'light' : 'dark';
                if (this.emitter.emitUIAction) {
                    await this.emitter.emitUIAction('changeTheme', { theme });
                }
                const result = `Switched to ${theme} theme! ✨`;
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for UI ACTION: Reset UI
            const resetKeywords = ['reset ui', 'reset the ui', 'default ui', 'restore ui'];
            if (resetKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                if (this.emitter.emitUIAction) {
                    await this.emitter.emitUIAction('resetUI', {});
                }
                const result = 'UI reset to defaults! 🔄';
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for UI ACTION: Background color
            const bgKeywords = ['background to', 'background color', 'background colour', 'change background', 'make background'];
            if (bgKeywords.some(kw => userLower.includes(kw))) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                const colorMatch = userInput.match(/\bto\s+(\w+)\s*$/i);
                let color = 'blue';
                if (colorMatch) {
                    color = colorMatch[1];
                } else {
                    const words = userInput.split(' ');
                    color = words[words.length - 1].replace(/[?!.]/g, '') || 'blue';
                }
                if (this.emitter.emitUIAction) {
                    await this.emitter.emitUIAction('changeBackgroundColor', { color });
                }
                const result = `Background changed to ${color}! 🎨`;
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // Check for GREETINGS
            const greetings = ['hello', 'hi', 'hey', 'hi there', 'hello there'];
            if (greetings.includes(userLower.trim()) || userLower.startsWith('hello,') || userLower.startsWith('hi,')) {
                await this.emitter.emitTextMessageStart(messageId, 'assistant');
                const result = "Hello! 👋 I'm your AI assistant (Mastra). I can help you with:\n• Weather info (try: 'What's the weather in Mumbai?')\n• Planning tasks (try: 'Plan a product launch')\n• UI changes (try: 'Change background to blue')\n• Calculations, time, and more!\n\nHow can I help you today?";
                await this.emitter.emitTextChunk(result, messageId);
                await this.emitter.emitTextMessageEnd(messageId);
                await this.emitter.emitRunFinished(runId, threadId);
                return result;
            }

            // ============ FALLBACK TO LLM ============

            // Pre-detect math and manually invoke calculator
            const mathPattern = /(?:what\s+is\s+|calculate\s+|compute\s+)?(\d+\s*[\+\-\*\/\(\)]\s*[\d\+\-\*\/\(\)\s]+\d)/i;
            const mathMatch = mathPattern.exec(userInput);

            let calculatorResult = null;
            if (mathMatch) {
                const expression = mathMatch[1].replace(/\s/g, '');
                const toolCallId = `tool-${Date.now().toString(36)}`;

                await this.emitter.emitToolCallStart('calculator', toolCallId, { expression });

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
            console.error('Mastra adapter error:', errorMessage);
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

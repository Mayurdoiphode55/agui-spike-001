/**
 * useAGUI Hook - AG-UI Protocol Event Handler
 * Handles SSE events from AG-UI backend and manages chat state
 * Now with UI Actions support!
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AGUIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isComplete: boolean;
    component?: {
        type: string;
        data: any;
    };
}

export interface ToolCall {
    id: string;
    name: string;
    args?: Record<string, unknown>;
    result?: string;
    status: 'pending' | 'running' | 'complete' | 'error';
}

export interface AGUIMetrics {
    ttft: number | null;
    totalTokens: number;
    totalTime: number | null;
    throughput: number | null;
}

// Recipe State for Shared State feature
export interface RecipeState {
    cookingTime: number;
    skillLevel: 'beginner' | 'intermediate' | 'expert';
    dietaryPreferences: string[];
    ingredients: { id: string; name: string; amount: string }[];
    instructions: string[];
    title: string;
}

// UI Actions that can be invoked by the AI
export interface UIActions {
    changeBackgroundColor?: (color: string) => void;
    changeTheme?: (theme: 'dark' | 'light') => void;
    showNotification?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    resetUI?: () => void;
    updateRecipeState?: (state: RecipeState) => void;
}

interface UseAGUIReturn {
    messages: AGUIMessage[];
    isConnected: boolean;
    isStreaming: boolean;
    activeTool: ToolCall | null;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    sendRecipeImproveRequest: (recipeState: RecipeState) => Promise<void>;
    clearMessages: () => void;
    metrics: AGUIMetrics;
    isImprovingRecipe: boolean;
}

export function useAGUI(endpoint: string, uiActions?: UIActions): UseAGUIReturn {
    const [messages, setMessages] = useState<AGUIMessage[]>([]);
    const [isConnected, setIsConnected] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [activeTool, setActiveTool] = useState<ToolCall | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<AGUIMetrics>({
        ttft: null,
        totalTokens: 0,
        totalTime: null,
        throughput: null
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const firstTokenTimeRef = useRef<number | null>(null);
    const tokenCountRef = useRef(0);
    const uiActionsRef = useRef(uiActions);

    // Keep uiActions ref updated
    useEffect(() => {
        uiActionsRef.current = uiActions;
    }, [uiActions]);

    // Execute UI action based on tool call
    const executeUIAction = useCallback((toolName: string, args: Record<string, unknown>) => {
        const actions = uiActionsRef.current;
        if (!actions) return;

        console.log('🎯 Executing UI Action:', toolName, args);

        switch (toolName) {
            case 'changeBackgroundColor':
            case 'change_background_color':
                if (actions.changeBackgroundColor && args.color) {
                    actions.changeBackgroundColor(args.color as string);
                }
                break;
            case 'changeTheme':
            case 'change_theme':
                if (actions.changeTheme && args.theme) {
                    actions.changeTheme(args.theme as 'dark' | 'light');
                }
                break;
            case 'showNotification':
            case 'show_notification':
                if (actions.showNotification && args.message) {
                    actions.showNotification(
                        args.message as string,
                        (args.type as 'info' | 'success' | 'warning' | 'error') || 'info'
                    );
                }
                break;
            case 'resetUI':
            case 'reset_ui':
                if (actions.resetUI) {
                    actions.resetUI();
                }
                break;
        }
    }, []);

    const processSSELine = useCallback((line: string, currentMsgId: string) => {
        if (!line.startsWith('data: ')) return;

        try {
            const data = JSON.parse(line.slice(6));
            const eventType = data.type;

            switch (eventType) {
                case 'RUN_STARTED':
                    setIsStreaming(true);
                    startTimeRef.current = performance.now();
                    firstTokenTimeRef.current = null;
                    tokenCountRef.current = 0;
                    break;

                case 'TEXT_MESSAGE_START':
                    setMessages(prev => [...prev, {
                        id: data.messageId || currentMsgId,
                        role: 'assistant',
                        content: '',
                        timestamp: new Date(),
                        isComplete: false
                    }]);
                    break;

                case 'TEXT_MESSAGE_CONTENT':
                    if (firstTokenTimeRef.current === null) {
                        firstTokenTimeRef.current = performance.now();
                        const ttft = firstTokenTimeRef.current - (startTimeRef.current || 0);
                        setMetrics(prev => ({ ...prev, ttft }));
                    }
                    tokenCountRef.current++;

                    setMessages(prev => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;
                        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                            updated[lastIdx] = {
                                ...updated[lastIdx],
                                content: updated[lastIdx].content + (data.delta || '')
                            };
                        }
                        return updated;
                    });
                    break;

                case 'TEXT_MESSAGE_END':
                    setMessages(prev => {
                        const updated = [...prev];
                        const lastIdx = updated.length - 1;
                        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                            const content = updated[lastIdx].content;

                            // Check if content is a COMPONENT response
                            if (content.startsWith('COMPONENT:')) {
                                try {
                                    // Parse: COMPONENT:ComponentType:{json}
                                    const afterPrefix = content.substring('COMPONENT:'.length);
                                    const colonIdx = afterPrefix.indexOf(':');
                                    const componentType = afterPrefix.substring(0, colonIdx);
                                    const jsonStr = afterPrefix.substring(colonIdx + 1);
                                    const componentData = JSON.parse(jsonStr);

                                    updated[lastIdx] = {
                                        ...updated[lastIdx],
                                        content: '', // Clear raw JSON from display
                                        isComplete: true,
                                        component: {
                                            type: componentType,
                                            data: componentData
                                        }
                                    };
                                } catch (e) {
                                    console.error('Failed to parse component:', e);
                                    updated[lastIdx] = {
                                        ...updated[lastIdx],
                                        isComplete: true
                                    };
                                }
                            } else {
                                updated[lastIdx] = {
                                    ...updated[lastIdx],
                                    isComplete: true
                                };
                            }
                        }
                        return updated;
                    });
                    break;

                case 'TOOL_CALL_START':
                    setActiveTool({
                        id: data.toolCallId,
                        name: data.toolName,
                        args: data.args,
                        status: 'running'
                    });
                    break;

                case 'TOOL_CALL_ARGS':
                    setActiveTool(prev => {
                        if (!prev) return null;
                        const args = JSON.parse(data.delta || '{}');
                        return { ...prev, args };
                    });
                    break;

                case 'TOOL_CALL_END':
                    setActiveTool(prev => prev ? {
                        ...prev,
                        status: 'complete'
                    } : null);
                    setTimeout(() => setActiveTool(null), 1000);
                    break;

                    setActiveTool(prev => prev ? {
                        ...prev,
                        result: data.result
                    } : null);

                    // Check for Component Protocol
                    const resultStr = data.result as string;
                    if (resultStr && resultStr.startsWith('COMPONENT:')) {
                        try {
                            const [_, type, jsonStr] = resultStr.split('COMPONENT:')[1].split(/:(.+)/);
                            const componentData = JSON.parse(jsonStr);

                            // Add a new message to display this component
                            setMessages(prev => [...prev, {
                                id: `comp-${Date.now()}`,
                                role: 'assistant',
                                content: '', // Empty content, just component
                                timestamp: new Date(),
                                isComplete: true,
                                component: {
                                    type: type.trim(),
                                    data: componentData
                                }
                            }]);
                        } catch (e) {
                            console.error('Failed to parse component data:', e);
                        }
                    }
                    break;

                // UI Action events - execute frontend actions
                // Shared State update from agent
                case 'STATE_UPDATE':
                    if (data.state && uiActionsRef.current?.updateRecipeState) {
                        console.log('📦 STATE_UPDATE received:', data.state);
                        uiActionsRef.current.updateRecipeState(data.state as RecipeState);
                    }
                    break;

                case 'UI_ACTION':
                case 'FRONTEND_ACTION':
                    if (data.action && data.args) {
                        executeUIAction(data.action, data.args);
                    }
                    break;

                case 'RUN_FINISHED':
                    setIsStreaming(false);
                    const endTime = performance.now();
                    const totalTime = endTime - (startTimeRef.current || 0);
                    const throughput = tokenCountRef.current / (totalTime / 1000);
                    setMetrics(prev => ({
                        ...prev,
                        totalTokens: tokenCountRef.current,
                        totalTime,
                        throughput
                    }));
                    break;

                case 'RUN_ERROR':
                    setError(data.message || 'Unknown error');
                    setIsStreaming(false);
                    break;

                case 'DONE':
                    setIsStreaming(false);
                    break;
            }
        } catch (e) {
            console.error('Error parsing SSE event:', e);
        }
    }, [executeUIAction]);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isStreaming) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setError(null);

        const userMsgId = `msg-${Date.now()}`;
        const userMessage: AGUIMessage = {
            id: userMsgId,
            role: 'user',
            content,
            timestamp: new Date(),
            isComplete: true
        };
        setMessages(prev => [...prev, userMessage]);

        const allMessages = [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
        }));

        try {
            setIsConnected(true);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: allMessages,
                    thread_id: 'thread-1',
                    // Tell backend about available UI actions
                    available_ui_actions: [
                        'changeBackgroundColor',
                        'changeTheme',
                        'showNotification',
                        'resetUI'
                    ]
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';
            const assistantMsgId = `msg-${Date.now() + 1}`;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        processSSELine(line, assistantMsgId);
                    }
                }
            }

            if (buffer.trim()) {
                processSSELine(buffer, assistantMsgId);
            }

        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setError((e as Error).message);
                setIsConnected(false);
            }
            setIsStreaming(false);
        }
    }, [endpoint, messages, isStreaming, processSSELine]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setError(null);
        setMetrics({
            ttft: null,
            totalTokens: 0,
            totalTime: null,
            throughput: null
        });
    }, []);

    // State for recipe improvement
    const [isImprovingRecipe, setIsImprovingRecipe] = useState(false);

    // Send recipe improve request to backend
    const sendRecipeImproveRequest = useCallback(async (recipeState: RecipeState) => {
        if (isImprovingRecipe) return;

        setIsImprovingRecipe(true);
        setError(null);

        try {
            // Build the message array with recipe state sync
            const messageArray = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Add special improve request message
            messageArray.push({
                role: 'user' as const,
                content: `IMPROVE_RECIPE:${JSON.stringify(recipeState)}`
            });

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messageArray })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';
            const assistantMsgId = `msg-${Date.now() + 1}`;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        processSSELine(line, assistantMsgId);
                    }
                }
            }

            if (buffer.trim()) {
                processSSELine(buffer, assistantMsgId);
            }

        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsImprovingRecipe(false);
        }
    }, [endpoint, messages, isImprovingRecipe, processSSELine]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        messages,
        isConnected,
        isStreaming,
        activeTool,
        error,
        sendMessage,
        sendRecipeImproveRequest,
        clearMessages,
        metrics,
        isImprovingRecipe
    };
}

export default useAGUI;

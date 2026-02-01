/**
 * AG-UI Research Spike - Main Application
 * Demonstrates AG-UI protocol integration with UI Actions
 */

import { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import ToolStatus from './components/ToolStatus';
import StatusBar from './components/StatusBar';
import { useAGUI } from './hooks/useAGUI';

// UI State that can be controlled by AI
interface UIState {
    backgroundColor: string;
    theme: 'dark' | 'light';
    notification: { message: string; type: 'info' | 'success' | 'warning' | 'error' } | null;
}

function App() {
    const [backendType, setBackendType] = useState<'langchain' | 'mastra' | 'crewai'>('langchain');
    const [apiEndpoint, setApiEndpoint] = useState('/api/copilotkit');

    // UI State controlled by AI actions
    const [uiState, setUIState] = useState<UIState>({
        backgroundColor: '#0f172a',
        theme: 'dark',
        notification: null
    });

    // UI Action handlers - these get called when AI invokes UI tools
    const uiActions = {
        changeBackgroundColor: useCallback((color: string) => {
            console.log('🎨 AI changing background to:', color);
            setUIState(prev => ({ ...prev, backgroundColor: color }));
        }, []),

        changeTheme: useCallback((theme: 'dark' | 'light') => {
            console.log('🌓 AI changing theme to:', theme);
            setUIState(prev => ({
                ...prev,
                theme,
                backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc'
            }));
        }, []),

        showNotification: useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
            console.log('📢 AI showing notification:', message);
            setUIState(prev => ({ ...prev, notification: { message, type } }));
            // Auto-hide after 5 seconds
            setTimeout(() => {
                setUIState(prev => ({ ...prev, notification: null }));
            }, 5000);
        }, []),

        resetUI: useCallback(() => {
            console.log('🔄 AI resetting UI');
            setUIState({
                backgroundColor: '#0f172a',
                theme: 'dark',
                notification: null
            });
        }, [])
    };

    const {
        messages,
        isConnected,
        isStreaming,
        activeTool,
        error,
        sendMessage,
        clearMessages,
        metrics
    } = useAGUI(apiEndpoint, uiActions);

    // Handle backend switch - use environment variables for production
    useEffect(() => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const mastraUrl = import.meta.env.VITE_MASTRA_URL || 'http://localhost:8001';

        if (backendType === 'mastra') {
            setApiEndpoint(`${mastraUrl}/api/copilotkit`);
        } else {
            // LangChain and CrewAI both use the main backend
            setApiEndpoint(`${backendUrl}/api/copilotkit`);
        }
    }, [backendType]);

    // Notification colors
    const notificationColors = {
        info: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
        success: 'bg-green-500/20 border-green-500/30 text-green-300',
        warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
        error: 'bg-red-500/20 border-red-500/30 text-red-300'
    };

    // Theme-based text colors
    const textColor = uiState.theme === 'dark' ? 'text-white' : 'text-gray-900';
    const subTextColor = uiState.theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

    return (
        <div
            className={`min-h-screen flex flex-col transition-colors duration-500 ${textColor}`}
            style={{ backgroundColor: uiState.backgroundColor }}
        >
            {/* AI Notification Banner */}
            {uiState.notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border ${notificationColors[uiState.notification.type]} animate-pulse`}>
                    <div className="flex items-center gap-2">
                        <span>🤖</span>
                        <span>{uiState.notification.message}</span>
                        <button
                            onClick={() => setUIState(prev => ({ ...prev, notification: null }))}
                            className="ml-2 hover:opacity-70"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="glass border-b border-white/10 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <span className="text-xl">🤖</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-primary-300 bg-clip-text text-transparent">
                                AG-UI Research Spike
                            </h1>
                            <p className={`text-xs ${subTextColor}`}>AI can control this UI! Try: "change background to blue"</p>
                        </div>
                    </div>

                    {/* Backend Selector */}
                    <div className="flex items-center gap-4">
                        <label className={`text-sm ${subTextColor}`}>Backend:</label>
                        <div className="flex gap-1 p-1 rounded-lg glass">
                            {(['langchain', 'mastra', 'crewai'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setBackendType(type)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${backendType === type
                                        ? 'bg-primary-600 text-white'
                                        : `${subTextColor} hover:text-white hover:bg-white/5`
                                        }`}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Clear button */}
                        <button
                            onClick={clearMessages}
                            className={`px-3 py-1.5 text-sm ${subTextColor} hover:text-white hover:bg-white/10 rounded-md transition-all`}
                            title="Clear chat history"
                        >
                            🗑️ Clear
                        </button>
                    </div>
                </div>
            </header>

            {/* Status Bar */}
            <StatusBar
                isConnected={isConnected}
                isStreaming={isStreaming}
                backendType={backendType}
                metrics={metrics}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-6">
                {/* UI Actions Info */}
                <div className={`mb-4 p-3 rounded-xl glass text-sm ${subTextColor}`}>
                    <strong className={textColor}>🎮 Try these UI commands:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                        <li>"Change background to blue" / "Make background red"</li>
                        <li>"Switch to light theme" / "Use dark mode"</li>
                        <li>"Show a success notification saying Hello!"</li>
                        <li>"Reset the UI to default"</li>
                    </ul>
                </div>

                {/* Tool Status */}
                {activeTool && (
                    <ToolStatus tool={activeTool} />
                )}

                {/* Error Display */}
                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300">
                        <div className="flex items-center gap-2">
                            <span className="text-red-400">⚠️</span>
                            <span className="font-medium">Error:</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Chat Interface */}
                <ChatInterface
                    messages={messages}
                    isStreaming={isStreaming}
                    onSendMessage={sendMessage}
                    onClear={clearMessages}
                />
            </main>

            {/* Footer */}
            <footer className={`glass border-t border-white/10 px-6 py-3 text-center text-sm ${subTextColor}`}>
                AG-UI Research Spike • LangChain + Mastra + CrewAI • Powered by Groq (Llama 3.1)
            </footer>
        </div>
    );
}

export default App;

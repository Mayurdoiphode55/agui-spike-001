/**
 * ChatInterface Component
 * Displays messages and handles user input
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { AGUIMessage } from '../hooks/useAGUI';
import WeatherCard from './WeatherCard';

interface ChatInterfaceProps {
    messages: AGUIMessage[];
    isStreaming: boolean;
    onSendMessage: (content: string) => Promise<void>;
    onClear: () => void;
}

function ChatInterface({ messages, isStreaming, onSendMessage, onClear }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;
        const message = input;
        setInput('');
        await onSendMessage(message);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                        <p className="text-sm text-center max-w-md">
                            Ask a question, request calculations, or explore the AI assistant.
                            Try: "What is 123 * 456?" or "Tell me about AI"
                        </p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={msg.id || idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-fade-in`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-tr-sm'
                                    : 'glass rounded-tl-sm'
                                    }`}
                            >
                                {/* Role indicator */}
                                <div className={`text-xs mb-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-500'}`}>
                                    {msg.role === 'user' ? 'You' : '🤖 Assistant'}
                                </div>

                                {/* Component Rendering */}
                                {msg.component && msg.component.type === 'WeatherCard' && (
                                    <div className="mt-4 mb-4">
                                        <WeatherCard data={msg.component.data} />
                                    </div>
                                )}

                                {/* Message content */}
                                <div className="whitespace-pre-wrap break-words">
                                    {msg.content}
                                    {!msg.isComplete && msg.role === 'assistant' && (
                                        <span className="inline-block w-2 h-5 bg-primary-400 ml-1 animate-pulse rounded-sm" />
                                    )}
                                </div>

                                {/* Timestamp */}
                                <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-600'}`}>
                                    {msg.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Streaming indicator */}
                {isStreaming && messages[messages.length - 1]?.isComplete !== false && (
                    <div className="flex justify-start">
                        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-sm">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="glass rounded-2xl p-3">
                <div className="flex items-end gap-3">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                        className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 text-white placeholder-gray-500"
                        rows={1}
                        disabled={isStreaming}
                    />

                    <div className="flex gap-2">
                        {messages.length > 0 && (
                            <button
                                onClick={onClear}
                                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                title="Clear chat"
                            >
                                🗑️
                            </button>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isStreaming}
                            className={`px-4 py-2 rounded-xl font-medium transition-all ${input.trim() && !isStreaming
                                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg hover:shadow-primary-500/30'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isStreaming ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                    Responding
                                </span>
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default ChatInterface;

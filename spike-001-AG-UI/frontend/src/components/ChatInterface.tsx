/**
 * ChatInterface Component
 * Displays messages and handles user input with form and file attachments
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { AGUIMessage, FormData, FileData } from '../hooks/useAGUI';
import WeatherCard from './WeatherCard';
import TaskChecklist from './TaskChecklist';
import DocSearchCard from './DocSearchCard';
import FormInput from './FormInput';
import FileUpload from './FileUpload';

interface ChatInterfaceProps {
    messages: AGUIMessage[];
    isStreaming: boolean;
    onSendMessage: (content: string, formData?: FormData, fileData?: FileData) => Promise<void>;
    onClear: () => void;
}

function ChatInterface({ messages, isStreaming, onSendMessage, onClear }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(false);
    const [formData, setFormData] = useState<FormData | null>(null);
    const [fileData, setFileData] = useState<FileData | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();

        // Listen for actions from components
        const handleComponentAction = (e: CustomEvent) => {
            if (e.detail && e.detail.action === 'sendMessage') {
                onSendMessage(e.detail.content);
            }
        };

        window.addEventListener('agui-action', handleComponentAction as EventListener);
        return () => {
            window.removeEventListener('agui-action', handleComponentAction as EventListener);
        };
    }, [onSendMessage]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;
        const message = input;
        setInput('');

        // Send message with form and file data
        await onSendMessage(message, formData || undefined, fileData || undefined);

        // Clear form and file data after sending
        setFormData(null);
        setFileData(null);
        setShowForm(false);
        setShowFileUpload(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFormDataChange = (data: FormData) => {
        setFormData(data);
    };

    const handleFileSelect = (data: FileData | null) => {
        setFileData(data);
    };

    // Helper to check if form has any data
    const hasFormData = formData && (
        Object.values(formData.textFields).some(v => v) ||
        Object.values(formData.checkboxes).some(v => v)
    );

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
                        <div className="mt-4 flex gap-4 text-xs text-gray-600">
                            <span>📋 Use form for structured data</span>
                            <span>📎 Attach files for analysis</span>
                        </div>
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
                                {msg.component && msg.component.type === 'TaskChecklist' && (
                                    <div className="mt-4 mb-4">
                                        <TaskChecklist data={msg.component.data} />
                                    </div>
                                )}
                                {msg.component && msg.component.type === 'DocSearchCard' && (
                                    <div className="mt-4 mb-4">
                                        <DocSearchCard data={msg.component.data} />
                                    </div>
                                )}

                                {/* Form Data Display */}
                                {msg.formData && (
                                    <div className="mb-2 p-2 rounded-lg bg-white/10 text-xs">
                                        <div className="text-primary-200 mb-1 font-medium">📋 Form Data:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {msg.formData.textFields.name && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200">
                                                    Name: {msg.formData.textFields.name}
                                                </span>
                                            )}
                                            {msg.formData.textFields.subject && (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200">
                                                    Subject: {msg.formData.textFields.subject}
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                                                Priority: {msg.formData.dropdowns.priority}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                                                Category: {msg.formData.dropdowns.category}
                                            </span>
                                            {msg.formData.checkboxes.urgent && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-200">🚨 Urgent</span>
                                            )}
                                            {msg.formData.checkboxes.needsFollowUp && (
                                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/30 text-yellow-200">📞 Follow-up</span>
                                            )}
                                            {msg.formData.checkboxes.confidential && (
                                                <span className="px-2 py-0.5 rounded-full bg-gray-500/30 text-gray-200">🔒 Confidential</span>
                                            )}
                                        </div>
                                        {msg.formData.textFields.details && (
                                            <div className="mt-1 text-gray-300">
                                                Details: {msg.formData.textFields.details}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* File Data Display */}
                                {msg.fileData && (
                                    <div className="mb-2 p-2 rounded-lg bg-white/10 text-xs">
                                        <div className="text-primary-200 mb-1 font-medium">📎 Attached File:</div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">📄</span>
                                            <div>
                                                <div className="text-white">{msg.fileData.name}</div>
                                                <div className="text-gray-400">
                                                    {formatFileSize(msg.fileData.size)} • {msg.fileData.type}
                                                </div>
                                            </div>
                                        </div>
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

            {/* Form Input Panel */}
            {showForm && (
                <FormInput
                    onFormDataChange={handleFormDataChange}
                    onClose={() => setShowForm(false)}
                    disabled={isStreaming}
                />
            )}

            {/* File Upload Panel */}
            {showFileUpload && (
                <FileUpload
                    onFileSelect={handleFileSelect}
                    onClose={() => setShowFileUpload(false)}
                    disabled={isStreaming}
                />
            )}

            {/* Active Attachments Preview */}
            {(hasFormData || fileData) && (
                <div className="flex gap-2 mb-2 text-xs">
                    {hasFormData && (
                        <span className="px-2 py-1 rounded-full bg-primary-500/20 text-primary-300 flex items-center gap-1">
                            📋 Form data attached
                            <button
                                onClick={() => setFormData(null)}
                                className="hover:text-white ml-1"
                            >✕</button>
                        </span>
                    )}
                    {fileData && (
                        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                            📎 {fileData.name}
                            <button
                                onClick={() => setFileData(null)}
                                className="hover:text-white ml-1"
                            >✕</button>
                        </span>
                    )}
                </div>
            )}

            {/* Input Area */}
            <div className="glass rounded-2xl p-3">
                <div className="flex items-end gap-3">
                    {/* Toggle Buttons */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                setShowForm(!showForm);
                                if (showFileUpload) setShowFileUpload(false);
                            }}
                            className={`p-2 rounded-lg transition-all ${showForm || hasFormData
                                ? 'bg-primary-500/30 text-primary-300'
                                : 'text-gray-500 hover:text-white hover:bg-white/10'
                                }`}
                            title="Add form data"
                            disabled={isStreaming}
                        >
                            📋
                        </button>
                        <button
                            onClick={() => {
                                setShowFileUpload(!showFileUpload);
                                if (showForm) setShowForm(false);
                            }}
                            className={`p-2 rounded-lg transition-all ${showFileUpload || fileData
                                ? 'bg-green-500/30 text-green-300'
                                : 'text-gray-500 hover:text-white hover:bg-white/10'
                                }`}
                            title="Attach file"
                            disabled={isStreaming}
                        >
                            📎
                        </button>
                    </div>

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


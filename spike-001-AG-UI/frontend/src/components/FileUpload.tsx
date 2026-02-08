/**
 * FileUpload Component
 * Drag-and-drop file picker for uploading files to send with messages
 */

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';

export interface FileData {
    name: string;
    type: string;
    size: number;
    content: string; // base64 for binary files, raw text for text files
    isText: boolean;
}

interface FileUploadProps {
    onFileSelect: (fileData: FileData | null) => void;
    onClose: () => void;
    disabled?: boolean;
    maxSizeBytes?: number; // default 5MB
}

const TEXT_FILE_TYPES = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/xml',
    'text/xml'
];

const ALLOWED_EXTENSIONS = [
    '.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts',
    '.py', '.java', '.cpp', '.c', '.h', '.yaml', '.yml', '.toml', '.ini',
    '.log', '.env', '.gitignore'
];

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUpload({
    onFileSelect,
    onClose,
    disabled = false,
    maxSizeBytes = 5 * 1024 * 1024 // 5MB default
}: FileUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTextFile = (file: File): boolean => {
        if (TEXT_FILE_TYPES.includes(file.type)) return true;
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
    };

    const processFile = useCallback(async (file: File) => {
        setError(null);
        setIsLoading(true);

        try {
            // Validate file size
            if (file.size > maxSizeBytes) {
                setError(`File too large. Maximum size is ${formatFileSize(maxSizeBytes)}`);
                setIsLoading(false);
                return;
            }

            // Check if it's a text file
            const isText = isTextFile(file);

            if (!isText) {
                setError('Only text-based files are supported (.txt, .md, .json, .csv, etc.)');
                setIsLoading(false);
                return;
            }

            // Read file content
            const content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });

            const fileData: FileData = {
                name: file.name,
                type: file.type || 'text/plain',
                size: file.size,
                content,
                isText: true
            };

            setSelectedFile(fileData);
            onFileSelect(fileData);
        } catch (err) {
            setError('Failed to read file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [maxSizeBytes, onFileSelect]);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragOver(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (disabled) return;

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }, [disabled, processFile]);

    const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    }, [processFile]);

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleClear = useCallback(() => {
        setSelectedFile(null);
        setError(null);
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onFileSelect]);

    return (
        <div className="glass rounded-xl p-4 mb-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <span>📎</span> File Attachment
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {!selectedFile ? (
                <>
                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleBrowseClick}
                        className={`
                            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                            ${isDragOver
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                            }
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileInputChange}
                            accept={ALLOWED_EXTENSIONS.join(',')}
                            className="hidden"
                            disabled={disabled}
                        />

                        {isLoading ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm text-gray-400">Reading file...</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-4xl mb-2">📁</div>
                                <p className="text-white text-sm mb-1">
                                    {isDragOver ? 'Drop file here!' : 'Drag & drop a file here'}
                                </p>
                                <p className="text-gray-500 text-xs">
                                    or <span className="text-primary-400 hover:underline">browse</span> to select
                                </p>
                                <p className="text-gray-600 text-xs mt-2">
                                    Supports: .txt, .md, .json, .csv, .py, .js, .ts (max {formatFileSize(maxSizeBytes)})
                                </p>
                            </>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}
                </>
            ) : (
                /* File Preview */
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-lg">
                                📄
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-gray-500 text-xs">
                                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'text/plain'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClear}
                            className="text-gray-400 hover:text-red-400 transition-colors p-2"
                            disabled={disabled}
                        >
                            🗑️
                        </button>
                    </div>

                    {/* Content Preview */}
                    <div className="rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/10 text-xs text-gray-500">
                            Preview (first 500 characters)
                        </div>
                        <pre className="p-3 text-xs text-gray-300 overflow-auto max-h-32 font-mono">
                            {selectedFile.content.slice(0, 500)}
                            {selectedFile.content.length > 500 && (
                                <span className="text-gray-500">... ({selectedFile.content.length - 500} more characters)</span>
                            )}
                        </pre>
                    </div>

                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="text-green-400">✓</span>
                        File ready to send with your message
                    </p>
                </div>
            )}
        </div>
    );
}

export default FileUpload;

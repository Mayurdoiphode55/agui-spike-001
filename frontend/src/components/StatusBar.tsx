/**
 * StatusBar Component
 * Displays connection status and performance metrics
 */

import { AGUIMetrics } from '../hooks/useAGUI';

interface StatusBarProps {
    isConnected: boolean;
    isStreaming: boolean;
    backendType: 'langchain' | 'mastra' | 'crewai';
    metrics: AGUIMetrics;
}

function StatusBar({ isConnected, isStreaming, backendType, metrics }: StatusBarProps) {
    const formatMs = (ms: number | null) => {
        if (ms === null) return '-';
        return `${ms.toFixed(0)}ms`;
    };

    const formatThroughput = (t: number | null) => {
        if (t === null) return '-';
        return `${t.toFixed(1)} tok/s`;
    };

    return (
        <div className="glass-dark border-b border-white/5 px-6 py-2">
            <div className="max-w-5xl mx-auto flex items-center justify-between text-sm">
                {/* Connection Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected
                                ? isStreaming
                                    ? 'bg-yellow-500 animate-pulse'
                                    : 'bg-green-500'
                                : 'bg-red-500'
                            }`} />
                        <span className="text-gray-400">
                            {isConnected
                                ? isStreaming
                                    ? 'Streaming...'
                                    : 'Connected'
                                : 'Disconnected'
                            }
                        </span>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-primary-400">{backendType.toUpperCase()}</span>
                        <span>adapter</span>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="flex items-center gap-6 text-gray-500">
                    <div className="flex items-center gap-2" title="Time to First Token">
                        <span className="text-xs">TTFT:</span>
                        <span className={metrics.ttft !== null ?
                            (metrics.ttft < 500 ? 'text-green-400' : metrics.ttft < 1000 ? 'text-yellow-400' : 'text-red-400')
                            : 'text-gray-600'
                        }>
                            {formatMs(metrics.ttft)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2" title="Throughput">
                        <span className="text-xs">Throughput:</span>
                        <span className={metrics.throughput !== null ?
                            (metrics.throughput > 40 ? 'text-green-400' : metrics.throughput > 20 ? 'text-yellow-400' : 'text-red-400')
                            : 'text-gray-600'
                        }>
                            {formatThroughput(metrics.throughput)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2" title="Total Tokens">
                        <span className="text-xs">Tokens:</span>
                        <span className="text-gray-400">{metrics.totalTokens}</span>
                    </div>

                    <div className="flex items-center gap-2" title="Total Response Time">
                        <span className="text-xs">Total:</span>
                        <span className="text-gray-400">{formatMs(metrics.totalTime)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatusBar;

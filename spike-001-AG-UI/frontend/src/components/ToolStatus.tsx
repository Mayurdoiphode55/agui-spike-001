/**
 * ToolStatus Component
 * Displays active tool invocation status
 */

import { ToolCall } from '../hooks/useAGUI';

interface ToolStatusProps {
    tool: ToolCall;
}

function ToolStatus({ tool }: ToolStatusProps) {
    const getStatusIcon = () => {
        switch (tool.status) {
            case 'pending':
                return '⏳';
            case 'running':
                return '🔄';
            case 'complete':
                return '✅';
            case 'error':
                return '❌';
            default:
                return '🔧';
        }
    };

    const getStatusColor = () => {
        switch (tool.status) {
            case 'pending':
                return 'border-yellow-500/30 bg-yellow-500/10';
            case 'running':
                return 'border-primary-500/30 bg-primary-500/10 tool-indicator';
            case 'complete':
                return 'border-green-500/30 bg-green-500/10';
            case 'error':
                return 'border-red-500/30 bg-red-500/10';
            default:
                return 'border-gray-500/30 bg-gray-500/10';
        }
    };

    return (
        <div className={`mb-4 p-4 rounded-xl border ${getStatusColor()} transition-all duration-300`}>
            <div className="flex items-center gap-3">
                <div className="text-2xl">
                    {getStatusIcon()}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                            Using: {tool.name}
                        </span>
                        {tool.status === 'running' && (
                            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                        )}
                    </div>

                    {tool.args && Object.keys(tool.args).length > 0 && (
                        <div className="text-sm text-gray-400 mt-1">
                            Args: {JSON.stringify(tool.args)}
                        </div>
                    )}

                    {tool.result && (
                        <div className="text-sm text-green-400 mt-1">
                            Result: {tool.result.slice(0, 100)}{tool.result.length > 100 ? '...' : ''}
                        </div>
                    )}
                </div>

                <div className={`px-2 py-1 rounded text-xs font-medium ${tool.status === 'running' ? 'bg-primary-600 text-white' :
                        tool.status === 'complete' ? 'bg-green-600 text-white' :
                            tool.status === 'error' ? 'bg-red-600 text-white' :
                                'bg-gray-600 text-gray-200'
                    }`}>
                    {tool.status.toUpperCase()}
                </div>
            </div>
        </div>
    );
}

export default ToolStatus;

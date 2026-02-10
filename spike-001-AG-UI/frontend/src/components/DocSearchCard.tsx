/**
 * DocSearchCard Component
 * Displays document search results in a beautiful card format
 * Triggered when backend returns: COMPONENT:DocSearchCard:{json}
 */

import { useState } from 'react';

interface DocSearchResult {
    title: string;
    snippet: string;
    relevance: number;  // 0-100
    category: string;
    icon?: string;
}

interface DocSearchData {
    query: string;
    results: DocSearchResult[];
    totalFound: number;
}

function DocSearchCard({ data }: { data: DocSearchData }) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    // Get color based on relevance score
    const getRelevanceColor = (score: number): string => {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-orange-400';
    };

    // Get bar width for relevance
    const getBarColor = (score: number): string => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-orange-500';
    };

    // Category icons
    const getCategoryIcon = (category: string): string => {
        const icons: Record<string, string> = {
            'api': '🔌',
            'guide': '📖',
            'tutorial': '🎓',
            'reference': '📚',
            'architecture': '🏗️',
            'security': '🔒',
            'database': '🗄️',
            'frontend': '🎨',
            'backend': '⚙️',
            'deployment': '🚀',
            'testing': '🧪',
            'configuration': '⚙️',
            'general': '📄',
        };
        return icons[category.toLowerCase()] || '📄';
    };

    return (
        <div className="rounded-xl overflow-hidden" style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.15)'
        }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                borderBottom: '1px solid rgba(129, 140, 248, 0.2)'
            }}>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    <div>
                        <div className="font-semibold text-white text-sm">Search Results</div>
                        <div className="text-xs text-indigo-300">
                            Query: "{data.query}" • {data.totalFound} result{data.totalFound !== 1 ? 's' : ''} found
                        </div>
                    </div>
                </div>
                <div className="px-2 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc' }}>
                    📄 Docs
                </div>
            </div>

            {/* Results List */}
            <div className="p-3 space-y-2">
                {data.results.length === 0 ? (
                    <div className="text-center py-6 text-indigo-300">
                        <div className="text-3xl mb-2">🔎</div>
                        <div className="text-sm">No documents found matching your query.</div>
                    </div>
                ) : (
                    data.results.map((result, idx) => (
                        <div
                            key={idx}
                            className="rounded-lg p-3 transition-all cursor-pointer hover:scale-[1.01]"
                            style={{
                                background: expandedIdx === idx
                                    ? 'rgba(99, 102, 241, 0.15)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                border: expandedIdx === idx
                                    ? '1px solid rgba(129, 140, 248, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.08)'
                            }}
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        >
                            {/* Result Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <span className="text-lg mt-0.5">{result.icon || getCategoryIcon(result.category)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white text-sm truncate">
                                            {result.title}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                                background: 'rgba(129, 140, 248, 0.2)',
                                                color: '#c7d2fe'
                                            }}>
                                                {result.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Relevance Score */}
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-sm font-bold ${getRelevanceColor(result.relevance)}`}>
                                        {result.relevance}%
                                    </span>
                                    <div className="w-16 h-1.5 rounded-full bg-white/10">
                                        <div
                                            className={`h-full rounded-full ${getBarColor(result.relevance)}`}
                                            style={{ width: `${result.relevance}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Snippet (always visible) */}
                            <div className={`mt-2 text-xs text-indigo-200/70 ${expandedIdx === idx ? '' : 'line-clamp-2'}`}>
                                {result.snippet}
                            </div>

                            {/* Expand indicator */}
                            <div className="text-center mt-1">
                                <span className="text-xs text-indigo-400">
                                    {expandedIdx === idx ? '▲ collapse' : '▼ expand'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 text-xs text-indigo-400 text-center" style={{
                borderTop: '1px solid rgba(129, 140, 248, 0.15)'
            }}>
                Powered by AG-UI Doc Search • Results ranked by relevance
            </div>
        </div>
    );
}

export default DocSearchCard;

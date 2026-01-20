
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, MessageSquare, Clock, Cpu, BarChart3, Loader2, Calendar, Hash, Crown, User, Mic, FileText } from 'lucide-react';
import { useStore } from '../store';

interface InsightsModalProps {
    onAnalyze: () => void;
    stats: any | null;
    isAnalyzing: boolean;
}

const InsightsModal: React.FC<InsightsModalProps> = ({ onAnalyze, stats, isAnalyzing }) => {
    const { showInsights, setShowInsights, setActiveConversationId } = useStore(state => ({
        showInsights: state.showInsights,
        setShowInsights: state.setShowInsights,
        setActiveConversationId: state.setActiveConversationId
    }));

    if (!showInsights) return null;

    // Helper to clean up user instructions that might be wrapped in code blocks
    const cleanText = (text: string) => {
        if (!text) return '';
        // Remove "The user provided..." preamble if it exists in simple format
        let cleaned = text.replace(/^The user provided.*?:\n/, '');
        // Remove code block ticks if they wrap the whole content
        cleaned = cleaned.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
        return cleaned.trim();
    };

    const renderHeatmap = () => {
        if (!stats) return null;
        const max = Math.max(1, ...stats.hourlyActivity);
        
        return (
            <div className="flex items-end gap-1 h-24 w-full mt-6">
                {stats.hourlyActivity.map((count: number, hour: number) => (
                    <div key={hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div 
                            className={`w-full min-w-[4px] rounded-sm transition-all duration-500 ease-out ${
                                count === 0 ? 'bg-gray-100 dark:bg-[#2C2B28] h-px' :
                                `bg-claude-accent`
                            }`}
                            style={{ 
                                height: count === 0 ? '2px' : `${Math.max(5, (count / max) * 100)}%`,
                                opacity: count === 0 ? 1 : 0.6 + (count/max)*0.4
                            }}
                        />
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                            {hour}:00 &middot; {count} msgs
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderWordList = (words: [string, number][], title: string, color: string) => (
        <div className="flex-1">
            <h4 className="font-serif text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 border-b border-gray-200 dark:border-[#2C2B28] pb-1">
                {title}
            </h4>
            <div className="flex flex-wrap gap-2">
                {words.slice(0, 15).map(([word, count], i) => (
                    <span 
                        key={word} 
                        className={`text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-[#2F2E2B] text-gray-600 dark:text-gray-300 font-mono`}
                        style={{ fontSize: `${Math.max(0.7, 0.7 + (15-i)*0.03)}rem` }}
                    >
                        {word} <span className="opacity-50 text-[10px]">{count}</span>
                    </span>
                ))}
            </div>
        </div>
    );

    const renderMonthlyTimeline = () => {
        if (!stats.monthlyActivity) return null;
        const max = Math.max(1, ...stats.monthlyActivity.map(([,c]: any) => c));

        return (
            <div className="w-full overflow-x-auto pb-4">
                <div className="flex items-end gap-1.5 h-32 min-w-max px-1">
                    {stats.monthlyActivity.map(([date, count]: any) => {
                        const [year, month] = date.split('-');
                        const shortMonth = new Date(parseInt(year), parseInt(month)-1).toLocaleString('default', { month: 'short' });
                        return (
                            <div key={date} className="flex flex-col items-center group gap-2">
                                <div 
                                    className="w-8 rounded-sm bg-claude-accent transition-all hover:bg-[#C96445]"
                                    style={{ 
                                        height: `${Math.max(4, (count / max) * 100)}%`,
                                        opacity: 0.5 + (count/max)*0.5
                                    }}
                                >
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none transform -translate-x-1/2 left-1/2">
                                        {shortMonth} {year}: {count} msgs
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono -rotate-90 origin-top translate-y-4 w-4">
                                    {shortMonth} '{year.slice(2)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowInsights(false)}
        >
            <div 
                className="w-full max-w-5xl bg-[#F9F9F9] dark:bg-[#1A1917] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2B28] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-200/50 dark:border-[#2C2B28] flex justify-between items-start bg-[#F9F9F9] dark:bg-[#1A1917] shrink-0">
                    <div>
                        <h2 className="text-3xl font-serif text-[#333333] dark:text-[#E6E4DD] tracking-tight">Insights</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-sans">Analysis of your conversation history</p>
                    </div>
                    <button 
                        onClick={() => setShowInsights(false)}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    {!stats ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-[#EAE7DF] dark:bg-[#2F2E2B] rounded-full flex items-center justify-center mb-6">
                                <BarChart3 className="w-8 h-8 text-claude-accent" />
                            </div>
                            <h3 className="text-xl font-serif text-gray-900 dark:text-gray-100 mb-3">
                                Generate Report
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 text-sm leading-relaxed">
                                Analyze your local conversation history to uncover patterns, usage statistics, and activity trends. Processed entirely offline.
                            </p>
                            <button
                                onClick={onAnalyze}
                                disabled={isAnalyzing}
                                className="px-6 py-2.5 bg-claude-accent hover:bg-[#C96445] text-white rounded-lg font-medium shadow-sm transition-all active:scale-95 flex items-center gap-2 text-sm"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                {isAnalyzing ? 'Analyzing...' : 'Generate Insights'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Chats', value: stats.totalConversations, icon: <MessageSquare className="w-4 h-4" /> },
                                    { label: 'Messages Sent', value: stats.totalUserMessages, icon: <Activity className="w-4 h-4" /> },
                                    { label: 'Words Written', value: stats.totalUserWords.toLocaleString(), icon: <BarChart3 className="w-4 h-4" /> },
                                    { label: 'Avg User Msg', value: `${stats.avgUserLength} words`, icon: <Activity className="w-4 h-4" /> },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col">
                                        <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs font-medium uppercase tracking-wider font-sans">
                                            {item.icon} {item.label}
                                        </div>
                                        <div className="text-3xl font-serif text-[#333333] dark:text-[#E6E4DD]">
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-[#2C2B28] w-full" />

                            {/* User Profile Section */}
                            {(stats.userProfile.bio || stats.userProfile.instructions) && (
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <h3 className="font-serif text-lg text-gray-900 dark:text-gray-100">User Profile Context</h3>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {stats.userProfile.bio && (
                                            <div className="p-4 bg-white dark:bg-[#252422] rounded-xl border border-gray-200 dark:border-[#3F3E3B]">
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <User className="w-3 h-3" /> About You
                                                </div>
                                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                                                    {cleanText(stats.userProfile.bio)}
                                                </div>
                                            </div>
                                        )}
                                        {stats.userProfile.instructions && (
                                            <div className="p-4 bg-white dark:bg-[#252422] rounded-xl border border-gray-200 dark:border-[#3F3E3B]">
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> Custom Instructions
                                                </div>
                                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                                                    {cleanText(stats.userProfile.instructions)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(stats.userProfile.bio || stats.userProfile.instructions) && <div className="h-px bg-gray-200 dark:bg-[#2C2B28] w-full" />}

                            {/* Timeline Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <h3 className="font-serif text-lg text-gray-900 dark:text-gray-100">Activity Timeline</h3>
                                </div>
                                {renderMonthlyTimeline()}
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-[#2C2B28] w-full" />

                            {/* Activity Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <h3 className="font-serif text-lg text-gray-900 dark:text-gray-100">Daily Rhythm</h3>
                                </div>
                                <p className="text-sm text-gray-500 mb-6">Activity distribution by hour of day</p>
                                {renderHeatmap()}
                                <div className="flex justify-between text-[10px] text-gray-400 mt-3 font-mono uppercase border-t border-gray-200 dark:border-[#2C2B28] pt-2">
                                    <span>12 AM</span>
                                    <span>6 AM</span>
                                    <span>12 PM</span>
                                    <span>6 PM</span>
                                    <span>11 PM</span>
                                </div>
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-[#2C2B28] w-full" />

                            {/* Top Chats */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Crown className="w-4 h-4 text-gray-400" />
                                    <h3 className="font-serif text-lg text-gray-900 dark:text-gray-100">Longest Conversations</h3>
                                </div>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {stats.topChats && stats.topChats.map((chat: any, i: number) => (
                                        <div 
                                            key={i}
                                            onClick={() => { setActiveConversationId(chat.id); setShowInsights(false); }}
                                            className="p-4 bg-white dark:bg-[#252422] rounded-xl border border-gray-200 dark:border-[#3F3E3B] hover:border-claude-accent/50 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2F2E2B] flex items-center justify-center text-xs font-serif font-bold text-gray-500 group-hover:text-claude-accent transition-colors">
                                                    {i + 1}
                                                </div>
                                                <span className="text-xs text-gray-400 font-mono">{new Date(chat.date * 1000).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-2 h-10 leading-tight">
                                                {chat.title}
                                            </h4>
                                            <div className="text-xs text-gray-500">
                                                {chat.count} messages
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-gray-200 dark:bg-[#2C2B28] w-full" />

                            {/* Vocabulary & Models */}
                            <div className="grid md:grid-cols-2 gap-12">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Hash className="w-4 h-4 text-gray-400" />
                                        <h3 className="font-serif text-lg text-gray-900 dark:text-gray-100">Common Vocabulary</h3>
                                    </div>
                                    <div className="flex gap-8">
                                        {renderWordList(stats.topUserWords, "You", "claude-accent")}
                                        {renderWordList(stats.topModelWords, "AI", "blue-500")}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Cpu className="w-4 h-4 text-gray-400" />
                                        <h3 className="font-serif text-lg text-gray-900 dark:text-gray-100">Top Models & Voices</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {Object.entries(stats.modelUsage)
                                            .sort(([,a]:any, [,b]:any) => b - a)
                                            .slice(0, 5)
                                            .map(([model, count]: any, idx) => (
                                                <div key={model} className="group">
                                                    <div className="flex justify-between text-sm mb-1.5">
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{model}</span>
                                                        <span className="text-gray-400 font-mono text-xs">{count}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-200 dark:bg-[#2C2B28] rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-claude-accent rounded-full opacity-80 group-hover:opacity-100 transition-opacity" 
                                                            style={{ width: `${(count / Math.max(1, stats.totalModelMessages)) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* Voice Models */}
                                    {Object.keys(stats.voiceUsage).length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-[#2C2B28]">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                                <Mic className="w-3 h-3" /> Voice Models
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(stats.voiceUsage).map(([voice, count]: any) => (
                                                    <div key={voice} className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#2F2E2B] px-2.5 py-1 rounded-full border border-gray-200 dark:border-[#3F3E3B]">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{voice}</span>
                                                        <span className="text-[10px] text-gray-400 bg-white dark:bg-black/20 px-1.5 rounded-full">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default InsightsModal;

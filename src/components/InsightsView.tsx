import React from 'react';
import { Activity, MessageSquare, Clock, Cpu, BarChart3, Loader2, Calendar, Hash, Crown, User, Mic, FileText, ChevronLeft, RefreshCw } from 'lucide-react';
import { useStore } from '../store';

interface InsightsViewProps {
    onAnalyze: () => void;
    stats: any | null;
    isAnalyzing: boolean;
}

const InsightsView: React.FC<InsightsViewProps> = ({ onAnalyze, stats, isAnalyzing }) => {
    const { setView, setActiveConversationId } = useStore(state => ({
        setView: state.setView,
        setActiveConversationId: state.setActiveConversationId
    }));

    const cleanText = (text: string) => {
        if (!text) return '';
        let cleaned = text.replace(/^The user provided.*?:\n/, '');
        cleaned = cleaned.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
        return cleaned.trim();
    };

    const renderHeatmap = () => {
        if (!stats) return null;
        const max = Math.max(1, ...stats.hourlyActivity);
        
        return (
            <div className="flex items-end gap-1 h-28 w-full mt-6">
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
        <div className="flex-1 min-w-[200px]">
            <h4 className="font-serif text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 pb-2 border-b border-claude-border dark:border-claude-dark-border">
                {title}
            </h4>
            {words.length === 0 ? (
                <div className="text-xs text-gray-400 italic">Not enough data to analyze vocabulary.</div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {words.slice(0, 15).map(([word, count], i) => (
                        <span 
                            key={word} 
                            className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-[#2F2E2B] text-gray-600 dark:text-gray-300 font-mono border border-claude-border dark:border-claude-dark-border"
                            style={{ fontSize: `${Math.max(0.75, 0.75 + (15-i)*0.02)}rem` }}
                        >
                            {word} <span className="opacity-40 text-[10px] ml-1">{count}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );

    const renderMonthlyTimeline = () => {
        if (!stats.monthlyActivity || stats.monthlyActivity.length === 0) {
            return <div className="text-sm text-gray-400 italic py-8 text-center">No timeline activity found in this dataset.</div>;
        }
        
        const max = Math.max(1, ...stats.monthlyActivity.map(([,c]: any) => c));

        return (
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex items-end gap-2 h-40 min-w-max px-2 pt-4">
                    {stats.monthlyActivity.map(([date, count]: any) => {
                        const [year, month] = date.split('-');
                        const shortMonth = new Date(parseInt(year), parseInt(month)-1).toLocaleString('default', { month: 'short' });
                        return (
                            <div key={date} className="flex flex-col items-center group gap-2 w-8">
                                <div className="relative w-full flex items-end justify-center h-full">
                                    <div 
                                        className="w-full rounded-sm bg-claude-accent transition-all hover:bg-[#C96445] min-h-[4px]"
                                        style={{ 
                                            height: `${Math.max(4, (count / max) * 100)}%`,
                                            opacity: 0.5 + (count/max)*0.5
                                        }}
                                    >
                                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none transform -translate-x-1/2 left-1/2">
                                            {shortMonth} {year}: {count} msgs
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono -rotate-90 origin-top translate-y-3 w-4 h-8 whitespace-nowrap">
                                    {shortMonth} '{year.slice(2)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#F9F9F9] dark:bg-[#1A1917]">
            {/* Header */}
            <header className="px-6 py-5 border-b border-claude-border dark:border-claude-dark-border flex items-center justify-between shrink-0 bg-[#F9F9F9] dark:bg-[#1A1917]">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setView('chat')}
                        className="p-2 -ml-2 text-gray-500 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD]">Insights</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Analysis of conversation history</p>
                    </div>
                </div>
                {stats && !isAnalyzing && (
                    <button
                        onClick={onAnalyze}
                        className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                        title="Refresh Analysis"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                <div className="max-w-5xl mx-auto">
                    {!stats ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-white dark:bg-[#252422] rounded-full flex items-center justify-center mb-8 shadow-sm border border-claude-border dark:border-claude-dark-border">
                                <BarChart3 className="w-8 h-8 text-claude-accent" />
                            </div>
                            <h3 className="text-2xl font-serif text-gray-900 dark:text-gray-100 mb-4">
                                Deep Dive Your History
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-10 text-sm leading-relaxed">
                                Process your local data to uncover usage patterns, vocabulary habits, and activity trends. No data leaves your device.
                            </p>
                            <button
                                onClick={onAnalyze}
                                disabled={isAnalyzing}
                                className="px-8 py-3 bg-claude-accent hover:bg-[#C96445] text-white rounded-lg font-medium shadow-sm transition-all active:scale-95 flex items-center gap-3 text-sm disabled:opacity-70 disabled:active:scale-100"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                {isAnalyzing ? 'Processing History...' : 'Generate Report'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {[
                                    { label: 'Total Chats', value: stats.totalConversations, icon: <MessageSquare className="w-4 h-4" /> },
                                    { label: 'Messages Sent', value: stats.totalUserMessages, icon: <Activity className="w-4 h-4" /> },
                                    { label: 'Words Written', value: stats.totalUserWords.toLocaleString(), icon: <BarChart3 className="w-4 h-4" /> },
                                    { label: 'Avg User Msg', value: `${stats.avgUserLength} words`, icon: <Activity className="w-4 h-4" /> },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col p-5 bg-white dark:bg-[#252422] border border-claude-border dark:border-claude-dark-border rounded-2xl shadow-sm">
                                        <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs font-bold uppercase tracking-wider font-sans">
                                            {item.icon} {item.label}
                                        </div>
                                        <div className="text-3xl font-serif text-[#333333] dark:text-[#E6E4DD] tracking-tight">
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Activity Section */}
                            <div className="bg-white dark:bg-[#252422] p-8 rounded-2xl border border-claude-border dark:border-claude-dark-border shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-serif text-xl text-gray-900 dark:text-gray-100">Daily Rhythm</h3>
                                </div>
                                <p className="text-sm text-gray-500 mb-8">Activity distribution by hour of day</p>
                                {renderHeatmap()}
                                <div className="flex justify-between text-[10px] text-gray-400 mt-4 font-mono uppercase tracking-widest">
                                    <span>12 AM</span>
                                    <span>6 AM</span>
                                    <span>12 PM</span>
                                    <span>6 PM</span>
                                    <span>11 PM</span>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="bg-white dark:bg-[#252422] p-8 rounded-2xl border border-claude-border dark:border-claude-dark-border shadow-sm">
                                <div className="flex items-center gap-2 mb-8">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-serif text-xl text-gray-900 dark:text-gray-100">Activity Timeline</h3>
                                </div>
                                {renderMonthlyTimeline()}
                            </div>

                            {/* Top Chats */}
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <Crown className="w-5 h-5 text-gray-400" />
                                    <h3 className="font-serif text-xl text-gray-900 dark:text-gray-100">Longest Conversations</h3>
                                </div>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {stats.topChats && stats.topChats.map((chat: any, i: number) => (
                                        <button 
                                            key={i}
                                            onClick={() => { setActiveConversationId(chat.id); setView('chat'); }}
                                            className="p-5 bg-white dark:bg-[#252422] rounded-2xl border border-claude-border dark:border-claude-dark-border hover:border-claude-accent/50 hover:shadow-md text-left transition-all group h-full flex flex-col"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2F2E2B] flex items-center justify-center text-xs font-serif font-bold text-gray-500 group-hover:text-claude-accent transition-colors">
                                                    {i + 1}
                                                </div>
                                                <span className="text-xs text-gray-400 font-mono">{new Date(chat.date * 1000).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-3 leading-snug flex-1">
                                                {chat.title}
                                            </h4>
                                            <div className="text-xs text-gray-500 font-medium bg-gray-50 dark:bg-black/20 w-fit px-2 py-1 rounded-md">
                                                {chat.count} messages
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Vocabulary & Models */}
                            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <Hash className="w-5 h-5 text-gray-400" />
                                        <h3 className="font-serif text-xl text-gray-900 dark:text-gray-100">Common Vocabulary</h3>
                                    </div>
                                    <div className="flex flex-col gap-8">
                                        {renderWordList(stats.topUserWords, "You", "claude-accent")}
                                        {renderWordList(stats.topModelWords, "AI", "blue-500")}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <Cpu className="w-5 h-5 text-gray-400" />
                                        <h3 className="font-serif text-xl text-gray-900 dark:text-gray-100">Top Models</h3>
                                    </div>
                                    <div className="space-y-5 bg-white dark:bg-[#252422] p-6 rounded-2xl border border-claude-border dark:border-claude-dark-border">
                                        {Object.entries(stats.modelUsage)
                                            .sort(([,a]:any, [,b]:any) => b - a)
                                            .slice(0, 6)
                                            .map(([model, count]: any) => (
                                                <div key={model} className="group">
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{model}</span>
                                                        <span className="text-gray-400 font-mono text-xs">{count}</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 dark:bg-[#2C2B28] rounded-full overflow-hidden">
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
                                        <div className="mt-8">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                                <Mic className="w-4 h-4" /> Voice Models
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(stats.voiceUsage).map(([voice, count]: any) => (
                                                    <div key={voice} className="flex items-center gap-2 bg-white dark:bg-[#252422] px-3 py-1.5 rounded-full border border-claude-border dark:border-claude-dark-border shadow-sm">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{voice}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">{count}</span>
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
        </div>
    );
};

export default InsightsView;
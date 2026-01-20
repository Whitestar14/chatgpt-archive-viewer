import React, { useMemo } from 'react';
import { X, Archive, Eye, ChevronLeft, Calendar } from 'lucide-react';
import { useStore } from '../store';

const ArchiveView: React.FC = () => {
    const { 
        conversations, hiddenIds, toggleHidden, setView, setActiveConversationId 
    } = useStore(state => ({
        conversations: state.conversations,
        hiddenIds: state.hiddenIds,
        toggleHidden: state.toggleHidden,
        setView: state.setView,
        setActiveConversationId: state.setActiveConversationId
    }));

    const archivedConversations = useMemo(() => {
        return conversations
            .filter(c => hiddenIds.includes(c.id))
            .sort((a, b) => b.create_time - a.create_time);
    }, [conversations, hiddenIds]);

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
                        <h2 className="text-2xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD]">Archived Chats</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{archivedConversations.length} conversations</p>
                    </div>
                </div>
            </header>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                <div className="max-w-4xl mx-auto space-y-4">
                    {archivedConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-white dark:bg-[#252422] rounded-full flex items-center justify-center mb-8 shadow-sm border border-claude-border dark:border-claude-dark-border">
                                <Archive className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-2xl font-serif text-gray-900 dark:text-gray-100 mb-4">
                                No archived chats
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm leading-relaxed">
                                Conversations you hide from the sidebar will appear here for safekeeping.
                            </p>
                        </div>
                    ) : (
                        archivedConversations.map((conv) => (
                            <div 
                                key={conv.id} 
                                className="group flex items-start sm:items-center justify-between p-5 bg-white dark:bg-[#252422] border border-claude-border dark:border-claude-dark-border rounded-xl hover:shadow-md hover:border-claude-accent/30 dark:hover:border-claude-accent/30 transition-all duration-200"
                            >
                                <div className="min-w-0 flex-1 mr-6">
                                    <h3 className="text-base font-medium text-gray-900 dark:text-[#E6E4DD] truncate mb-2">
                                        {conv.title || 'Untitled Chat'}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-black/20 px-2 py-1 rounded">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(conv.create_time * 1000).toLocaleDateString()}
                                        </span>
                                        <span>{new Date(conv.create_time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-1 sm:pt-0">
                                    <button
                                        onClick={() => {
                                            setActiveConversationId(String(conversations.indexOf(conv)));
                                            setView('chat');
                                        }}
                                        className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#2F2E2B] hover:bg-gray-200 dark:hover:bg-[#3F3E3B] rounded-lg transition-colors shadow-sm"
                                    >
                                        View Chat
                                    </button>
                                    <button
                                        onClick={() => toggleHidden(conv.id)}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-900/30"
                                        title="Restore to Sidebar"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArchiveView;
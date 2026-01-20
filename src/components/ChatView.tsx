import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Conversation, FormattedMessage } from '../types';
import MessageBubble from './MessageBubble';
import JsonView from './JsonView';
import { Menu, PanelLeftClose, PanelLeftOpen, X, ClipboardList, Copy, FileText, Code, Braces, FileJson, Info, Download } from 'lucide-react';
import { formatDate, formatTime, conversationToMarkdown } from '../utils/parser';
import { createPortal } from 'react-dom';
import { chatWorkerScript } from '../utils/chatWorker';
import { useStore } from '../store';

interface ChatViewProps {
  conversation: Conversation;
  isSecondary?: boolean;
  onClose?: () => void;
}

const ChatView: React.FC<ChatViewProps> = React.memo(({ 
  conversation, 
  isSecondary = false,
  onClose
}) => {
  const { 
      fontSize, 
      fontFamily,
      chatWidth, 
      isSidebarOpen, 
      toggleSidebar, 
      setMobileMenuOpen, 
      setIsChatReady 
  } = useStore(state => ({
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      chatWidth: state.chatWidth,
      isSidebarOpen: state.isSidebarOpen,
      toggleSidebar: state.toggleSidebar,
      setMobileMenuOpen: state.setMobileMenuOpen,
      setIsChatReady: state.setIsChatReady
  }));

  const [currentLeafId, setCurrentLeafId] = useState<string | undefined>(conversation.current_node);
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  
  const [viewMode, setViewMode] = useState<'chat' | 'json'>('chat');
  const [jsonHighlightId, setJsonHighlightId] = useState<string | null>(null);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const infoBtnRef = useRef<HTMLButtonElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    const code = chatWorkerScript.toString();
    const blob = new Blob([`(${code})()`], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // Handle Conversation Parsing
  useEffect(() => {
    setViewMode('chat');
    setJsonHighlightId(null);
    setMessages([]); 

    if (workerRef.current) {
        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'PARSE_COMPLETE') {
                setMessages(e.data.messages);
                setCurrentLeafId(e.data.leafId);
                if (!isSecondary) setIsChatReady(true);
            }
        };

        workerRef.current.postMessage({
            type: 'PARSE',
            conversation: conversation,
            currentLeafId: conversation.current_node
        });
    }
  }, [conversation, isSecondary, setIsChatReady]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [conversation.id]); 

  const handleBranchSwitch = (parentNodeId: string, newIndex: number) => {
      const parentNode = conversation.mapping[parentNodeId];
      if (!parentNode || !parentNode.children) return;
      const targetNodeId = parentNode.children[newIndex - 1];
      workerRef.current?.postMessage({
          type: 'PARSE',
          conversation: conversation,
          currentLeafId: targetNodeId 
      });
  };

  const handleJumpToJson = (id: string) => {
      setViewMode('json');
      setJsonHighlightId(id);
  };

  const handleDownloadMarkdown = () => {
      const md = conversationToMarkdown(conversation);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(conversation.title || 'chat').replace(/[^a-z0-9]/gi, '_').substring(0, 50)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCopyMenuOpen(false);
  };

  const handleCopyConversation = (format: 'text' | 'markdown' | 'json' | 'json-branch') => {
      if (format === 'json') {
          navigator.clipboard.writeText(JSON.stringify(conversation, null, 2));
          setCopyMenuOpen(false);
          return;
      }

      if (format === 'json-branch') {
          navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
          setCopyMenuOpen(false);
          return;
      }

      let content = '';
      messages.forEach(msg => {
          const role = msg.role.toUpperCase();
          const text = msg.parts.filter(p => p.type === 'text').map(p => p.text).join('\n');
          if (format === 'markdown') {
              content += `**${role}**:\n${text}\n\n---\n\n`;
          } else {
              content += `${role}:\n${text}\n\n----------------\n\n`;
          }
      });
      navigator.clipboard.writeText(content);
      setCopyMenuOpen(false);
  };

  const getWidthClass = () => {
      switch (chatWidth) {
          case 'medium': return 'max-w-3xl';
          case 'wide': return 'max-w-5xl';
          case 'full': return 'max-w-none'; 
          case 'narrow':
          default: return 'max-w-2xl';
      }
  };

  // Get conversation metadata for Info popover
  const metaInfo = React.useMemo(() => {
      const models = new Set<string>();
      messages.forEach(m => {
          if (m.model) models.add(m.model);
      });
      return {
          created: conversation.create_time,
          updated: conversation.update_time,
          models: Array.from(models),
          msgCount: messages.length
      };
  }, [conversation, messages]);

  return (
    <div className={`flex flex-col h-full bg-claude-bg dark:bg-claude-dark-bg transition-colors duration-200 relative ${isSecondary ? 'border-l border-[#E5E5E5] dark:border-[#2C2B28]' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between bg-claude-bg/95 dark:bg-claude-dark-bg/95 backdrop-blur-sm transition-colors duration-200 border-b border-[#F0EEE6] dark:border-claude-dark-border/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
            {!isSecondary && (
                <>
                    <button 
                      onClick={() => setMobileMenuOpen(true)}
                      className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-md transition-colors"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    
                    <button 
                      onClick={toggleSidebar}
                      className="hidden md:block p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-md transition-colors"
                      title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                      {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                    </button>
                </>
            )}

            <div className="flex flex-col ml-2 min-w-0">
                <span className="text-sm font-semibold text-gray-800 dark:text-[#E6E4DD] line-clamp-1">
                    {conversation.title || 'Untitled Chat'}
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-1">
            <button
                onClick={() => setViewMode(prev => prev === 'chat' ? 'json' : 'chat')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'json' ? 'text-claude-accent bg-claude-accent/10' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B]'}`}
                title={viewMode === 'chat' ? "View as JSON" : "View Chat"}
            >
                {viewMode === 'chat' ? <Braces className="w-5 h-5" /> : <Code className="w-5 h-5" />}
            </button>

            {/* Info Button */}
            <div className="relative">
                <button
                    ref={infoBtnRef}
                    onClick={() => setInfoOpen(!infoOpen)}
                    className={`p-1.5 rounded-lg transition-colors ${infoOpen ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B]'}`}
                    title="Chat Info"
                >
                    <Info className="w-5 h-5" />
                </button>
                {infoOpen && createPortal(
                    <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setInfoOpen(false)} />
                        <div 
                            className="fixed z-[9999] w-64 bg-white dark:bg-[#252422] rounded-xl shadow-xl border border-[#E5E5E5] dark:border-[#3F3E3B] p-3 animate-in fade-in zoom-in-95 duration-100"
                            style={{ 
                                top: (infoBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 5, 
                                left: (infoBtnRef.current?.getBoundingClientRect().right ?? 0) - 256 
                            }}
                        >
                            <div className="space-y-3 text-sm">
                                <div>
                                    <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Created</div>
                                    <div className="text-gray-700 dark:text-gray-300">
                                        {formatDate(metaInfo.created)} <span className="text-gray-400 text-xs">{formatTime(metaInfo.created)}</span>
                                    </div>
                                </div>
                                {metaInfo.updated && (
                                    <div>
                                        <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Last Updated</div>
                                        <div className="text-gray-700 dark:text-gray-300">
                                            {formatDate(metaInfo.updated)} <span className="text-gray-400 text-xs">{formatTime(metaInfo.updated)}</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Models Used</div>
                                    <div className="flex flex-wrap gap-1">
                                        {metaInfo.models.length > 0 ? metaInfo.models.map(m => (
                                            <span key={m} className="px-1.5 py-0.5 bg-[#F0EEE6] dark:bg-[#2F2E2B] rounded text-xs font-mono text-gray-600 dark:text-gray-400 border border-[#E5E5E5] dark:border-[#3F3E3B]">
                                                {m}
                                            </span>
                                        )) : <span className="text-gray-400 italic">Unknown</span>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Stats</div>
                                    <div className="text-gray-700 dark:text-gray-300">{metaInfo.msgCount} messages</div>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
            </div>

            {/* Actions/Export Button */}
            <div className="relative">
                <button
                    ref={copyBtnRef}
                    onClick={() => viewMode === 'json' ? handleCopyConversation('json') : setCopyMenuOpen(!copyMenuOpen)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                    title={viewMode === 'json' ? "Copy JSON" : "Export / Copy"}
                >
                    {viewMode === 'json' ? <Copy className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                </button>
                
                {copyMenuOpen && viewMode === 'chat' && createPortal(
                    <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setCopyMenuOpen(false)} />
                        <div 
                            className="fixed z-[9999] w-48 bg-white dark:bg-[#252422] rounded-xl shadow-xl border border-[#E5E5E5] dark:border-[#3F3E3B] p-1.5 animate-in fade-in zoom-in-95 duration-100"
                            style={{ 
                                top: (copyBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 5, 
                                left: (copyBtnRef.current?.getBoundingClientRect().right ?? 0) - 192 
                            }}
                        >
                            <button 
                                onClick={handleDownloadMarkdown}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Markdown</span>
                            </button>
                            <div className="h-px bg-[#E5E5E5] dark:bg-[#3F3E3B] my-1" />
                            <button 
                                onClick={() => handleCopyConversation('text')}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Copy as Text</span>
                            </button>
                            <button 
                                onClick={() => handleCopyConversation('markdown')}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy as Markdown</span>
                            </button>
                            <button 
                                onClick={() => handleCopyConversation('json')}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                            >
                                <FileJson className="w-3.5 h-3.5" />
                                <span>Copy Full JSON</span>
                            </button>
                            <button 
                                onClick={() => handleCopyConversation('json-branch')}
                                className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                            >
                                <Braces className="w-3.5 h-3.5" />
                                <span>Copy Branch JSON</span>
                            </button>
                        </div>
                    </>,
                    document.body
                )}
            </div>

            {onClose && (
                <button 
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
                    title="Close View"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
      </header>

      {/* Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'json' ? (
            <JsonView data={conversation} highlightId={jsonHighlightId} />
        ) : (
            <div className={`mx-auto w-full pb-24 pt-8 px-4 md:px-8 ${getWidthClass()}`}>
                {messages.length > 0 ? (
                    messages.map((msg) => {
                        // Check if it's a tool/thinking block to reduce padding
                        const isToolLike = msg.role === 'tool' || 
                                           (msg.role === 'assistant' && msg.recipient && msg.recipient !== 'all') ||
                                           (msg.metadata as any)?.contentType === 'code' || 
                                           (msg.metadata as any)?.contentType === 'execution_output';
                        
                        return (
                            <div 
                                key={msg.id} 
                                className={`
                                    ${msg.isHidden ? 'opacity-50 grayscale' : ''}
                                    ${isToolLike ? 'py-0' : 'py-2'} 
                                `}
                            >
                                 {msg.isHidden && (
                                     <div className="flex justify-center mb-1">
                                         <span className="text-[10px] uppercase tracking-widest text-gray-400 bg-[#F0EEE6] dark:bg-[#2F2E2B] px-2 py-0.5 rounded-full">Hidden Message</span>
                                     </div>
                                 )}
                                <MessageBubble 
                                    message={msg} 
                                    onBranchSwitch={handleBranchSwitch}
                                    onJumpToJson={handleJumpToJson}
                                    fontSize={fontSize}
                                    fontFamily={fontFamily}
                                />
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full w-full" />
                )}
            </div>
        )}
      </div>
    </div>
  );
});

export default ChatView;
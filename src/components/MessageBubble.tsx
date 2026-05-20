import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import type { FormattedMessage, MessagePart } from '../types';
import { Copy, ImageIcon, FileAudio, Info, Check, Clock, Fingerprint, Activity, Volume2, Square, MoreHorizontal, EyeOff, ChevronLeft, ChevronRight, Globe, Code, Hexagon, Brain, ChevronDown, Terminal, ExternalLink, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

interface MessageBubbleProps {
  message: FormattedMessage;
  onHide?: () => void;
  onBranchSwitch?: (parentId: string, newIndex: number) => void;
  onJumpToJson?: (id: string) => void;
  fontSize?: 'small' | 'normal' | 'large' | 'xl';
  fontFamily?: string;
}

// Helper to normalize text content to play nicely with Markdown
const preprocessText = (content: string) => {
  if (!content) return '';
  
  const codeBlockRegex = /((?:```[\s\S]*?```)|(?:`[^`\n]*`))/g;

  return content.split(codeBlockRegex).map((part, index) => {
    if (index % 2 === 1) {
      return part; // Return code block as-is
    }

    let text = part;

    // Currency fix
    text = text.replace(/\$(\d)/g, '\\$$$1');

    // LaTeX Normalization
    text = text
      .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$') 
      .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

    return text;
  }).join('');
};

const CodeBlock = ({ className, children, node, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match && !String(children).includes('\n');
    
    const getTextFromChildren = (child: any): string => {
        if (typeof child === 'string') return child;
        if (typeof child === 'number') return String(child);
        if (Array.isArray(child)) return child.map(getTextFromChildren).join('');
        if (typeof child === 'object' && child?.props?.children) return getTextFromChildren(child.props.children);
        return '';
    };

    const handleCopy = () => {
        const textToCopy = getTextFromChildren(children);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isInline) {
        return (
            <code className={`
                font-mono text-[85%] px-1.5 py-0.5 rounded border
                bg-[#F0EEE6] dark:bg-[#2C2B28] text-[#DA7756] border-[#E5E5E5] dark:border-[#3F3E3B]
            `} {...props}>{children}</code>
        );
    }

    return (
        <div className="my-6 rounded-xl overflow-hidden border border-[#E5E5E5] dark:border-[#3F3E3B] shadow-sm bg-white dark:bg-[#1A1917]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#F9F9F9] dark:bg-[#252422] border-b border-[#E5E5E5] dark:border-[#3F3E3B]">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-sans font-medium">{match ? match[1] : 'Code'}</span>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>
            <div className="p-4 overflow-x-auto bg-[#FFFFFF] dark:bg-[#1A1917]">
                <code className="text-[13px] md:text-[14px] font-mono leading-relaxed text-gray-800 dark:text-gray-300" {...props}>
                    {children}
                </code>
            </div>
        </div>
    );
};

const ThinkingBlock: React.FC<{ message: FormattedMessage }> = ({ message }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isToolOutput = message.role === 'tool';
    const isToolCall = message.role === 'assistant' && message.recipient && message.recipient !== 'all';
    
    // Metadata Analysis
    const searchResults = message.metadata?.search_result_groups;
    const hasSearchResults = searchResults && searchResults.length > 0;

    const content = message.parts.map(p => p.text).join('\n');
    const hasTextContent = content && content.trim().length > 0;

    // If it's a tool output/call and has absolutely no content, don't render
    if (!hasTextContent && !hasSearchResults) {
        return null;
    }

    // Determine Label
    let title = "Thinking";
    let Icon = Brain;

    if (isToolOutput) {
        Icon = Terminal;
        let name = message.authorName || 'Tool';
        if (name === 'web.run' || name === 'web.search') name = 'web';
        if (name === 'dalle.text2im') name = 'dalle';
        title = name;
        if (hasSearchResults) {
            title = 'web'; 
            Icon = Search;
        }
    } else if (isToolCall) {
        Icon = Terminal;
        let name = message.recipient || 'tool';
        if (name.startsWith('web.') || name === 'web') name = 'web';
        if (name.startsWith('dalle')) name = 'dalle';
        if (name === 'python') name = 'python';
        title = name;
    }

    return (
        <div className="flex flex-col items-start max-w-full">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all select-none border
                    ${isOpen 
                        ? 'bg-[#F0EEE6] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100 border-[#E5E5E5] dark:border-[#3F3E3B] mb-2' 
                        : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-[#F0EEE6] dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                `}
            >
                <Icon className="w-3.5 h-3.5" />
                <span className="opacity-90">{title}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''} opacity-50`} />
            </button>
            
            {isOpen && (
                <div className="w-full ml-1 pl-3 border-l-2 border-[#E5E5E5] dark:border-[#2C2B28] space-y-2 mb-2">
                    {/* Raw Text Content (Input or Output) */}
                    {hasTextContent && (
                        <div className="p-3 bg-[#F9F9F9] dark:bg-[#1A1917] rounded-lg border border-[#E5E5E5] dark:border-[#3F3E3B] overflow-x-auto">
                            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                                {content}
                            </pre>
                        </div>
                    )}

                    {/* Rich Search Results */}
                    {hasSearchResults && (
                        <div className="space-y-3">
                            {searchResults.map((group: any, gIdx: number) => (
                                <div key={gIdx} className="space-y-2">
                                    {group.entries?.map((entry: any, eIdx: number) => (
                                        <a 
                                            key={eIdx} 
                                            href={entry.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-start gap-3 p-3 bg-white dark:bg-[#1A1917] border border-[#E5E5E5] dark:border-[#3F3E3B] rounded-lg hover:border-claude-accent/30 dark:hover:border-claude-accent/30 transition-colors group"
                                        >
                                            <div className="p-1.5 bg-[#F9F9F9] dark:bg-[#252422] rounded-md text-gray-400 group-hover:text-claude-accent transition-colors">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-gray-900 dark:text-gray-200 truncate pr-4">
                                                    {entry.title || 'Untitled Result'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5">
                                                    {entry.url}
                                                </div>
                                                {entry.snippet && (
                                                    <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed opacity-80">
                                                        {entry.snippet}
                                                    </div>
                                                )}
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const PartThinkingBlock: React.FC<{ part: MessagePart }> = ({ part }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Determine Label and Content
    let title = "Thinking";
    let Icon = Brain;
    let content = "";
    
    if (part.type === 'tool_use') {
        Icon = Terminal;
        let name = part.name || 'tool';
        if (name.startsWith('web.') || name === 'web' || name === 'web_search') name = 'web';
        if (name.startsWith('dalle')) name = 'dalle';
        title = name;
        content = JSON.stringify(part.input || {}, null, 2);
    } else if (part.type === 'tool_result') {
        Icon = Terminal;
        title = 'Tool Result';
        if (Array.isArray(part.content)) {
            content = part.content.map((c: any) => c.text || c.title || '').join('\n');
        } else if (typeof part.content === 'string') {
            content = part.content;
        } else {
            content = JSON.stringify(part.content || {}, null, 2);
        }
    } else if (part.type === 'artifact' || part.type === 'redacted_thinking') {
        title = part.type === 'redacted_thinking' ? 'Redacted Thinking' : 'Artifact';
        Icon = Code;
        content = typeof part.content === 'string' ? part.content : JSON.stringify(part.content || part, null, 2);
    } else if (part.type === 'thinking') {
        content = part.thinking || '';
    }

    if (!content || content.trim().length === 0) return null;

    return (
        <div className="flex flex-col items-start max-w-full my-3">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all select-none border
                    ${isOpen 
                        ? 'bg-[#F0EEE6] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100 border-[#E5E5E5] dark:border-[#3F3E3B] mb-2' 
                        : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-[#F0EEE6] dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                `}
            >
                <Icon className="w-3.5 h-3.5" />
                <span className="opacity-90">{title}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''} opacity-50`} />
            </button>
            
            {isOpen && (
                <div className="w-full ml-1 pl-3 border-l-2 border-[#E5E5E5] dark:border-[#2C2B28] space-y-2 mb-2">
                    <div className="p-3 bg-[#F9F9F9] dark:bg-[#1A1917] rounded-lg border border-[#E5E5E5] dark:border-[#3F3E3B] overflow-x-auto max-h-96">
                        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                            {content}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

const PartRenderer: React.FC<{ part: MessagePart; isUser: boolean; isVisible: boolean; fontSize: string; fontFamily?: string }> = ({ part, isUser, isVisible, fontSize, fontFamily }) => {
  if (part.type === 'tool_use' || part.type === 'tool_result' || part.type === 'thinking' || part.type === 'artifact' || part.type === 'redacted_thinking') {
      return <PartThinkingBlock part={part} />;
  }

  if (part.type === 'image') {
    return (
      <div className="my-4 max-w-md rounded-lg overflow-hidden border border-[#E5E5E5] dark:border-gray-700/50 shadow-sm bg-[#F9F9F9] dark:bg-black/20">
        <div className="relative aspect-video flex items-center justify-center">
            {part.assetUrl ? (
                <img 
                    src={part.assetUrl} 
                    alt="Chat asset" 
                    className="w-full h-full object-contain bg-gray-900"
                    onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                />
            ) : null}
            <div className={`absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center ${part.assetUrl ? 'hidden' : ''}`}>
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-sans">Asset Missing</span>
            </div>
        </div>
      </div>
    );
  }

  if (part.type === 'audio') {
     return (
         <div className="my-3 p-3 bg-white dark:bg-[#2F2E2B] rounded-xl flex items-center gap-4 border border-[#E5E5E5] dark:border-gray-700/50 shadow-sm w-fit pr-6">
             <div className="p-2.5 bg-claude-accent/10 rounded-full">
                 <FileAudio className="w-5 h-5 text-claude-accent" />
             </div>
             <div className="flex-1 min-w-0">
                 <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-sans font-medium uppercase tracking-wide">Audio Clip</div>
                 <audio controls className="h-8 w-48 opacity-80 hover:opacity-100 transition-opacity" src={part.assetUrl} />
             </div>
         </div>
     )
  }

  const textContent = part.text || '';
  const enableMath = !isUser && isVisible;
  
  const processedText = useMemo(() => {
    return enableMath ? preprocessText(textContent) : textContent;
  }, [textContent, enableMath]);

  // Dynamic Font Size Class map
  const sizeMap: Record<string, string> = {
      'small': 'text-[14px] md:text-[15px]',
      'normal': 'text-[16px] md:text-[17px]',
      'large': 'text-[18px] md:text-[19px]',
      'xl': 'text-[20px] md:text-[21px]',
  }
  const userSizeMap: Record<string, string> = {
      'small': 'text-[13px] md:text-[14px]',
      'normal': 'text-[15px] md:text-[16px]',
      'large': 'text-[16px] md:text-[17px]',
      'xl': 'text-[18px] md:text-[19px]',
  }

  const baseSize = isUser ? userSizeMap[fontSize] : sizeMap[fontSize];

  // Styles specifically for Assistant/System responses (Markdown heavy)
  const assistantStyles = `
    font-serif ${baseSize} text-[#333333] dark:text-[#E6E4DD] tracking-normal
    [&_p]:mb-5 [&_p:last-child]:mb-0
    [&_h1]:text-[1.5em] [&_h1]:font-sans [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6
    [&_h2]:text-[1.25em] [&_h2]:font-sans [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5
    [&_h3]:text-[1.125em] [&_h3]:font-sans [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-4
    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5
    [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5
    [&_li]:mb-1.5 [&_li]:pl-1 [&_li]:border-none [&_li]:p-0
    [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-black/5 [&_hr]:dark:bg-white/5 [&_hr]:my-8
    [&>*:first-child]:mt-0
  `;

  // Styles specifically for User messages (Minimal)
  const userStyles = `
    font-sans ${baseSize} text-gray-800 dark:text-[#E6E4DD] whitespace-pre-wrap
  `;

  const customStyle = (!isUser && fontFamily) ? { fontFamily: `"${fontFamily}", serif` } : undefined;

  return (
    <div 
        className={`break-words leading-relaxed transition-colors duration-200 ${isUser ? userStyles : assistantStyles}`}
        style={customStyle}
    >
        <ReactMarkdown
            remarkPlugins={enableMath ? [remarkMath, remarkGfm] : [remarkGfm]}
            rehypePlugins={enableMath ? [rehypeKatex] : []}
            components={{
                code: CodeBlock,
                a({ href, children }) {
                    return <a href={href} className="text-claude-accent hover:text-[#C96445] hover:underline decoration-1 underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>
                },
                blockquote({ children }) {
                    return <blockquote className="border-l-[3px] border-claude-accent/40 pl-5 py-1 my-4 text-gray-600 dark:text-gray-400 italic bg-[#F0EEE6]/50 dark:bg-transparent">{children}</blockquote>
                },
                ul({ children }) {
                    return <ul>{children}</ul>
                },
                ol({ children }) {
                    return <ol>{children}</ol>
                },
                li({ children }) {
                    return <li>{children}</li>
                },
                table({ children }) {
                    return <div className="overflow-x-auto my-6 rounded-lg border border-[#E5E5E5] dark:border-[#3F3E3B]"><table className="w-full text-left text-sm">{children}</table></div>
                },
                th({ children }) {
                    return <th className="bg-[#F9F9F9] dark:bg-[#252422] px-4 py-2 font-semibold text-gray-900 dark:text-[#E6E4DD] border-b border-[#E5E5E5] dark:border-[#3F3E3B]">{children}</th>
                },
                td({ children }) {
                    return <td className="px-4 py-2 border-b last:border-0 border-[#F0EEE6] dark:border-[#2C2B28]">{children}</td>
                }
            }}
        >
        {processedText}
        </ReactMarkdown>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, onHide, onBranchSwitch, onJumpToJson, fontSize = 'normal', fontFamily }) => {
  const isUser = message.role === 'user';
  
  // Identify if this is a Thinking/Tool message
  const isToolCall = message.role === 'assistant' && message.recipient && message.recipient !== 'all';
  const isThinkingOrTool = message.role === 'tool' || 
                           isToolCall ||
                           (message.metadata as any)?.contentType === 'code' || 
                           (message.metadata as any)?.contentType === 'execution_output';

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  
  // Detect if search was used
  const hasSearch = !!(message.metadata?.search_result_groups && message.metadata.search_result_groups.length > 0) || 
                    !!(message.metadata?.search_queries && message.metadata.search_queries.length > 0);

  const handleMenuToggle = () => {
    if (menuOpen) {
        setMenuOpen(false);
        return;
    }
    if (menuButtonRef.current) {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 5, left: rect.left });
        setMenuOpen(true);
    }
  };

  useEffect(() => {
     const closeMenu = () => setMenuOpen(false);
     if (menuOpen) window.addEventListener('click', closeMenu);
     return () => window.removeEventListener('click', closeMenu);
  }, [menuOpen]);

  useEffect(() => {
    if (isUser) {
        setIsVisible(true);
        return;
    }
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect(); 
            }
        },
        { rootMargin: '300px' }
    );
    if (bubbleRef.current) observer.observe(bubbleRef.current);
    return () => observer.disconnect();
  }, [isUser]);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);
  
  const handleCopy = () => {
    const text = message.parts.filter(p => p.type === 'text').map(p => p.text).join('\n\n');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
    }
    const text = message.parts.filter(p => p.type === 'text').map(p => p.text).join(' ');
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Improved Voice Selection Strategy
    const preferredVoices = [
        'Google US English', 
        'Microsoft Zira', 
        'Samantha', 
        'Daniel', 
        'Google UK English Female'
    ];
    
    let bestVoice = voices.find(v => preferredVoices.some(p => v.name.includes(p)));
    
    if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.startsWith('en') && v.localService);
    }
    
    if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.startsWith('en'));
    }

    if (bestVoice) {
        utterance.voice = bestVoice;
        if (!bestVoice.name.includes('Google')) {
            utterance.rate = 1.05; 
            utterance.pitch = 1.0;
        }
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Render Tool/Thinking Blocks specially
  if (isThinkingOrTool) {
      const content = message.parts.map(p => p.text).join('\n');
      const hasContent = content && content.trim().length > 0;
      const hasResults = message.metadata?.search_result_groups && message.metadata.search_result_groups.length > 0;
      
      if (!hasContent && !hasResults) return null;

      return (
          <div className="w-full pl-12 pr-4 md:pr-12">
              <ThinkingBlock message={message} />
          </div>
      );
  }

  return (
    <div ref={bubbleRef} className={`w-full py-4 md:py-6 group/message ${isUser ? '' : ''}`}>
      <div className={`flex gap-4 md:gap-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
        
        {!isUser && (
            <div className="shrink-0 flex flex-col pt-1.5">
                <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center">
                    <Hexagon className="w-7 h-7 text-claude-accent fill-none stroke-[2]" />
                </div>
            </div>
        )}

        <div className={`
          relative max-w-[85%] md:max-w-[80%] lg:max-w-[70%]
          ${isUser 
            ? 'bg-claude-user dark:bg-claude-dark-user px-4 py-3 rounded-[1.25rem] text-left shadow-sm' 
            : 'px-0 py-0' 
          }
        `}>
          {/* Sibling Navigation */}
          {message.sibling && message.sibling.total > 1 && (
             <div className="flex items-center gap-1.5 mb-2 text-xs font-mono select-none">
                 <button 
                    disabled={message.sibling.current <= 1}
                    onClick={() => onBranchSwitch?.(message.sibling!.parent, message.sibling!.current - 1)}
                    className="p-0.5 rounded hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] disabled:opacity-30 disabled:hover:bg-transparent text-gray-500 dark:text-gray-400 transition-colors"
                 >
                    <ChevronLeft className="w-3.5 h-3.5" />
                 </button>
                 <span className="text-gray-400 dark:text-gray-500">
                    {message.sibling.current} / {message.sibling.total}
                 </span>
                 <button 
                    disabled={message.sibling.current >= message.sibling.total}
                    onClick={() => onBranchSwitch?.(message.sibling!.parent, message.sibling!.current + 1)}
                    className="p-0.5 rounded hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] disabled:opacity-30 disabled:hover:bg-transparent text-gray-500 dark:text-gray-400 transition-colors"
                 >
                    <ChevronRight className="w-3.5 h-3.5" />
                 </button>
             </div>
          )}

          <div className="space-y-1">
            {message.parts.map((part, idx) => (
                <PartRenderer key={idx} part={part} isUser={isUser} isVisible={isVisible} fontSize={fontSize} fontFamily={fontFamily} />
            ))}
          </div>

          {!isUser && hasSearch && (
             <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 select-none">
                 <Globe className="w-3 h-3" />
                 <span>Used Search</span>
             </div>
          )}

          {/* Action Buttons - Layout Change for Mobile */}
          <div className={`
            flex items-center gap-1 transition-opacity duration-200
            ${isUser 
                ? 'absolute -bottom-8 right-1 opacity-100 md:opacity-0 md:group-hover/message:opacity-100' 
                : 'md:absolute md:-bottom-8 md:left-0 md:opacity-0 md:group-hover/message:opacity-100 mt-2 md:mt-0 opacity-100' 
            }
          `}>
            <button 
              onClick={handleCopy}
              className={`p-1.5 rounded-md transition-colors ${isCopied ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B]'}`}
              title="Copy message (Markdown)"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            
            {!isUser && (
                <>
                    <button 
                        onClick={handleSpeak}
                        className={`p-1.5 rounded-md transition-colors ${isSpeaking ? 'text-claude-accent bg-claude-accent/10' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B]'}`}
                        title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
                    >
                        {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <div className="relative">
                        <button 
                            ref={menuButtonRef}
                            onClick={(e) => { e.stopPropagation(); handleMenuToggle(); }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] transition-colors"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {menuOpen && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                                <div 
                                    className="fixed z-[9999] w-56 bg-white dark:bg-[#252422] rounded-xl shadow-xl border border-[#E5E5E5] dark:border-[#3F3E3B] p-2 animate-in fade-in zoom-in-95 duration-100 text-sm font-sans"
                                    style={{ top: menuPos.top, left: menuPos.left }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-2 py-2 mb-1 border-b border-[#E5E5E5] dark:border-[#3F3E3B]">
                                        <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Model</div>
                                        <div className="text-gray-700 dark:text-gray-200 font-mono text-xs">{message.model || 'Unknown'}</div>
                                    </div>
                                    <div className="px-2 py-2 mb-1 border-b border-[#E5E5E5] dark:border-[#3F3E3B]">
                                        <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider mb-1">Time</div>
                                        <div className="text-gray-700 dark:text-gray-200 text-xs">
                                            {message.createdAt ? new Date(message.createdAt * 1000).toLocaleString() : 'Unknown'}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { onJumpToJson?.(message.id); setMenuOpen(false); }}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                                    >
                                        <Code className="w-3.5 h-3.5" />
                                        <span>View JSON</span>
                                    </button>
                                </div>
                            </>,
                            document.body
                        )}
                    </div>
                </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
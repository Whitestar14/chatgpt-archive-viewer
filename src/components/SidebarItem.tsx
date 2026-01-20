import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pin, PinOff, Columns, EyeOff, Eye, CheckCircle, Circle, FolderPlus, Folder, Star, StarOff } from 'lucide-react';
import { getConversationText } from '../utils/search';
import { useStore } from '../store';
import type { Conversation } from '../types';

interface SidebarItemProps {
    id?: string;
    // Intersection type to handle the UI-specific index property added during mapping
    conv: Conversation & { originalIndex: number };
    originalIndex: number;
    isSelected: boolean;
    isSecondary: boolean;
    isPinned: boolean;
    isHidden: boolean;
    onSelect: (id: string) => void;
    onTogglePin: (id: string) => void;
    onToggleHidden: (id: string) => void;
    onOpenSplit: (id: string) => void;
    searchTerm?: string;
    
    // Selection Mode Props
    isSelectionMode: boolean;
    isChecked: boolean;
    onToggleSelection: (id: string) => void;
    onEnableSelectionMode: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = React.memo(({ 
    id,
    conv, 
    originalIndex, 
    isSelected, 
    isSecondary,
    isPinned,
    isHidden,
    onSelect, 
    onTogglePin, 
    onToggleHidden, 
    onOpenSplit,
    searchTerm,
    isSelectionMode,
    isChecked,
    onToggleSelection,
    onEnableSelectionMode
}) => {
    const { collections, addToCollection } = useStore();
    const [showMenu, setShowMenu] = useState(false);
    const [showCollectionSubmenu, setShowCollectionSubmenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = () => {
            if (showMenu) {
                setShowMenu(false);
                setShowCollectionSubmenu(false);
            }
        };
        const handleResize = () => {
            if (showMenu) {
                setShowMenu(false);
                setShowCollectionSubmenu(false);
            }
        }
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('resize', handleResize);
        };
    }, [showMenu]);

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showMenu) {
            setShowMenu(false);
            return;
        }
        
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPos({ 
                top: rect.bottom + 4, 
                left: rect.left 
            });
            setShowMenu(true);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isSelectionMode) {
            e.preventDefault();
            onToggleSelection(conv.id);
        } else {
            onSelect(String(originalIndex));
        }
    };

    const searchSnippet = useMemo(() => {
        if (!searchTerm || !searchTerm.trim()) return null;
        const fullText = getConversationText(conv);
        const lowerText = fullText.toLowerCase();
        const lowerTerm = searchTerm.toLowerCase();
        const idx = lowerText.indexOf(lowerTerm);
        if (idx === -1) return null;
        const start = Math.max(0, idx - 25);
        const end = Math.min(fullText.length, idx + lowerTerm.length + 40);
        let snippet = fullText.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < fullText.length) snippet = snippet + '...';
        return snippet;
    }, [conv, searchTerm]);

    const renderSnippet = (text: string, term: string) => {
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <span className="text-[11px] text-gray-500 dark:text-gray-500 line-clamp-2 break-words mt-0.5 font-normal">
                {parts.map((part, i) => (
                    part.toLowerCase() === term.toLowerCase() ? 
                        <span key={i} className="font-semibold text-gray-900 dark:text-gray-200">{part}</span> : 
                        <span key={i}>{part}</span>
                ))}
            </span>
        );
    };

    const hasSnippet = !!(searchSnippet && searchTerm);

    return (
        <div className="relative group" id={id}>
            <button
                onClick={handleClick}
                className={`
                    w-full text-left pl-3 pr-1 py-1 rounded-lg transition-colors duration-150
                    flex items-center gap-2 group/item relative text-sm font-medium
                    ${(isSelected && !isSelectionMode) 
                    ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100' 
                    : isSecondary && !isSelectionMode
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-white/5'
                    }
                    ${hasSnippet ? 'items-start' : ''}
                    ${isChecked ? 'bg-claude-accent/5 dark:bg-claude-accent/10' : ''}
                `}
            >
                {isSelectionMode && (
                    <div className={`shrink-0 transition-colors ${isChecked ? 'text-claude-accent' : 'text-gray-300 dark:text-gray-600'} ${hasSnippet ? 'mt-0.5' : ''}`}>
                        {isChecked ? <CheckCircle className="w-4 h-4 fill-current" /> : <Circle className="w-4 h-4" />}
                    </div>
                )}

                <div className="flex flex-col min-w-0 flex-1 overflow-hidden justify-center">
                    <div className="flex items-center gap-2">
                        {isHidden && <EyeOff className="w-3 h-3 shrink-0 opacity-40 text-gray-400" />}
                        <span className="truncate leading-5 w-full block">
                            {conv.title || 'Untitled Chat'}
                        </span>
                    </div>
                    {hasSnippet && <div className="leading-snug">{renderSnippet(searchSnippet, searchTerm)}</div>}
                </div>
                
                {!isSelectionMode && (
                    <div 
                        ref={buttonRef}
                        className={`
                            p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 shrink-0
                            ${showMenu ? 'opacity-100 bg-black/5 dark:bg-white/10' : 'md:opacity-0 group-hover/item:opacity-100'}
                            transition-all duration-200
                            ${hasSnippet ? 'mt-0.5' : ''}
                        `}
                        onClick={handleMenuToggle}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </div>
                )}
            </button>

            {showMenu && createPortal(
                <div 
                    className="fixed z-[10000] w-52 bg-white dark:bg-[#252422] rounded-xl shadow-xl border border-gray-100 dark:border-claude-dark-border p-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: menuPos.top, left: menuPos.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={() => { onTogglePin(conv.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors">
                        {isPinned ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                        <span>{isPinned ? 'Unstar' : 'Star'}</span>
                    </button>
                    <button onClick={() => { onOpenSplit(String(originalIndex)); setShowMenu(false); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors">
                        <Columns className="w-3.5 h-3.5" />
                        <span>Split View</span>
                    </button>
                    {collections.length > 0 && (
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowCollectionSubmenu(!showCollectionSubmenu); }} className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors">
                                <div className="flex items-center gap-2"><FolderPlus className="w-3.5 h-3.5" /><span>Add to...</span></div>
                                <MoreHorizontal className="w-3 h-3 -rotate-90 opacity-40" />
                            </button>
                            {showCollectionSubmenu && (
                                <div className="absolute left-full top-0 ml-1 w-44 bg-white dark:bg-[#252422] rounded-xl shadow-xl border border-gray-100 dark:border-claude-dark-border p-1 overflow-y-auto max-h-48">
                                    {collections.map(col => (
                                        <button key={col.id} onClick={() => { addToCollection(col.id, [conv.id]); setShowMenu(false); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"><Folder className="w-3 h-3" /><span className="truncate">{col.name}</span></button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="my-1 border-t border-gray-100 dark:border-claude-dark-border"></div>
                    <button onClick={() => { onEnableSelectionMode(); onToggleSelection(conv.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"><CheckCircle className="w-3.5 h-3.5" /><span>Select...</span></button>
                    <button onClick={() => { onToggleHidden(conv.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">{isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}<span>{isHidden ? 'Unhide' : 'Hide'}</span></button>
                </div>,
                document.body
            )}
        </div>
    );
});

export default SidebarItem;
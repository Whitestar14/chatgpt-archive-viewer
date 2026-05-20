import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Filter, Calendar, Plus, Trash2, Edit2, Check, Settings, EyeOff, Sparkles, FileUp, ChevronsUpDown, Terminal, Mic, ImageIcon, Keyboard, RotateCcw, Folder, FolderOpen, Eye, Star, ChevronDown, ChevronRight, MoreHorizontal, Zap, Archive } from 'lucide-react';
import SidebarItem from './SidebarItem';
import ConfirmationModal from './ConfirmationModal';
import { createPortal } from 'react-dom';
import type { ProfileMeta } from '../utils/db';
import { useStore } from '../store';
import type { Conversation } from '../types';

interface SidebarProps {
  onSearch?: (term: string) => void;
  searchResults?: number[] | null;
  isSearching?: boolean;
  searchId?: number;
  
  // Profile Props
  onAddProfile: () => void;
  onDeleteProfile: (id: string) => void;
  onRenameProfile: (id: string, newName: string) => void;
  onSwitchProfile: (id: string) => void;
}

const groupChatsByDate = (chats: (Conversation & { originalIndex: number })[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const groups: { [key: string]: (Conversation & { originalIndex: number })[] } = {
        'Today': [],
        'Yesterday': [],
        'Previous 7 days': [],
        'Previous 30 days': [],
    };

    const olderGroups: { [key: string]: (Conversation & { originalIndex: number })[] } = {};

    chats.forEach(chat => {
        const date = new Date(chat.create_time * 1000);
        const time = date.getTime();

        if (time >= today.getTime()) {
            groups['Today'].push(chat);
        } else if (time >= yesterday.getTime()) {
            groups['Yesterday'].push(chat);
        } else if (time >= last7Days.getTime()) {
            groups['Previous 7 days'].push(chat);
        } else if (time >= last30Days.getTime()) {
            groups['Previous 30 days'].push(chat);
        } else {
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!olderGroups[monthYear]) olderGroups[monthYear] = [];
            olderGroups[monthYear].push(chat);
        }
    });

    return { ...groups, ...olderGroups };
};

interface SidebarListContentProps {
    pinnedList: (Conversation & { originalIndex: number })[];
    recentList: (Conversation & { originalIndex: number })[];
    activeConversationId: string | null;
    secondaryConversationId: string | null;
    hiddenIds: string[];
    searchTerm: string;
    isSelectionMode: boolean;
    selectedItems: Set<string>;
    isCurrentlySearching: boolean;
    isLoading: boolean;
    visibleCount: number;
    onSelect: (id: string) => void;
    onTogglePin: (id: string) => void;
    onToggleHidden: (id: string) => void;
    onOpenSplit: (id: string) => void;
    handleToggleSelection: (id: string) => void;
    setIsSelectionMode: (val: boolean) => void;
    setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
    isSearchActive: boolean;
}

const SidebarListContent = React.memo(({ 
    pinnedList, 
    recentList, 
    activeConversationId, 
    secondaryConversationId, 
    hiddenIds, 
    searchTerm, 
    isSelectionMode, 
    selectedItems, 
    isCurrentlySearching,
    isLoading,
    visibleCount,
    onSelect,
    onTogglePin,
    onToggleHidden,
    onOpenSplit,
    handleToggleSelection,
    setIsSelectionMode,
    setVisibleCount,
    isSearchActive
}: SidebarListContentProps) => {
    
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 100) {
            setVisibleCount((prev: number) => prev + 20);
        }
    };

    const visibleRecents = recentList.slice(0, visibleCount);
    const groupedRecents = useMemo(() => {
        if (isSearchActive) return null; 
        return groupChatsByDate(visibleRecents);
    }, [visibleRecents, isSearchActive]);

    // Matching SettingsView header style: text-xs font-semibold text-gray-500 uppercase tracking-wider
    const headerClass = "px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 mt-6 select-none flex items-center gap-1.5 uppercase tracking-wider";

    return (
        <div 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-3 px-3 md:px-4"
        >
            {pinnedList.length > 0 && !isSearchActive && (
                <div className="mb-2">
                    <div className={headerClass}>
                        Starred
                    </div>
                    <div className="space-y-0.5">
                        {pinnedList.map((conv) => (
                            <SidebarItem
                                key={`pin-${conv.originalIndex}`}
                                conv={conv}
                                originalIndex={conv.originalIndex}
                                isSelected={activeConversationId === String(conv.originalIndex)}
                                isSecondary={secondaryConversationId === String(conv.originalIndex)}
                                isPinned={true}
                                isHidden={hiddenIds.includes(conv.id)}
                                onSelect={onSelect}
                                onTogglePin={onTogglePin}
                                onToggleHidden={onToggleHidden}
                                onOpenSplit={onOpenSplit}
                                searchTerm={searchTerm}
                                isSelectionMode={isSelectionMode}
                                isChecked={selectedItems.has(conv.id)}
                                onToggleSelection={handleToggleSelection}
                                onEnableSelectionMode={() => setIsSelectionMode(true)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div>
                {isCurrentlySearching ? (
                    <div className="space-y-2 pt-2">
                        <div className="h-9 bg-[#EAE7DF] dark:bg-[#2F2E2B] rounded-lg animate-pulse" />
                        <div className="h-9 bg-[#EAE7DF] dark:bg-[#2F2E2B] rounded-lg animate-pulse delay-75" />
                        <div className="h-9 bg-[#EAE7DF] dark:bg-[#2F2E2B] rounded-lg animate-pulse delay-150" />
                    </div>
                ) : recentList.length === 0 ? (
                    !isLoading && (
                        <div className="py-12 text-center text-sm text-gray-400">
                            <span className="italic">
                                {searchTerm ? 'No matches found.' : 'No active conversations.'}
                            </span>
                        </div>
                    )
                ) : (
                    <>
                        {groupedRecents ? (
                            Object.entries(groupedRecents).map(([groupName, chatList]) => {
                                if (chatList.length === 0) return null;
                                return (
                                    <div key={groupName}>
                                        <div className={`${headerClass} sticky top-0 bg-[#F9F9F9] dark:bg-[#1A1917] z-10 py-1`}>
                                            {groupName}
                                        </div>
                                        <div className="space-y-0.5">
                                            {chatList.map((conv) => (
                                                <SidebarItem
                                                    key={`rec-${conv.originalIndex}`}
                                                    id={`item-${conv.originalIndex}`}
                                                    conv={conv}
                                                    originalIndex={conv.originalIndex}
                                                    isSelected={activeConversationId === String(conv.originalIndex)}
                                                    isSecondary={secondaryConversationId === String(conv.originalIndex)}
                                                    isPinned={false}
                                                    isHidden={hiddenIds.includes(conv.id)}
                                                    onSelect={onSelect}
                                                    onTogglePin={onTogglePin}
                                                    onToggleHidden={onToggleHidden}
                                                    onOpenSplit={onOpenSplit}
                                                    searchTerm={searchTerm}
                                                    isSelectionMode={isSelectionMode}
                                                    isChecked={selectedItems.has(conv.id)}
                                                    onToggleSelection={handleToggleSelection}
                                                    onEnableSelectionMode={() => setIsSelectionMode(true)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="space-y-0.5 mt-2">
                                {visibleRecents.map((conv) => (
                                    <SidebarItem
                                        key={`rec-${conv.originalIndex}`}
                                        id={`item-${conv.originalIndex}`}
                                        conv={conv}
                                        originalIndex={conv.originalIndex}
                                        isSelected={activeConversationId === String(conv.originalIndex)}
                                        isSecondary={secondaryConversationId === String(conv.originalIndex)}
                                        isPinned={false}
                                        isHidden={hiddenIds.includes(conv.id)}
                                        onSelect={onSelect}
                                        onTogglePin={onTogglePin}
                                        onToggleHidden={onToggleHidden}
                                        onOpenSplit={onOpenSplit}
                                        searchTerm={searchTerm}
                                        isSelectionMode={isSelectionMode}
                                        isChecked={selectedItems.has(conv.id)}
                                        onToggleSelection={handleToggleSelection}
                                        onEnableSelectionMode={() => setIsSelectionMode(true)}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {visibleCount < recentList.length && (
                            <div className="py-4 text-center text-xs text-gray-400">
                                Loading more...
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
});

const CreateCollectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [name, setName] = useState('');
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-sm bg-white dark:bg-[#1A1917] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2B28] p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">New Collection</h3>
                <input 
                    autoFocus
                    placeholder="Collection Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9F9] dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] rounded-lg mb-4 text-sm focus:ring-2 focus:ring-claude-accent/20 outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onConfirm(name); onClose(); setName(''); } }}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg">Cancel</button>
                    <button 
                        disabled={!name.trim()}
                        onClick={() => { onConfirm(name); onClose(); setName(''); }} 
                        className="px-3 py-1.5 text-sm bg-claude-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ITEMS_PER_PAGE = 40;

const Sidebar: React.FC<SidebarProps> = ({ 
  onSearch,
  searchResults,
  isSearching = false,
  searchId,
  onAddProfile,
  onDeleteProfile,
  onRenameProfile,
  onSwitchProfile
}) => {
  const { 
      conversations, 
      activeConversationId, 
      secondaryConversationId, 
      pinnedIds, 
      hiddenIds, 
      excludeArchivedSearch,
      isSidebarOpen,
      isMobileMenuOpen,
      theme,
      profiles,
      activeProfileId,
      isProfileLoading: isLoading,
      setActiveConversationId,
      setSecondaryConversationId,
      setMobileMenuOpen,
      setTheme,
      togglePin,
      toggleHidden,
      setView,
      currentView,
      
      // Collections
      collections,
      activeCollectionId,
      createCollection,
      deleteCollection,
      setActiveCollectionId
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isInputProcessing, setIsInputProcessing] = useState(false);
  const [isCollectionsExpanded, setIsCollectionsExpanded] = useState(true);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'profile' | 'collection', id: string, name: string } | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minMsg, setMinMsg] = useState('');
  const [maxMsg, setMaxMsg] = useState('');
  const [filterModel, setFilterModel] = useState<string>('all');
  
  const [filterTools, setFilterTools] = useState(false);
  const [filterImages, setFilterImages] = useState(false);
  const [filterVoice, setFilterVoice] = useState(false);
  const [filterDictation, setFilterDictation] = useState(false);

  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const prevSearchTermRef = useRef(searchTerm);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
              setShowProfileMenu(false);
          }
      };
      if (showProfileMenu) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    if (searchTerm) setIsInputProcessing(true);
    else setIsInputProcessing(false);
    const handler = setTimeout(() => { if (onSearch) onSearch(searchTerm); }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, onSearch]);

  useEffect(() => setIsInputProcessing(false), [searchId]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, dateFrom, dateTo, minMsg, maxMsg, filterModel, filterTools, filterImages, filterVoice, filterDictation]);


  const handleStartRename = useCallback((e: React.MouseEvent, profile: ProfileMeta) => {
      e.stopPropagation();
      setEditingProfileId(profile.id);
      setEditName(profile.name);
  }, []);

  const handleSaveRename = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      if (editingProfileId && editName.trim()) onRenameProfile(editingProfileId, editName.trim());
      setEditingProfileId(null);
  }, [editingProfileId, editName, onRenameProfile]);

  const handleToggleSelection = useCallback((id: string) => {
      setSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
              newSet.delete(id);
              if (newSet.size === 0) setIsSelectionMode(false);
          } else newSet.add(id);
          return newSet;
      });
  }, []);

  const handleExitSelectionMode = useCallback(() => {
      setIsSelectionMode(false);
      setSelectedItems(new Set());
  }, []);

  const handleMassAction = useCallback((action: 'pin' | 'unpin' | 'hide' | 'unhide') => {
      if (selectedItems.size === 0) return;
      const ids = Array.from(selectedItems);
      ids.forEach(id => {
          if (action === 'pin' && !pinnedIds.includes(id)) togglePin(id);
          if (action === 'unpin' && pinnedIds.includes(id)) togglePin(id);
          if (action === 'hide' && !hiddenIds.includes(id)) toggleHidden(id);
          if (action === 'unhide' && hiddenIds.includes(id)) toggleHidden(id);
      });
      handleExitSelectionMode();
  }, [selectedItems, pinnedIds, hiddenIds, togglePin, toggleHidden, handleExitSelectionMode]);

  const selectionContext = useMemo(() => {
      if (selectedItems.size === 0) return { canPin: false, canUnpin: false, canHide: false, canUnhide: false };
      const selectedIds = Array.from(selectedItems);
      return {
          canPin: selectedIds.some(id => !pinnedIds.includes(id)),
          canUnpin: selectedIds.some(id => pinnedIds.includes(id)),
          canHide: selectedIds.some(id => !hiddenIds.includes(id)),
          canUnhide: selectedIds.some(id => hiddenIds.includes(id))
      };
  }, [selectedItems, pinnedIds, hiddenIds]);

  const availableModels = useMemo(() => {
     const models = new Set<string>();
     conversations.forEach(c => { if (c.models) c.models.forEach((m: any) => models.add(m)); });
     return Array.from(models).sort();
  }, [conversations]);

  const { pinnedList, recentList } = useMemo(() => {
    let all: (Conversation & { originalIndex: number })[] = [];
    if (searchTerm.trim() && searchResults) all = searchResults.map(idx => ({ ...conversations[idx], originalIndex: idx }));
    else if (!searchTerm.trim()) all = conversations.map((c, i) => ({ ...c, originalIndex: i }));

    if (activeCollectionId && !searchTerm) {
        const collection = collections.find(c => c.id === activeCollectionId);
        if (collection) all = all.filter(c => collection.chatIds.includes(c.id));
    }

    if (dateFrom || dateTo || minMsg || maxMsg || filterModel !== 'all' || filterTools || filterImages || filterVoice || filterDictation || (searchTerm.trim() && excludeArchivedSearch)) {
        const fromTs = dateFrom ? new Date(dateFrom).getTime() / 1000 : 0;
        const toTs = dateTo ? new Date(dateTo).getTime() / 1000 + 86400 : Infinity;
        all = all.filter(conv => {
            if (searchTerm.trim() && excludeArchivedSearch && hiddenIds.includes(conv.id)) return false;
            if (conv.create_time < fromTs || conv.create_time > toTs) return false;
            if (filterModel !== 'all' && (!conv.models || !conv.models.includes(filterModel))) return false;
            if (filterTools && !conv.features?.hasTools) return false;
            if (filterImages && !conv.features?.hasImages) return false;
            if (filterVoice && !conv.features?.hasVoice) return false;
            if (filterDictation && !conv.features?.hasDictation) return false;
            return true;
        });
    }

    if (searchTerm.trim().length > 0) return { pinnedList: [], recentList: all };
    const active = all.filter(c => !hiddenIds.includes(c.id));
    const pinned: (Conversation & { originalIndex: number })[] = [];
    const recents: (Conversation & { originalIndex: number })[] = [];
    active.forEach(item => { if (pinnedIds.includes(item.id)) pinned.push(item); else recents.push(item); });
    return { pinnedList: pinned, recentList: recents };
  }, [conversations, searchTerm, searchResults, pinnedIds, hiddenIds, dateFrom, dateTo, minMsg, maxMsg, filterModel, filterTools, filterImages, filterVoice, filterDictation, excludeArchivedSearch, activeCollectionId, collections]);

  // Ensure active conversation is visible after a reload or selection change
  useEffect(() => {
      if (activeConversationId) {
          const index = recentList.findIndex(c => String(c.originalIndex) === activeConversationId);
          if (index !== -1 && index >= visibleCount) {
              setVisibleCount(index + 20);
          }
      }
  }, [activeConversationId, recentList, visibleCount]);

  useEffect(() => {
      const wasSearching = prevSearchTermRef.current.length > 0;
      prevSearchTermRef.current = searchTerm;
      if ((wasSearching && searchTerm.length === 0) && activeConversationId) {
          const index = recentList.findIndex((c) => String(c.originalIndex) === activeConversationId);
          if (index !== -1) {
              if (index >= visibleCount) setVisibleCount(index + 20);
              setTimeout(() => { const el = document.getElementById(`item-${activeConversationId}`); if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' }); }, 50);
          }
      }
  }, [searchTerm, activeConversationId, recentList, visibleCount]);

  const isCurrentlySearching = (isSearching || isInputProcessing) && searchTerm.length > 0;
  const isSearchActive = searchTerm.trim().length > 0;
  const isFilterActive = dateFrom || dateTo || minMsg || maxMsg || filterModel !== 'all' || filterTools || filterImages || filterVoice || filterDictation;

  const onSelectItem = useCallback((id: string) => {
      setActiveConversationId(id); 
      setView('chat');
      if (window.innerWidth < 768) setMobileMenuOpen(false);
  }, [setActiveConversationId, setMobileMenuOpen, setView]);

  const onOpenSplit = useCallback((id: string) => { 
      setSecondaryConversationId(id);
      setView('chat');
  }, [setSecondaryConversationId, setView]);

  const handleDeleteConfirm = () => {
      if (itemToDelete?.type === 'profile') onDeleteProfile(itemToDelete.id);
      else if (itemToDelete?.type === 'collection') deleteCollection(itemToDelete.id);
      setItemToDelete(null);
  };

  return (
    <>
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={itemToDelete?.type === 'profile' ? 'Delete Profile?' : 'Delete Collection?'}
        message={<span className="text-gray-600 dark:text-gray-400">Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-200">"{itemToDelete?.name}"</span>? This action cannot be undone.</span>}
        confirmText="Delete"
        type="danger"
      />

      <CreateCollectionModal isOpen={showCollectionModal} onClose={() => setShowCollectionModal(false)} onConfirm={createCollection} />

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      <aside className={`fixed md:relative z-50 h-full flex flex-col bg-[#F9F9F9] dark:bg-[#1A1917] border-r border-gray-200 dark:border-[#2C2B28] transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:w-72 md:translate-x-0' : 'md:w-0 md:-translate-x-full md:overflow-hidden'} ${isMobileMenuOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:translate-x-0'}`}>
        
        {/* Header - Matching SettingsView */}
        <div className="px-6 py-5 flex items-center justify-between shrink-0">
            {isSelectionMode ? (
                 <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-1 duration-200">
                     <span className="font-semibold text-sm text-claude-accent">{selectedItems.size} Selected</span>
                     <button onClick={handleExitSelectionMode} className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B]">Done</button>
                 </div>
            ) : (
                <div className="flex items-center justify-between w-full">
                    <h2 className="text-xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD]">Archive</h2>
                    <div className="flex items-center gap-1">
                        <button onClick={onAddProfile} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors" title="Import JSON"><Plus className="w-5 h-5" /></button>
                        <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>
            )}
        </div>

        {/* Search & Filter */}
        {!isSelectionMode && (
            <div className="px-4 md:px-3 pb-4 shrink-0 flex gap-2">
                <div className="relative group flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-claude-accent transition-colors" />
                    <input type="text" placeholder="Search..." className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] focus:border-claude-accent/50 focus:ring-1 focus:ring-claude-accent/10 rounded-lg text-sm transition-all outline-none placeholder-gray-400 dark:text-gray-200" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {isCurrentlySearching ? <div className="absolute right-2 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 text-claude-accent animate-spin" /></div> : searchTerm ? <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-4 h-4" /></button> : null}
                </div>
                <div className="relative">
                    <button ref={filterBtnRef} onClick={() => setShowFilters(!showFilters)} className={`p-2 h-full rounded-lg border transition-colors flex items-center justify-center ${isFilterActive ? 'bg-claude-accent/10 border-claude-accent/30 text-claude-accent' : 'bg-white dark:bg-[#252422] border-gray-200 dark:border-[#3F3E3B] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Filters"><Filter className="w-4 h-4" /></button>
                    {showFilters && <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setShowFilters(false)} />
                        <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#1A1917] rounded-xl shadow-xl border border-gray-100 dark:border-[#2C2B28] p-3 z-[70] animate-in fade-in zoom-in-95 duration-100 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
                            <div><div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider"><Calendar className="w-2.5 h-2.5" /><span>Time Period</span></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5"><label className="text-[9px] text-gray-400 ml-1">From</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-[#F9F9F9] dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-claude-accent" /></div>
                                <div className="space-y-0.5"><label className="text-[9px] text-gray-400 ml-1">To</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-[#F9F9F9] dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-claude-accent" /></div>
                            </div></div>
                            <div><div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider"><Zap className="w-2.5 h-2.5" /><span>Model</span></div>
                            <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="w-full text-xs p-1.5 rounded-lg bg-[#F9F9F9] dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-claude-accent appearance-none"><option value="all">All Models</option>{availableModels.map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
                            <div><div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider"><Sparkles className="w-2.5 h-2.5" /><span>Features</span></div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[ { label: 'Tools', icon: Terminal, state: filterTools, set: setFilterTools }, { label: 'Images', icon: ImageIcon, state: filterImages, set: setFilterImages }, { label: 'Voice', icon: Mic, state: filterVoice, set: setFilterVoice }, { label: 'Dictation', icon: Keyboard, state: filterDictation, set: setFilterDictation } ].map((f) => (
                                    <button key={f.label} onClick={() => f.set(!f.state)} className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200 flex items-center gap-1.5 ${f.state ? 'bg-claude-accent text-white border-claude-accent' : 'bg-white dark:bg-[#252422] border-gray-200 dark:border-[#3F3E3B] text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}><f.icon className="w-3 h-3" />{f.label}</button>
                                ))}
                            </div></div>
                            {isFilterActive && <button onClick={() => { setDateFrom(''); setDateTo(''); setMinMsg(''); setMaxMsg(''); setFilterModel('all'); setFilterTools(false); setFilterImages(false); setFilterVoice(false); setFilterDictation(false); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] rounded-lg transition-colors font-bold uppercase tracking-wider border border-transparent hover:border-gray-200"><RotateCcw className="w-2.5 h-2.5" />Reset Filters</button>}
                        </div>
                    </>}
                </div>
            </div>
        )}

        {/* Collections */}
        {!isSearchActive && !isSelectionMode && (
            <div className="px-4 md:px-3 mb-2 shrink-0">
                <button 
                    onClick={() => setIsCollectionsExpanded(!isCollectionsExpanded)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-white/5 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <span>Collections</span>
                    </div>
                    <div className="flex items-center">
                        <Plus 
                            onClick={(e) => { e.stopPropagation(); setShowCollectionModal(true); }} 
                            className="w-4 h-4 opacity-0 group-hover:opacity-100 hover:text-claude-accent transition-all cursor-pointer mr-1" 
                        />
                        {isCollectionsExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                    </div>
                </button>

                {isCollectionsExpanded && (
                    <div className="mt-1 space-y-0.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                        {collections.map(col => (
                            <div key={col.id} className="group relative">
                                <button
                                    onClick={() => setActiveCollectionId(activeCollectionId === col.id ? null : col.id)}
                                    className={`
                                        w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-3 text-sm font-medium ml-2
                                        ${activeCollectionId === col.id 
                                            ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100' 
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        {activeCollectionId === col.id ? <FolderOpen className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />}
                                    </div>
                                    <span className="truncate flex-1">{col.name}</span>
                                    <span className="text-[10px] opacity-60 tabular-nums">{col.chatIds.length}</span>
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'collection', id: col.id, name: col.name }); }}
                                        className="hidden group-hover:flex absolute right-1 items-center justify-center p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </div>
                                </button>
                            </div>
                        ))}
                        {collections.length === 0 && (
                            <div className="px-5 py-2 text-xs italic text-gray-400">No collections.</div>
                        )}
                    </div>
                )}
            </div>
        )}

        <SidebarListContent 
            pinnedList={pinnedList}
            recentList={recentList}
            activeConversationId={activeConversationId}
            secondaryConversationId={secondaryConversationId}
            hiddenIds={hiddenIds}
            searchTerm={searchTerm}
            isSelectionMode={isSelectionMode}
            selectedItems={selectedItems}
            isCurrentlySearching={isCurrentlySearching}
            isLoading={isLoading}
            visibleCount={visibleCount}
            onSelect={onSelectItem}
            onTogglePin={togglePin}
            onToggleHidden={toggleHidden}
            onOpenSplit={onOpenSplit}
            handleToggleSelection={handleToggleSelection}
            setIsSelectionMode={setIsSelectionMode}
            setVisibleCount={setVisibleCount}
            isSearchActive={isSearchActive}
        />

        {/* Profile / Bottom Menu */}
        <div className="p-3 md:p-3 border-t border-gray-200 dark:border-[#2C2B28] shrink-0 relative bg-[#F9F9F9] dark:bg-[#1A1917]" ref={profileMenuRef}>
            {isSelectionMode ? (
                <div className="flex items-center gap-2 p-1">
                    {selectionContext.canPin && <button onClick={() => handleMassAction('pin')} className="flex-1 p-2 rounded-lg hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] text-gray-600 dark:text-gray-300 transition-colors" title="Pin Selected"><Star className="w-4 h-4 mx-auto" /></button>}
                    {selectionContext.canUnpin && <button onClick={() => handleMassAction('unpin')} className="flex-1 p-2 rounded-lg hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] text-gray-600 dark:text-gray-300 transition-colors" title="Unpin Selected"><div className="relative inline-block"><Star className="w-4 h-4 mx-auto" /><div className="absolute top-0 right-0 w-full h-full border-r-2 border-red-500 transform rotate-45 origin-center"></div></div></button>}
                    {selectionContext.canHide && <button onClick={() => handleMassAction('hide')} className="flex-1 p-2 rounded-lg hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] text-gray-600 dark:text-gray-300 transition-colors" title="Hide Selected"><EyeOff className="w-4 h-4 mx-auto" /></button>}
                    {selectionContext.canUnhide && <button onClick={() => handleMassAction('unhide')} className="flex-1 p-2 rounded-lg hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] text-gray-600 dark:text-gray-300 transition-colors" title="Unhide Selected"><Eye className="w-4 h-4 mx-auto" /></button>}
                </div>
            ) : (
                <>
                    <button onClick={() => setShowProfileMenu(!showProfileMenu)} className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors hover:bg-white dark:hover:bg-[#252422] ${showProfileMenu ? 'bg-white dark:bg-[#252422]' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                {activeProfile?.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{activeProfile?.name || 'Archive'}</span>
                        </div>
                        <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showProfileMenu && <>
                        <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#1A1917] rounded-xl border border-gray-200 dark:border-[#2C2B28] p-1.5 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150 shadow-2xl">
                            <div className="mb-1 max-h-40 overflow-y-auto custom-scrollbar">
                                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch Profile</div>
                                {profiles.map(profile => (
                                    <div key={profile.id} onClick={() => { onSwitchProfile(profile.id); setShowProfileMenu(false); }} className={`group flex items-center justify-between px-2 py-2 rounded-lg text-sm cursor-pointer transition-colors ${activeProfileId === profile.id ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-[#252422] hover:text-gray-900'}`}>
                                        {editingProfileId === profile.id ? <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-sm" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(e as any); }} /><button onClick={handleSaveRename} className="p-1 hover:bg-green-100 text-green-600 rounded"><Check className="w-3.5 h-3.5" /></button></div> : <><span className="truncate">{profile.name}</span>{activeProfileId === profile.id && <Check className="w-3.5 h-3.5 text-gray-400" />}<div className="hidden group-hover:flex items-center gap-1"><button onClick={(e) => handleStartRename(e, profile)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-400 hover:text-gray-600"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'profile', id: profile.id, name: profile.name }); }} className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div></>}
                                    </div>
                                ))}
                                <button onClick={() => { onAddProfile(); setShowProfileMenu(false); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-[#F0EEE6] dark:hover:bg-[#252422] transition-colors mt-1"><FileUp className="w-4 h-4" /><span>Import new JSON...</span></button>
                            </div>
                            <div className="h-px bg-gray-100 dark:bg-[#2C2B28] my-1" />
                            <button onClick={() => { setView('insights'); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] transition-colors"><Sparkles className="w-4 h-4 text-gray-400" /><span>Insights</span></button>
                            <button onClick={() => { setView('archive'); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] transition-colors"><Archive className="w-4 h-4 text-gray-400" /><span>Archive</span></button>
                            <button onClick={() => { setView('settings'); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] transition-colors"><Settings className="w-4 h-4 text-gray-400" /><span>Settings</span></button>
                        </div>
                    </>}
                </>
            )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
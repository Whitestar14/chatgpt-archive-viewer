import { create } from 'zustand';
import type { ChatWidth } from './components/SettingsView';
import type { ProfileMeta } from './utils/db';
import type { Conversation } from './types';

export type View = 'chat' | 'settings' | 'archive' | 'insights' | 'import';

export interface Collection {
  id: string;
  name: string;
  chatIds: string[];
  createdAt: number;
}

interface AppState {
  // Profiles
  profiles: ProfileMeta[];
  activeProfileId: string | null;
  
  // Conversations Data
  conversations: Conversation[]; 
  activeConversationId: string | null;
  secondaryConversationId: string | null; // For split view
  
  // UI State
  currentView: View;
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  isProfileLoading: boolean;
  isChatReady: boolean;
  showInsights: boolean;
  
  // User Preferences
  theme: 'light' | 'dark';
  fontSize: 'small' | 'normal' | 'large' | 'xl';
  fontFamily: string;
  chatWidth: ChatWidth;
  pinnedIds: string[];
  hiddenIds: string[];
  excludeArchivedSearch: boolean;
  
  // Collections
  collections: Collection[];
  activeCollectionId: string | null;

  // Actions
  setProfiles: (profiles: ProfileMeta[]) => void;
  setActiveProfileId: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setSecondaryConversationId: (id: string | null) => void;
  
  setView: (view: View) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setShowInsights: (show: boolean) => void;
  
  setIsProfileLoading: (loading: boolean) => void;
  setIsChatReady: (ready: boolean) => void;
  
  setTheme: (theme: 'light' | 'dark') => void;
  setFontSize: (size: 'small' | 'normal' | 'large' | 'xl') => void;
  setFontFamily: (font: string) => void;
  setChatWidth: (width: ChatWidth) => void;
  setExcludeArchivedSearch: (exclude: boolean) => void;
  
  togglePin: (id: string) => void;
  toggleHidden: (id: string) => void;
  
  // Collection Actions
  createCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addToCollection: (collectionId: string, chatIds: string[]) => void;
  removeFromCollection: (collectionId: string, chatIds: string[]) => void;
  setActiveCollectionId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial Data
  profiles: [],
  activeProfileId: (typeof window !== 'undefined' && localStorage.getItem('archive_active_profile_id')) || null,
  conversations: [],
  activeConversationId: (typeof window !== 'undefined' && localStorage.getItem('archive_active_conversation_id')) || null,
  secondaryConversationId: null,
  
  // Initial UI
  currentView: (typeof window !== 'undefined' && localStorage.getItem('archive_current_view') as View) || 'chat',
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  isProfileLoading: typeof window !== 'undefined' ? localStorage.getItem('archive_has_profiles') === 'true' : false,
  isChatReady: false,
  showInsights: false,
  
  // Initial Prefs
  theme: (typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark') ? 'dark' : 'light',
  fontSize: (typeof window !== 'undefined' && localStorage.getItem('archive_font_size') as any) || 'small',
  fontFamily: (typeof window !== 'undefined' && localStorage.getItem('archive_font_family') as any) || 'Source Serif 4',
  chatWidth: (typeof window !== 'undefined' && localStorage.getItem('archive_chat_width') as any) || 'full',
  pinnedIds: (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('pinned_chats') || '[]')) || [],
  hiddenIds: (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('hidden_chats') || '[]')) || [],
  excludeArchivedSearch: (typeof window !== 'undefined' && localStorage.getItem('exclude_archived_search') === 'true') || false,
  
  // Initial Collections
  collections: (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('archive_collections') || '[]')) || [],
  activeCollectionId: null,

  // Setters
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfileId: (id) => {
      if (id) localStorage.setItem('archive_active_profile_id', id);
      else localStorage.removeItem('archive_active_profile_id');
      set({ activeProfileId: id });
  },
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => {
      if (id) localStorage.setItem('archive_active_conversation_id', id);
      else localStorage.removeItem('archive_active_conversation_id');
      set({ activeConversationId: id });
  },
  setSecondaryConversationId: (id) => set({ secondaryConversationId: id }),
  
  setView: (view) => {
      localStorage.setItem('archive_current_view', view);
      set({ currentView: view, isMobileMenuOpen: false });
  },
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  setShowInsights: (show) => set({ showInsights: show }),
  
  setIsProfileLoading: (loading) => set({ isProfileLoading: loading }),
  setIsChatReady: (ready) => set({ isChatReady: ready }),
  
  setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      set({ theme });
  },
  
  setFontSize: (size) => {
      localStorage.setItem('archive_font_size', size);
      set({ fontSize: size });
  },

  setFontFamily: (font) => {
      localStorage.setItem('archive_font_family', font);
      set({ fontFamily: font });
  },
  
  setChatWidth: (width) => {
      localStorage.setItem('archive_chat_width', width);
      set({ chatWidth: width });
  },

  setExcludeArchivedSearch: (exclude) => {
      localStorage.setItem('exclude_archived_search', String(exclude));
      set({ excludeArchivedSearch: exclude });
  },
  
  togglePin: (id) => set((state) => {
      const newPinned = state.pinnedIds.includes(id) 
          ? state.pinnedIds.filter(p => p !== id) 
          : [...state.pinnedIds, id];
      localStorage.setItem('pinned_chats', JSON.stringify(newPinned));
      return { pinnedIds: newPinned };
  }),
  
  toggleHidden: (id) => set((state) => {
      const newHidden = state.hiddenIds.includes(id)
          ? state.hiddenIds.filter(h => h !== id)
          : [...state.hiddenIds, id];
      localStorage.setItem('hidden_chats', JSON.stringify(newHidden));
      return { hiddenIds: newHidden };
  }),

  // Collection Logic
  createCollection: (name) => set((state) => {
      const newCol: Collection = {
          id: crypto.randomUUID(),
          name,
          chatIds: [],
          createdAt: Date.now()
      };
      const updated = [...state.collections, newCol];
      localStorage.setItem('archive_collections', JSON.stringify(updated));
      return { collections: updated };
  }),

  deleteCollection: (id) => set((state) => {
      const updated = state.collections.filter(c => c.id !== id);
      localStorage.setItem('archive_collections', JSON.stringify(updated));
      return { collections: updated, activeCollectionId: state.activeCollectionId === id ? null : state.activeCollectionId };
  }),

  renameCollection: (id, name) => set((state) => {
      const updated = state.collections.map(c => c.id === id ? { ...c, name } : c);
      localStorage.setItem('archive_collections', JSON.stringify(updated));
      return { collections: updated };
  }),

  addToCollection: (collectionId, chatIds) => set((state) => {
      const updated = state.collections.map(c => {
          if (c.id === collectionId) {
              const newIds = new Set([...c.chatIds, ...chatIds]);
              return { ...c, chatIds: Array.from(newIds) };
          }
          return c;
      });
      localStorage.setItem('archive_collections', JSON.stringify(updated));
      return { collections: updated };
  }),

  removeFromCollection: (collectionId, chatIds) => set((state) => {
      const updated = state.collections.map(c => {
          if (c.id === collectionId) {
              return { ...c, chatIds: c.chatIds.filter(id => !chatIds.includes(id)) };
          }
          return c;
      });
      localStorage.setItem('archive_collections', JSON.stringify(updated));
      return { collections: updated };
  }),

  setActiveCollectionId: (id) => set({ activeCollectionId: id })
}));
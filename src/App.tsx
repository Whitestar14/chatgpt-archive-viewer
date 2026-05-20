import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import ImportView from './components/ImportView';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import ArchiveView from './components/ArchiveView';
import InsightsView from './components/InsightsView';
import { fileWorkerScript } from './utils/fileWorker';
import { addProfile, getProfileList, getProfileData, deleteProfile, renameProfile } from './utils/db';
import { Loader2 } from 'lucide-react';
import { useStore } from './store';

const App: React.FC = () => {
  const {
      profiles,
      activeProfileId,
      conversations,
      activeConversationId,
      secondaryConversationId,
      isProfileLoading,
      isChatReady,
      currentView,
      setProfiles,
      setActiveProfileId,
      setConversations,
      setActiveConversationId,
      setSecondaryConversationId,
      setIsProfileLoading,
      setIsChatReady,
      setView,
      theme,
      fontFamily
  } = useStore();

  const [searchResults, setSearchResults] = useState<number[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchId, setSearchId] = useState(0); 
  
  // Insights State
  const [insightsData, setInsightsData] = useState<any | null>(null);
  const [isAnalyzingInsights, setIsAnalyzingInsights] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    const code = fileWorkerScript.toString();
    const blob = new Blob([`(${code})()`], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    // Initial DB Load
    loadProfiles();

    return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // Handle Worker Messages (Search, Import, Insights)
  useEffect(() => {
      if (!workerRef.current) return;
      const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'SEARCH_RESULTS') {
              setSearchResults(e.data.results);
              setIsSearching(false);
              setSearchId(prev => prev + 1);
          }
          if (e.data.type === 'INSIGHTS_RESULT') {
              setInsightsData(e.data.stats);
              setIsAnalyzingInsights(false);
          }
          if (e.data.type === 'INSIGHTS_ERROR') {
              console.error(e.data.error);
              setIsAnalyzingInsights(false);
              alert("Failed to generate insights.");
          }
      };
      workerRef.current.addEventListener('message', handleMessage);
      return () => workerRef.current?.removeEventListener('message', handleMessage);
  }, []);

  // Theme Sync
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Dynamic Font Loading
  useEffect(() => {
      if (fontFamily === 'Inter' || fontFamily === 'Charter') {
          return;
      }

      // Check if font already exists
      if (!document.getElementById(`font-${fontFamily}`)) {
          const link = document.createElement('link');
          link.id = `font-${fontFamily}`;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
          document.head.appendChild(link);
      }
  }, [fontFamily]);

  const loadProfiles = async () => {
      setIsProfileLoading(true);
      try {
          const list = await getProfileList();
          setProfiles(list);
          
          if (list.length > 0) {
              const storedProfileId = localStorage.getItem('archive_active_profile_id');
              const targetProfile = list.find(p => p.id === storedProfileId) || list[0];
              
              setActiveProfileId(targetProfile.id);
              await loadProfileData(targetProfile.id);
          } else {
              setIsProfileLoading(false);
              setIsChatReady(true);
              setView('import'); // Force import view if no profiles
          }
      } catch (e) {
          console.error("Failed to load profiles", e);
          setIsProfileLoading(false);
          setIsChatReady(true);
      }
  };

  const loadProfileData = async (id: string) => {
      setIsProfileLoading(true);
      setIsChatReady(false);
      try {
          const data = await getProfileData(id);
          setConversations(data);
          
          const storedConvId = localStorage.getItem('archive_active_conversation_id');
          if (storedConvId && parseInt(storedConvId) < data.length) {
              setActiveConversationId(storedConvId);
          } else {
              setActiveConversationId(data.length > 0 ? "0" : null);
          }
          
          setSecondaryConversationId(null);
          
          if (workerRef.current) {
              workerRef.current.postMessage({ type: 'INDEX', conversations: data });
          }
      } catch (e) {
          console.error("Error loading profile data", e);
          setIsChatReady(true); 
      } finally {
          setIsProfileLoading(false);
      }
  };

  const handleFileSelect = (file: File) => {
    setIsProcessing(true);
    if (workerRef.current) {
        const handler = async (e: MessageEvent) => {
            if (e.data.type === 'SUCCESS') {
                const { conversations: sorted, profileType } = e.data;
                const name = `${profileType || 'ChatGPT'} Export ${new Date().toLocaleDateString()}`;
                const newProfile = await addProfile(name, sorted);
                
                setProfiles([newProfile, ...profiles]);
                setActiveProfileId(newProfile.id);
                setConversations(sorted);
                setActiveConversationId("0");
                
                setView('chat');
                setIsProcessing(false);
                setIsChatReady(false);
                
                workerRef.current?.removeEventListener('message', handler);
            } else if (e.data.type === 'ERROR') {
                console.error("Worker Error:", e.data.error);
                alert("Failed to process file.");
                setIsProcessing(false);
                workerRef.current?.removeEventListener('message', handler);
            }
        };
        workerRef.current.addEventListener('message', handler);
        workerRef.current.postMessage({ file });
    }
  };

  const handleSearch = useCallback((term: string) => {
      setIsSearching(true);
      if (workerRef.current) {
          workerRef.current.postMessage({ type: 'SEARCH', query: term });
      }
  }, []);

  const handleAnalyzeInsights = useCallback(() => {
      setIsAnalyzingInsights(true);
      if (workerRef.current) {
          workerRef.current.postMessage({ type: 'GENERATE_INSIGHTS' });
      }
  }, []);

  const handleSwitchProfile = async (id: string) => {
      if (id === activeProfileId) return;
      setActiveProfileId(id);
      await loadProfileData(id);
      setView('chat');
  };

  const handleDeleteProfile = async (id: string) => {
      await deleteProfile(id);
      const newProfiles = profiles.filter(p => p.id !== id);
      setProfiles(newProfiles);
      
      if (activeProfileId === id) {
          if (newProfiles.length > 0) {
              handleSwitchProfile(newProfiles[0].id);
          } else {
              setConversations([]);
              setActiveProfileId(null);
              setIsChatReady(true);
              setView('import');
          }
      }
  };

  const handleRenameProfile = async (id: string, newName: string) => {
      await renameProfile(id, newName);
      setProfiles(profiles.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // Close Logic for Split Views
  const closePrimary = () => {
      if (secondaryConversationId) {
          setActiveConversationId(secondaryConversationId);
          setSecondaryConversationId(null);
      } else {
          setActiveConversationId(null);
      }
  };

  const closeSecondary = () => {
      setSecondaryConversationId(null);
  };

  const currentConversation = activeConversationId !== null ? conversations[parseInt(activeConversationId)] : null;
  const secondaryConversation = secondaryConversationId !== null ? conversations[parseInt(secondaryConversationId)] : null;

  // Show loading overlay
  const showLoadingOverlay = (isProfileLoading || (!isChatReady && currentView === 'chat')) && currentView !== 'import';

  const renderMainContent = () => {
      switch (currentView) {
          case 'settings':
              return <SettingsView />;
          case 'archive':
              return <ArchiveView />;
          case 'insights':
              return (
                  <InsightsView 
                      onAnalyze={handleAnalyzeInsights}
                      stats={insightsData}
                      isAnalyzing={isAnalyzingInsights}
                  />
              );
          case 'import':
              return (
                  <ImportView 
                      onFileSelect={handleFileSelect}
                      isProcessing={isProcessing}
                      isInitialSetup={profiles.length === 0}
                  />
              );
          case 'chat':
          default:
              return (
                  <div className={`flex flex-col md:flex-row h-full w-full ${secondaryConversation ? 'divide-y md:divide-y-0 md:divide-x divide-claude-border dark:divide-claude-dark-border' : ''}`}>
                      {/* Primary Chat */}
                      <div className={`
                          flex flex-col min-w-0 bg-claude-bg dark:bg-claude-dark-bg transition-all duration-300
                          ${secondaryConversation ? 'h-1/2 md:h-full w-full md:w-1/2' : 'h-full w-full'}
                      `}>
                          {currentConversation ? (
                              <ChatView 
                                  conversation={currentConversation}
                                  onClose={secondaryConversation ? closePrimary : undefined}
                              />
                          ) : (
                              <div className="flex-1 flex items-center justify-center text-gray-400">
                                  <div className="text-center px-4">
                                      <h3 className="text-lg font-serif font-bold text-gray-600 dark:text-gray-300 mb-2">Welcome to Archive</h3>
                                      <p className="text-sm">Select a conversation to begin reading.</p>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Secondary Chat (Split View) */}
                      {secondaryConversation && (
                          <div className="flex flex-col min-w-0 bg-white dark:bg-[#1A1917] h-1/2 md:h-full w-full md:w-1/2 shadow-inner md:shadow-none z-10">
                              <ChatView 
                                  conversation={secondaryConversation}
                                  isSecondary={true}
                                  onClose={closeSecondary}
                              />
                          </div>
                      )}
                  </div>
              );
      }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-claude-bg dark:bg-claude-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* Loading Overlay */}
      {showLoadingOverlay && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-claude-bg dark:bg-claude-dark-bg">
              <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                  <Loader2 className="w-8 h-8 text-claude-accent animate-spin" />
                  <span className="text-sm font-medium text-gray-500">Loading Profile...</span>
              </div>
          </div>
      )}

      {/* Main Layout */}
      <div className="absolute inset-0 z-0 flex h-full">
          {/* Only show Sidebar if in Chat view */}
          {currentView === 'chat' && (
              <Sidebar 
                  onSearch={handleSearch}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  searchId={searchId}
                  onAddProfile={() => setView('import')}
                  onDeleteProfile={handleDeleteProfile}
                  onRenameProfile={handleRenameProfile}
                  onSwitchProfile={handleSwitchProfile}
              />
          )}
          
          <main className="flex-1 flex min-w-0 relative">
              {renderMainContent()}
          </main>
      </div>
    </div>
  );
};

export default App;
import React, { useState } from 'react';
import { X, Download, Loader2, FileJson, ChevronRight, Archive, Moon, Sun, Type, Layout, Shield, ChevronLeft, Search } from 'lucide-react';
import { useStore } from '../store';
import JSZip from 'jszip';
import { conversationToMarkdown } from '../utils/parser';

export type ChatWidth = 'narrow' | 'medium' | 'wide' | 'full';

const SettingsView: React.FC = () => {
    const { 
        fontSize, setFontSize, 
        fontFamily, setFontFamily,
        chatWidth, setChatWidth, 
        conversations, profiles, activeProfileId, 
        excludeArchivedSearch, setExcludeArchivedSearch,
        theme, setTheme,
        setView
    } = useStore(state => ({
        fontSize: state.fontSize,
        setFontSize: state.setFontSize,
        fontFamily: state.fontFamily,
        setFontFamily: state.setFontFamily,
        chatWidth: state.chatWidth,
        setChatWidth: state.setChatWidth,
        conversations: state.conversations,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        excludeArchivedSearch: state.excludeArchivedSearch,
        setExcludeArchivedSearch: state.setExcludeArchivedSearch,
        theme: state.theme,
        setTheme: state.setTheme,
        setView: state.setView
    }));

    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'data'>('general');

    const handleExportMarkdown = async () => {
        if (conversations.length === 0) return;
        setIsExporting(true);

        try {
            const zip = new JSZip();
            const activeProfile = profiles.find(p => p.id === activeProfileId);
            const folderName = activeProfile ? `archive-${activeProfile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : 'archive-export';
            const folder = zip.folder(folderName);

            if (folder) {
                conversations.forEach((conv, index) => {
                    const md = conversationToMarkdown(conv);
                    let filename = (conv.title || `untitled-${index}`).replace(/[^a-z0-9]/gi, '_').substring(0, 50);
                    folder.file(`${filename}-${index}.md`, md);
                });

                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${folderName}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export conversations.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportJson = () => {
        if (conversations.length === 0) return;
        const activeProfile = profiles.find(p => p.id === activeProfileId);
        const fileName = activeProfile ? `archive-${activeProfile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json` : 'conversations.json';
        
        const jsonStr = JSON.stringify(conversations, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const fonts = [
        { name: 'Inter', type: 'sans' },
        { name: 'Roboto', type: 'sans' },
        { name: 'Open Sans', type: 'sans' },
        { name: 'Lato', type: 'sans' },
        { name: 'Montserrat', type: 'sans' },
        { name: 'Source Serif 4', type: 'serif' },
        { name: 'Merriweather', type: 'serif' },
        { name: 'Roboto Mono', type: 'mono' },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-[#F9F9F9] dark:bg-[#1A1917] overflow-hidden">
            {/* Navigation Sidebar */}
            <div className="w-full md:w-72 shrink-0 bg-transparent md:border-r border-b md:border-b-0 border-gray-200 dark:border-[#2C2B28] flex flex-col">
                <div className="px-6 py-5 flex items-center justify-between md:block">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setView('chat')} className="md:hidden p-1 -ml-1 text-gray-500">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD]">Settings</h2>
                    </div>
                    <button 
                        onClick={() => setView('chat')}
                        className="hidden md:flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mt-4 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Chat
                    </button>
                </div>
                
                <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-4 md:px-3 pb-2 md:pb-0 space-x-2 md:space-x-0 md:space-y-1">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`
                            whitespace-nowrap flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'general' 
                                ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-white/5'
                            }
                        `}
                    >
                        <Layout className="w-4 h-4" />
                        Appearance
                    </button>
                    <button 
                        onClick={() => setActiveTab('data')}
                        className={`
                            whitespace-nowrap flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === 'data' 
                                ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-white/5'
                            }
                        `}
                    >
                        <Shield className="w-4 h-4" />
                        Data & Search
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto p-6 md:p-12 space-y-12">
                    
                    {activeTab === 'general' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Theme Section */}
                            <section>
                                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-[#2C2B28]">Appearance</h3>
                                
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Mode</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => setTheme('light')}
                                                className={`
                                                    p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                                    ${theme === 'light' ? 'border-[#EAE7DF] bg-[#F9F9F9]' : 'border-gray-200 dark:border-[#3F3E3B] bg-gray-50 dark:bg-[#252422]'}
                                                `}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-claude-accent' : 'text-gray-400'}`} />
                                                    <span className="text-sm font-medium">Light</span>
                                                </div>
                                                <div className="h-12 w-full bg-[#F9F9F9] rounded-lg border border-[#EAE7DF]" />
                                            </button>
                                            <button 
                                                onClick={() => setTheme('dark')}
                                                className={`
                                                    p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                                    ${theme === 'dark' ? 'border-[#2F2E2B] bg-[#1A1917]' : 'border-gray-200 dark:border-[#3F3E3B] bg-white dark:bg-[#252422]'}
                                                `}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-claude-accent' : 'text-gray-400'}`} />
                                                    <span className="text-sm font-medium">Dark</span>
                                                </div>
                                                <div className="h-12 w-full bg-[#21201C] rounded-lg border border-[#2C2B28]" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Family</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {fonts.map((font) => (
                                                <button
                                                    key={font.name}
                                                    onClick={() => setFontFamily(font.name)}
                                                    className={`
                                                        px-4 py-3 rounded-lg text-sm text-left transition-all border border-transparent
                                                        ${fontFamily === font.name 
                                                            ? 'bg-[#EAE7DF] dark:bg-[#2F2E2B] text-gray-900 dark:text-gray-100 font-medium' 
                                                            : 'bg-[#F9F9F9] dark:bg-[#252422] text-gray-600 dark:text-gray-400 hover:bg-[#F0EEE6] dark:hover:bg-[#2A2926]'
                                                        }
                                                    `}
                                                >
                                                    <span className="block font-medium mb-0.5">{font.name}</span>
                                                    <span className="text-xs opacity-60 capitalize">{font.type}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Text Size</label>
                                        <div className="flex bg-[#F0EEE6] dark:bg-[#252422] p-1 rounded-xl">
                                            {(['small', 'normal', 'large', 'xl'] as const).map((size) => (
                                                <button
                                                    key={size}
                                                    onClick={() => setFontSize(size)}
                                                    className={`
                                                        flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
                                                        ${fontSize === size 
                                                            ? 'bg-white dark:bg-[#3F3E3B] text-gray-900 dark:text-gray-100 shadow-sm' 
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                                        }
                                                    `}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat Width</label>
                                        <div className="flex bg-[#F0EEE6] dark:bg-[#252422] p-1 rounded-xl">
                                            {(['narrow', 'medium', 'wide', 'full'] as const).map((width) => (
                                                <button
                                                    key={width}
                                                    onClick={() => setChatWidth(width)}
                                                    className={`
                                                        flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
                                                        ${chatWidth === width 
                                                            ? 'bg-white dark:bg-[#3F3E3B] text-gray-900 dark:text-gray-100 shadow-sm' 
                                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                                        }
                                                    `}
                                                >
                                                    {width}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-[#2C2B28]">Privacy & Data</h3>
                                
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[#F0EEE6] dark:bg-[#2F2E2B] rounded-lg">
                                                <Search className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Exclude Archived Chats</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">Hidden conversations won't appear in global search results</div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setExcludeArchivedSearch(!excludeArchivedSearch)}
                                            className={`
                                                w-11 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-claude-accent
                                                ${excludeArchivedSearch ? 'bg-claude-accent' : 'bg-gray-200 dark:bg-[#3F3E3B]'}
                                            `}
                                        >
                                            <div className={`
                                                absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                                                ${excludeArchivedSearch ? 'translate-x-5' : 'translate-x-0'}
                                            `} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Data</label>
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            <button
                                                onClick={handleExportMarkdown}
                                                disabled={isExporting || conversations.length === 0}
                                                className="flex flex-col p-4 bg-white dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] rounded-xl hover:border-claude-accent/50 transition-colors group text-left disabled:opacity-50"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Download className="w-5 h-5 text-blue-500" />
                                                    {isExporting && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                                                </div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">Markdown</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Download as ZIP archive</div>
                                            </button>

                                            <button
                                                onClick={handleExportJson}
                                                disabled={conversations.length === 0}
                                                className="flex flex-col p-4 bg-white dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] rounded-xl hover:border-claude-accent/50 transition-colors group text-left disabled:opacity-50"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <FileJson className="w-5 h-5 text-green-500" />
                                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                                                </div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">JSON</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Raw data export</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
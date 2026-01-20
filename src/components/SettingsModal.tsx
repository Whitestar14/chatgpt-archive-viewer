
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Type, Layout, Maximize2, Minimize2, Download, Loader2, FileDown, FileJson, ChevronRight, Archive } from 'lucide-react';
import { useStore } from '../store';
import JSZip from 'jszip';
import { conversationToMarkdown } from '../utils/parser';

export type ChatWidth = 'narrow' | 'medium' | 'wide' | 'full';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { fontSize, setFontSize, chatWidth, setChatWidth, conversations, profiles, activeProfileId, excludeArchivedSearch, setExcludeArchivedSearch } = useStore(state => ({
        fontSize: state.fontSize,
        setFontSize: state.setFontSize,
        chatWidth: state.chatWidth,
        setChatWidth: state.setChatWidth,
        conversations: state.conversations,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        excludeArchivedSearch: state.excludeArchivedSearch,
        setExcludeArchivedSearch: state.setExcludeArchivedSearch
    }));

    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

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
                    // Sanitize filename
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

    return createPortal(
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-[#F9F9F9] dark:bg-[#1A1917] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2B28] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-[#2C2B28]">
                    <h2 className="text-xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD]">
                        Settings
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Font Size Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Appearance</div>
                        <div className="bg-white dark:bg-[#252422] rounded-xl border border-gray-200 dark:border-[#3F3E3B] p-1 flex">
                            {[
                                { id: 'small', label: 'Aa', size: 'text-xs' },
                                { id: 'normal', label: 'Aa', size: 'text-sm' },
                                { id: 'large', label: 'Aa', size: 'text-base' },
                                { id: 'xl', label: 'Aa', size: 'text-lg' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setFontSize(opt.id as any)}
                                    className={`
                                        flex-1 h-10 rounded-lg flex items-center justify-center transition-all
                                        ${fontSize === opt.id 
                                            ? 'bg-claude-accent text-white shadow-sm' 
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2F2E2B]'
                                        }
                                    `}
                                    title={`${opt.id} text`}
                                >
                                    <span className={opt.size}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Width Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Layout</div>
                        <div className="bg-white dark:bg-[#252422] rounded-xl border border-gray-200 dark:border-[#3F3E3B] p-1 flex">
                            {[
                                { id: 'narrow', label: 'Narrow' },
                                { id: 'medium', label: 'Medium' },
                                { id: 'wide', label: 'Wide' },
                                { id: 'full', label: 'Full' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setChatWidth(opt.id as ChatWidth)}
                                    className={`
                                        flex-1 h-10 rounded-lg flex items-center justify-center transition-all text-xs font-medium
                                        ${chatWidth === opt.id 
                                            ? 'bg-claude-accent text-white shadow-sm' 
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2F2E2B]'
                                        }
                                    `}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Options Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Search</div>
                        <div className="bg-white dark:bg-[#252422] rounded-xl border border-gray-200 dark:border-[#3F3E3B] p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-[#2F2E2B] rounded-lg text-gray-500">
                                        <Archive className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Exclude Archived
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setExcludeArchivedSearch(!excludeArchivedSearch)}
                                    className={`
                                        w-11 h-6 rounded-full transition-colors relative
                                        ${excludeArchivedSearch ? 'bg-claude-accent' : 'bg-gray-200 dark:bg-[#3F3E3B]'}
                                    `}
                                >
                                    <div className={`
                                        absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                                        ${excludeArchivedSearch ? 'translate-x-5' : 'translate-x-0'}
                                    `} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Export Section */}
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Management</div>
                        <div className="space-y-2">
                            <button
                                onClick={handleExportMarkdown}
                                disabled={isExporting || conversations.length === 0}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2F2E2B] transition-colors disabled:opacity-50 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Download className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium">Export as Markdown</div>
                                        <div className="text-xs text-gray-500">Download ZIP archive</div>
                                    </div>
                                </div>
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />}
                            </button>

                            <button
                                onClick={handleExportJson}
                                disabled={conversations.length === 0}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-[#252422] border border-gray-200 dark:border-[#3F3E3B] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2F2E2B] transition-colors disabled:opacity-50 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                                        <FileJson className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-medium">Export as JSON</div>
                                        <div className="text-xs text-gray-500">Raw data file</div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SettingsModal;

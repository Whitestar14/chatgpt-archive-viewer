import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';
import { useStore } from '../store';

interface ImportViewProps {
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
    isInitialSetup: boolean;
}

const ImportView: React.FC<ImportViewProps> = ({ onFileSelect, isProcessing, isInitialSetup }) => {
    const { setView } = useStore(state => ({ setView: state.setView }));
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        validateAndProcess(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        validateAndProcess(file);
    };

    const validateAndProcess = (file?: File) => {
        if (!file) return;
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            setError("Please select a valid JSON file.");
            return;
        }
        setError(null);
        onFileSelect(file);
    };

    return (
        <div 
            className="flex flex-col h-full w-full bg-[#F9F9F9] dark:bg-[#1A1917] items-center justify-center p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {!isInitialSetup && (
                <div className="absolute top-6 left-6">
                    <button 
                        onClick={() => setView('chat')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>
            )}

            <div className="w-full max-w-md bg-white dark:bg-[#252422] rounded-2xl shadow-xl border border-claude-border dark:border-claude-dark-border overflow-hidden">
                <div className="px-8 py-8 text-center border-b border-gray-100 dark:border-claude-dark-border">
                    <h2 className="text-2xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD] mb-2">
                        {isInitialSetup ? 'Welcome to Archive' : 'Import Data'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Visualize your ChatGPT or Claude history offline. Secure, fast, and distraction-free.
                    </p>
                </div>

                <div className="p-8">
                    <div 
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-10
                            flex flex-col items-center text-center transition-all duration-200 cursor-pointer group
                            ${isProcessing 
                                ? 'border-claude-border dark:border-claude-dark-border opacity-50 cursor-not-allowed' 
                                : 'border-claude-border dark:border-claude-dark-border hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-[#2F2E2B]'
                            }
                        `}
                    >
                        <div className="w-16 h-16 bg-gray-100 dark:bg-[#2F2E2B] rounded-full flex items-center justify-center mb-6 text-gray-400 dark:text-gray-500 group-hover:scale-105 transition-transform duration-300">
                            <UploadCloud className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                            Drop `conversations.json`
                        </p>
                        <p className="text-xs text-gray-500 mb-6">
                            or click to browse
                        </p>
                        
                        <button 
                            disabled={isProcessing}
                            className={`
                                px-6 py-2.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-2 transition-all
                                ${isProcessing 
                                    ? 'bg-claude-accent text-white cursor-wait' 
                                    : 'bg-gray-900 dark:bg-[#E6E4DD] text-white dark:text-[#1A1917] hover:opacity-90'
                                }
                            `}
                        >
                            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {isProcessing ? 'Processing...' : 'Select File'}
                        </button>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={isProcessing}
                        />
                    </div>

                    {error && (
                        <div className="mt-6 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-900/20">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            Files are processed locally in your browser. No data is uploaded.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportView;
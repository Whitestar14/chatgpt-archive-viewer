
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, X, Loader2, AlertCircle } from 'lucide-react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
    allowClose?: boolean;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onFileSelect, isProcessing, allowClose = true }) => {
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

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

    return createPortal(
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={allowClose ? onClose : undefined}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            <div 
                className="w-full max-w-md bg-[#F9F9F9] dark:bg-[#1A1917] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2B28] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50 dark:border-[#2C2B28]">
                    <h2 className="text-xl font-serif font-bold text-[#333333] dark:text-[#E6E4DD]">
                        {allowClose ? 'Import Conversations' : 'Get Started'}
                    </h2>
                    {allowClose && !isProcessing && (
                        <button 
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-[#2F2E2B] rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center leading-relaxed">
                        Visualize your exported ChatGPT history in a clean, distraction-free interface. Fast search, filters, and offline privacy.
                    </p>

                    <div 
                        className={`
                            border-2 border-dashed rounded-xl p-10
                            flex flex-col items-center text-center transition-all duration-200
                            ${isProcessing 
                                ? 'border-claude-accent/30 bg-claude-accent/5' 
                                : 'border-gray-300 dark:border-[#3F3E3B] hover:border-gray-400 dark:hover:border-gray-500 hover:bg-white dark:hover:bg-[#252422]'
                            }
                        `}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-10 h-10 text-claude-accent animate-spin mb-4" />
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Processing...</p>
                                <p className="text-xs text-gray-500 mt-1">This may take a moment.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-gray-100 dark:bg-[#2F2E2B] rounded-full flex items-center justify-center mb-4">
                                    <UploadCloud className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
                                    Drop conversations.json here
                                </p>
                                <p className="text-xs text-gray-500 mb-6">
                                    or click to browse local files
                                </p>
                                
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="modal-file-upload"
                                />
                                
                                <label 
                                    htmlFor="modal-file-upload"
                                    className="px-5 py-2.5 rounded-lg bg-gray-900 dark:bg-[#E6E4DD] text-white dark:text-[#1A1917] hover:opacity-90 text-xs font-medium cursor-pointer transition-opacity shadow-sm"
                                >
                                    Browse Files
                                </label>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-900/20">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    {!allowClose && !isProcessing && (
                        <div className="mt-6 text-center">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                Your files are processed locally and never uploaded.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImportModal;


import React, { useRef, useState } from 'react';
import { AlertCircle, Loader2, UploadCloud, FileJson } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing = false }) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setError("Please select a valid JSON file.");
        return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
          if (fileInputRef.current) {
              if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                setError("Please select a valid JSON file.");
                return;
              }
              setError(null);
              onFileSelect(file);
          }
      }
  };

  return (
    <div 
        className="flex flex-col items-center justify-center min-h-screen bg-claude-bg dark:bg-claude-dark-bg p-6 transition-colors duration-300"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
    >
      <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in-95 duration-300">
        
        <div className="text-center space-y-2">
            <h1 className="text-2xl font-serif font-semibold text-gray-900 dark:text-gray-100">
                ChatGPT Archive Viewer
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Select your exported <code className="bg-gray-100 dark:bg-[#2C2B28] px-1.5 py-0.5 rounded text-xs">conversations.json</code> file to begin.
            </p>
        </div>

        <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
                group relative
                border-2 border-dashed rounded-xl p-12
                flex flex-col items-center text-center cursor-pointer
                transition-all duration-200
                ${isProcessing 
                    ? 'border-claude-accent/30 bg-claude-accent/5 cursor-wait' 
                    : 'border-gray-200 dark:border-[#3F3E3B] bg-white dark:bg-[#1A1917] hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-[#252422]'
                }
            `}
        >
            {isProcessing ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-claude-accent animate-spin mb-4" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        Processing...
                    </p>
                </div>
            ) : (
                <>
                    <div className="w-12 h-12 bg-gray-100 dark:bg-[#2F2E2B] rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">
                        Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        JSON files only
                    </p>
                </>
            )}
            
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
            />
        </div>

        {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/10 py-2.5 px-4 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
            </div>
        )}

        <div className="text-center">
            <p className="text-[10px] text-gray-300 dark:text-[#5D5C59] uppercase tracking-wider font-medium">
                Offline & Private
            </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

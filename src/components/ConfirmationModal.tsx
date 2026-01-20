import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Delete', 
    cancelText = 'Cancel',
    type = 'danger' 
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-sm bg-white dark:bg-[#1A1917] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2B28] p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'}`}>
                        <AlertTriangle className={`w-6 h-6 ${type === 'danger' ? 'text-red-600 dark:text-red-500' : 'text-yellow-600 dark:text-yellow-500'}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                            {message}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full pt-2">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#3F3E3B] text-gray-700 dark:text-gray-300 hover:bg-[#F0EEE6] dark:hover:bg-[#2F2E2B] transition-colors text-sm font-medium"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-white transition-colors text-sm font-medium shadow-sm ${
                                type === 'danger' 
                                    ? 'bg-red-600 hover:bg-red-700' 
                                    : 'bg-yellow-600 hover:bg-yellow-700'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
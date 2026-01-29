import React, { type ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose?: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
            onClick={(e) => {
                // 背景クリックで閉じる
                if (e.target === e.currentTarget && onClose) onClose();
            }}
        >
            <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                {title && (
                    <div className="px-6 py-4 border-b border-slate-700 font-bold text-lg bg-slate-800/50 flex justify-between items-center shrink-0">
                        <span>{title}</span>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-white p-2 -mr-2 rounded-full hover:bg-slate-700/50 transition-colors"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 bg-slate-800/50 flex justify-end gap-3 border-t border-slate-700">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

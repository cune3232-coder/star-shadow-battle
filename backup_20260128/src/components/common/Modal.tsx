import React, { ReactNode } from 'react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                {title && (
                    <div className="px-6 py-4 border-b border-slate-700 font-bold text-lg bg-slate-800/50">
                        {title}
                    </div>
                )}
                <div className="p-6">
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

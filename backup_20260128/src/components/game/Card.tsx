import React from 'react';
import type { Card as CardType } from '../../types/game';

interface CardProps {
    card: CardType;
    onClick?: (card: CardType) => void;
    isSmall?: boolean;
    isFaceDown?: boolean;
    isSelected?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, onClick, isSmall = false, isFaceDown = false, isSelected = false }) => {
    // カードタイプごとの色分け
    const getTypeColor = (type: CardType['type']) => {
        switch (type) {
            case 'ATTACK': return 'border-red-500 bg-red-950/30 text-red-100';
            case 'HEAL': return 'border-green-500 bg-green-950/30 text-green-100';
            case 'DEFENSE': return 'border-blue-400 bg-blue-950/30 text-blue-100';
            case 'SPECIAL': return 'border-purple-500 bg-purple-950/30 text-purple-100';
            case 'INFO': return 'border-yellow-500 bg-yellow-950/30 text-yellow-100';
            case 'TRICK': return 'border-gray-400 bg-gray-950/80 text-gray-100 shadow-[0_0_15px_rgba(255,255,255,0.5)]';
            default: return 'border-slate-500 bg-slate-900';
        }
    };

    if (isFaceDown) {
        return (
            <div
                className={`
          ${isSmall ? 'w-10 h-14' : 'w-24 h-36'} 
          bg-slate-800 border-2 border-slate-600 rounded-lg shadow-md 
          flex items-center justify-center bg-stripes-slate
        `}
            >
                <div className="w-1/2 h-1/2 rounded-full bg-slate-700/50"></div>
            </div>
        );
    }

    const baseStyle = getTypeColor(card.type);

    return (
        <div
            onClick={() => onClick && onClick(card)}
            className={`
        relative transition-all duration-200 
        ${isSmall ? 'w-16 h-20 text-[10px]' : 'w-32 h-44'} 
        rounded-lg border-2 shadow-lg flex flex-col p-2 cursor-pointer select-none
        ${baseStyle}
        ${isSelected ? 'ring-4 ring-yellow-400 -translate-y-2' : 'hover:-translate-y-1 hover:shadow-xl'}
      `}
        >
            {/* Header */}
            <div className="font-bold border-b border-white/20 pb-1 mb-1 truncate leading-tight">
                {card.name}
            </div>

            {/* Body */}
            <div className="flex-1 flex items-center justify-center text-center leading-snug opacity-90 text-sm overflow-hidden">
                {isSmall ? '' : card.description}
            </div>

            {/* Footer (Value/Type) */}
            {!isSmall && (
                <div className="mt-1 pt-1 border-t border-white/20 flex justify-between text-xs font-mono opacity-70">
                    <span>{card.type}</span>
                    {card.value && <span>Pow:{card.value}</span>}
                </div>
            )}
        </div>
    );
};

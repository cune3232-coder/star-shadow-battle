import React from 'react';
import type { Player, Card } from '../../types/game';

interface TargetSelectionOverlayProps {
    players: Player[];
    onSelect: (playerId: string) => void;
    onCancel: () => void;
    myPlayerId: string;
    cardType?: string; // ATTACK, HEAL etc.
    activeCard?: Card | null;
}

export const TargetSelectionOverlay: React.FC<TargetSelectionOverlayProps> = ({
    players, onSelect, onCancel, myPlayerId, cardType, activeCard
}) => {
    const me = players.find(p => p.id === myPlayerId);
    const others = players.filter(p => p.id !== myPlayerId);
    const isAttack = cardType === 'ATTACK';

    const PlayerButton = ({ p, isMe = false }: { p: Player, isMe?: boolean }) => {
        const isDead = !p.isAlive;
        const isDisabled = isDead;

        return (
            <button
                key={p.id}
                onClick={() => !isDisabled && onSelect(p.id)}
                disabled={isDisabled}
                className={`
                    relative rounded-xl border-2 transition-all 
                    ${isMe
                        ? 'bg-indigo-900/40 border-indigo-500/60 w-full p-3 flex items-center justify-between gap-4 hover:bg-indigo-900/60 active:bg-indigo-900/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'flex flex-col items-center justify-center gap-2 p-4 min-h-[120px] shadow-lg ' + (isDisabled ? 'border-slate-800 bg-slate-900/30 opacity-40 grayscale cursor-not-allowed' : 'border-slate-600 bg-slate-800 active:bg-slate-700 active:scale-95 hover:border-yellow-500')}
                    ${!isDisabled && !isMe && 'active:ring-2 active:ring-yellow-400'}
                    ${!isDisabled && isMe && 'active:ring-2 active:ring-indigo-400'}
                `}
            >
                {/* Avatar */}
                <div className={`${isMe ? 'text-2xl' : 'text-3xl'} filter drop-shadow-md`}>
                    {isDead ? '💀' : isMe ? '🤠' : '👤'}
                </div>

                {/* Name & Label */}
                <div className={`${isMe ? 'flex-1 text-left' : 'w-full text-center'}`}>
                    <div className="font-bold text-white text-sm truncate">
                        {p.name}
                    </div>
                    {isMe ? <div className="text-[10px] text-indigo-300 font-bold">あなた (Self)</div> : null}
                </div>

                {/* HP Bar */}
                {p.isAlive && (
                    <div className={`${isMe ? 'w-24' : 'w-full mt-1'}`}>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5 px-1">
                            <span>HP</span>
                            <span className={p.hp <= 3 ? 'text-red-400 font-bold' : 'text-white'}>{p.hp}/{p.maxHp}</span>
                        </div>
                        <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                            <div
                                className={`h-full ${p.hp <= 3 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${(p.hp / p.maxHp) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Team Hint */}
                {(p.isRevealed || isMe || (!p.isAlive)) && p.team && (
                    <div className={`absolute ${isMe ? '-top-2 -right-2' : 'top-2 right-2'} text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm
                        ${p.team === 'RED' ? 'bg-red-900 text-red-100 border border-red-500' :
                            p.team === 'BLUE' ? 'bg-blue-900 text-blue-100 border border-blue-500' :
                                'bg-purple-900 text-purple-100 border border-purple-500'}`}>
                        {p.team === 'TRICKSTER' ? 'TRICK' : p.team}
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-fadeIn">
            <div className="p-4 text-center border-b border-slate-800 bg-slate-900/50 shrink-0">
                {/* Active Card Info */}
                {activeCard && (
                    <div className="mb-3 p-2 bg-indigo-900/40 border border-indigo-500/50 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <div className="text-[10px] text-indigo-300 font-bold mb-0.5 uppercase tracking-wider">Effect Activation</div>
                        <div className="text-lg font-bold text-white drop-shadow-md">{activeCard.name}</div>
                        <div className="text-xs text-slate-300 mt-1 line-clamp-2">{activeCard.description}</div>
                    </div>
                )}

                <h2 className="text-xl font-bold text-yellow-400 animate-pulse">
                    対象を選択
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    {isAttack ? '攻撃対象を選んでください' : '対象を選んでください'}
                </p>
            </div>

            {/* Scrollable Area for Others */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3 pb-safe">
                    {others.map(p => (
                        <PlayerButton key={p.id} p={p} />
                    ))}
                </div>
            </div>

            {/* Bottom Section: Self & Cancel */}
            <div className="p-4 bg-slate-900/80 backdrop-blur border-t border-slate-800 pb-safe shrink-0 space-y-3">
                {me && (
                    <div>
                        <div className="text-[10px] text-center text-slate-500 mb-2 font-mono">--- 自分を対象にする ---</div>
                        <PlayerButton p={me} isMe={true} />
                    </div>
                )}

                <button
                    onClick={onCancel}
                    className="w-full py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 font-bold active:bg-slate-700 transition-colors"
                >
                    キャンセル
                </button>
            </div>
        </div>
    );
};

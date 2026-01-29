import React, { useState, useEffect } from 'react';
import type { GameLog } from '../../types/game';
import { Modal } from '../common/Modal';

interface LogViewerProps {
    logs: GameLog[];
    myPlayerId: string;
    playerOrder: string[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, myPlayerId, playerOrder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [queue, setQueue] = useState<GameLog[]>([]);
    const [currentToast, setCurrentToast] = useState<GameLog | null>(null);
    const [processedLogIds, setProcessedLogIds] = useState<Set<string>>(new Set());

    // プレイヤーカラーの定義 (インデックスベース)
    const getPlayerStyleByIndex = (index: number) => {
        const styles = [
            { border: 'border-cyan-500', bg: 'bg-cyan-900/20' },   // P1
            { border: 'border-rose-500', bg: 'bg-rose-900/20' },   // P2
            { border: 'border-emerald-500', bg: 'bg-emerald-900/20' },// P3
            { border: 'border-amber-500', bg: 'bg-amber-900/20' },  // P4
            { border: 'border-violet-500', bg: 'bg-violet-900/20' }, // P5
            { border: 'border-pink-500', bg: 'bg-pink-900/20' }    // P6
        ];
        return index >= 0 ? styles[index % styles.length] : { border: 'border-slate-600', bg: 'bg-slate-900/30' };
    };

    const getLogItemStyle = (log: GameLog) => {
        // 1. sourceIdがあればそれを使う
        if (log.data?.sourceId) {
            const index = playerOrder.indexOf(log.data.sourceId);
            if (index >= 0) return getPlayerStyleByIndex(index);
        }

        // 2. メッセージから "Player N" を探す (フォールバック)
        // 例: "Player 1のターン..." "Player 3が..."
        const match = log.message.match(/Player (\d+)/);
        if (match) {
            const playerNum = parseInt(match[1], 10);
            // Player 1 -> Index 0
            if (!isNaN(playerNum) && playerNum > 0) {
                return getPlayerStyleByIndex(playerNum - 1);
            }
        }

        return { border: 'border-slate-600', bg: 'bg-slate-900/30' };
    };

    // 1. 新規ログをキューに追加
    useEffect(() => {
        const newLogs = logs.filter(l =>
            !processedLogIds.has(l.id) &&
            (!l.visibleTo || l.visibleTo.includes(myPlayerId))
        );

        if (newLogs.length > 0) {
            setQueue(prev => [...prev, ...newLogs]);
            setProcessedLogIds(prev => {
                const next = new Set(prev);
                newLogs.forEach(l => next.add(l.id));
                return next;
            });
        }
    }, [logs, myPlayerId]);

    // 表示用ログ（キュー処理されたものを保持）
    const [displayedLog, setDisplayedLog] = useState<GameLog | null>(null);

    // 2. キュー処理とトースト表示（実質ログ更新）
    useEffect(() => {
        if (currentToast) return;

        if (queue.length > 0) {
            const nextLog = queue[0];
            setCurrentToast(nextLog);
            setDisplayedLog(nextLog); // Ticker更新
            setQueue(prev => prev.slice(1));
        }
    }, [queue, currentToast]);

    // 3. 次のログへの待機時間確保（2秒）
    useEffect(() => {
        if (currentToast) {
            const timer = setTimeout(() => {
                setCurrentToast(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [currentToast]);

    const visibleLogs = logs.filter(l => !l.visibleTo || l.visibleTo.includes(myPlayerId));

    return (
        <>
            {/* Mobile Ticker (Top) - 強化版 */}
            <div className={`md:hidden fixed top-0 left-0 right-0 bg-indigo-950/95 text-white px-4 py-2 z-40 flex items-center justify-between border-b border-indigo-500/30 backdrop-blur-sm h-14 shadow-lg transition-all duration-300 ${displayedLog ? 'border-l-4 ' + getLogItemStyle(displayedLog).border.replace('border-', 'border-l-') : ''}`}>
                <div className="flex flex-col flex-1 mr-4 overflow-hidden">
                    {displayedLog && (
                        <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-0.5 animate-pulse">
                            {displayedLog.type}
                        </span>
                    )}
                    <span className="truncate font-bold text-sm leading-tight text-slate-100">
                        {displayedLog ? displayedLog.message : 'Game Started'}
                    </span>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="shrink-0 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 px-3 py-1.5 rounded text-xs border border-slate-600 font-bold transition-colors"
                >
                    LOG
                </button>
            </div>

            {/* Full Log Modal for Mobile */}
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`行動ログ (${visibleLogs.length}件)`}>
                <div className="max-h-[80vh] overflow-y-auto space-y-2 p-1 font-mono">
                    {visibleLogs.slice().reverse().map(log => {
                        const style = getLogItemStyle(log);
                        return (
                            <div
                                key={log.id}
                                className={`
                                    border-b border-slate-700/50 pb-2 mb-2 last:border-0 last:pb-0 text-xs text-slate-300
                                    pl-3 border-l-4 rounded-r-lg
                                    ${style.border} ${style.bg}
                                `}
                            >
                                <div className="flex justify-between text-slate-500 text-[10px] mb-0.5 pr-2">
                                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    <span className="font-bold opacity-50">{log.type}</span>
                                </div>
                                <span className={
                                    log.type === 'ATTACK' ? 'text-red-300' :
                                        log.type === 'HEAL' ? 'text-green-300' :
                                            log.type === 'SPECIAL' ? 'text-purple-300' :
                                                log.type === 'INFO' ? 'text-yellow-300' : ''
                                }>
                                    {log.message}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4">
                    <button onClick={() => setIsOpen(false)} className="w-full py-3 bg-slate-700 active:bg-slate-600 rounded-lg text-white font-bold text-sm transition-colors">
                        閉じる
                    </button>
                </div>
            </Modal>
        </>
    );
};

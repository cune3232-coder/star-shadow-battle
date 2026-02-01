import React, { useState } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { setupNewGame } from '../../utils/gameSetup';
import { CardListModal } from '../game/CardListModal';
import { RulesModal } from '../game/RulesModal';

export const StartScreen: React.FC = () => {
    const { dispatch } = useGameContext();
    const [userName, setUserName] = useState('Player 1');
    const [playerCount, setPlayerCount] = useState<number>(3);
    const [isStarting, setIsStarting] = useState(false);
    const [showCardList, setShowCardList] = useState(false);
    const [showRules, setShowRules] = useState(false);

    const handleStart = () => {
        setIsStarting(true);
        // 少し遅延を入れてアニメーション等の余地を作る（今回は即時）
        setTimeout(() => {
            const { players, deck } = setupNewGame(playerCount, userName);

            // 1. Initialize Game State
            dispatch({ type: 'INIT_GAME', payload: { players, deck } });

            // 2. Initial Draw (Skipped: setupNewGame handles initial hands)
            // players.forEach(p => {
            //     dispatch({ type: 'DRAW_PHASE_AUTO', payload: { playerId: p.id, count: 3 } });
            // });

            // 3. Start Turn for Player 1 (User)
            // This will set AP to 1 and trigger logs
            dispatch({ type: 'START_TURN', payload: { playerId: 'player-1' } });

        }, 100);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans">
            <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 animate-pulse">
                星影 -Star Shadow-
            </h1>
            <p className="mb-12 text-slate-400 text-xl">Chaos Edition (3-8 Players)</p>

            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        プレイヤー名
                    </label>
                    <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full px-4 py-3 rounded bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="名前を入力"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        参加人数 (3〜8人)
                    </label>
                    <select
                        value={playerCount}
                        onChange={(e) => setPlayerCount(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value={3}>3人 (標準)</option>
                        <option value={4}>4人 (非推奨バランス)</option>
                        <option value={5}>5人 (推奨)</option>
                        <option value={6}>6人</option>
                        <option value={7}>7人</option>
                        <option value={8}>8人</option>
                    </select>
                </div>

                {/* カードリスト・ルール説明ボタン */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCardList(true)}
                        className="flex-1 py-2 rounded-lg font-semibold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-all"
                    >
                        📋 カードリスト
                    </button>
                    <button
                        onClick={() => setShowRules(true)}
                        className="flex-1 py-2 rounded-lg font-semibold text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-all"
                    >
                        📖 ルール説明
                    </button>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleStart}
                        disabled={isStarting}
                        className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all transform hover:scale-105
                            ${isStarting
                                ? 'bg-slate-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/30'
                            }`}
                    >
                        {isStarting ? '準備中...' : 'ゲーム開始'}
                    </button>
                </div>
            </div>

            <div className="mt-8 text-sm text-slate-500 max-w-lg text-center">
                <p>推奨プレイ: 5人〜</p>
                <p>役割: レッド(討伐隊) vs ブルー(反乱軍) vs トリックスター(第三勢力)</p>
            </div>

            {/* モーダル */}
            <CardListModal isOpen={showCardList} onClose={() => setShowCardList(false)} />
            <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { useGameLogic } from '../../hooks/useGameLogic';
import type { Card as CardType } from '../../types/game';
import { Card } from './Card';
import { PlayerStatus } from './PlayerStatus';
import { ActionControls } from './ActionControls';
import { Modal } from '../common/Modal';
import { RoleRevealModal } from './RoleRevealModal';
import { TricksterProgress } from './TricksterProgress';

// 仮のユーザーID (本番はAuthContextから取得)
const MY_PLAYER_ID = 'player-1'; // TODO: Replace with real ID

// ターゲット選択が不要なカードのリスト
const NO_TARGET_CARDS = [
    'star_fall',        // 全体攻撃
    'star_barrier',     // 自己バフ
    'mystery_star',     // 山札使用
    'chaos_drive',      // ランダム対象
    'time_leap',        // 自己コスト
    'reversal',         // 自己回復
    'reversal_full_heal' // 自己回復（旧名）
];

// カードがターゲット選択を必要とするか判定
const isTargetRequired = (card: CardType): boolean => {
    // ターゲット不要リストに含まれる場合は不要
    if (NO_TARGET_CARDS.includes(card.staticId)) {
        return false;
    }
    // ATTACK, SPECIAL, INFO, HEALタイプはターゲット必要
    return ['ATTACK', 'SPECIAL', 'INFO', 'HEAL'].includes(card.type);
};

export const GameBoard: React.FC = () => {
    const { state, dispatch } = useGameContext();
    const { playCard, tacticalBurst, endTurn, runAiTurn, resolveChoice } = useGameLogic();
    const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
    const [targetSelectionMode, setTargetSelectionMode] = useState(false);
    const [showRoleReveal, setShowRoleReveal] = useState(true); // 役割表示モーダル

    // 自分のプレイヤーデータ
    const myPlayerId = state.playerOrder.includes(MY_PLAYER_ID) ? MY_PLAYER_ID : state.playerOrder[0];
    const me = state.players[myPlayerId];

    // 他のプレイヤー（順番通りに並べる）
    const otherPlayerIds = state.playerOrder.filter(id => id !== myPlayerId);

    // 勝敗判定
    const isMyAlive = me?.isAlive;
    const isOthersDead = otherPlayerIds.every(pid => !state.players[pid].isAlive);
    const isGameOver = (!isMyAlive || isOthersDead) && state.phase !== 'STARTING'; // STARTING中は無視

    // AIターン制御
    useEffect(() => {
        const currentPlayer = state.players[state.turnPlayerId];

        // 1. 自分のターンなら即終了（絶対にAIを動かさない）
        if (state.turnPlayerId === myPlayerId) {
            return;
        }

        // 2. すでに死んでいるプレイヤーのターンならスキップ（自動ターンエンドへ）
        if (!currentPlayer || !currentPlayer.isAlive) {
            // ※別途オートスキップ処理がある場合はそちらに任せるが、念のため何もAIはしない
            return;
        }

        // --- ここから下のみAI処理 ---

        // 思考時間（1秒）をおいてからアクション
        const timer = setTimeout(() => {
            // AIのアクション実行関数を呼び出し
            runAiTurn(state.turnPlayerId);
        }, 1000);

        return () => clearTimeout(timer);

    }, [state.turnPlayerId, myPlayerId, isGameOver, state.phase, state.players, runAiTurn]);

    if (!me) return <div className="text-white p-10">Loading Player Data...</div>;

    const isMyTurn = state.turnPlayerId === myPlayerId;

    // --- Handlers ---

    const handleCardClick = (card: CardType) => {
        if (!isMyTurn) return;

        // アクション残数が0以下の場合は操作不可
        if ((state.actionsRemaining ?? 0) <= 0) {
            return;
        }

        // 呪いのカード (false_star, invisible_star) は直接使用不可
        if (card.staticId === 'false_star') {
            alert("このカードは直接使用できません。手札に持っているだけで[情報判定を反転]させるパッシブ効果を発揮します。");
            return;
        }

        if (card.staticId === 'invisible_star') {
            alert("このカードは直接使用できません。手札に持っているだけで[情報判定をERROR]にするパッシブ効果を発揮します。");
            return;
        }

        setSelectedCard(card);
    };

    const handlePlayConfirm = () => {
        if (!selectedCard) return;

        // ターゲット選択が必要か判定
        const needsTarget = isTargetRequired(selectedCard);

        if (needsTarget) {
            setTargetSelectionMode(true);
        } else {
            // 対象不要なら即実行
            playCard(myPlayerId, selectedCard.id);
            setSelectedCard(null);
        }
    };

    const handleTargetSelect = (targetId: string) => {
        // 割り込み処理 (ミステリースター解決中など)
        if (state.activeCard && state.phase === 'EFFECT_CHOICE') {
            dispatch({ type: 'RESOLVE_MYSTERY_TARGET', payload: { targetId } });
            setTargetSelectionMode(false); // Clear local UI state
            return;
        }

        if (!selectedCard || !targetSelectionMode) return;

        // ターゲット選択のバリデーション
        const targetPlayer = state.players[targetId];

        // 死亡しているプレイヤーは選択不可
        if (!targetPlayer.isAlive) {
            alert('倒れているプレイヤーは選択できません。');
            return;
        }

        // 攻撃カードは自分以外のみ選択可能
        if (selectedCard.type === 'ATTACK' && targetId === myPlayerId) {
            alert('攻撃カードは自分自身には使用できません。');
            return;
        }

        // その他のカード（HEAL, SPECIAL, INFO, TRICK, DEFENSE）は自分を含む全員が選択可能

        playCard(myPlayerId, selectedCard.id, targetId);

        // Reset
        setSelectedCard(null);
        setTargetSelectionMode(false);
    };

    const handleTacticalBurst = () => {
        tacticalBurst(myPlayerId);
    };

    return (
        <div className="h-screen w-full bg-slate-950 text-white overflow-hidden flex flex-col font-sans selection:bg-yellow-500/30">
            {/* Header / Other Players */}
            <div className="flex-none p-4 bg-slate-900/60 backdrop-blur-sm border-b border-slate-800 overflow-x-auto">
                <div className="flex items-start gap-4 mx-auto w-max px-4">
                    {otherPlayerIds.map(pid => {
                        const handleNoteChange = (playerId: string, note: 'RED' | 'BLUE' | 'TRICKSTER' | null) => {
                            dispatch({ type: 'UPDATE_PLAYER_NOTE', payload: { playerId, note } });
                        };

                        return (
                            <PlayerStatus
                                key={pid}
                                player={state.players[pid]}
                                isTurnPlayer={state.turnPlayerId === pid}
                                isTargetable={targetSelectionMode || (!!state.activeCard && state.phase === 'EFFECT_CHOICE')}
                                onClick={() => handleTargetSelect(pid)}
                                isMe={false}
                                playerNote={state.playerNotes?.[pid] ?? null}
                                onNoteChange={handleNoteChange}
                            />
                        );
                    })}
                </div>
                {targetSelectionMode && (
                    <div className="text-center mt-2 text-yellow-400 font-bold animate-pulse">
                        対象を選択してください
                        <button
                            onClick={() => { setTargetSelectionMode(false); setSelectedCard(null); }}
                            className="ml-4 text-xs underline text-slate-400 hover:text-white"
                        >
                            キャンセル
                        </button>
                    </div>
                )}
            </div>

            {/* Main Area (Center) */}
            <div className="flex-1 relative p-4 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
                {/* Deck & Discard */}
                <div className="flex gap-8 items-center">
                    {/* Deck */}
                    <div className="relative group">
                        <div className="w-24 h-36 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-xl flex items-center justify-center relative transform transition group-hover:-translate-y-1">
                            {/* Layered effect */}
                            <div className="absolute inset-0 bg-indigo-500/10 rounded-lg"></div>
                            <div className="text-center">
                                <span className="block font-bold text-2xl">{state.deck.length}</span>
                                <span className="text-[10px] text-slate-400">山札</span>
                            </div>
                        </div>
                    </div>

                    {/* Collapse Counter */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`
                             w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-black shadow-[0_0_20px_currentColor]
                             ${state.collapseCounter === 0 ? 'border-blue-500 text-blue-500 shadow-blue-500/20' : ''}
                             ${state.collapseCounter === 1 ? 'border-yellow-500 text-yellow-500 shadow-yellow-500/40' : ''}
                             ${state.collapseCounter >= 2 ? 'border-red-600 text-red-600 animate-pulse shadow-red-600/60' : ''}
                         `}>
                            {state.collapseCounter}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">崩壊レベル</span>
                    </div>

                    {/* Discard Pile */}
                    <div className="w-24 h-36 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center relative bg-black/20">
                        {state.discardPile.length > 0 ? (
                            <div className="absolute inset-0 transform rotate-6 hover:rotate-0 transition-transform">
                                <Card
                                    card={state.discardPile[state.discardPile.length - 1]}
                                    isFaceDown={false}
                                />
                            </div>
                        ) : (
                            <span className="text-xs text-slate-600">捨て札</span>
                        )}
                    </div>
                </div>

                {/* Active Card / Mystery Resolution Display */}
                {state.activeCard && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                        <div className="relative animate-bounce">
                            <div className="absolute -inset-4 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>
                            <div className="scale-150 shadow-[0_0_50px_rgba(255,215,0,0.5)]">
                                <Card
                                    card={state.activeCard}
                                    isFaceDown={false}
                                />
                            </div>
                            <div className="absolute -bottom-16 w-full text-center">
                                <span className="text-yellow-400 font-bold text-xl drop-shadow-md animate-pulse whitespace-nowrap">
                                    {state.activeCard.staticId === 'mystery_star' ? '連鎖発動中...' : '効果解決中...'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logs Overlay (Updated) */}
                <div className="absolute top-4 right-4 w-96 max-h-[80vh] overflow-y-auto bg-black/80 backdrop-blur p-4 rounded-lg border border-slate-700/80 shadow-2xl text-sm text-slate-300 font-mono pointer-events-auto z-30">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 sticky top-0 bg-black/90 p-2 backdrop-blur border-b border-slate-700">行動ログ</h3>
                    {state.logs.slice().reverse().filter(log => {
                        // 秘匿ログフィルタリング
                        // visibleToがない場合は全員に表示
                        if (!log.visibleTo) return true;
                        // visibleToがある場合は、自分が含まれている場合のみ表示
                        return log.visibleTo.includes(myPlayerId);
                    }).map(log => (
                        <div key={log.id} className="group mb-2 border-b border-white/10 pb-2 last:border-0 hover:bg-white/5 p-2 rounded transition-colors">
                            <div className="flex justify-between items-start opacity-70 text-xs mb-1">
                                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                <span className="font-bold">{log.type}</span>
                            </div>

                            <p className={`
                                leading-snug break-words
                                ${log.type === 'ATTACK' ? 'text-rose-300' : ''}
                                ${log.type === 'BURST' ? 'text-amber-300 font-bold' : ''}
                                ${log.type === 'RESHUFFLE' ? 'text-cyan-300' : ''}
                                ${log.type === 'SYSTEM' && log.message.includes('崩壊') ? 'text-red-500 animate-pulse font-black' : ''}
                            `}>
                                {log.message}
                            </p>

                            {/* 公開されたカードデータがある場合、ここに表示する */}
                            {log.data?.revealedCards && log.data.revealedCards.length > 0 && (
                                <div className="mt-2 flex gap-1 flex-wrap bg-black/40 p-2 rounded border border-white/10">
                                    <span className="text-[10px] text-slate-500 w-full mb-1">公開された手札:</span>
                                    {log.data.revealedCards.map((c, i) => (
                                        <div key={i} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white whitespace-nowrap flex items-center gap-1" title={c.description}>
                                            {c.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* My Area (Bottom) */}
            <div className="flex-none bg-slate-900 border-t border-slate-700">
                {/* Hand Area */}
                <div className="flex justify-center p-4 min-h-[220px] items-end gap-2 overflow-x-visible pb-8">
                    {me.hand.map((card) => (
                        <div key={card.id} className="relative transition-transform hover:-translate-y-4 hover:z-10 z-0">
                            <Card
                                card={card}
                                onClick={handleCardClick}
                            />
                        </div>
                    ))}
                </div>

                {/* Info Bar */}
                <div
                    className={`absolute bottom-4 left-4 z-20 flex items-end gap-4 transition-all`}
                >
                    <div
                        className={`text-white drop-shadow-md select-none ${targetSelectionMode ? 'cursor-pointer hover:scale-110 hover:skew-x-2' : 'pointer-events-none'}`}
                        onClick={() => {
                            if (targetSelectionMode) {
                                handleTargetSelect(myPlayerId);
                            }
                        }}
                    >
                        <p className={`font-bold text-xl ${targetSelectionMode ? 'text-yellow-400 animate-pulse underline' : ''}`}>
                            {me.name} <span className="text-sm font-normal opacity-70">({me.team})</span>
                        </p>
                        <p className={`font-mono text-2xl ${me.hp <= 2 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                            HP: {me.hp} <span className="text-sm text-slate-400">/ {me.maxHp}</span>
                        </p>
                        {targetSelectionMode && <span className="text-xs text-yellow-500 block">👈 Click to Self-Target</span>}
                    </div>

                    {/* Role Check Button */}
                    <button
                        onClick={() => setShowRoleReveal(true)}
                        className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1 rounded border border-slate-600 backdrop-blur pointer-events-auto"
                        title="自分の役職と勝利条件を確認"
                    >
                        役職確認
                    </button>
                </div>



                {/* Controls */}
                <div className="flex flex-col items-center w-full">
                    <div className="mb-2">
                        <TricksterProgress player={me} deckCount={state.deck.length} />
                    </div>
                    <ActionControls
                        isMyTurn={isMyTurn}
                        onTacticalBurst={handleTacticalBurst}
                        onEndTurn={endTurn}
                        canBurst={me.hp > 1 && me.hand.length > 0}
                        actionsRemaining={state.actionsRemaining ?? 0}
                    />
                </div>
            </div>

            {/* Card Detail Modal */}
            <Modal
                isOpen={!!selectedCard && !targetSelectionMode}
                onClose={() => setSelectedCard(null)}
                title={selectedCard?.name}
                footer={
                    <>
                        <button
                            onClick={() => setSelectedCard(null)}
                            className="px-4 py-2 rounded text-slate-300 hover:text-white"
                        >
                            閉じる
                        </button>
                        <button
                            onClick={handlePlayConfirm}
                            className="px-6 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30"
                        >
                            {selectedCard && isTargetRequired(selectedCard)
                                ? '対象を選択して使用'
                                : '使用する'}
                        </button>
                    </>
                }
            >
                <div className="text-center py-4">
                    <div className="flex justify-center mb-6">
                        {selectedCard && <Card card={selectedCard} />}
                    </div>
                    <p className="text-lg leading-relaxed text-slate-200">
                        {selectedCard?.description}
                    </p>

                </div>
            </Modal>

            {/* Game Result Modal */}
            <Modal
                isOpen={!!state.winner || isGameOver} // winner決定済み、またはローカル判定でGameOver
                title={
                    state.winner === 'RED_TEAM' ? "RED TEAM VICTORY" :
                        state.winner === 'BLUE_TEAM' ? "BLUE TEAM VICTORY" :
                            state.winner === 'TRICKSTER' ? "TRICKSTER VICTORY" :
                                !isMyAlive ? "DEFEAT..." : "GAME OVER"
                }
                footer={
                    <button
                        onClick={() => window.location.reload()}
                        className={`
                            px-8 py-3 rounded-lg font-bold text-lg shadow-xl mb-4 mx-auto block transition-all hover:scale-105
                            ${state.winner === 'RED_TEAM' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/50' : ''}
                            ${state.winner === 'BLUE_TEAM' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50' : ''}
                            ${state.winner === 'TRICKSTER' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50' : ''}
                            ${!state.winner ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : ''}
                        `}
                    >
                        もう一度遊ぶ
                    </button>
                }
            >
                <div className="text-center py-8">
                    <div className="text-6xl mb-6 animate-bounce">
                        {state.winner === 'RED_TEAM' ? '🔴' :
                            state.winner === 'BLUE_TEAM' ? '🔵' :
                                state.winner === 'TRICKSTER' ? '🃏' : '💀'}
                    </div>
                    <p className={`text-2xl font-bold tracking-widest uppercase mb-2
                        ${state.winner === 'RED_TEAM' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}
                        ${state.winner === 'BLUE_TEAM' ? 'text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}
                        ${state.winner === 'TRICKSTER' ? 'text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]' : ''}
                    `}>
                        {state.winner === 'RED_TEAM' ? '赤チーム勝利' :
                            state.winner === 'BLUE_TEAM' ? '青チーム勝利' :
                                state.winner === 'TRICKSTER' ? 'トリックスター勝利' :
                                    'DEFEAT...'}
                    </p>
                    <p className="text-slate-400 text-sm">
                        {state.winner === 'RED_TEAM' ? '青チームは殲滅されました。' :
                            state.winner === 'BLUE_TEAM' ? '赤チームは殲滅されました。' :
                                state.winner === 'TRICKSTER' ? '漁夫の利... 最後の生存者となりました。' :
                                    'あなたのHPは0になりました。'}
                    </p>
                </div>
            </Modal>
            {/* Star Choice Modal */}
            <Modal
                isOpen={state.phase === 'EFFECT_CHOICE' && isMyTurn && (state.activeCard?.staticId === 'star_choice' || state.pendingEffect?.sourceCard?.staticId === 'star_choice')}
                title="星選択の効果"
                footer={null} // カスタムボタンのみ
                onClose={() => { }} // 強制選択なので閉じられない
            >
                <div className="text-center py-6">
                    <p className="mb-6 text-slate-300">
                        対象に対する効果を選択してください。
                    </p>
                    <div className="flex justify-center gap-6">
                        <button
                            onClick={() => resolveChoice('HEAL')}
                            className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-green-900/40 border-2 border-slate-600 hover:border-green-500 rounded-lg transition-all w-32 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">✨</span>
                            <span className="font-bold text-green-400">回復</span>
                            <span className="text-xs text-slate-400">HP+2</span>
                        </button>
                        <button
                            onClick={() => resolveChoice('ATTACK')}
                            className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-red-900/40 border-2 border-slate-600 hover:border-red-500 rounded-lg transition-all w-32 group"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform">💥</span>
                            <span className="font-bold text-red-500">攻撃</span>
                            <span className="text-xs text-slate-400">2ダメージ</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Role Reveal Modal (ゲーム開始時) */}
            <RoleRevealModal
                isOpen={showRoleReveal}
                player={me}
                playerCount={state.playerOrder.length}
                onClose={() => setShowRoleReveal(false)}
            />
        </div>
    );
};

import { useRef } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { decideAIAction } from '../utils/aiLogic';

export const useGameLogic = () => {
    const { state, dispatch } = useGameContext();

    // AIの行動状態を追跡するためのRef
    // Reactの再レンダリング（State更新）をまたいで状態を保持する
    const aiStateRef = useRef({
        turnId: '',
        hasActed: false
    });

    // プレイヤーアクション: Play
    const playCard = (playerId: string, cardId: string, targetId?: string) => {
        // --- Round 1 Restriction: Info Cards Only ---
        // Check if we are in the first round (using turn count or log analysis)
        // --- Round 1 Restriction: Info Cards Only ---
        // Check if we are in the first round using turnCount
        const isFirstRound = (state.turnCount || 0) <= state.playerOrder.length;

        if (isFirstRound) {
            const player = state.players[playerId];
            if (player) {
                const card = player.hand.find(c => c.id === cardId);
                // Strict Rule: Only INFO allowed in Round 1 regardless of hand
                if (card && card.type !== 'INFO') {
                    // Human Player Restriction
                    if (playerId === 'player-1') {
                        alert('第1幕（最初の1巡）は、情報収集フェーズです。\n手札に情報カードがある場合は、それを使用してください。');
                        return; // Cancel action
                    }

                    // AI Warning (Allow to proceed to prevent softlock)
                    console.warn(`[Rules] ${playerId} attempted to play ${card.name} but should play INFO card in Round 1. Allowing to prevent softlock.`);
                }
            }
        }

        dispatch({ type: 'PLAY_CARD', payload: { playerId, cardId, targetId } });
    };

    // プレイヤーアクション: Burst
    const tacticalBurst = (playerId: string) => {
        // --- Round 1 Restriction: No Burst ---
        // --- Round 1 Restriction: No Burst ---
        const isFirstRound = (state.turnCount || 0) <= state.playerOrder.length;
        if (isFirstRound) {
            if (playerId === 'player-1') {
                alert('第1幕（最初の1巡）は、情報収集フェーズです。戦術的バーストは使用できません。');
            }
            return;
        }
        dispatch({ type: 'TACTICAL_BURST', payload: { playerId } });
    };

    // ターン終了
    const endTurn = () => {
        dispatch({ type: 'END_TURN' });
    };

    const resolveChoice = (choice: 'ATTACK' | 'HEAL') => {
        dispatch({ type: 'RESOLVE_CHOICE', payload: { choice } });
    };

    const resolveMysteryTarget = (targetId: string) => {
        dispatch({ type: 'RESOLVE_MYSTERY_TARGET', payload: { targetId } });
    };

    // AIロジック (State-Aware)
    const runAiTurn = async (aiPlayerId: string) => {
        const player = state.players[aiPlayerId];
        if (!player || !player.isAlive) return;

        // ターンが変わっていたら状態リセット（必要なら）
        if (aiStateRef.current.turnId !== state.gameId + '-' + state.turnPlayerId) {
            aiStateRef.current = {
                turnId: state.gameId + '-' + state.turnPlayerId,
                hasActed: false
            };
        }

        // 行動権がない場合、ターン終了
        if (state.phase === 'ACTION_SELECTION' && (state.actionsRemaining ?? 0) <= 0) {
            // 行動完了後の余韻（ログ確認用）
            await new Promise(r => setTimeout(r, 1500));
            endTurn();
            return;
        }

        // 思考時間 (演出) - ターン開始時やフェーズ移行時
        await new Promise(r => setTimeout(r, 1500));

        // --- フェーズ別行動 ---

        if (state.phase === 'EFFECT_CHOICE') {
            // 選択待機状態 (Mystery Starのターゲット選択 or Star Choiceの選択)
            handleAiEffectChoice(aiPlayerId);
            return;
        }

        if (state.phase === 'ACTION_SELECTION') {
            const decision = decideAIAction(state, aiPlayerId);

            if (decision) {
                playCard(aiPlayerId, decision.cardId, decision.targetId);
            } else {
                // 有効なアクションがない場合
                if (player.hp > 1 && (state.actionsRemaining ?? 0) > 0) {
                    // バースト可能ならバースト（Anarchistならより積極的かもだが一旦これ）
                    tacticalBurst(aiPlayerId);
                } else {
                    // 何もできなければターン終了
                    endTurn();
                }
            }
        }
    };

    const handleAiEffectChoice = (aiPlayerId: string) => {
        // PendingEffectの内容を見て判断
        if (state.pendingEffect) {
            const { targetId } = state.pendingEffect;

            if (targetId === undefined) {
                // ターゲット未定 (Mystery Starからの呼び出しなど)
                // 今回の実装では decideAIAction は手札ベースなので、
                // Mystery Star発動中のターゲット選択ロジックを簡易的にここに書くか、
                // aiLogicにヘルパーを作る必要がある。
                // ユーザー要望の decideAIAction は "手札のカードにスコア" とあるので、
                // 発動中のカードに対するターゲット選択は別途考慮が必要。
                // とりあえず既存のランダムロジック（または簡易ロジック）で凌ぐ
                const targets = state.playerOrder.filter(pid => state.players[pid].isAlive);
                const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                if (randomTarget) resolveMysteryTarget(randomTarget);
            } else {
                // Star Choice: 味方ならHEAL、敵ならATTACK
                // ここも本来はAIロジックだが、簡易実装
                const me = state.players[aiPlayerId];
                const target = state.players[targetId];
                const isFriend = me.team === target.team; // 簡易判定
                resolveChoice(isFriend ? 'HEAL' : 'ATTACK');
            }
        }
    };



    return {
        playCard,
        tacticalBurst,
        endTurn,
        runAiTurn,
        resolveChoice,
        resolveMysteryTarget
    };
};

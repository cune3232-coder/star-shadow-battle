import { useRef } from 'react';
import { useGameContext } from '../contexts/GameContext';

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
        dispatch({ type: 'PLAY_CARD', payload: { playerId, cardId, targetId } });
    };

    // プレイヤーアクション: Burst
    const tacticalBurst = (playerId: string) => {
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
            // 手札があるかチェック
            if (player.hand.length > 0) {
                // 使用可能なカードのみを抽出（呪いのカードを除外）
                const playableCards = player.hand.filter(c => !c.isLieStar && !c.isInvisible && !c.isCursed);

                if (playableCards.length > 0) {
                    const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];

                    // ターゲット選択が必要か？
                    const targetId = selectAiTarget(aiPlayerId, randomCard.type);
                    playCard(aiPlayerId, randomCard.id, targetId);

                    // プレイ実行。State更新を待つため、ここでは何もしない。
                    // 次のレンダリングで actionsRemaining が減っていれば、
                    // 再びこの関数が呼ばれた確認時に endTurn 条件などをチェックする。
                } else {
                    // プレイできるカードがない（全て呪いカードなど）
                    // タクティカルバーストが可能なら行う、無理ならエンド
                    if (player.hp > 1 && (state.actionsRemaining ?? 0) > 0) {
                        tacticalBurst(aiPlayerId);
                    } else {
                        endTurn();
                    }
                }
            } else {
                // 手札なし
                endTurn();
            }
        }
    };

    const handleAiEffectChoice = (aiPlayerId: string) => {
        // PendingEffectの内容を見て判断
        if (state.pendingEffect) {
            const { targetId, sourceCard } = state.pendingEffect;

            if (targetId === undefined) {
                // ターゲット未定 (Mystery Starからの呼び出しなど)
                // sourceCardがあればそのタイプに基づいてターゲットを決める
                const type = sourceCard?.type || 'SPECIAL';
                const tId = selectAiTarget(aiPlayerId, type);
                if (tId) resolveMysteryTarget(tId);
            } else {
                // ターゲットは決まっているが、選択肢がある (Star Choiceなど)
                // ランダムに選ぶ
                const choice = Math.random() > 0.5 ? 'ATTACK' : 'HEAL';
                resolveChoice(choice);
            }
        }
    };

    const selectAiTarget = (aiPlayerId: string, cardType: string): string | undefined => {
        // 攻撃対象: 自分以外
        const others = state.playerOrder.filter(pid => pid !== aiPlayerId && state.players[pid].isAlive);
        // 回復・情報対象: 全員（自分含む）
        const aliveAll = state.playerOrder.filter(pid => state.players[pid].isAlive);

        let targetId: string | undefined;

        if (['ATTACK', 'SPECIAL'].includes(cardType)) {
            if (others.length > 0) {
                targetId = others[Math.floor(Math.random() * others.length)];
            }
        } else if (['HEAL', 'DEFENSE', 'INFO'].includes(cardType)) {
            targetId = aliveAll[Math.floor(Math.random() * aliveAll.length)];
        }
        return targetId;
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

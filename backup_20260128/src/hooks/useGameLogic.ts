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

        // ターンが変わっていたら状態リセット
        if (aiStateRef.current.turnId !== state.gameId + '-' + state.turnPlayerId) {
            aiStateRef.current = {
                turnId: state.gameId + '-' + state.turnPlayerId,
                hasActed: false
            };
        }

        // 既にこのターンで行動済み（カード使用完了）なら、ターン終了して終わり
        // ただし、EFFECT_CHOICEの場合は「行動中」なので継続
        if (state.phase === 'ACTION_SELECTION' && aiStateRef.current.hasActed) {
            await new Promise(r => setTimeout(r, 500));
            endTurn();
            return;
        }

        // 思考時間 (演出)
        await new Promise(r => setTimeout(r, 1000));

        // --- フェーズ別行動 ---

        if (state.phase === 'EFFECT_CHOICE') {
            // 選択待機状態 (Mystery Starのターゲット選択 or Star Choiceの選択)
            handleAiEffectChoice(aiPlayerId);
            // 選択完了後はhasActedフラグを立てる（handleAiEffectChoice内で処理するか、次のステップで）
            // ここでマークしておくと、次回のuseEffect呼び出し(ACTION_SELECTIONに戻った後)でendTurnされる
            aiStateRef.current.hasActed = true;
            return;
        }

        if (state.phase === 'ACTION_SELECTION') {
            // まだ行動していない場合
            if (!aiStateRef.current.hasActed) {
                // 手札があるかチェック
                if (player.hand.length > 0) {
                    const randomCard = player.hand[Math.floor(Math.random() * player.hand.length)];

                    // ターゲット選択が必要か？
                    // プレイ時に即時解決しないカード（Star ChoiceやMystery Starの一部）は
                    // ここでターゲット指定しても phase='EFFECT_CHOICE' に移行することがある。
                    // その場合は次のuseEffectサイクルで上のブロックが処理する。

                    const targetId = selectAiTarget(aiPlayerId, randomCard.type); // ヘルパー関数へ抽出
                    playCard(aiPlayerId, randomCard.id, targetId);

                    // カードが「対象選択不要で即解決」または「単純な対象選択のみ」だった場合、
                    // STATEは ACTION_SELECTION のままになる（はず）。
                    // もし Mystery Star -> Target Selection になった場合は EFFECT_CHOICE になる。

                    // ここでは「プレイした」事実を記録しない。
                    // なぜなら、もし EFFECT_CHOICE に移行した場合、まだAIのターンは終わっていないから。
                    // ACTION_SELECTION のままなら、完了とみなす。

                    // しかし、playCardは同期的にStateを変えない（Reducerは同期的だが、このstate変数は古い）。
                    // したがって、ここでは一旦 hasActed = true にしてしまうと、
                    // もし本当は EFFECT_CHOICE になっていた場合に、次のループで何もできなくなる可能性がある？
                    // いや、EFFECT_CHOICE のブロックは hasActed をチェックしていないので大丈夫。

                    // 結論: ここで hasActed = true にする。
                    // もし EFFECT_CHOICE になったら、上のブロックが走り、解決後に ACTION_SELECTION に戻る。
                    // その時 hasActed=true なので endTurn される。
                    aiStateRef.current.hasActed = true;
                } else {
                    // 手札なし（ありえないが）
                    endTurn();
                }
            }
        }
    };

    const handleAiEffectChoice = (aiPlayerId: string) => {
        // PendingEffectの内容を見て判断
        if (state.pendingEffect) {
            const { cardId, targetId, sourceCard } = state.pendingEffect;

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
        const others = state.playerOrder.filter(pid => pid !== aiPlayerId && state.players[pid].isAlive);
        const aliveAll = state.playerOrder.filter(pid => state.players[pid].isAlive);
        let targetId: string | undefined;

        if (['ATTACK', 'SPECIAL', 'LIE_STAR'].includes(cardType)) {
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

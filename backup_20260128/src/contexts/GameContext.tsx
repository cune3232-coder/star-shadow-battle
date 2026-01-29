
import React, { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import type { GameState, Player, Card, GameLog, GamePhase, TricksterObjective } from '../types/game';
import { shuffleDeck } from '../constants/cards';
import { v4 as uuidv4 } from 'uuid';

// --- Action Types ---
export type GameAction =
    | { type: 'INIT_GAME'; payload: { players: Player[], deck: Card[] } }
    | { type: 'START_TURN'; payload: { playerId: string } }
    | { type: 'END_TURN' }
    | { type: 'DRAW_PHASE_AUTO'; payload: { playerId: string, count: number } }
    | { type: 'PLAY_CARD'; payload: { playerId: string, cardId: string, targetId?: string } }
    | { type: 'TACTICAL_BURST'; payload: { playerId: string } }
    | { type: 'UNIVERSE_COLLAPSE'; payload: { damage: number, maxHpReduction: number } }
    | { type: 'RESOLVE_CHOICE'; payload: { choice: 'HEAL' | 'ATTACK' } }
    | { type: 'RESOLVE_MYSTERY_TARGET'; payload: { targetId: string } }
    | { type: 'ADD_LOG'; payload: GameLog }
    | { type: 'SET_PHASE'; payload: GamePhase }
    | { type: 'UPDATE_PLAYER_NOTE'; payload: { playerId: string, note: 'RED' | 'BLUE' | 'TRICKSTER' | null } };

// --- Initial State ---
const initialState: GameState = {
    gameId: 'local-session',
    phase: 'LOBBY',
    players: {},
    playerOrder: [],
    turnPlayerId: '',
    deck: [],
    discardPile: [],
    collapseCounter: 0,
    logs: [],
    effectStack: [],
    pendingEffect: null,
    activeCard: null,
    actionsRemaining: 1,
    playerNotes: {},
};

// --- Helper Functions ---
const createLog = (message: string, type: GameLog['type'] = 'INFO', data?: GameLog['data']): GameLog => ({
    id: typeof uuidv4 === 'function' ? uuidv4() : Math.random().toString(36),
    timestamp: Date.now(),
    message,
    type,
    data
});

const getTeamNameJP = (team: string): string => {
    switch (team) {
        case 'RED': return 'レッド';
        case 'BLUE': return 'ブルー';
        case 'TRICKSTER': return 'トリックスター';
        default: return '不明';
    }
};

// 勝利判定ロジック
const checkWinCondition = (state: GameState): GameState['winner'] | undefined => {
    const { players, turnPlayerId } = state;
    const alivePlayers = Object.values(players).filter(p => p.isAlive);
    const redAlive = alivePlayers.filter(p => p.team === 'RED').length;
    const blueAlive = alivePlayers.filter(p => p.team === 'BLUE').length;
    const tricksters = alivePlayers.filter(p => p.team === 'TRICKSTER');
    const totalPlayers = Object.keys(players).length;

    // --- Trickster Individual Checks (即時勝利のみ) ---
    for (const t of tricksters) {
        if (!t.tricksterObjective) continue;
        if (!t.isAlive) continue; // 生存必須

        switch (t.tricksterObjective) {
            case 'REAPER':
                // 3人: 1キル, 4人以上: 2キル
                const requiredKills = totalPlayers === 3 ? 1 : 2;
                if (t.killCount >= requiredKills) return 'TRICKSTER';
                break;
            case 'ANARCHIST':
                // 自分のターン中に山札0枚
                if (turnPlayerId === t.id && state.deck.length === 0) return 'TRICKSTER';
                break;
            case 'SADIST':
                // 5人以下: 20ダメージ、6人以上: 30ダメージ
                const requiredDamage = totalPlayers <= 5 ? 20 : 30;
                if (t.damageDealt >= requiredDamage) return 'TRICKSTER';
                break;
            case 'SURVIVOR':
                if (t.hp === 1 && t.turnsAtOneHp >= 2) return 'TRICKSTER';
                break;
            case 'GAMBLER':
                // ミステリースター4回使用
                if (t.mysteryStarUsage >= 4) return 'TRICKSTER';
                break;
            case 'PROPHET':
                // 情報カード3種すべて使用かつ累計4回使用
                const hasAllTypes = ['info_red', 'info_blue', 'info_trickster'].every(type => t.infoTypesUsed.includes(type));
                if (hasAllTypes && t.infoCardUsage >= 4) return 'TRICKSTER';
                break;
            // SAINTは即時勝利なし（決着時のみ判定）
        }
    }

    // --- MARTYR (First Blood Logic) ---
    // 最初の死亡者がMARTYRであり、かつ自殺でない場合
    const deadPlayers = Object.values(players).filter(p => !p.isAlive);
    if (deadPlayers.length === 1) {
        const victim = deadPlayers[0];
        if (victim.tricksterObjective === 'MARTYR') {
            // 自殺でないことを確認 (suicide check)
            if (victim.lastAttackerId && victim.lastAttackerId !== victim.id) {
                return 'TRICKSTER';
            }
        }
    }

    // --- チーム勝利判定 & 聖人強奪ロジック ---
    let teamWinner: 'RED_TEAM' | 'BLUE_TEAM' | undefined = undefined;
    if (blueAlive === 0 && redAlive > 0) teamWinner = 'RED_TEAM';
    if (redAlive === 0 && blueAlive > 0) teamWinner = 'BLUE_TEAM';
    if (redAlive === 0 && blueAlive === 0) teamWinner = undefined; // 両方全滅は引き分け扱い

    if (teamWinner) {
        // 聖人の生存＆不殺チェック
        const saint = tricksters.find(t =>
            t.tricksterObjective === 'SAINT' &&
            t.isAlive &&
            t.killCount === 0
        );
        if (saint) {
            return 'TRICKSTER'; // 勝利強奪
        }
        return teamWinner; // 通常のチーム勝利
    }

    return undefined;
};

// 銀河再編ロジック
const executeGalaxyReshuffleInternal = (state: GameState): GameState => {
    let allCards: Card[] = [...state.discardPile, ...state.deck];
    Object.values(state.players).forEach(p => {
        allCards = [...allCards, ...p.hand];
    });

    const newDeck = shuffleDeck(allCards);
    const updatedPlayers = { ...state.players };
    let currentDeckIndex = 0;

    Object.keys(updatedPlayers).forEach(pid => {
        const hand: Card[] = [];
        for (let i = 0; i < 3; i++) {
            if (currentDeckIndex < newDeck.length) {
                hand.push(newDeck[currentDeckIndex]);
                currentDeckIndex++;
            }
        }
        updatedPlayers[pid] = { ...updatedPlayers[pid], hand };
    });

    const finalDeck = newDeck.slice(currentDeckIndex);
    let collapseLog: GameLog | null = null;
    let finalPlayersAfterCollapse = updatedPlayers;

    if (state.collapseCounter >= 1) {
        const damage = 1;
        const maxHpReduction = 2;
        Object.keys(finalPlayersAfterCollapse).forEach(pid => {
            const p = finalPlayersAfterCollapse[pid];
            const newMaxHp = Math.max(1, p.maxHp - maxHpReduction);
            const newHp = Math.max(0, Math.min(p.hp, newMaxHp) - damage);
            finalPlayersAfterCollapse[pid] = { ...p, maxHp: newMaxHp, hp: newHp, isAlive: newHp > 0 };
        });
        collapseLog = createLog(`【宇宙の崩壊】Lv${state.collapseCounter + 1}: 全員に${damage}ダメージ / MaxHP-${maxHpReduction}`, 'SYSTEM');
    }

    const reshuffleLog = createLog('【銀河再編】全カード回収・再配布完了。', 'RESHUFFLE');

    const interimState = {
        ...state,
        deck: finalDeck,
        players: finalPlayersAfterCollapse,
        discardPile: [],
        collapseCounter: state.collapseCounter + 1,
        logs: collapseLog ? [...state.logs, reshuffleLog, collapseLog] : [...state.logs, reshuffleLog],
    };
    const winner = checkWinCondition(interimState);
    return { ...interimState, phase: winner ? 'GAME_OVER' : 'RESHUFFLE', winner };
};

// ダメージ適用
const applyDamage = (players: Record<string, Player>, targetId: string, amount: number, sourceId?: string): { updatedPlayers: Record<string, Player>, log: string, killOccurred: boolean } => {
    const p = players[targetId];
    if (!p || !p.isAlive) return { updatedPlayers: players, log: '', killOccurred: false };

    if (p.statusEffects && p.statusEffects.includes('INVINCIBLE')) {
        return { updatedPlayers: players, log: `${p.name}は星の結界で守られている！ (0ダメ)`, killOccurred: false };
    }

    const newHp = Math.max(0, p.hp - amount);
    const isNowDead = newHp === 0;

    let sourcePlayer = sourceId ? players[sourceId] : undefined;
    if (sourcePlayer) {
        sourcePlayer = { ...sourcePlayer, damageDealt: sourcePlayer.damageDealt + amount };
        if (isNowDead) {
            sourcePlayer = { ...sourcePlayer, killCount: sourcePlayer.killCount + 1 };
        }
    }

    const newTargetPlayer = {
        ...p,
        hp: newHp,
        isAlive: !isNowDead,
        lastAttackerId: sourceId // Record the attacker
    };

    // 自爆（自分への攻撃）の場合、HP減少と戦績更新をマージする必要がある
    if (sourceId === targetId && sourcePlayer) {
        // sourcePlayerには更新されたdamageDealt/killCountが入っている
        Object.assign(newTargetPlayer, {
            damageDealt: sourcePlayer.damageDealt,
            killCount: sourcePlayer.killCount
        });
    }

    const nextPlayers = {
        ...players,
        [targetId]: newTargetPlayer,
        // 他人への攻撃の場合のみ、攻撃者の状態を別途更新
        ...(sourcePlayer && sourceId && sourceId !== targetId ? { [sourceId]: sourcePlayer } : {})
    };

    return {
        updatedPlayers: nextPlayers,
        log: `${p.name}に${amount}ダメージ！` + (isNowDead ? ' 撃破！' : ''),
        killOccurred: isNowDead
    };
};

const healPlayer = (players: Record<string, Player>, targetId: string, amount: number): { updatedPlayers: Record<string, Player>, log: string } => {
    const p = players[targetId];
    if (!p || !p.isAlive) return { updatedPlayers: players, log: '' };
    const newHp = Math.min(p.maxHp, p.hp + amount);
    const healedAmount = newHp - p.hp;
    return {
        updatedPlayers: { ...players, [targetId]: { ...p, hp: newHp } },
        log: `${p.name}のHPが${healedAmount}回復！`
    };
};


// 情報判定ヘルパー関数
const performInfoCheck = (
    sourceCard: Card,
    targetPlayer: Player,
    checkType: 'RED' | 'BLUE' | 'TRICKSTER' | 'READINGS'
): { result: string; isPublic: boolean } => {
    // 1. 星読みの光は全てを貫通
    if (sourceCard.isTruthSeeker || checkType === 'READINGS') {
        const teamName = getTeamNameJP(targetPlayer.team);
        return {
            result: `星読みの儀式: ${targetPlayer.name}の正体は【${teamName}】です！（確定情報）`,
            isPublic: true
        };
    }

    // 2. invisible_star所持チェック
    const hasInvisible = targetPlayer.hand.some(c => c.isInvisible);
    if (hasInvisible) {
        return {
            result: `${targetPlayer.name}への判定: ERROR（測定不能）`,
            isPublic: false
        };
    }

    // 3. false_star所持チェック（嘘・反転）
    const hasFalseStar = targetPlayer.hand.some(c => c.isLieStar);
    if (hasFalseStar) {
        let actualResult: boolean;
        if (checkType === 'RED') actualResult = targetPlayer.team === 'RED';
        else if (checkType === 'BLUE') actualResult = targetPlayer.team === 'BLUE';
        else actualResult = targetPlayer.team === 'TRICKSTER';

        const invertedResult = !actualResult;
        const checkName = checkType === 'RED' ? 'レッド' : checkType === 'BLUE' ? 'ブルー' : 'トリックスター';
        return {
            result: `${targetPlayer.name}は${invertedResult ? checkName + '！' : checkName + 'ではない'}`,
            isPublic: false
        };
    }

    // 4. 正常な判定
    let actualResult: boolean;
    if (checkType === 'RED') actualResult = targetPlayer.team === 'RED';
    else if (checkType === 'BLUE') actualResult = targetPlayer.team === 'BLUE';
    else actualResult = targetPlayer.team === 'TRICKSTER';

    const checkName = checkType === 'RED' ? 'レッド' : checkType === 'BLUE' ? 'ブルー' : 'トリックスター';
    return {
        result: `${targetPlayer.name}は${actualResult ? checkName + '！' : checkName + 'ではない'}`,
        isPublic: false
    };
};

const gameReducer = (state: GameState, action: GameAction): GameState => {

    // Internal Helper for Drawing
    const executeDraw = (currentState: GameState, drawPlayerId: string, count: number): GameState => {
        const playerToDraw = currentState.players[drawPlayerId];
        console.log(`[GameContext] executeDraw called. ID: ${drawPlayerId}, Count: ${count}, Deck: ${currentState.deck.length}`);

        if (!playerToDraw) {
            console.error('[GameContext] Player not found for draw');
            return currentState;
        }

        if (currentState.deck.length < count) {
            console.log('[GameContext] Deck too low, reshuffling...');
            const reshuffledState = executeGalaxyReshuffleInternal(currentState);
            return { ...reshuffledState, phase: 'ACTION_SELECTION' };
        }

        const drawn = currentState.deck.slice(0, count);
        const remainingDeck = currentState.deck.slice(count);
        const newPlayer = { ...playerToDraw, hand: [...playerToDraw.hand, ...drawn] };
        console.log(`[GameContext] Drawn ${drawn.length} cards. Hand size now: ${newPlayer.hand.length}`);

        const interimState = {
            ...currentState,
            deck: remainingDeck,
            players: { ...currentState.players, [drawPlayerId]: newPlayer },
            phase: 'ACTION_SELECTION' as GamePhase
        };

        const winner = checkWinCondition(interimState);
        if (winner) return { ...interimState, winner, phase: 'GAME_OVER' };
        return interimState;
    };

    switch (action.type) {
        case 'INIT_GAME': {
            const { players, deck } = action.payload;
            const playerMap = players.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
            return {
                ...initialState,
                phase: 'STARTING',
                players: playerMap,
                playerOrder: players.map(p => p.id),
                deck,
                discardPile: [],
                logs: [createLog('ゲーム開始', 'SYSTEM')]
            };
        }

        case 'START_TURN': {
            const { playerId } = action.payload;
            const player = state.players[playerId];
            if (!player) return state;

            // Update Survivor logic
            let turnsAtOne = player.turnsAtOneHp;
            if (player.hp === 1) turnsAtOne += 1;
            else turnsAtOne = 0;

            const updatedPlayer = { ...player, turnsAtOneHp: turnsAtOne };

            const newState: GameState = {
                ...state,
                turnPlayerId: playerId,
                players: { ...state.players, [playerId]: updatedPlayer },
                actionsRemaining: 1, // Reset AP to 1
                phase: 'ACTION_SELECTION',
                logs: [...state.logs, createLog(`${player.name}のターン (HP:${player.hp}, AP:1)`, 'SYSTEM')],
                activeCard: null,
                pendingEffect: null
            };

            const winner = checkWinCondition(newState);
            if (winner) return { ...newState, winner, phase: 'GAME_OVER' };
            return newState;
        }

        case 'END_TURN': {
            // 1. まず現在のプレイヤーの手札を3枚まで補充
            let currentState = state;
            const currentPlayer = currentState.players[currentState.turnPlayerId];

            if (currentPlayer && currentPlayer.hand.length < 3) {
                const drawCount = 3 - currentPlayer.hand.length;
                console.log(`[END_TURN] ${currentPlayer.name}の手札補充: ${drawCount}枚ドロー`);
                // 不足分をドロー (executeDrawは内部で再編ロジックも含む)
                currentState = executeDraw(currentState, currentState.turnPlayerId, drawCount);
            }

            // 2. 次のプレイヤーへ交代
            const activePlayers = currentState.playerOrder.filter(id => currentState.players[id].isAlive);
            let idx = activePlayers.indexOf(currentState.turnPlayerId);
            if (idx === -1) idx = 0; // Fallback
            const nextId = activePlayers[(idx + 1) % activePlayers.length];
            const nextPlayer = currentState.players[nextId];

            // Clean status effects
            const updatedNext = {
                ...nextPlayer,
                statusEffects: nextPlayer.statusEffects.filter(e => e !== 'INVINCIBLE')
            };

            return {
                ...currentState, // ドロー後のStateを引き継ぐ
                turnPlayerId: nextId,
                actionsRemaining: 1,
                players: { ...currentState.players, [nextId]: updatedNext },
                phase: 'ACTION_SELECTION',
                logs: [...currentState.logs, createLog(`${updatedNext.name}のターンへ...`, 'SYSTEM')],
                activeCard: null
            };
        }

        case 'DRAW_PHASE_AUTO': {
            // ターン開始時ドローを一括処理する場合など
            return executeDraw(state, action.payload.playerId, action.payload.count);
        }

        case 'TACTICAL_BURST': {
            const { playerId } = action.payload;
            const player = state.players[playerId];

            // Requirements: HP > 1, AP > 0
            if (!player || player.hp <= 1 || state.actionsRemaining <= 0) return state;

            const newHp = player.hp - 1;
            const discards = [...state.discardPile, ...player.hand.filter(c => !c.isLieStar)];
            const lieStars = player.hand.filter(c => c.isLieStar);

            // Lie Star Shuffling
            let newDeck = [...state.deck];
            if (lieStars.length > 0) {
                newDeck = shuffleDeck([...newDeck, ...lieStars]);
            }

            const updatedPlayer = { ...player, hp: newHp, hand: [] };
            const newActions = state.actionsRemaining - 1;

            const interimState: GameState = {
                ...state,
                players: { ...state.players, [playerId]: updatedPlayer },
                deck: newDeck,
                discardPile: discards,
                actionsRemaining: newActions,
                logs: [...state.logs, createLog(`${player.name}がTactical Burst！ (HP -1, AP -1)`, 'BURST')],
                phase: 'BURST_RESOLUTION'
            };

            // Draw 3
            return executeDraw(interimState, playerId, 3);
        }

        case 'PLAY_CARD': {
            const { playerId, cardId, targetId } = action.payload;
            const player = state.players[playerId];
            if (!player || state.actionsRemaining <= 0) return state;

            const cardIndex = player.hand.findIndex(c => c.id === cardId);
            if (cardIndex === -1) return state;
            const card = player.hand[cardIndex];

            // Remove Card from Hand
            const newHand = [...player.hand];
            newHand.splice(cardIndex, 1);

            // Update Counts for GAMBLER & PROPHET
            let updatedPlayer = { ...player, hand: newHand };

            if (card.staticId === 'mystery_star') {
                updatedPlayer.mysteryStarUsage = (updatedPlayer.mysteryStarUsage || 0) + 1;
            }
            if (card.type === 'INFO') {
                updatedPlayer.infoCardUsage = (updatedPlayer.infoCardUsage || 0) + 1;
                if (!updatedPlayer.infoTypesUsed.includes(card.staticId)) {
                    updatedPlayer.infoTypesUsed = [...(updatedPlayer.infoTypesUsed || []), card.staticId];
                }
            }

            let currentPlayers = { ...state.players, [playerId]: updatedPlayer };
            let logsToAdd = [createLog(`${player.name}が「${card.name}」を使用`, 'INFO')];

            // --- Logic Definitions ---
            type ResolveResult = { status: 'DONE' | 'PAUSE' | 'END'; players: any; logs: string[]; bonusAP?: number; active?: any; pending?: any; deck: any; discards: any; };

            const resolve = (c: Card, tId: string | undefined, p: typeof currentPlayers, d: Card[], disc: Card[]): ResolveResult => {
                let msg = '';
                let np = { ...p };
                let nd = [...d];
                let ndisc = [...disc];
                let ap = 0;

                // SimpleFizzle Check
                if (c.staticId === 'reversal' && np[playerId].hp > 5) return { status: 'DONE', players: np, logs: ['不発(HP5以下のみ)'], deck: nd, discards: ndisc };

                switch (c.staticId) {
                    case 'star_strike': if (tId) { const r = applyDamage(np, tId, 2, playerId); np = r.updatedPlayers; msg = r.log; } break;
                    case 'meteor_clash': if (tId) { const r1 = applyDamage(np, tId, 3, playerId); const r2 = applyDamage(r1.updatedPlayers, playerId, 1, playerId); np = r2.updatedPlayers; msg = `${r1.log} ${r2.log}`; } break;
                    case 'supernova': if (tId) { const r = applyDamage(np, tId, 4, playerId); np = r.updatedPlayers; msg = r.log; } break;
                    case 'star_fall': Object.keys(np).forEach(pid => { if (pid !== playerId) { const r = applyDamage(np, pid, 1, playerId); np = r.updatedPlayers; if (r.log) msg += ` ${r.log}`; } }); break;
                    case 'chaos_drive': {
                        const alives = Object.keys(np).filter(k => np[k].isAlive);
                        if (alives.length > 0) { const tid = alives[Math.floor(Math.random() * alives.length)]; const r = applyDamage(np, tid, 5, playerId); np = r.updatedPlayers; msg = `カオスD!(${np[tid].name}) ` + r.log; }
                    } break;
                    case 'healing_star': if (tId) { const r = healPlayer(np, tId, 2); np = r.updatedPlayers; msg = r.log; } break;
                    case 'star_barrier': { const u = np[playerId]; if (!u.statusEffects.includes('INVINCIBLE')) { np[playerId] = { ...u, statusEffects: [...u.statusEffects, 'INVINCIBLE'] }; msg = '結界を展開'; } } break;
                    case 'reversal': { const u = np[playerId]; np[playerId] = { ...u, hp: u.maxHp }; msg = '起死回生!'; } break;
                    case 'star_readings_light':
                        if (tId) {
                            const r = healPlayer(np, tId, 3);
                            np = r.updatedPlayers;
                            const infoCheck = performInfoCheck(c, np[tId], 'READINGS');
                            msg = r.log + ' ' + infoCheck.result;
                        }
                        break;
                    case 'forced_teleport': if (tId) {
                        const t = np[tId]; ndisc = [...ndisc, ...t.hand];
                        const dr = nd.slice(0, 3); nd = nd.slice(3); np[tId] = { ...t, hand: dr }; msg = `${t.name}の手札交換(3枚)`;
                    } break;
                    case 'time_leap': { const r = applyDamage(np, playerId, 2, playerId); np = r.updatedPlayers; if (np[playerId].isAlive) { ap = 2; msg = r.log + ' 行動権+2'; } else msg = r.log + ' 倒れた...'; } break;
                    case 'life_exchange': if (tId) { const me = np[playerId], tg = np[tId]; const mhp = me.hp, thp = tg.hp; np[playerId] = { ...me, hp: Math.min(me.maxHp, thp) }; np[tId] = { ...tg, hp: Math.min(tg.maxHp, mhp) }; msg = 'HP入替!'; } break;
                    case 'mystery_star':
                        if (nd.length === 0) return { status: 'DONE', players: np, logs: ['山札なし'], deck: nd, discards: ndisc };
                        const tops = nd[0]; nd = nd.slice(1);
                        if (tops.staticId === 'false_star') return { status: 'END', players: np, logs: ['ミステリー->嘘の星(シャッフル)'], deck: shuffleDeck([...nd, tops]), discards: ndisc };

                        const needTGT = ['ATTACK', 'HEAL', 'SPECIAL', 'INFO'].includes(tops.type) && !['star_fall', 'star_barrier', 'mystery_star', 'chaos_drive', 'time_leap'].includes(tops.staticId);
                        if (needTGT) return { status: 'PAUSE', players: np, deck: nd, discards: ndisc, logs: [`ミステリー喚起: [${tops.name}]`], pending: { cardId: tops.id, sourceCard: tops }, active: tops };

                        const sub = resolve(tops, undefined, np, nd, [...ndisc, tops]);
                        return { ...sub, logs: [`喚起: [${tops.name}]`, ...sub.logs], bonusAP: (sub.bonusAP || 0) };

                    // 情報カード
                    case 'info_red':
                        if (tId) {
                            const infoCheckRed = performInfoCheck(c, np[tId], 'RED');
                            msg = infoCheckRed.result;
                        }
                        break;
                    case 'info_blue':
                        if (tId) {
                            const infoCheckBlue = performInfoCheck(c, np[tId], 'BLUE');
                            msg = infoCheckBlue.result;
                        }
                        break;
                    case 'info_trickster':
                        if (tId) {
                            const infoCheckTrick = performInfoCheck(c, np[tId], 'TRICKSTER');
                            msg = infoCheckTrick.result;
                        }
                        break;

                    default: msg = '効果なし';
                }
                return { status: 'DONE', players: np, logs: [msg], bonusAP: ap, deck: nd, discards: ndisc };
            };

            // --- Root Execution ---
            let currentDeck = [...state.deck];
            let currentDiscards = [...state.discardPile, card];

            if (card.staticId === 'star_choice' && targetId) return { ...state, players: currentPlayers, deck: currentDeck, discardPile: currentDiscards, logs: logsToAdd, phase: 'EFFECT_CHOICE', pendingEffect: { cardId: card.id, targetId, sourceCard: card }, activeCard: card };

            // 呪いのカード処理（false_star, invisible_star）
            if (card.isCursed) {
                const cursedCardName = card.name;
                return {
                    ...state,
                    players: currentPlayers,
                    deck: shuffleDeck([...currentDeck, card]),
                    discardPile: state.discardPile, // 捨て札には追加しない
                    logs: [...state.logs, ...logsToAdd, createLog(`${cursedCardName}は呪われている...山札に戻った`, 'SPECIAL')],
                    actionsRemaining: state.actionsRemaining - 1
                };
            }

            const res = resolve(card, targetId, currentPlayers, currentDeck, currentDiscards);

            if (res.status === 'PAUSE') {
                return { ...state, players: res.players, deck: res.deck, discardPile: res.discards, logs: [...state.logs, ...logsToAdd, ...res.logs.map(l => createLog(l))], phase: 'EFFECT_CHOICE', pendingEffect: res.pending, activeCard: res.active };
            } else {
                const winner = checkWinCondition({ ...state, players: res.players });

                // 情報カードの場合、visibleToを設定
                let finalLogs = [...state.logs, ...logsToAdd];
                if (['info_red', 'info_blue', 'info_trickster'].includes(card.staticId)) {
                    // 他のプレイヤーには秘密のログ
                    finalLogs.push({
                        id: `log-${Date.now()}-public`,
                        timestamp: Date.now(),
                        message: `${player.name}が${targetId ? res.players[targetId].name : '誰か'}に情報カードを使用しました（結果は秘密です）`,
                        type: 'INFO' as const
                    });
                    // 当事者のみに見えるログ
                    res.logs.forEach(l => {
                        finalLogs.push({
                            id: `log-${Date.now()}-${Math.random()}`,
                            timestamp: Date.now(),
                            message: l,
                            type: 'SPECIAL' as const,
                            visibleTo: [playerId, targetId!] // 使用者と対象のみ
                        });
                    });
                } else if (card.staticId === 'star_readings_light') {
                    // 星読みの光は全員に公開
                    res.logs.forEach(l => {
                        finalLogs.push(createLog(l, 'SPECIAL'));
                    });
                } else {
                    // 通常のカード
                    res.logs.forEach(l => {
                        finalLogs.push(createLog(l, 'ATTACK'));
                    });
                }

                return {
                    ...state,
                    players: res.players,
                    deck: res.deck,
                    discardPile: res.discards,
                    logs: finalLogs,
                    actionsRemaining: state.actionsRemaining - 1 + (res.bonusAP || 0),
                    phase: winner ? 'GAME_OVER' : 'ACTION_SELECTION',
                    winner
                };
            }
        }

        case 'RESOLVE_CHOICE': {
            const { choice } = action.payload;
            if (!state.pendingEffect) return state;
            const { targetId } = state.pendingEffect;
            const pId = state.turnPlayerId;
            let cp = { ...state.players };
            let msg = '';

            if (choice === 'HEAL' && targetId) { const r = healPlayer(cp, targetId, 2); cp = r.updatedPlayers; msg = r.log; }
            if (choice === 'ATTACK' && targetId) { const r = applyDamage(cp, targetId, 2, pId); cp = r.updatedPlayers; msg = r.log; }

            const winner = checkWinCondition({ ...state, players: cp });
            return {
                ...state, players: cp, pendingEffect: null, activeCard: null,
                logs: [...state.logs, createLog(`選択解決: ${choice}->${msg}`, 'SPECIAL')],
                actionsRemaining: state.actionsRemaining - 1,
                phase: winner ? 'GAME_OVER' : 'ACTION_SELECTION', winner
            };
        }

        case 'RESOLVE_MYSTERY_TARGET': {
            const { targetId } = action.payload;
            if (!state.activeCard) return state;
            const card = state.activeCard;
            const pId = state.turnPlayerId;
            let cp = { ...state.players };
            let currentDeck = [...state.deck];
            let currentDiscards = [...state.discardPile];
            let msg = '';

            // star_choiceの場合は選択画面へ遷移
            if (card.staticId === 'star_choice') {
                return {
                    ...state,
                    pendingEffect: { cardId: card.id, targetId, sourceCard: card },
                    phase: 'EFFECT_CHOICE',
                    logs: [...state.logs, createLog(`運命の選択: 対象は${cp[targetId].name}`, 'SPECIAL')]
                };
            }

            // Simplified direct resolve for targeted mystery results
            switch (card.staticId) {
                case 'star_strike': { const r = applyDamage(cp, targetId, 2, pId); cp = r.updatedPlayers; msg = r.log; } break;
                case 'meteor_clash': { const r1 = applyDamage(cp, targetId, 3, pId); const r2 = applyDamage(r1.updatedPlayers, pId, 1, pId); cp = r2.updatedPlayers; msg = r1.log + ' ' + r2.log; } break;
                case 'supernova': { const r = applyDamage(cp, targetId, 4, pId); cp = r.updatedPlayers; msg = r.log; } break;
                case 'healing_star': { const r = healPlayer(cp, targetId, 2); cp = r.updatedPlayers; msg = r.log; } break;
                case 'star_readings_light': {
                    const r = healPlayer(cp, targetId, 3);
                    cp = r.updatedPlayers;
                    const infoCheck = performInfoCheck(card, cp[targetId], 'READINGS');
                    msg = r.log + ' ' + infoCheck.result;
                } break;
                case 'info_red': {
                    const infoCheckRed = performInfoCheck(card, cp[targetId], 'RED');
                    msg = infoCheckRed.result;
                } break;
                case 'info_blue': {
                    const infoCheckBlue = performInfoCheck(card, cp[targetId], 'BLUE');
                    msg = infoCheckBlue.result;
                } break;
                case 'info_trickster': {
                    const infoCheckTrick = performInfoCheck(card, cp[targetId], 'TRICKSTER');
                    msg = infoCheckTrick.result;
                } break;
                case 'forced_teleport': {
                    const t = cp[targetId];
                    currentDiscards = [...currentDiscards, ...t.hand];
                    // 3枚ドロー
                    const drawn = currentDeck.slice(0, 3);
                    currentDeck = currentDeck.slice(3);
                    cp[targetId] = { ...t, hand: drawn };
                    msg = `${t.name}の手札を全て捨て、3枚ドロー！`;
                } break;
            }

            // activeCardを捨て札に追加
            const newDisc = [...currentDiscards, card];

            const winner = checkWinCondition({ ...state, players: cp });

            // 情報カードの場合、visibleToを設定
            let finalLogs = [...state.logs];
            if (['info_red', 'info_blue', 'info_trickster'].includes(card.staticId)) {
                // 他のプレイヤーには秘密のログ
                finalLogs.push({
                    id: `log-${Date.now()}-public`,
                    timestamp: Date.now(),
                    message: `${cp[pId].name}が${cp[targetId].name}に情報カードを使用しました（結果は秘密です）`,
                    type: 'INFO' as const
                });
                // 当事者のみに見えるログ
                finalLogs.push({
                    id: `log-${Date.now()}-secret`,
                    timestamp: Date.now(),
                    message: `連鎖対象選択: ${msg}`,
                    type: 'SPECIAL' as const,
                    visibleTo: [pId, targetId] // 使用者と対象のみ
                });
            } else if (card.staticId === 'star_readings_light') {
                // 星読みの光は全員に公開
                finalLogs.push(createLog(`連鎖対象選択: ${msg}`, 'SPECIAL'));
            } else {
                // 通常のカード
                finalLogs.push(createLog(`連鎖対象選択: ${msg}`, 'SPECIAL'));
            }

            return {
                ...state,
                players: cp,
                deck: currentDeck,
                activeCard: null,
                pendingEffect: null,
                discardPile: newDisc,
                logs: finalLogs,
                actionsRemaining: state.actionsRemaining - 1,
                phase: winner ? 'GAME_OVER' : 'ACTION_SELECTION',
                winner
            };
        }

        case 'UPDATE_PLAYER_NOTE': {
            const { playerId, note } = action.payload;
            return {
                ...state,
                playerNotes: {
                    ...state.playerNotes,
                    [playerId]: note
                }
            };
        }

        default: return state;
    }
};

interface GameContextProps { state: GameState; dispatch: Dispatch<GameAction>; }
const GameContext = createContext<GameContextProps | undefined>(undefined);
export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
};
export const useGameContext = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGameContext must be used within a GameProvider');
    return context;
};

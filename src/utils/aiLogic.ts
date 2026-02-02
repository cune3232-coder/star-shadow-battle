
import type { GameState, Player, Card } from '../types/game';

// Helper to determine if a card needs a target
const isGlobalCard = (card: Card): boolean => {
    // These cards do NOT need a specific target
    const globalIds = [
        'star_fall',        // Attacks everyone else
        'star_barrier',     // Self buff
        'mystery_star',     // Uses top deck (handled separately, but if in hand needs no target)
        'chaos_drive',      // Random target
        'time_leap',        // Self buff
        'reversal',         // Self heal
        'reversal_full_heal'
    ];
    return globalIds.includes(card.staticId);
};

// Helper to get play targets
const getValidTargets = (gameState: GameState, card: Card): string[] => {
    // Attack cards: Target any living player (usually enemies, but technically any)
    if (card.type === 'ATTACK' || card.type === 'SPECIAL') {
        return gameState.playerOrder.filter(pid => gameState.players[pid].isAlive);
    }
    // Heal/Info/Defense: Target any living player
    // Heal/Info/Defense: Target any living player
    if (['HEAL', 'DEFENSE', 'INFO'].includes(card.type)) {
        return gameState.playerOrder.filter(pid => gameState.players[pid].isAlive);
    }
    return [];
};

// カオスモード用: ランダムな行動を選択
export const getRandomAction = (gameState: GameState, aiPlayerId: string): { cardId: string, targetId?: string, isChaos?: boolean } | null => {
    const aiPlayer = gameState.players[aiPlayerId];
    if (!aiPlayer) return null;

    const playableCards = aiPlayer.hand.filter(card => {
        // ★重要: ラウンド1制限（第1幕は情報カードのみ）
        const isFirstRound = (gameState.turnCount || 0) <= gameState.playerOrder.length;
        if (isFirstRound && card.type !== 'INFO') {
            // console.log(`[DEBUG] AI ${aiPlayer.name}: Skipping ${card.name} (Not INFO in Round 1)`);
            return false;
        }

        // コストチェック (すべて1アクションと仮定)
        if ((gameState.actionsRemaining || 0) < 1) return false;

        // 呪いカード等は除外
        if (card.isLieStar || card.isInvisible || card.isCursed) return false;

        // 起死回生の制限
        if (card.staticId === 'reversal' && aiPlayer.hp > 5) return false;

        return true;
    });

    console.log(`[DEBUG] AI ${aiPlayer.name} (Round 1: ${(gameState.turnCount || 0) <= gameState.playerOrder.length}): Playable cards:`, playableCards.map(c => c.name));

    if (playableCards.length === 0) return null;

    // ランダムにカードを選択
    const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];

    // グローバルカードならターゲット不要
    if (isGlobalCard(randomCard)) {
        return { cardId: randomCard.id, isChaos: true };
    }

    // ターゲットが必要な場合
    let targets = getValidTargets(gameState, randomCard);

    // ★重要: 攻撃カードは自分を除外（自殺防止）
    if (randomCard.type === 'ATTACK' || randomCard.type === 'SPECIAL') {
        targets = targets.filter(tid => tid !== aiPlayer.id);
    }

    // INFOカードは自分以外
    if (randomCard.type === 'INFO') {
        targets = targets.filter(tid => tid !== aiPlayer.id);
    }

    if (targets.length === 0) return null;

    // ランダムにターゲット選択
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];

    return { cardId: randomCard.id, targetId: randomTarget, isChaos: true };
};

// タクティカルバースト判定
export const shouldBurst = (
    aiPlayer: Player,
    isChaosMode: boolean,
    hasValidAction: boolean
): boolean => {
    // ★重要: HP 2以下ではバーストできない（バーストコスト=1HPなので安全マージン）
    if (aiPlayer.hp <= 2) return false;

    // 手札がなければバーストできない
    if (aiPlayer.hand.length === 0) return false;

    // カオスモード時: 5%の確率（ただしHP 3以上）
    if (isChaosMode && aiPlayer.hp >= 3 && Math.random() < 0.05) return true;

    // ANARCHIST: HP 8以上で50%
    if (aiPlayer.team === 'TRICKSTER' &&
        aiPlayer.tricksterObjective === 'ANARCHIST' &&
        aiPlayer.hp >= 8) {
        return Math.random() < 0.5;
    }

    // 有効な手がない + HP 5以上
    if (!hasValidAction && aiPlayer.hp >= 5) return true;

    return false;
};


export const decideAIAction = (gameState: GameState, aiPlayerId: string): { cardId: string, targetId?: string, isChaos?: boolean } | null => {
    const aiPlayer = gameState.players[aiPlayerId];
    if (!aiPlayer) return null;

    // カオス判定 (30%の確率)
    const isChaosMode = Math.random() < 0.3;

    if (isChaosMode) {
        console.log(`[AI Chaos] ${aiPlayer.name} がカオスモードで行動します！`);
        return getRandomAction(gameState, aiPlayer.id);
    }

    // スマートモード: 既存のスコアリングロジック
    let bestScore = -9999;
    let bestAction: { cardId: string, targetId?: string } | null = null;
    let debugReason = '';

    // Loop through hand
    for (const card of aiPlayer.hand) {
        // Skip unplayable cards (Curses)
        if (card.isLieStar || card.isInvisible || card.isCursed) continue;

        // Restriction: Reversal (起死回生) only allowed if HP <= 5
        if (card.staticId === 'reversal' && aiPlayer.hp > 5) continue;

        // --- Round 1 Restriction Logic for AI ---
        const isFirstRound = (gameState.turnCount || 0) <= gameState.playerOrder.length;
        if (isFirstRound) {
            // Strict Rule: Only INFO cards allowed in Round 1.
            if (card.type !== 'INFO') continue;
        }

        // Target-less cards
        if (isGlobalCard(card)) {
            const score = evaluateAction(gameState, aiPlayer, card, undefined);
            if (score > bestScore) {
                bestScore = score;
                bestAction = { cardId: card.id, targetId: undefined };
                debugReason = `Global Card ${card.name} (${score})`;
            }
            continue;
        }

        // Targeted cards
        let targets = getValidTargets(gameState, card);

        // Filter out self for INFO cards
        if (card.type === 'INFO') {
            targets = targets.filter(tid => tid !== aiPlayerId);
        }

        // Shuffle targets to prevent bias towards Player 1 (or lower IDs) when scores are tied
        for (let i = targets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [targets[i], targets[j]] = [targets[j], targets[i]];
        }

        for (const targetId of targets) {
            // Validate self-targeting for attacks if necessary (usually allowed but typically bad score)
            const score = evaluateAction(gameState, aiPlayer, card, targetId);
            if (score > bestScore) {
                bestScore = score;
                bestAction = { cardId: card.id, targetId };
                debugReason = `Target ${gameState.players[targetId].name} with ${card.name} (${score})`;
            }
        }
    }

    // Pass if no good move
    if (bestScore <= 0) return null;

    console.log(`[AI Smart] ${aiPlayer.name} chose: ${debugReason}`);
    return bestAction;
};

// --- Memory / Inference Logic ---

// ログ解析による敵対/友好度の推測
const calculateTrustScore = (state: GameState, aiId: string, targetId: string): number => {
    // 1. 確定情報の確認
    const ai = state.players[aiId];
    const target = state.players[targetId];

    if (ai.id === target.id) return 100; // 自分は信頼度MAX

    if (target.isRevealed) {
        if (ai.team === 'RED') {
            return target.team === 'RED' ? 100 : -100;
        }
        if (ai.team === 'BLUE') {
            return target.team === 'BLUE' ? 100 : -100;
        }
        // TRICKSTER視点: 全員利用対象だが、基本は敵扱い
        return -50;
    }

    // 2. ログ解析 (簡易メモリ)
    let score = 0;

    // 最近のログ50件を確認
    const recentLogs = state.logs.slice(-50);

    for (const log of recentLogs) {
        if (!log.data || !log.data.targetId || !log.data.sourceId) continue;

        const sourceId = log.data.sourceId;
        const targetLogId = log.data.targetId;

        // A. 自分の味方(推定)が攻撃されたら、攻撃者は敵
        if (targetLogId === aiId || score > 20) { // 自分 または 信頼できる人が
            if (sourceId === targetId) {
                if (log.type === 'ATTACK') score -= 30; // 攻撃してきた
                if (log.type === 'HEAL') score += 20;   // 回復してくれた
            }
        }

        // B. 対象が誰かを攻撃した場合
        if (sourceId === targetId) {
            if (log.type === 'ATTACK') {
                // 自分を殴った -> 敵
                if (targetLogId === aiId) score -= 40;
                // 他人を殴った -> その他人が敵なら味方の可能性、その他人が味方なら敵
                // (複雑になりすぎるので一旦省略、シンプルに「好戦的」とみなす？)
            }
        }
    }

    return score;
};

// --- Evaluation Logic ---

const evaluateAction = (state: GameState, ai: Player, card: Card, targetId?: string): number => {
    let score = 0;
    const target = targetId ? state.players[targetId] : undefined;

    // --- A. Base Score ---
    switch (card.type) {
        case 'ATTACK': score += 10; break;
        case 'HEAL': score += 10; break;
        case 'SPECIAL': score += 15; break;
        case 'INFO': score += 5; break;
        default: score += 5; break;
    }

    // --- 過剰回復防止 (Overheal Prevention) ---
    if (card.type === 'HEAL' && target) {
        if (target.hp >= target.maxHp) {
            // SAINT例外: 回復回数稼ぎのため軽いペナルティ
            if (ai.team === 'TRICKSTER' && ai.tricksterObjective === 'SAINT') {
                score -= 50;
            } else {
                return -9999; // 絶対選ばない
            }
        }
    }

    // --- B. Role Bonus (Switching by Role) ---

    // TRICKSTER Specific - 8 Roles Branching
    if (ai.team === 'TRICKSTER') {
        const objective = ai.tricksterObjective;

        switch (objective) {
            case 'REAPER': // 死神
                // キル優先
                if (target && card.type === 'ATTACK') {
                    if (target.hp <= getCardDamage(card)) score += 1000; // KILL CONFIRM
                    if (target.hp <= 3) score += 50; // Near Death
                }
                break;

            case 'SAINT': // 聖人
                // 回復マン
                if (card.type === 'HEAL' && target && target.id !== ai.id) score += 500;
                if (card.type === 'ATTACK') score -= 100; // DON'T ATTACK
                break;

            case 'MARTYR': // 殉教者
                // 復讐 & 自傷
                if (target && target.id === ai.lastAttackerId && card.type === 'ATTACK') score += 200;
                if (card.staticId === 'meteor_crash') score += 100; // Self damage
                break;

            case 'GAMBLER': // 賭博師
                // 星依存
                if (card.staticId === 'mystery_star') score += 1000;
                break;

            case 'PROPHET': // 預言者
                // 情報収集
                if (card.type === 'INFO') {
                    const infoType = card.staticId;
                    if (!ai.infoTypesUsed?.includes(infoType)) score += 300;
                }
                break;

            case 'SURVIVOR': // 生存者 (強化: hp <= 5)
                // 防衛
                if (ai.hp <= 5) {
                    if (card.type === 'HEAL' || card.type === 'DEFENSE') {
                        if (!targetId || targetId === ai.id) score += 1000; // 強化
                    }
                }
                break;

            case 'ANARCHIST': // 崩壊 (強化: hp >= 8でカード使用推奨)
                // 浪費
                if (ai.hp >= 8) {
                    score += 100; // カード使用を推奨
                }
                if (card.type === 'SPECIAL' || card.staticId === 'star_rain') score += 50;
                break;

            case 'SADIST': // 加虐者
                // HPが高い敵を削る
                if (card.type === 'ATTACK' && target && target.hp >= 6) {
                    score += 50;
                }
                break;
        }
    }
    // TEAM AI (RED / BLUE)
    else {
        if (target) {
            const trust = calculateTrustScore(state, ai.id, target.id);
            const isFriend = trust > 0;
            const isEnemy = trust < 0;

            if (card.type === 'ATTACK') {
                if (isEnemy) score += 50; // 敵確定/推測なら攻撃
                if (isFriend) return -9999; // 味方撃ち厳格禁止 (強化)
            }

            if (card.type === 'HEAL') {
                if (isFriend) score += 50; // 味方回復
                if (isEnemy) score -= 50; // 敵回復しない
            }
        }
    }

    // --- C. Context Bonus ---

    // HP Critical (共通)
    if (ai.hp <= 2) {
        if (card.type === 'HEAL' || card.type === 'DEFENSE') {
            if (!target || target.id === ai.id) score += 100;
        }
    }

    // Overkill Check
    if (target && target.hp <= 0 && card.type === 'ATTACK') {
        score -= 9999;
    }

    return score;
};

// --- Helpers ---

const getCardDamage = (card: Card): number => {
    switch (card.staticId) {
        case 'star_strike': return 2;
        case 'meteor_crash': return 3; // Self 1 damage handled elsewhere
        case 'supernova': return 4;
        case 'chaos_drive': return 5; // Average/Random
        case 'star_rain': return 1; // AOE
        default: return 0;
    }
};

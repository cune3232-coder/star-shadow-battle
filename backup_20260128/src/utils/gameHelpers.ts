import { Card, Player, Team } from '../types/game';
import { shuffleDeck as shuffle } from '../constants/cards';

// デッキシャッフル（既存の関数を再エクスポートまたは利用）
export const shuffleDeck = (deck: Card[]): Card[] => {
    return shuffle(deck);
};

// ダメージ計算
export const calculateDamage = (
    baseDamage: number,
    target: Player,
    source?: Player
): number => {
    let damage = baseDamage;

    // 星の結界（無敵）チェックなどはここで拡張可能
    // 現在は単純なダメージ計算のみ

    return Math.max(0, damage);
};

// プレイヤーへのダメージ適用
export const applyDamage = (player: Player, damage: number): Player => {
    // 星の結界などのステータスチェック（必要なら実装）
    // とりあえず単純減少
    const newHp = Math.max(0, player.hp - damage);
    return {
        ...player,
        hp: newHp,
        isAlive: newHp > 0
    };
};

// 手札からカードを削除
export const removeCardFromHand = (hand: Card[], cardId: string): { newHand: Card[], removedCard?: Card } => {
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { newHand: hand };

    const newHand = [...hand];
    const removedStats = newHand.splice(cardIndex, 1);
    return { newHand, removedCard: removedStats[0] };
};

// 山札からのドロー処理（枚数指定）
// 足りない場合は空配列を返し、呼び出し元で「銀河再編」をトリガーさせる設計も可能だが、
// ここでは単純に引けるだけ引く処理とする
export const drawCards = (deck: Card[], count: number): { drawn: Card[], remainingDeck: Card[] } => {
    if (deck.length < count) {
        // 足りない場合もそのまま返す（呼び出し元で再編判定をするため）
        return { drawn: deck, remainingDeck: [] };
    }
    const drawn = deck.slice(0, count);
    const remainingDeck = deck.slice(count);
    return { drawn, remainingDeck };
};

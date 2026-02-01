import { v4 as uuidv4 } from 'uuid';
import type { Card } from '../types/game';

// --- Card Definitions (Static Data) ---
// Total 48 Cards
// Attack: 15, Heal/Def: 10, Special: 14, Info: 9

const ATTACK_CARDS = [
    { id: 'star_strike', name: '星撃', count: 6, description: '単体に2ダメージ' },
    { id: 'meteor_clash', name: 'メテオクラッシュ', count: 3, description: '単体に3ダメージ、自分に1ダメージ' },
    { id: 'supernova', name: 'スーパーノヴァ', count: 2, description: '単体に4ダメージ' },
    { id: 'star_fall', name: '星の雨', count: 2, description: '自分以外の全員に1ダメージ' },
    { id: 'chaos_drive', name: 'カオス・ドライブ', count: 2, description: 'ランダムな対象1人に5ダメージ (ログに誰に当たったか表示)' }
];

const HEAL_DEF_CARDS = [
    { id: 'healing_star', name: '癒やしの星', count: 6, description: '単体のHPを2回復' },
    { id: 'star_barrier', name: '星の結界', count: 3, description: '次の自分のターンまでダメージ無効' },
    { id: 'reversal', name: '起死回生', count: 1, description: 'HPが5以下の時のみ使用可。HPを全回復する' }
];

const SPECIAL_CARDS = [
    { id: 'star_choice', name: '運命の選択', count: 4, description: '「2ダメージ」か「2回復」を選択して対象に使用' },
    { id: 'mystery_star', name: 'ミステリースター', count: 4, description: '山札の一番上を使用する' },
    { id: 'forced_teleport', name: '強制転送', count: 2, description: '対象の手札を全て捨てさせ、山札から3枚引かせる' },
    { id: 'time_leap', name: 'タイム・リープ', count: 2, description: 'HPを2消費し、行動権を+2する' },
    { id: 'life_exchange', name: 'ライフ・エクスチェンジ', count: 1, description: '対象と自分のHPを入れ替える' },
    { id: 'star_readings_light', name: '星読みの光', count: 1, description: '対象を3回復し、その正体を嘘偽りなく全員に公開する（絶対的真実）', isTruthSeeker: true }
];

const TRICK_CARDS = [
    { id: 'false_star', name: '嘘の星', count: 1, description: '【呪い】所持中、情報判定を反転させる。捨てると山札に戻る', isLieStar: true, isCursed: true },
    { id: 'invisible_star', name: 'インビジブル・スター', count: 1, description: '【呪い】所持中、情報判定をERRORにする。捨てると山札に戻る', isInvisible: true, isCursed: true }
];

const INFO_CARDS = [
    { id: 'info_red', name: '情報：赤の星', count: 4, description: '対象が「レッド」か判定する' },
    { id: 'info_blue', name: '情報：青の星', count: 4, description: '対象が「ブルー」か判定する' },
    { id: 'info_trickster', name: '情報：深淵の星', count: 4, description: '対象が「トリックスター」か判定する' }
];

export const generateDeck = (): Card[] => {
    let deck: Card[] = [];

    ATTACK_CARDS.forEach(d => {
        for (let i = 0; i < d.count; i++) deck.push({ id: uuidv4(), staticId: d.id, name: d.name, type: 'ATTACK', description: d.description });
    });

    HEAL_DEF_CARDS.forEach(d => {
        const type = d.id === 'star_barrier' ? 'DEFENSE' : 'HEAL';
        for (let i = 0; i < d.count; i++) deck.push({ id: uuidv4(), staticId: d.id, name: d.name, type, description: d.description });
    });

    SPECIAL_CARDS.forEach(d => {
        for (let i = 0; i < d.count; i++) {
            deck.push({
                id: uuidv4(),
                staticId: d.id,
                name: d.name,
                type: 'SPECIAL',
                description: d.description,
                isTruthSeeker: d.isTruthSeeker
            });
        }
    });

    TRICK_CARDS.forEach(d => {
        for (let i = 0; i < d.count; i++) {
            deck.push({
                id: uuidv4(),
                staticId: d.id,
                name: d.name,
                type: 'TRICK',
                description: d.description,
                isLieStar: d.isLieStar,
                isInvisible: d.isInvisible,
                isCursed: d.isCursed
            });
        }
    });

    INFO_CARDS.forEach(d => {
        for (let i = 0; i < d.count; i++) {
            deck.push({
                id: uuidv4(),
                staticId: d.id,
                name: d.name,
                type: 'INFO',
                description: d.description
            });
        }
    });

    return shuffleDeck(deck);
};

export const createOmegaStar = (): Card => ({
    id: uuidv4(),
    staticId: 'omega_star',
    name: '終焉の星（オメガ）',
    type: 'SPECIAL',
    description: '【逆転】自分以外の全員に3ダメージを与え、自分は3回復する。',
    isCursed: false
});

export const createPhoenixStar = (): Card => ({
    id: uuidv4(),
    staticId: 'phoenix_star',
    name: '不死鳥の星',
    type: 'SPECIAL',
    description: '【再生】次の自分のターンまで、HPが0になった瞬間に全回復して復活する。',
    isCursed: false
});

export const shuffleDeck = (deck: Card[]): Card[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
};

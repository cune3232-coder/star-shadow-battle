import { generateDeck } from '../constants/cards';
import type { Player, Team, TricksterObjective } from '../types/game';

const TEAM_DISTRIBUTION: Record<number, { RED: number; BLUE: number; TRICKSTER: number }> = {
    3: { RED: 1, BLUE: 1, TRICKSTER: 1 },
    4: { RED: 1, BLUE: 1, TRICKSTER: 2 },
    5: { RED: 2, BLUE: 2, TRICKSTER: 1 },
    6: { RED: 2, BLUE: 2, TRICKSTER: 2 },
    7: { RED: 2, BLUE: 2, TRICKSTER: 3 },
    8: { RED: 3, BLUE: 3, TRICKSTER: 2 }
};

const TRICKSTER_OBJECTIVES: TricksterObjective[] = [
    'REAPER', 'ANARCHIST', 'SADIST', 'SAINT', 'SURVIVOR', 'MARTYR', 'GAMBLER', 'PROPHET'
];

const CPU_NAMES = [
    'カイト', 'レン', 'ルナ', 'ソラ', 'ノア',
    'レオ', 'アリス', 'シオン', 'レイ', 'ユウ',
    'サラ', 'アラン', 'ミオ', 'リク', 'エマ',
    'ハルト', 'メイ', 'ジン', 'ロイ', 'ニーナ'
];

const generateRandomNames = (count: number): string[] => {
    // Shuffle the name list
    const shuffled = [...CPU_NAMES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

export const setupNewGame = (playerCount: number, customUserName: string = 'あなた'): { players: Player[], deck: any[] } => {
    const players: Player[] = [];
    const distribution = TEAM_DISTRIBUTION[playerCount];
    const roles: Team[] = [];

    // 1. Assign Teams
    for (let i = 0; i < distribution.RED; i++) roles.push('RED');
    for (let i = 0; i < distribution.BLUE; i++) roles.push('BLUE');
    for (let i = 0; i < distribution.TRICKSTER; i++) roles.push('TRICKSTER');
    roles.sort(() => Math.random() - 0.5);

    // 2. Generate Random Names for CPUs
    const cpuNames = generateRandomNames(playerCount - 1);

    // 3. Create Player Objects
    for (let i = 0; i < playerCount; i++) {
        const id = i === 0 ? 'player-1' : `cpu-${i}`;
        const name = i === 0 ? customUserName : cpuNames[i - 1];
        const team = roles[i];
        let tricksterObjective: TricksterObjective | undefined;

        if (team === 'TRICKSTER') {
            tricksterObjective = TRICKSTER_OBJECTIVES[Math.floor(Math.random() * TRICKSTER_OBJECTIVES.length)];
        }

        players.push({
            id,
            name,
            team,
            hp: 10,
            maxHp: 10,
            hand: [],
            isAlive: true,
            isRevealed: false,
            isTurn: false,
            isPhoenixActive: false,
            statusEffects: [],
            tricksterObjective,
            killCount: 0,
            damageDealt: 0,
            turnsAtOneHp: 0,
            mysteryStarUsage: 0,
            infoCardUsage: 0,
            infoTypesUsed: [],
            healingDone: 0,
            actionsRemaining: 0
        });
    }

    // 4. Generate Deck
    let deck = generateDeck();

    // 5. Initial Rigged Deal (Guarantee 1 Info Card per Player for Round 1)
    const infoCards = deck.filter(c => c.type === 'INFO');
    const otherCards = deck.filter(c => c.type !== 'INFO');

    console.log(`[DEBUG] initializeGame: Starting rigged deal. Info cards: ${infoCards.length}, Other cards: ${otherCards.length}`);

    players.forEach(player => {
        if (infoCards.length > 0) {
            const card = infoCards.pop()!;
            player.hand.push(card);
            console.log(`[DEBUG] initializeGame: Gave ${card.name} to ${player.name} (${player.id})`);
        } else {
            console.error(`[DEBUG] initializeGame: Ran out of Info cards for ${player.name} (${player.id})!`);
        }
    });

    // Recombine remaining Info cards with others
    let remainingPool = [...otherCards, ...infoCards];

    // Shuffle remaining pool
    remainingPool = remainingPool.sort(() => Math.random() - 0.5);

    // Distribute 2 more cards to each player
    players.forEach(player => {
        for (let i = 0; i < 2; i++) {
            if (remainingPool.length > 0) {
                const card = remainingPool.pop()!;
                player.hand.push(card);
            }
        }
        console.log(`[DEBUG] initializeGame: ${player.name}'s final hand:`, player.hand.map(c => c.name));
    });

    console.log(`[DEBUG] initializeGame: Setup complete. Deck size: ${remainingPool.length}`);

    return { players, deck: remainingPool };
};

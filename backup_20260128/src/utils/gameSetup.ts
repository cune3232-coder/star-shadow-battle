
import { v4 as uuidv4 } from 'uuid';
import { generateDeck } from '../constants/cards';
import type { Player, Team, TricksterObjective } from '../types/game';

const TEAM_DISTRIBUTION: Record<number, { RED: number; BLUE: number; TRICKSTER: number }> = {
    3: { RED: 1, BLUE: 1, TRICKSTER: 1 },
    4: { RED: 1, BLUE: 1, TRICKSTER: 2 }, // Fallback for 4 (Not recommended)
    5: { RED: 2, BLUE: 2, TRICKSTER: 1 },
    6: { RED: 2, BLUE: 2, TRICKSTER: 2 },
    7: { RED: 2, BLUE: 2, TRICKSTER: 3 },
    8: { RED: 3, BLUE: 3, TRICKSTER: 2 }
};

const TRICKSTER_OBJECTIVES: TricksterObjective[] = [
    'REAPER', 'ANARCHIST', 'SADIST', 'SAINT', 'SURVIVOR', 'MARTYR', 'GAMBLER', 'PROPHET'
];

export const setupNewGame = (playerCount: number, userName: string): { players: Player[]; deck: any[] } => {
    // 1. Determine Distribution
    const dist = TEAM_DISTRIBUTION[playerCount] || TEAM_DISTRIBUTION[3];

    // 2. Create Team Array & Shuffle
    let teams: Team[] = [];
    for (let i = 0; i < dist.RED; i++) teams.push('RED');
    for (let i = 0; i < dist.BLUE; i++) teams.push('BLUE');
    for (let i = 0; i < dist.TRICKSTER; i++) teams.push('TRICKSTER');

    // Fisher-Yates Shuffle
    for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    // 3. Create Players
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
        const isUser = i === 0;
        const id = isUser ? 'player-1' : `player-${i + 1}`;
        const name = isUser ? userName : `Player ${i + 1}`;
        const team = teams[i];

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
            isTurn: false, // Set explicitly later
            statusEffects: [],
            tricksterObjective,
            killCount: 0,
            damageDealt: 0,
            turnsAtOneHp: 0,
            mysteryStarUsage: 0,
            infoCardUsage: 0,
            infoTypesUsed: [],
            actionsRemaining: 0 // Initialize at 0, updated by START_TURN
        });
    }

    // 4. Generate Deck
    const deck = generateDeck();

    return { players, deck };
};

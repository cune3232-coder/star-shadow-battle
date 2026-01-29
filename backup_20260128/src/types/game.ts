export type Team = 'RED' | 'BLUE' | 'TRICKSTER';

export type TricksterObjective =
    | 'REAPER'        // 死神: 指定キル数達成
    | 'ANARCHIST'     // 崩壊の使徒: 自ターンに山札0
    | 'SADIST'        // 加虐者: ダメージ総量
    | 'SAINT'         // 聖人: 不殺で生存し、決着時に勝利強奪
    | 'SURVIVOR'      // 生存者: 瀕死で生存
    | 'MARTYR'        // 殉教者: 最初の死亡者となる
    | 'GAMBLER'       // 賭博師: ミステリースター使用回数
    | 'PROPHET';      // 預言者: 情報カード3種使用＆回数

export interface Card {
    id: string; // Unique ID (uuid)
    staticId: string; // ID for card definition (e.g., 'star_strike')
    name: string;
    type: 'ATTACK' | 'HEAL' | 'DEFENSE' | 'SPECIAL' | 'INFO' | 'TRICK';
    description: string;
    canPlay?: (player: Player, gameState: GameState) => boolean;
    isLieStar?: boolean; // For 'false_star' - 情報判定を反転
    isInvisible?: boolean; // For 'invisible_star' - 情報判定をERRORに
    isCursed?: boolean; // 捨てると山札に戻る呪いのカード
    isTruthSeeker?: boolean; // For 'star_readings_light' - すべてを貫通する絶対的真実
}

export interface Player {
    id: string;
    name: string;
    team: Team;
    hp: number;
    maxHp: number;
    hand: Card[];
    isAlive: boolean;
    isRevealed: boolean; // 正体判明フラグ
    isTurn: boolean;     // ターン中フラグ
    statusEffects: string[]; // e.g., 'INVINCIBLE'

    // Chaos Mode New Fields
    tricksterObjective?: TricksterObjective;
    killCount: number;
    damageDealt: number;
    turnsAtOneHp: number; // For SURVIVOR

    // New Roles Progress
    mysteryStarUsage: number; // For GAMBLER
    infoCardUsage: number;    // For PROPHET (total usage)
    infoTypesUsed: string[];  // For PROPHET (types: 'info_red', etc.)

    lastAttackerId?: string;  // 最後にダメージを与えたプレイヤーID (MARTYR判定用)

    actionsRemaining?: number; // UI表示用などに持たせる場合推奨だが、GameState管理が主
}

export type GamePhase =
    | 'LOBBY'
    | 'STARTING'
    | 'ACTION_SELECTION'
    | 'EFFECT_CHOICE'
    | 'BURST_RESOLUTION'
    | 'RESHUFFLE'
    | 'GAME_OVER';

export interface GameLog {
    id: string;
    timestamp: number;
    message: string;
    type: 'INFO' | 'ATTACK' | 'HEAL' | 'SPECIAL' | 'SYSTEM' | 'BURST' | 'RESHUFFLE';
    visibleTo?: string[]; // 指定されたプレイヤーIDのみに表示。未指定なら全員に表示
    data?: {
        sourceId?: string;
        targetId?: string;
        cardId?: string;
        revealedCards?: Card[];
    };
}

export interface GameState {
    gameId: string;
    phase: GamePhase;
    players: Record<string, Player>; // Key: playerId
    playerOrder: string[]; // Array of playerIds
    turnPlayerId: string;
    deck: Card[];
    discardPile: Card[];
    collapseCounter: number; // 銀河再編回数
    logs: GameLog[];

    // Interrupt/Effect Processing
    effectStack: any[];
    pendingEffect: {
        cardId: string;
        targetId?: string;
        sourceCard: Card;
    } | null;
    activeCard: Card | null; // Currently being resolved card (for UI)

    // Action Logic
    actionsRemaining: number;
    winner?: 'RED_TEAM' | 'BLUE_TEAM' | 'TRICKSTER';

    // 推理メモ: プレイヤーIDごとの予想チーム
    playerNotes?: Record<string, 'RED' | 'BLUE' | 'TRICKSTER' | null>;
}

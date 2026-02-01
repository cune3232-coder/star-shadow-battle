import React from 'react';
import type { Player } from '../../types/game';

interface PlayerStatusProps {
    player: Player;
    isTurnPlayer: boolean;
    onClick?: (playerId: string) => void;
    isTargetable?: boolean;
    isMe?: boolean; // 自分自身かどうか
    playerNote?: 'RED' | 'BLUE' | 'TRICKSTER' | null; // 推理メモ
    onNoteChange?: (playerId: string, note: 'RED' | 'BLUE' | 'TRICKSTER' | null) => void; // メモ変更ハンドラ
}

export const PlayerStatus: React.FC<PlayerStatusProps> = ({
    player,
    isTurnPlayer,
    onClick,
    isTargetable,
    isMe = false,
    playerNote,
    onNoteChange
}) => {
    // HPバーの計算 (削除済み)


    // 表示するチーム（推理メモ優先）
    let displayedTeam: Player['team'] | null;
    if (isMe) {
        // 自分は常に正しいチームを表示
        displayedTeam = player.team;
    } else if (playerNote !== undefined && playerNote !== null) {
        // 推理メモがある場合はそれを表示
        displayedTeam = playerNote;
    } else if (player.isRevealed) {
        // 正体判明済みの場合は正しいチームを表示
        displayedTeam = player.team;
    } else {
        // それ以外は不明
        displayedTeam = null;
    }

    // チーム名の短縮表記 (Mobile: R/B/T, Desktop: Full)
    const getTeamLabel = (team: Player['team'] | null) => {
        if (team === null) return '?';
        switch (team) {
            case 'RED': return 'R';
            case 'BLUE': return 'B';
            case 'TRICKSTER': return 'T';
            default: return '?';
        }
    };

    const displayTeam = getTeamLabel(displayedTeam);

    // チームアイコンクリック時の処理（推理メモの切り替え）
    const handleTeamClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // 親のonClickを発火させない
        if (isMe || !onNoteChange) return; // 自分自身は変更不可

        // 循環: null -> RED -> BLUE -> TRICKSTER -> null
        let nextNote: 'RED' | 'BLUE' | 'TRICKSTER' | null;
        if (playerNote === null || playerNote === undefined) {
            nextNote = 'RED';
        } else if (playerNote === 'RED') {
            nextNote = 'BLUE';
        } else if (playerNote === 'BLUE') {
            nextNote = 'TRICKSTER';
        } else {
            nextNote = null;
        }

        onNoteChange(player.id, nextNote);
    };

    return (
        <div
            onClick={() => isTargetable && onClick && onClick(player.id)}
            className={`
        relative p-1 md:p-3 rounded-lg md:rounded-xl border transition-all 
        flex-1 min-w-0 md:w-48 md:flex-none flex flex-col justify-start gap-0.5
        ${isTargetable ? 'cursor-pointer ring-2 ring-yellow-400 hover:bg-yellow-500/20 transform hover:scale-105 z-20' : ''}
        ${isTurnPlayer
                    ? 'border-yellow-500 bg-yellow-950/40 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                    : 'border-slate-700 bg-slate-800/80'}
        ${!player.isAlive ? 'opacity-50 grayscale' : ''}
        h-auto min-h-[70px]
      `}
        >
            {/* ターンインジケーター */}
            {isTurnPlayer && (
                <>
                    <div className="md:hidden absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse z-10 box-border border border-black"></div>
                    <div className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full z-10 whitespace-nowrap">
                        手番
                    </div>
                </>
            )}

            {/* 名前表示エリア (上部) - 隙間なし */}
            <div className="flex items-center justify-center md:justify-start">
                <div className="font-bold text-white text-[10px] md:text-sm leading-tight text-center md:text-left truncate w-full">
                    {player.name}
                </div>
            </div>

            {/* 役職/チーム表示 (中央) - コンパクト */}
            <div className="flex justify-center md:justify-start w-full">
                <div
                    onClick={handleTeamClick}
                    className={`
             text-[9px] md:text-xs font-black px-1 py-0.5 rounded border transition-all cursor-pointer select-none leading-none
             ${displayedTeam === 'RED' ? 'border-red-500 text-red-500 bg-red-950/50' : ''}
             ${displayedTeam === 'BLUE' ? 'border-blue-500 text-blue-400 bg-blue-950/50' : ''}
             ${displayedTeam === 'TRICKSTER' ? 'border-purple-500 text-purple-400 bg-purple-950/50' : ''}
             ${displayedTeam === null ? 'border-slate-600 text-slate-500 bg-slate-900' : ''}
             w-full text-center
        `}
                >
                    {displayTeam}
                </div>
            </div>

            {/* HP表示 (下部) - 横並びでコンパクト化 */}
            <div className="w-full flex items-center justify-center gap-0.5 mt-auto border-t border-slate-700/50 pt-0.5">
                <span className="text-[8px] text-slate-500 scale-90 md:scale-100">HP:</span>
                <span className={`text-sm md:text-2xl font-mono font-bold ${Number(player.hp) <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {Math.floor(Number(player.hp))}
                </span>
            </div>
        </div>
    );
};

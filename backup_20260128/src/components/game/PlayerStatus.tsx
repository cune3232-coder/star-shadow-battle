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
    // HPバーの計算 (MaxHPベース)
    const hpPercentage = Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100));

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

    // 日本語化マッピング
    const getTeamLabel = (team: Player['team'] | null) => {
        if (team === null) return '？';
        switch (team) {
            case 'RED': return 'レッド';
            case 'BLUE': return 'ブルー';
            case 'TRICKSTER': return 'トリックスター';
            default: return '所属不明';
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
        relative p-3 rounded-xl border-2 transition-all w-48 shrink-0
        ${isTargetable ? 'cursor-pointer ring-2 ring-yellow-400 hover:bg-yellow-500/20 transform hover:scale-105 z-20' : ''}
        ${isTurnPlayer
                    ? 'border-yellow-500 bg-yellow-950/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                    : 'border-slate-700 bg-slate-800/50'}
        ${!player.isAlive ? 'opacity-50 grayscale' : ''}
      `}
        >
            {/* ターンインジケーター */}
            {isTurnPlayer && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full z-10 whitespace-nowrap">
                    手番
                </div>
            )}

            {/* 上部情報 */}
            <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-white truncate max-w-[70%] text-sm">
                    {player.name}
                    {!player.isAlive && <span className="ml-1 text-red-500">脱落</span>}
                </div>
                <div
                    onClick={handleTeamClick}
                    className={`
             text-xs font-mono px-2 py-0.5 rounded border transition-all
             ${displayedTeam === 'RED' ? 'border-red-500 text-red-400' : ''}
             ${displayedTeam === 'BLUE' ? 'border-blue-500 text-blue-400' : ''}
             ${displayedTeam === 'TRICKSTER' ? 'border-purple-500 text-purple-400' : ''}
             ${displayedTeam === null ? 'border-gray-500 text-gray-400' : ''}
             ${!isMe && onNoteChange ? 'cursor-pointer hover:scale-110 hover:brightness-125' : ''}
        `}
                    title={!isMe && onNoteChange ? 'クリックで推理メモを切り替え' : ''}
                >
                    {displayTeam}
                </div>
            </div>

            {/* HP Bar */}
            <div className="w-full mb-2">
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5 px-0.5 font-mono">
                    <span>HP</span>
                    <span className="text-white font-bold">{Math.floor(Number(player.hp))} / {Number(player.maxHp)}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
                    <div
                        className={`h-full transition-all duration-500
                            ${hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 20 ? 'bg-yellow-500' : 'bg-red-600'}
                        `}
                        style={{ width: `${hpPercentage}%` }}
                    />
                </div>
            </div>

            {/* Hand Summary */}
            <div className="flex gap-1 justify-center mt-2 h-8 min-h-[32px]">
                {player.hand.map((_, i) => (
                    <div key={i} className="w-5 h-7 bg-slate-600 border border-slate-500 rounded-sm -ml-2 first:ml-0 shadow-sm" />
                ))}
                {player.hand.length === 0 && <span className="text-xs text-slate-500 self-center">手札なし</span>}
            </div>
        </div>
    );
};

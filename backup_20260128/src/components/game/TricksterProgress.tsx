import React from 'react';
import type { Player } from '../../types/game';

interface TricksterProgressProps {
    player: Player;
    deckCount: number; // ANARCHIST用
}

export const TricksterProgress: React.FC<TricksterProgressProps> = ({ player, deckCount }) => {
    // トリックスターでなければ表示しない
    if (player.team !== 'TRICKSTER' || !player.tricksterObjective) return null;

    const { tricksterObjective: obj } = player;

    // 進捗テキストと進捗率（0-100）を計算
    let text = '';
    let subText = '';
    let progress = 0;
    let icon = '';

    switch (obj) {
        case 'REAPER':
            icon = '💀';
            text = `キル数: ${player.killCount} / 3`;
            progress = Math.min(100, (player.killCount / 3) * 100);
            break;

        case 'SADIST':
            icon = '🩸';
            text = `総ダメージ: ${player.damageDealt} / 40`;
            progress = Math.min(100, (player.damageDealt / 40) * 100);
            break;

        case 'GAMBLER':
            icon = '🎲';
            text = `ミステリースター使用: ${player.mysteryStarUsage} / 4`;
            progress = Math.min(100, (player.mysteryStarUsage / 4) * 100);
            break;

        case 'ANARCHIST':
            icon = '🔥';
            text = `山札を0にせよ`;
            subText = `現在: ${deckCount}枚`;
            // 山札が少ないほど進捗が高いとみなす演出（30枚スタートとして）
            progress = Math.min(100, Math.max(0, (30 - deckCount) / 30 * 100));
            if (deckCount === 0) progress = 100;
            break;

        case 'SURVIVOR':
            icon = '❤️‍🔥';
            text = `HP1での生存ターン: ${player.turnsAtOneHp} / 2`;
            progress = Math.min(100, (player.turnsAtOneHp / 2) * 100);
            break;

        case 'PROPHET':
            icon = '👁️';
            const uniqueTypes = player.infoTypesUsed.length; // Max 3
            const totalUses = player.infoCardUsage; // Max 4
            text = `予言の成就`;
            subText = `種類: ${uniqueTypes}/3, 合計: ${totalUses}/4`;
            // 簡易的な進捗計算
            const p1 = (uniqueTypes / 3) * 50;
            const p2 = (totalUses / 4) * 50;
            progress = Math.min(100, p1 + p2);
            break;

        case 'MARTYR':
            icon = '⚰️';
            text = `最初の犠牲者となれ`;
            subText = `(現在生存中)`;
            progress = 0; // 生きている限り0
            break;

        case 'SAINT':
            icon = '😇';
            const isPacifist = player.killCount === 0;
            text = `不殺を貫き生存せよ`;
            subText = isPacifist ? '現在: 達成中' : '失敗: キルしてしまった...';
            progress = isPacifist ? 50 : 0; // ゲーム終了までわからないので50%固定にしておく
            break;

        default:
            return null;
    }

    return (
        <div className="flex items-center gap-3 bg-slate-900/90 border border-purple-500/50 px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-fadeIn">
            <div className="text-2xl">{icon}</div>
            <div className="flex flex-col min-w-[140px]">
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold text-purple-300 mr-2 tracking-wider">{obj}</span>
                    <span className="text-xs font-mono text-white">{text}</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {subText && <span className="text-[10px] text-slate-400 mt-0.5 text-right">{subText}</span>}
            </div>
        </div>
    );
};

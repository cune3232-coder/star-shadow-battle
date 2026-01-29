import React from 'react';
import type { Player } from '../../types/game';

interface TricksterProgressProps {
    player: Player;
    deckCount: number; // ANARCHIST用
    totalPlayers: number; // SADIST, REAPER用
}

export const TricksterProgress: React.FC<TricksterProgressProps> = ({ player, deckCount, totalPlayers }) => {
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
            // 3人: 1キル, 4人以上: 2キル
            const reaperTarget = totalPlayers === 3 ? 1 : 2;
            text = `キル数: ${player.killCount} / ${reaperTarget}`;
            progress = Math.min(100, (player.killCount / reaperTarget) * 100);
            break;

        case 'SADIST':
            icon = '🩸';
            // 5人以下: 20ダメージ、6人以上: 30ダメージ
            const sadistTarget = totalPlayers <= 5 ? 20 : 30;
            text = `総ダメージ: ${player.damageDealt} / ${sadistTarget}`;
            progress = Math.min(100, (player.damageDealt / sadistTarget) * 100);
            break;

        case 'GAMBLER':
            icon = '🎲';
            text = `ミステリースター使用: ${player.mysteryStarUsage} / 4`;
            progress = Math.min(100, (player.mysteryStarUsage / 4) * 100);
            break;

        case 'ANARCHIST':
            icon = '🔥';
            text = `自分のターン中に山札を0に`;
            subText = `現在: ${deckCount}枚`;
            // 山札が少ないほど進捗が高いとみなす演出（48枚スタートとして）
            progress = Math.min(100, Math.max(0, (48 - deckCount) / 48 * 100));
            if (deckCount === 0) progress = 100;
            break;

        case 'SURVIVOR':
            icon = '❤️‍🔥';
            text = `HP1での生存ターン: ${player.turnsAtOneHp} / 2`;
            progress = Math.min(100, (player.turnsAtOneHp / 2) * 100);
            subText = player.hp === 1 ? '現在HP1: カウント中' : 'HP1になると開始';
            break;

        case 'PROPHET':
            icon = '👁️';
            const uniqueTypes = player.infoTypesUsed.length; // Max 3
            const totalUses = player.infoCardUsage; // Max 4
            text = `予言の成就`;
            subText = `種類: ${uniqueTypes}/3 (赤・青・深淵), 合計: ${totalUses}/4`;
            // 両方の条件を満たす必要がある
            const typeProgress = (uniqueTypes / 3) * 50;
            const useProgress = (totalUses / 4) * 50;
            progress = Math.min(100, typeProgress + useProgress);
            break;

        case 'MARTYR':
            icon = '⚰️';
            text = `敵の攻撃で最初の死亡者となれ`;
            subText = player.isAlive ? '(現在生存中)' : '(死亡済み)';
            progress = 0; // 生きている限り0、死んだら勝利判定
            break;

        case 'SAINT':
            icon = '😇';
            const isPacifist = player.killCount === 0;
            const healingProgress = Math.min(100, (player.healingDone / 10) * 100);
            text = `他人への回復: ${player.healingDone} / 10`;
            subText = isPacifist ? 'キル数: 0 (達成中)' : `キル数: ${player.killCount} (失敗)`;
            progress = isPacifist ? healingProgress : 0;
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

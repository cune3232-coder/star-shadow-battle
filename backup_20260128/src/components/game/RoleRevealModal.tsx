import React from 'react';
import type { Player, TricksterObjective } from '../../types/game';
import { Modal } from '../common/Modal';

interface RoleRevealModalProps {
    isOpen: boolean;
    player: Player;
    playerCount: number;
    onClose: () => void;
}

// トリックスター目標の説明テキスト
const getTricksterObjectiveText = (objective: TricksterObjective, playerCount: number): string => {
    switch (objective) {
        case 'REAPER':
            // 3人: 1キル、4人以上: 2キル
            const killTarget = playerCount === 3 ? 1 : 2;
            return `死神: 他のプレイヤーを${killTarget}人撃破せよ`;
        case 'ANARCHIST':
            return '崩壊の使徒: 自分のターン中に山札を0枚にせよ';
        case 'SADIST':
            // 5人以下: 20ダメージ、6人以上: 30ダメージ
            const damageTarget = playerCount <= 5 ? 20 : 30;
            return `加虐者: 累計${damageTarget}ダメージを与えよ`;
        case 'SAINT':
            return '聖人: 誰も殺さずに生存したまま、決着（チーム全滅）を迎えよ\n（勝利を横取りして単独勝利となる）';
        case 'SURVIVOR':
            return '生存者: HP1の状態で2ターン生き延びよ';
        case 'MARTYR':
            return '殉教者: 敵の攻撃を受けて、ゲーム内で「最初の死亡者」となれ\n(自爆・自殺は無効)';
        case 'GAMBLER':
            return '賭博師: 「ミステリースター」を累計4回使用せよ';
        case 'PROPHET':
            return '預言者: 「赤」「青」「深淵」の3種全ての情報カードを使用し、\nかつ情報カードを累計4回使用せよ';
        default:
            return '特殊な勝利条件が設定されています';
    }
};

export const RoleRevealModal: React.FC<RoleRevealModalProps> = ({ isOpen, player, playerCount, onClose }) => {
    const getTeamName = (team: Player['team']) => {
        switch (team) {
            case 'RED': return 'レッドチーム';
            case 'BLUE': return 'ブルーチーム';
            case 'TRICKSTER': return 'トリックスター';
            default: return '不明';
        }
    };

    const getTeamColor = (team: Player['team']) => {
        switch (team) {
            case 'RED': return 'text-red-400';
            case 'BLUE': return 'text-blue-400';
            case 'TRICKSTER': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    const getVictoryCondition = () => {
        if (player.team === 'TRICKSTER' && player.tricksterObjective) {
            return getTricksterObjectiveText(player.tricksterObjective, playerCount);
        } else if (player.team === 'RED') {
            return 'ブルーチームを全滅させろ';
        } else if (player.team === 'BLUE') {
            return 'レッドチームを全滅させろ';
        }
        return '勝利条件が設定されていません';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="text-center py-8 px-4">
                {/* タイトル */}
                <h2 className="text-2xl font-bold text-white mb-6">
                    あなたの役割
                </h2>

                {/* チーム表示 */}
                <div className="mb-8">
                    <p className="text-slate-400 text-sm mb-2">あなたは</p>
                    <p className={`text-4xl font-bold ${getTeamColor(player.team)} drop-shadow-lg`}>
                        【{getTeamName(player.team)}】
                    </p>
                    <p className="text-slate-400 text-sm mt-2">です</p>
                </div>

                {/* 勝利条件 */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
                    <h3 className="text-yellow-400 font-bold mb-3 text-lg">勝利条件</h3>
                    <p className="text-white text-base leading-relaxed whitespace-pre-line">
                        {getVictoryCondition()}
                    </p>
                </div>

                {/* トリックスターの場合の注意事項 */}
                {player.team === 'TRICKSTER' && (
                    <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 mb-6">
                        <p className="text-purple-300 text-sm">
                            ⚠️ あなたの正体と目標は秘密です。<br />
                            他のプレイヤーを欺き、目標を達成してください。
                        </p>
                    </div>
                )}

                {/* 閉じるボタン */}
                <button
                    onClick={onClose}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 
                             text-black font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 
                             shadow-lg hover:shadow-xl"
                >
                    理解した（ゲーム開始）
                </button>
            </div>
        </Modal>
    );
};

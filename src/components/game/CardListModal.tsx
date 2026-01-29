import React from 'react';
import { Modal } from '../common/Modal';

interface CardListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CardListModal: React.FC<CardListModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📋 カードリスト">
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
                {/* 攻撃カード */}
                <div>
                    <h3 className="font-bold text-red-400 mb-2 text-base">攻撃カード (ATTACK) - 計15枚</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="font-semibold">星撃</span> (6枚) - 単体に2ダメージ</li>
                        <li>• <span className="font-semibold">メテオクラッシュ</span> (3枚) - 単体に3ダメージ、自分に1ダメージ</li>
                        <li>• <span className="font-semibold">スーパーノヴァ</span> (2枚) - 単体に4ダメージ</li>
                        <li>• <span className="font-semibold">星の雨</span> (2枚) - 自分以外の全員に1ダメージ</li>
                        <li>• <span className="font-semibold">カオス・ドライブ</span> (2枚) - ランダムな対象1人に5ダメージ</li>
                    </ul>
                </div>

                {/* 回復・防御カード */}
                <div>
                    <h3 className="font-bold text-green-400 mb-2 text-base">回復・防御カード (HEAL/DEFENSE) - 計10枚</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="font-semibold">癒やしの星</span> (6枚) - 単体のHPを2回復</li>
                        <li>• <span className="font-semibold">星の結界</span> (3枚) - 次の自分のターンまでダメージ無効</li>
                        <li>• <span className="font-semibold">起死回生</span> (1枚) - HPが5以下の時のみ使用可。HPを全回復</li>
                    </ul>
                </div>

                {/* 特殊カード */}
                <div>
                    <h3 className="font-bold text-purple-400 mb-2 text-base">特殊カード (SPECIAL) - 計14枚</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="font-semibold">運命の選択</span> (4枚) - 「2ダメージ」か「2回復」を選択</li>
                        <li>• <span className="font-semibold">ミステリースター</span> (4枚) - 山札の一番上を使用</li>
                        <li>• <span className="font-semibold">強制転送</span> (2枚) - 対象の手札を全て捨てさせ、山札から3枚引かせる</li>
                        <li>• <span className="font-semibold">タイム・リープ</span> (2枚) - HPを2消費し、行動権を+2する</li>
                        <li>• <span className="font-semibold">ライフ・エクスチェンジ</span> (1枚) - 対象と自分のHPを入れ替える</li>
                        <li>• <span className="font-semibold">星読みの光</span> (1枚) - 対象を3回復し、正体を全員に公開</li>
                    </ul>
                </div>

                {/* 情報カード */}
                <div>
                    <h3 className="font-bold text-yellow-400 mb-2 text-base">情報カード (INFO) - 計6枚</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="font-semibold">情報：赤の星</span> (2枚) - 対象が「レッド」か判定</li>
                        <li>• <span className="font-semibold">情報：青の星</span> (2枚) - 対象が「ブルー」か判定</li>
                        <li>• <span className="font-semibold">情報：深淵の星</span> (2枚) - 対象が「トリックスター」か判定</li>
                    </ul>
                </div>

                {/* トリックカード */}
                <div>
                    <h3 className="font-bold text-gray-400 mb-2 text-base">トリックカード (TRICK) - 計2枚</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="font-semibold">嘘の星</span> (1枚) - 【呪い】情報判定を反転。捨てると山札に戻る</li>
                        <li>• <span className="font-semibold">インビジブル・スター</span> (1枚) - 【呪い】情報判定をERROR表示。捨てると山札に戻る</li>
                    </ul>
                </div>

                <div className="pt-2 border-t border-slate-700 text-center text-slate-400">
                    合計: 48枚
                </div>
            </div>
        </Modal>
    );
};

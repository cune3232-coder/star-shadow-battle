import React from 'react';
import { Modal } from '../common/Modal';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📖 ゲームルール">
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
                {/* 基本ルール */}
                <div>
                    <h3 className="font-bold text-blue-400 mb-2 text-base">ゲームの目的</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="text-red-400 font-semibold">レッドチーム</span>: ブルーチーム全員を倒す</li>
                        <li>• <span className="text-blue-400 font-semibold">ブルーチーム</span>: レッドチーム全員を倒す</li>
                        <li>• <span className="text-purple-400 font-semibold">トリックスター</span>: 特殊な勝利条件を達成（第三勢力）</li>
                    </ul>
                </div>

                {/* ゲームの流れ */}
                <div>
                    <h3 className="font-bold text-blue-400 mb-2 text-base">ゲームの流れ</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• 初期HP: 10、初期手札: 3枚</li>
                        <li>• ターン開始時: 行動権（AP）1付与</li>
                        <li>• <span className="font-semibold">カード使用</span>: AP 1を消費</li>
                        <li>• <span className="font-semibold">タクティカルバースト</span>: AP 1、HP-1、手札を全て捨てて新しく3枚ドロー</li>
                        <li>• <span className="font-semibold">ターン終了</span>: 残りAPを放棄。手札が3枚未満なら3枚になるまでドロー</li>
                    </ul>
                </div>

                {/* 崩壊システム */}
                <div>
                    <h3 className="font-bold text-orange-400 mb-2 text-base">崩壊システム</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• 山札が0枚になると<span className="font-semibold">再編成</span>（崩壊カウンター+1）</li>
                        <li>• <span className="text-yellow-400">レベル1（初回）</span>: ペナルティなし</li>
                        <li>• <span className="text-red-400">レベル2以降</span>: 全員にHP-1 + 最大HP-2減少</li>
                        <li className="text-orange-300 italic">※崩壊が進むほど生存困難に</li>
                    </ul>
                </div>

                {/* トリックスター */}
                <div>
                    <h3 className="font-bold text-purple-400 mb-2 text-base">トリックスターの勝利条件</h3>
                    <ul className="space-y-1 text-slate-300 text-xs">
                        <li>• <span className="font-semibold">死神</span>: 累計2キル達成（3人以下の場合1人、4人以上の場合2人）</li>
                        <li>• <span className="font-semibold">崩壊の使徒</span>: 自分のターン中に山札を0枚に</li>
                        <li>• <span className="font-semibold">加虐者</span>: 累計20ダメージ（5人以下）/30ダメージ（6人以上）</li>
                        <li>• <span className="font-semibold">聖人</span>: 他人を累計10以上回復し、誰も殺さず生存</li>
                        <li>• <span className="font-semibold">生存者</span>: HP1の状態で2ターン生き延びる</li>
                        <li>• <span className="font-semibold">殉教者</span>: 敵の攻撃で最初の死亡者となる</li>
                        <li>• <span className="font-semibold">賭博師</span>: ミステリースターを累計4回使用</li>
                        <li>• <span className="font-semibold">預言者</span>: 赤・青・深淵の3種全ての情報カードを使用、かつ累計4回使用</li>
                    </ul>
                </div>

                {/* 特殊ルール */}
                <div>
                    <h3 className="font-bold text-yellow-400 mb-2 text-base">特殊ルール</h3>
                    <ul className="space-y-1 text-slate-300">
                        <li>• <span className="font-semibold">情報判定</span>: 「嘘の星」所持中は反転、「インビジブル・スター」所持中はERROR</li>
                        <li>• <span className="font-semibold">呪いカード</span>: 捨てても山札に戻る</li>
                        <li>• <span className="font-semibold">正体公開</span>: 「星読みの光」使用時、対象の正体が全員に公開（絶対的真実）</li>
                    </ul>
                </div>

                {/* プレイのコツ */}
                <div className="pt-2 border-t border-slate-700">
                    <h3 className="font-bold text-green-400 mb-2 text-base">🎮 プレイのコツ</h3>
                    <ul className="space-y-1 text-slate-300 text-xs">
                        <li>• 情報カードで味方と敵を見極めよう</li>
                        <li>• HPとAPのバランスを考えて行動</li>
                        <li>• 山札の残り枚数に注意（崩壊対策）</li>
                        <li>• 不自然な行動をするプレイヤーに警戒（トリックスター）</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

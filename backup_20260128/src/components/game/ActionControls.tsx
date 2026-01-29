import React, { useState } from 'react';
import { Modal } from '../common/Modal';

interface ActionControlsProps {
    isMyTurn: boolean;
    onTacticalBurst: () => void;
    onEndTurn: () => void;
    canBurst: boolean; // HP > 1 etc.
    actionsRemaining: number;
}

export const ActionControls: React.FC<ActionControlsProps> = ({ isMyTurn, onTacticalBurst, onEndTurn, canBurst, actionsRemaining }) => {
    const [showConfirm, setShowConfirm] = useState(false);

    // 自分のターンでない場合は表示しない（あるいは無効化）
    if (!isMyTurn) {
        return (
            <div className="border-t border-slate-700 p-4 bg-slate-900/50 text-center text-slate-500 text-sm">
                相手のターンです...
            </div>
        );
    }

    const noActions = actionsRemaining <= 0;

    return (
        <>
            <div className="border-t border-slate-700 p-4 bg-slate-900/80 flex justify-center items-center gap-4">
                {/* AP Indicator */}
                <div className="flex flex-col items-center border-r border-slate-600 pr-6 mr-2">
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">Rest Actions</span>
                    <span className={`text-2xl font-mono font-bold ${noActions ? 'text-red-500 animate-bounce' : 'text-blue-400'}`}>
                        {actionsRemaining}
                    </span>
                </div>

                <div className="text-slate-400 text-xs text-center mr-4 min-w-[200px]">
                    {noActions ? (
                        <p className="text-red-400 font-bold animate-pulse text-sm">カード使用不可<br />ターンを終了してください</p>
                    ) : (
                        <>
                            <p className="text-slate-300">カードをクリックしてPLAY</p>
                            <p className="text-[10px] opacity-70">または、アクションを選択</p>
                        </>
                    )}
                </div>

                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!canBurst || noActions}
                    className={`
            px-6 py-3 rounded-lg font-bold tracking-wider shadow-lg border-2 transition-all
            ${canBurst && !noActions
                            ? 'bg-red-600 border-red-400 text-white hover:bg-red-500 hover:scale-105 hover:shadow-red-900/50'
                            : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'}
          `}
                >
                    タクティカルバースト
                    <span className="block text-[9px] font-normal opacity-80 mt-0.5">
                        HP-1 / 手札全入替 / 3ドロー
                    </span>
                </button>

                <button
                    onClick={onEndTurn}
                    className={`
                        ml-4 px-6 py-3 rounded-lg font-bold tracking-wider shadow-lg border-2 transition-all
                        ${noActions
                            ? 'bg-yellow-600 border-yellow-400 text-white animate-pulse hover:bg-yellow-500 shadow-yellow-500/50 scale-105'
                            : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}
                    `}
                >
                    ターン終了
                </button>
            </div>

            <Modal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Tactical Burst 確認"
                footer={
                    <>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={() => {
                                onTacticalBurst();
                                setShowConfirm(false);
                            }}
                            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-bold"
                        >
                            実行する (HP-1)
                        </button>
                    </>
                }
            >
                <div className="space-y-3 text-slate-300">
                    <p className="text-white font-bold text-lg">本当にバーストしますか？</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        <li><span className="text-red-400 font-bold">HPが 1 減少</span>します。</li>
                        <li>現在持っている<span className="text-yellow-400">手札を全て公開して捨てます</span>。</li>
                        <li>その後、山札から<span className="text-blue-400 font-bold">3枚</span>ドローします。</li>
                    </ul>
                </div>
            </Modal>
        </>
    );
};

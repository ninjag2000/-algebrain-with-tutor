import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import BrainIcon from './icons/BrainIcon';

interface SmartProgressWidgetProps {
  payload: {
    skill: string;
    improvement: number;
    accuracy: number;
    insight: string;
  };
}

const SmartProgressWidget: React.FC<SmartProgressWidgetProps> = ({ payload }) => {
  const { t } = useLocalization();

  return (
    <div className="bg-gradient-to-br from-[#1A1D24] to-[#121826] border border-white/10 rounded-2xl p-4 max-w-sm w-full mx-auto my-4 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#A78BFA] to-[#6C5CE7] rounded-lg shadow-lg">
          <BrainIcon className="w-5 h-5 text-white" />
        </div>
        <h3 className="font-bold text-sm text-white">{t('widget.skillImproved')}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-[#E6EAF2] text-base">{payload.skill}</span>
          <span className="font-black text-lg text-green-400">+{payload.improvement}%</span>
        </div>

        <div className="w-full bg-black/30 rounded-full h-2.5 border border-white/5">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${payload.accuracy}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-[#9AA3B2]">{t('widget.accuracy')}: {payload.accuracy}%</span>
        </div>
      </div>
      
      <div className="mt-5 pt-4 border-t border-white/10">
        <p className="text-xs text-[#9AA3B2] italic">
            <span className="font-bold text-purple-400">{t('widget.insight')}:</span> “{payload.insight}”
        </p>
      </div>
    </div>
  );
};

export default SmartProgressWidget;
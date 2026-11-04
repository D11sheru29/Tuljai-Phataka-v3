import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500 no-print">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Please sell and use crackers according to local laws and safety rules.</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>TULJAI PHATAKA · POS & Inventory Engine</span>
        </div>
      </div>
    </footer>
  );
};

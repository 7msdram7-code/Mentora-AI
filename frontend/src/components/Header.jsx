import React from 'react';
import { Languages, AlertOctagon, User } from 'lucide-react';

export default function Header({ 
  currentSubject, 
  activeRootCause, 
  language, 
  setLanguage,
  onNavigateToProfile 
}) {
  return (
    <header className="h-16 bg-[#171B36] border-b border-[#292E56] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Subject info & Active Root Cause pill */}
      <div className="flex items-center gap-4">
        <div>
          <span className="text-xs text-light-subtle uppercase tracking-wider font-semibold">Subject</span>
          <h2 className="text-sm font-bold text-white">{currentSubject?.name || 'Data Structures — Hashing'}</h2>
        </div>

        {activeRootCause && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-rootcause-red/15 border border-rootcause-red/40 text-rootcause-red text-xs font-bold animate-pulse">
            <AlertOctagon size={14} />
            <span>Active Root Cause: {activeRootCause}</span>
          </div>
        )}
      </div>

      {/* Right controls: Student & Language Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onNavigateToProfile}
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0F1226] hover:bg-[#1E2347] border border-[#292E56] hover:border-[#6C4CF1] text-xs text-[#A5A6C2] hover:text-white transition-all shadow-sm"
          title="Open Student Profile & 3D MirrorPet"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#6C4CF1] to-[#22C3E6] flex items-center justify-center text-white text-[10px] font-black">
            A
          </div>
          <span className="font-bold text-white">Alex Chen</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6C4CF1]/20 text-[#22C3E6] border border-[#6C4CF1]/30 font-bold">
            Pet & Profile
          </span>
        </button>

        {/* English / Tamil toggle */}
        <div className="flex items-center bg-[#0F1226] p-1 rounded-lg border border-[#292E56]">
          <button
            onClick={() => setLanguage('en')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-[#6C4CF1] text-white shadow-sm'
                : 'text-light-subtle hover:text-white'
            }`}
          >
            <span>English</span>
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
              language === 'ta'
                ? 'bg-[#6C4CF1] text-white shadow-sm'
                : 'text-light-subtle hover:text-white'
            }`}
          >
            <span>தமிழ் (Tamil)</span>
          </button>
        </div>
      </div>
    </header>
  );
}

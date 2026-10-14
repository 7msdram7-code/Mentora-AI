import React from 'react';
import { 
  BookOpen, 
  PlayCircle, 
  GitFork, 
  MessageSquare, 
  CalendarCheck,
  TrendingUp,
  User,
  Sparkles,
  RotateCcw,
  Play
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'practice', label: 'Practice', icon: PlayCircle },
  { id: 'map', label: 'Root-Cause Map', icon: GitFork },
  { id: 'teachback', label: 'Teach-back', icon: MessageSquare },
  { id: 'revision', label: 'Revision', icon: CalendarCheck },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'profile', label: 'Profile & Pet', icon: User },
];

export default function Sidebar({ activeTab, setActiveTab, onResetDemo, onLoadDemo, isLoadingDemo }) {
  return (
    <aside className="w-64 bg-[#171B36] border-r border-[#292E56] flex flex-col justify-between shrink-0 h-screen select-none">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-[#292E56] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6C4CF1] to-[#22C3E6] flex items-center justify-center shadow-lg shadow-[#6C4CF1]/30">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">MistakeMirror</h1>
            <p className="text-[11px] text-light-subtle font-medium">Root-Cause AI Tutor</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#6C4CF1] text-white shadow-md shadow-[#6C4CF1]/30'
                    : 'text-[#A5A6C2] hover:bg-[#1E2347] hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Demo Controls in Sidebar Footer */}
      <div className="p-4 border-t border-[#292E56] bg-[#0F1226]/50">
        <div className="text-[11px] font-bold text-light-subtle uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Hackathon Demo</span>
          <span className="w-2 h-2 rounded-full bg-mastered-green animate-ping" />
        </div>
        <div className="space-y-2">
          <button
            onClick={onLoadDemo}
            disabled={isLoadingDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#22C3E6]/20 border border-[#22C3E6]/40 text-[#22C3E6] hover:bg-[#22C3E6]/30 text-xs font-semibold transition-all"
          >
            <Play size={14} />
            <span>Load Demo (Q1)</span>
          </button>
          <button
            onClick={onResetDemo}
            disabled={isLoadingDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#1E2347] hover:bg-[#292E56] text-[#A5A6C2] hover:text-white text-xs font-semibold transition-all border border-[#292E56]"
          >
            <RotateCcw size={14} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

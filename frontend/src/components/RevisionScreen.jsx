import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  AlertOctagon, 
  Clock, 
  BookOpen, 
  ArrowRight, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { fetchRevisionPlan } from '../api/client';

export default function RevisionScreen({ onPracticeTopic }) {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPlan = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRevisionPlan('demo_student');
      setCards(data.cards || []);
    } catch (err) {
      setError(err.message || 'Failed to load revision plan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-light-subtle">
        <RefreshCw size={28} className="animate-spin text-[#6C4CF1] mb-2" />
        <p className="text-xs font-semibold">Generating adaptive revision schedule...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-[#0F1226]">
      {/* Header Banner */}
      <div className="bg-[#171B36] p-6 rounded-3xl border border-[#292E56] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#22C3E6] mb-1">
            <Sparkles size={14} />
            <span>Spaced-Repetition Algorithm</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Adaptive Revision Schedule</h2>
          <p className="text-xs text-light-subtle mt-1">
            Prioritized by diagnosed root causes, unblocking foundational concepts first.
          </p>
        </div>

        <button
          onClick={loadPlan}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F1226] border border-[#292E56] hover:border-[#6C4CF1] text-xs font-semibold text-white transition-all"
        >
          <RefreshCw size={14} />
          <span>Refresh Plan</span>
        </button>
      </div>

      {/* Revision Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const isRoot = card.role === 'ROOT CAUSE' || card.status === 'RED';
          const isAmber = card.status === 'AMBER' || card.role === 'SYMPTOM';
          const pct = Math.round(card.p * 100);

          let borderColor = '#292E56';
          let tagBg = 'bg-mastered-green/10 text-mastered-green border-mastered-green/30';
          let intervalBadge = 'bg-[#1E2347] text-light-panel';

          if (isRoot) {
            borderColor = '#D93636';
            tagBg = 'bg-rootcause-red/20 text-rootcause-red border-rootcause-red/40 animate-pulse';
            intervalBadge = 'bg-rootcause-red text-white font-extrabold';
          } else if (isAmber) {
            borderColor = '#F5A524';
            tagBg = 'bg-symptom-amber/20 text-symptom-amber border-symptom-amber/40';
            intervalBadge = 'bg-symptom-amber/20 text-symptom-amber border border-symptom-amber/40';
          }

          return (
            <div
              key={card.topic_id}
              className="bg-[#171B36] rounded-3xl border-2 p-5 flex flex-col justify-between shadow-lg transition-all hover:translate-y-[-2px]"
              style={{ borderColor }}
            >
              <div className="space-y-3">
                {/* Interval and Status Tag */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${intervalBadge}`}>
                    {card.suggested_days}-Day Interval
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tagBg}`}>
                    {card.role || card.status}
                  </span>
                </div>

                {/* Topic Name */}
                <h3 className="text-base font-extrabold text-white leading-tight">
                  {card.topic_name}
                </h3>

                {/* Reason */}
                <p className="text-xs text-light-subtle leading-relaxed">
                  {card.reason}
                </p>

                {/* Mastery Bar */}
                <div className="bg-[#0F1226] p-3 rounded-2xl border border-[#292E56]">
                  <div className="flex justify-between text-[11px] mb-1.5 font-semibold">
                    <span className="text-light-subtle">Mastery</span>
                    <span className="text-white">{pct}%</span>
                  </div>
                  <div className="w-full bg-[#171B36] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isRoot ? '#D93636' : isAmber ? '#F5A524' : '#1FB57A'
                      }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-[11px] text-light-subtle pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#22C3E6]" />
                    <span>Review Target: <strong>{card.review_date}</strong></span>
                  </div>
                  {card.pages && card.pages.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={13} className="text-[#6C4CF1]" />
                      <span>Note Pages: <strong>{card.pages.join(', ')}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-4 border-t border-[#292E56]">
                <button
                  onClick={() => onPracticeTopic && onPracticeTopic(card.topic_id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#0F1226] hover:bg-[#6C4CF1] border border-[#292E56] hover:border-[#6C4CF1] text-xs font-bold text-white transition-all shadow-sm"
                >
                  <span>Practice Now</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

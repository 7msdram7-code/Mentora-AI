import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowUpRight, 
  Clock, 
  BrainCircuit, 
  Target, 
  Layers,
  Sparkles
} from 'lucide-react';
import { fetchProgress } from '../api/client';

export default function ProgressScreen({ language = 'en', onNavigateToPractice, onNavigateToMap }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const progress = await fetchProgress('demo_student');
      setData(progress);
    } catch (err) {
      console.error('Failed to load progress data:', err);
      setError('Failed to load progress analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isTa = language === 'ta';

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0F1226]">
        <RefreshCw className="animate-spin text-[#6C4CF1] mb-3" size={36} />
        <p className="text-light-subtle text-sm font-medium">
          {isTa ? 'முன்னேற்றப் பகுப்பாய்வு ஏற்றப்படுகிறது...' : 'Loading learning progress analytics...'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0F1226]">
        <AlertTriangle className="text-root-cause-red mb-3" size={36} />
        <p className="text-white font-semibold mb-3">{error || 'Could not load data'}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-[#1E2347] hover:bg-[#292E56] text-white rounded-xl text-sm font-semibold transition-all border border-[#292E56]"
        >
          {isTa ? 'மீண்டும் முயற்சி செய்க' : 'Retry'}
        </button>
      </div>
    );
  }

  const { overall_mastery, topic_counts, performance, mistake_distribution, topics, recent_timeline } = data;

  const totalMistakes = Object.values(mistake_distribution || {}).reduce((a, b) => a + b, 0);

  const mistakeLabels = {
    concept_gap: {
      label: isTa ? 'கருத்து இடைவெளி' : 'Concept Gap',
      desc: isTa ? 'அடிப்படை விதிகள் புரியாத நிலை' : 'Missing fundamental definitions or rules',
      color: 'bg-[#6C4CF1]'
    },
    wrong_mental_model: {
      label: isTa ? 'தவறான மன மாதிரி' : 'Wrong Mental Model',
      desc: isTa ? 'தவறான கணக்கீட்டு முறை' : 'Flawed internal heuristic or operational order',
      color: 'bg-[#F5A524]'
    },
    careless_slip: {
      label: isTa ? 'கவனக்குறைவு பிழை' : 'Careless Slip',
      desc: isTa ? 'தெரிந்த விதியில் விரைவு பிழை' : 'Speed or arithmetic typo without deep misconception',
      color: 'bg-[#22C3E6]'
    },
    missing_prerequisite: {
      label: isTa ? 'முன்தேவை இடைவெளி' : 'Missing Prerequisite',
      desc: isTa ? 'முந்தைய தலைப்பில் உள்ள பலவீனம்' : 'Dependency failure originating in prerequisite topic',
      color: 'bg-[#D93636]'
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F1226] p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#292E56]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#6C4CF1]/20 text-[#22C3E6] border border-[#6C4CF1]/40 uppercase tracking-wider">
              {isTa ? 'விரிவான பகுப்பாய்வு' : 'Learning Analytics'}
            </span>
            <span className="text-light-subtle text-xs">• demo_student</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="text-[#22C3E6]" size={26} />
            <span>{isTa ? 'மாணவர் முன்னேற்ற மையம்' : 'Student Mastery & Progress'}</span>
          </h2>
          <p className="text-xs text-light-subtle mt-1">
            {isTa 
              ? 'கருத்து இடைவெளிகள், முன்தேவை காரணங்கள் மற்றும் தீர்க்கப்பட்ட பிழைகளின் நேரடி கண்காணிப்பு.' 
              : 'Real-time telemetry tracking concept gaps, prerequisite dependencies, and counter-example recoveries.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171B36] hover:bg-[#1E2347] text-[#A5A6C2] hover:text-white border border-[#292E56] text-xs font-semibold transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            <span>{isTa ? 'புதுப்பி' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Mastery */}
        <div className="bg-[#171B36] border border-[#292E56] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-light-subtle mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isTa ? 'ஒட்டுமொத்த தேர்ச்சி' : 'Overall Mastery'}
            </span>
            <Award className="text-[#6C4CF1]" size={18} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white">{overall_mastery}%</span>
            <span className="text-xs text-[#22C3E6] font-medium">
              ({topic_counts.mastered}/{topic_counts.total} {isTa ? 'தேர்ச்சி' : 'mastered'})
            </span>
          </div>
          <div className="w-full bg-[#0F1226] h-2 rounded-full overflow-hidden border border-[#292E56]">
            <div
              className="h-full bg-gradient-to-r from-[#6C4CF1] to-[#22C3E6] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overall_mastery)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-light-subtle mt-2 font-medium">
            <span className="text-mastered-green font-semibold">{topic_counts.mastered} Green</span>
            <span className="text-symptom-amber font-semibold">{topic_counts.learning} Amber</span>
            <span className="text-root-cause-red font-semibold">{topic_counts.root_cause} Red</span>
          </div>
        </div>

        {/* Card 2: Misconceptions Resolved */}
        <div className="bg-[#171B36] border border-[#292E56] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-light-subtle mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isTa ? 'தீர்க்கப்பட்ட தவறான கருத்துகள்' : 'Misconceptions Resolved'}
            </span>
            <CheckCircle2 className="text-mastered-green" size={18} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-mastered-green">
              {performance.misconceptions_resolved}
            </span>
            <span className="text-xs text-light-subtle font-medium">
              / {performance.misconceptions_diagnosed} {isTa ? 'கண்டறியப்பட்டது' : 'diagnosed'}
            </span>
          </div>
          <div className="text-xs text-light-subtle flex items-center gap-1.5">
            <span className="font-bold text-[#22C3E6]">{performance.resolution_rate}%</span>
            <span>{isTa ? 'எதிர்-எடுத்துக்காட்டு தீர்வு விகிதம்' : 'counter-example recovery rate'}</span>
          </div>
        </div>

        {/* Card 3: Total Attempts & Accuracy */}
        <div className="bg-[#171B36] border border-[#292E56] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-light-subtle mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isTa ? 'பயிற்சி துல்லியம்' : 'Practice Accuracy'}
            </span>
            <Target className="text-[#22C3E6]" size={18} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-white">{performance.accuracy}%</span>
            <span className="text-xs text-light-subtle font-medium">
              ({performance.correct_attempts}/{performance.total_attempts} {isTa ? 'சரி' : 'correct'})
            </span>
          </div>
          <div className="text-xs text-light-subtle flex items-center gap-1.5">
            <Clock size={13} className="text-light-subtle" />
            <span>
              {performance.total_attempts} {isTa ? 'மொத்த வினா முயற்சிகள்' : 'total question attempts recorded'}
            </span>
          </div>
        </div>

        {/* Card 4: Teach-back Evaluation */}
        <div className="bg-[#171B36] border border-[#292E56] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-light-subtle mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isTa ? 'கற்பித்தல் தேர்வு மதிப்பெண்' : 'Teach-Back Score'}
            </span>
            <BrainCircuit className="text-[#F5A524]" size={18} />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-black text-[#F5A524]">
              {performance.avg_teachback_score > 0 ? `${performance.avg_teachback_score}/10` : '—'}
            </span>
            <span className="text-xs text-light-subtle font-medium">
              {performance.avg_teachback_score >= 8 ? (isTa ? 'சிறப்பு' : 'Excellent') : (isTa ? 'நன்று' : 'In Progress')}
            </span>
          </div>
          <div className="text-xs text-light-subtle flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#F5A524]" />
            <span>{isTa ? 'கருத்து தெளிவு மற்றும் வாய்மொழி விளக்கம்' : 'Feynman method clarity & voice explanations'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Topic Breakdown & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Topic Mastery Matrix */}
        <div className="lg:col-span-2 bg-[#171B36] border border-[#292E56] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#292E56]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-[#6C4CF1]" />
                <span>{isTa ? 'தலைப்பு வாரியான தேர்ச்சி மேட்ரிக்ஸ்' : 'Topic-by-Topic Mastery Matrix'}</span>
              </h3>
              <p className="text-xs text-light-subtle mt-0.5">
                {isTa 
                  ? 'கணினி முன்தேவை வரைபடத்தின்படி 9 தலைப்புகளின் நேரடி தேர்ச்சி மதிப்பெண்கள்' 
                  : 'Deterministic Bayesian mastery scores (p) across the 9 math dependency nodes'}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-[#0F1226] border border-[#292E56] text-light-subtle font-mono">
              Thresholds: Red &lt;0.4 | Amber 0.4-0.7 | Green &ge;0.7
            </span>
          </div>

          <div className="space-y-3.5">
            {topics.map((t) => {
              const isGreen = t.status === 'GREEN';
              const isRed = t.status === 'RED' || t.role === 'ROOT CAUSE';
              const isAmber = !isGreen && !isRed;

              let barColor = 'bg-symptom-amber';
              let badgeBg = 'bg-symptom-amber/15 text-symptom-amber border-symptom-amber/30';
              let badgeLabel = 'LEARNING';

              if (isGreen) {
                barColor = 'bg-mastered-green';
                badgeBg = 'bg-mastered-green/15 text-mastered-green border-mastered-green/30';
                badgeLabel = 'MASTERED';
              } else if (isRed) {
                barColor = 'bg-root-cause-red';
                badgeBg = 'bg-root-cause-red/20 text-root-cause-red border-root-cause-red/40 animate-pulse';
                badgeLabel = t.role === 'ROOT CAUSE' ? 'ROOT CAUSE' : 'CRITICAL GAP';
              }

              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-[#0F1226]/60 border border-[#292E56] hover:border-[#6C4CF1]/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">{t.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeBg}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-white">
                        p = {t.p.toFixed(3)} ({t.percentage}%)
                      </span>
                      {onNavigateToPractice && (
                        <button
                          onClick={() => onNavigateToPractice(t.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#22C3E6] hover:text-white transition-colors"
                        >
                          <span>{isTa ? 'பயிற்சி' : 'Practice'}</span>
                          <ArrowUpRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-[#171B36] h-2 rounded-full overflow-hidden border border-[#292E56]">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(5, t.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Mistake Taxonomy & Diagnostic Feed */}
        <div className="space-y-6">
          {/* Mistake Taxonomy Card */}
          <div className="bg-[#171B36] border border-[#292E56] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#F5A524]" />
              <span>{isTa ? 'பிழை வகைப்பாடு' : 'Misconception Taxonomy'}</span>
            </h3>
            <p className="text-xs text-light-subtle">
              {isTa 
                ? 'தவறான பதில்களை வகைப்படுத்தி மூல காரணத்தைக் கண்டறியும் வகைப்பாடு.' 
                : 'Categorization of mistakes to differentiate careless slips from prerequisite deficiencies.'}
            </p>

            <div className="space-y-3 pt-1">
              {Object.entries(mistakeLabels).map(([key, info]) => {
                const count = mistake_distribution?.[key] || 0;
                const pct = totalMistakes > 0 ? Math.round((count / totalMistakes) * 100) : 0;
                return (
                  <div key={key} className="p-3 rounded-xl bg-[#0F1226]/50 border border-[#292E56]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{info.label}</span>
                      <span className="text-xs font-mono font-bold text-[#A5A6C2]">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-light-subtle mb-2 leading-relaxed">{info.desc}</p>
                    <div className="w-full bg-[#171B36] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${info.color} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Diagnostic Activity Timeline */}
          <div className="bg-[#171B36] border border-[#292E56] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-[#22C3E6]" />
              <span>{isTa ? 'சமீபத்திய கண்டறிதல் வரலாறு' : 'Recent Diagnostic Telemetry'}</span>
            </h3>

            {recent_timeline && recent_timeline.length > 0 ? (
              <div className="space-y-3">
                {recent_timeline.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#0F1226]/50 border border-[#292E56] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        item.correct 
                          ? 'bg-mastered-green/20 text-mastered-green border border-mastered-green/30' 
                          : 'bg-root-cause-red/20 text-root-cause-red border border-root-cause-red/30'
                      }`}>
                        {item.correct ? (item.is_counterexample ? 'COUNTER-EXAMPLE PASS' : 'CORRECT') : 'MISTAKE DIAGNOSED'}
                      </span>
                      <span className="text-light-subtle text-[11px] font-mono">{item.timestamp}</span>
                    </div>

                    <p className="text-white font-medium line-clamp-2">{item.question_text}</p>

                    <div className="flex items-center justify-between text-[11px] text-light-subtle pt-1 border-t border-[#292E56]">
                      <span>Answer: <strong className="text-white">{item.answer}</strong></span>
                      {item.root_topic_name && !item.correct && (
                        <span className="text-root-cause-red font-semibold">
                          Root: {item.root_topic_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-light-subtle italic text-center py-4">
                {isTa ? 'இன்னும் எந்த முயற்சிகளும் பதிவு செய்யப்படவில்லை.' : 'No attempts recorded yet. Start practicing!'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

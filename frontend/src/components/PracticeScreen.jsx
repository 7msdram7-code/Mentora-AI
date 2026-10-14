import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  AlertOctagon, 
  GitFork, 
  Sparkles,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { fetchNextQuestion, submitAnswer } from '../api/client';

export default function PracticeScreen({ 
  subjectId = 'data_structures_hashing',
  language, 
  targetQuestionId,
  onNavigateToMap, 
  onRefreshGraph 
}) {
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeSec, setTimeSec] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [counterExample, setCounterExample] = useState(null);
  const [selectedCounterOption, setSelectedCounterOption] = useState(null);
  const [counterResult, setCounterResult] = useState(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [error, setError] = useState(null);

  // Voice Think-Aloud States
  const [voiceExplanation, setVoiceExplanation] = useState('');
  const [isVoiceExplaining, setIsVoiceExplaining] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const voiceRecRef = useRef(null);

  const timerRef = useRef(null);

  // Initialize Speech Recognition for Voice Think-Aloud
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setVoiceExplanation((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
          });
        }
      };

      recognition.onerror = (e) => {
        console.warn('Voice think-aloud error:', e.error);
        setIsVoiceExplaining(false);
        if (e.error === 'not-allowed') {
          setVoiceError('Microphone permission denied.');
        }
      };

      recognition.onend = () => {
        setIsVoiceExplaining(false);
      };

      voiceRecRef.current = recognition;
    }
  }, [language]);

  const toggleVoiceExplanation = () => {
    setVoiceError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input not supported in this browser.');
      return;
    }

    if (isVoiceExplaining) {
      try {
        voiceRecRef.current?.stop();
      } catch (e) {}
      setIsVoiceExplaining(false);
    } else {
      try {
        if (voiceRecRef.current) {
          voiceRecRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-US';
          voiceRecRef.current.start();
          setIsVoiceExplaining(true);
        }
      } catch (err) {
        setIsVoiceExplaining(false);
      }
    }
  };

  // Load question
  const loadQuestion = async (topicId = null, qId = targetQuestionId) => {
    setIsLoadingQuestion(true);
    setError(null);
    setResult(null);
    setCounterExample(null);
    setSelectedOption(null);
    setSelectedCounterOption(null);
    setCounterResult(null);
    setVoiceExplanation('');
    setIsVoiceExplaining(false);
    setTimeSec(0);

    try {
      const data = await fetchNextQuestion('demo_student', subjectId, topicId, qId);
      setQuestion(data);
    } catch (err) {
      setError(err.message || 'Failed to load question');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  useEffect(() => {
    loadQuestion(null, targetQuestionId);
  }, [targetQuestionId, subjectId]);

  // Timer counter
  useEffect(() => {
    if (!result && !isLoadingQuestion && question) {
      timerRef.current = setInterval(() => {
        setTimeSec((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [result, isLoadingQuestion, question]);

  // Handle main question submission
  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting || !question) return;
    setIsSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const res = await submitAnswer({
        studentId: 'demo_student',
        questionId: question.id,
        answer: selectedOption,
        timeSec,
        language
      });
      setResult(res);

      if (res.counter_example) {
        setCounterExample(res.counter_example);
      }

      // Notify parent to refresh graph
      if (onRefreshGraph) onRefreshGraph();
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle counter-example submission
  const handleSubmitCounterExample = async () => {
    if (!selectedCounterOption || isSubmitting || !counterExample) return;
    setIsSubmitting(true);

    try {
      // Counter-example question submission
      const qId = counterExample.id || 101;
      const res = await submitAnswer({
        studentId: 'demo_student',
        questionId: qId,
        answer: selectedCounterOption,
        timeSec: 8.0,
        language,
        parentAttemptId: question.id
      });
      setCounterResult(res);

      if (onRefreshGraph) onRefreshGraph();
    } catch (err) {
      setError(err.message || 'Failed to submit counter-example answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingQuestion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-light-subtle">
        <RefreshCw size={32} className="animate-spin text-[#6C4CF1] mb-3" />
        <p className="text-sm font-semibold">Loading practice question...</p>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="p-6 rounded-2xl bg-[#171B36] border border-rootcause-red/40 max-w-md text-center">
          <AlertOctagon size={40} className="text-rootcause-red mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-2">Error</h3>
          <p className="text-sm text-light-subtle mb-4">{error}</p>
          <button
            onClick={() => loadQuestion()}
            className="px-4 py-2 rounded-xl bg-[#6C4CF1] text-white text-xs font-bold hover:bg-[#5939D8]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between bg-[#171B36] px-5 py-3 rounded-2xl border border-[#292E56]">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#6C4CF1]/20 text-[#876DFF] border border-[#6C4CF1]/40">
            {question.topic_name}
          </span>
          <span className="text-xs text-light-subtle font-medium">
            Difficulty: <strong className="text-white capitalize">{question.difficulty}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-light-subtle font-mono text-sm bg-[#0F1226] px-3 py-1 rounded-lg border border-[#292E56]">
          <Clock size={16} className="text-[#22C3E6]" />
          <span>{timeSec}s</span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-[#171B36] p-6 lg:p-8 rounded-3xl border border-[#292E56] shadow-xl">
        <h2 className="text-lg lg:text-xl font-bold text-white leading-relaxed mb-6">
          {question.text}
        </h2>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            let optStyle = 'bg-[#0F1226] border-[#292E56] hover:border-[#6C4CF1] text-light-panel';
            
            if (isSelected) {
              optStyle = 'bg-[#6C4CF1]/20 border-[#6C4CF1] text-white shadow-md shadow-[#6C4CF1]/20';
            }

            if (result) {
              if (opt.id === result.correct_answer) {
                optStyle = 'bg-mastered-green/20 border-mastered-green text-white';
              } else if (isSelected && !result.correct) {
                optStyle = 'bg-rootcause-red/20 border-rootcause-red text-white';
              }
            }

            return (
              <button
                key={opt.id}
                disabled={!!result || isSubmitting}
                onClick={() => setSelectedOption(opt.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${optStyle}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? 'bg-[#6C4CF1] text-white' : 'bg-[#1E2347] text-light-subtle'
                }`}>
                  {opt.id}
                </div>
                <span className="text-sm font-medium pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        {!result && (
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                selectedOption && !isSubmitting
                  ? 'bg-[#6C4CF1] hover:bg-[#5939D8] text-white shadow-lg shadow-[#6C4CF1]/30 cursor-pointer'
                  : 'bg-[#1E2347] text-light-subtle cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Diagnosing...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Immediate Diagnosis Result Card */}
      {result && (
        <div className={`p-6 lg:p-8 rounded-3xl border-2 shadow-2xl transition-all ${
          result.correct
            ? 'bg-[#171B36] border-mastered-green/50'
            : 'bg-[#171B36] border-rootcause-red/50'
        }`}>
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              result.correct ? 'bg-mastered-green/20 text-mastered-green' : 'bg-rootcause-red/20 text-rootcause-red'
            }`}>
              {result.correct ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                {result.correct ? 'Correct Understanding!' : 'Misconception Diagnosed'}
              </h3>
              <p className="text-sm text-light-subtle mt-1 font-medium leading-relaxed">
                {result.explanation}
              </p>
            </div>
          </div>

          {/* Root-cause trace info if incorrect */}
          {!result.correct && result.root_topic && (
            <div className="mt-5 p-4 rounded-2xl bg-[#0F1226] border border-[#292E56] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon size={18} className="text-rootcause-red" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rootcause-red">
                    Identified Root Cause:
                  </span>
                  <span className="text-sm font-extrabold text-white">
                    {result.root_topic_name || result.root_topic}
                  </span>
                </div>
                <button
                  onClick={onNavigateToMap}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#22C3E6] hover:underline"
                >
                  <GitFork size={14} />
                  <span>View on Root-Cause Map</span>
                </button>
              </div>

              {/* Prerequisite Trace Chain */}
              {result.trace && result.trace.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-light-subtle uppercase tracking-wider mb-2">
                    Prerequisite Dependency Trace:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.trace.map((node, i) => (
                      <React.Fragment key={node.id}>
                        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                          node.role === 'ROOT CAUSE'
                            ? 'bg-rootcause-red/20 border-rootcause-red text-rootcause-red'
                            : 'bg-symptom-amber/20 border-symptom-amber text-symptom-amber'
                        }`}>
                          <span>{node.name}</span>
                          <span className="text-[10px] opacity-75 font-mono">({Math.round(node.p * 100)}%)</span>
                        </div>
                        {i < result.trace.length - 1 && (
                          <span className="text-light-subtle font-mono text-xs">→ needs →</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Think-Aloud Section */}
          <div className="mt-5 p-4 rounded-2xl bg-[#0F1226] border border-[#292E56] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Mic size={16} className={isVoiceExplaining ? "text-rootcause-red animate-pulse" : "text-[#22C3E6]"} />
                <span>Voice Think-Aloud: Explain your reasoning in your own words</span>
              </div>
              <button
                type="button"
                onClick={toggleVoiceExplanation}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isVoiceExplaining
                    ? 'bg-rootcause-red text-white ring-2 ring-rootcause-red/40 animate-pulse'
                    : 'bg-[#1E2347] hover:bg-[#292E56] text-[#22C3E6] border border-[#292E56]'
                }`}
              >
                {isVoiceExplaining ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isVoiceExplaining ? 'Stop Speaking' : 'Speak to Explain'}</span>
              </button>
            </div>

            {isVoiceExplaining && (
              <div className="text-[11px] text-[#22C3E6] font-semibold animate-pulse flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-[#22C3E6] animate-ping" />
                <span>
                  🎙️ Listening... explain why you selected that answer ({language === 'ta' ? 'தமிழ்' : 'English'})
                </span>
              </div>
            )}

            {voiceError && (
              <div className="text-[11px] text-symptom-amber">{voiceError}</div>
            )}

            {voiceExplanation && (
              <div className="p-3 rounded-xl bg-[#171B36] border border-[#292E56] text-xs text-white mt-2">
                <span className="text-[10px] text-light-subtle uppercase tracking-wider block mb-1 font-semibold">
                  Transcribed Explanation:
                </span>
                <p className="italic text-[#22C3E6]">"{voiceExplanation}"</p>
                <div className="text-[10px] text-mastered-green mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  <span>Verbalizing your thought process strengthens conceptual retention!</span>
                </div>
              </div>
            )}
          </div>

          {/* Next Question / Continue Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => loadQuestion()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E2347] hover:bg-[#292E56] text-white text-xs font-bold transition-all border border-[#292E56]"
            >
              <RefreshCw size={14} />
              <span>Next Regular Question</span>
            </button>
          </div>
        </div>
      )}

      {/* Counter-Example Challenge Card */}
      {counterExample && !counterResult && (
        <div className="p-6 lg:p-8 rounded-3xl bg-[#171B36] border-2 border-[#22C3E6]/60 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#22C3E6] text-[#0F1226] text-[11px] font-extrabold uppercase tracking-wider rounded-bl-2xl flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>Belief Challenge Counter-Example</span>
          </div>

          <div className="mb-4 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#22C3E6]">
              Testing False Belief on: {counterExample.target_topic}
            </span>
            <h3 className="text-base lg:text-lg font-bold text-white mt-1 leading-snug">
              {counterExample.text}
            </h3>
          </div>

          {/* Counter-example options */}
          <div className="space-y-2.5 mb-5">
            {counterExample.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedCounterOption(opt.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  selectedCounterOption === opt.id
                    ? 'bg-[#22C3E6]/20 border-[#22C3E6] text-white'
                    : 'bg-[#0F1226] border-[#292E56] hover:border-[#22C3E6]/50 text-light-panel'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                  selectedCounterOption === opt.id ? 'bg-[#22C3E6] text-[#0F1226]' : 'bg-[#1E2347] text-light-subtle'
                }`}>
                  {opt.id}
                </div>
                <span className="text-xs font-medium pt-0.5 leading-relaxed">{opt.text}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmitCounterExample}
              disabled={!selectedCounterOption || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                selectedCounterOption && !isSubmitting
                  ? 'bg-[#22C3E6] hover:bg-[#1bb0d0] text-[#0F1226] shadow-lg shadow-[#22C3E6]/30 cursor-pointer'
                  : 'bg-[#1E2347] text-light-subtle cursor-not-allowed'
              }`}
            >
              <span>Submit Counter-Example</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Counter-Example Feedback Card */}
      {counterResult && (
        <div className="p-6 rounded-3xl bg-[#171B36] border-2 border-mastered-green/60 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-mastered-green/20 text-mastered-green flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">
                {counterResult.correct ? 'Misconception Addressed!' : 'Needs Further Review'}
              </h4>
              <p className="text-sm text-light-subtle mt-1 font-medium">
                {counterResult.explanation}
              </p>

              {/* Show mastery recovery */}
              {counterResult.mastery_changes && counterResult.mastery_changes.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  {counterResult.mastery_changes.map((c) => (
                    <div key={c.topic_id} className="px-3.5 py-2 rounded-xl bg-[#0F1226] border border-mastered-green/40 flex items-center gap-2 text-xs">
                      <span className="font-bold text-white">{c.topic_name}:</span>
                      <span className="text-light-subtle line-through">{Math.round(c.old_p * 100)}%</span>
                      <span className="text-mastered-green font-extrabold">→ {Math.round(c.new_p * 100)}%</span>
                      <span className="px-2 py-0.5 rounded bg-symptom-amber/20 text-symptom-amber font-bold text-[10px]">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={() => loadQuestion()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-bold"
            >
              <span>Continue Practice</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

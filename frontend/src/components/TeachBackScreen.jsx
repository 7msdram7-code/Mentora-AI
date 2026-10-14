import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { startTeachback, sendTeachbackMessage, finishTeachback } from '../api/client';

export default function TeachBackScreen({ language, onNavigateToPractice }) {
  const [topicId, setTopicId] = useState('order_of_operations');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // Voice Input States
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const recognitionRef = useRef(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setInputText((prev) => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${currentTranscript.trim()}` : currentTranscript.trim();
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      recognitionRef.current = null;
    }

    return () => {
      try {
        recognitionRef.current?.abort();
      } catch (e) {
        // ignore
      }
    };
  }, [language]);

  // Toggle Voice Recording
  const toggleListening = () => {
    setSpeechError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.warn('Stop error:', err);
      }
      setIsListening(false);
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-US';
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (err) {
        console.warn('Start error:', err);
        // If already started, stop and restart
        try {
          recognitionRef.current?.stop();
          setTimeout(() => {
            recognitionRef.current?.start();
            setIsListening(true);
          }, 200);
        } catch (e) {
          setIsListening(false);
        }
      }
    }
  };

  // Optional: Read text aloud with Web Speech Synthesis
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start new session
  const handleStart = async (selectedTopic = topicId) => {
    setIsStarting(true);
    setEvaluation(null);
    setMessages([]);
    setSpeechError(null);
    try {
      const data = await startTeachback(selectedTopic, 'demo_student', language);
      setSessionId(data.session_id);
      setMessages([
        { sender: 'junior', message: data.junior_message }
      ]);
    } catch (err) {
      console.error('Failed to start teachback:', err);
    } finally {
      setIsStarting(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !sessionId || isSending) return;
    if (isListening) {
      toggleListening();
    }
    const userMsg = inputText.trim();
    setInputText('');
    setMessages((prev) => [...prev, { sender: 'user', message: userMsg }]);
    setIsSending(true);

    try {
      const data = await sendTeachbackMessage(sessionId, userMsg, language);
      setMessages((prev) => [...prev, { sender: 'junior', message: data.reply }]);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Finish session
  const handleFinish = async () => {
    if (!sessionId || isFinishing) return;
    if (isListening) {
      toggleListening();
    }
    setIsFinishing(true);
    try {
      const data = await finishTeachback(sessionId, language);
      setEvaluation(data);
    } catch (err) {
      console.error('Failed to finish teachback:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0F1226] overflow-hidden">
      {/* Top Header & Topic Selector */}
      <div className="bg-[#171B36] border-b border-[#292E56] px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6C4CF1]/20 border border-[#6C4CF1]/40 flex items-center justify-center text-[#876DFF]">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Teach-Back AI Junior</h2>
            <p className="text-xs text-light-subtle">
              Teach a curious junior student by typing or speaking your explanation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={isStarting || isSending}
            className="bg-[#0F1226] border border-[#292E56] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#6C4CF1]"
          >
            <option value="order_of_operations">Order of Operations (PEMDAS)</option>
            <option value="linear_equations">Simple Equations</option>
            <option value="fractions_decimals">Fractions & Decimals</option>
            <option value="percentages">Percentages & Ratios</option>
            <option value="negative_numbers">Negative Numbers & Signs</option>
          </select>

          <button
            onClick={() => handleStart(topicId)}
            disabled={isStarting}
            className="px-4 py-2 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-bold transition-all shadow-md shadow-[#6C4CF1]/30 flex items-center gap-1.5"
          >
            {isStarting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Start New Session</span>
          </button>

          {sessionId && !evaluation && (
            <button
              onClick={handleFinish}
              disabled={isFinishing || messages.length < 2}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                messages.length >= 2
                  ? 'bg-symptom-amber hover:bg-[#e09319] text-[#0F1226] cursor-pointer'
                  : 'bg-[#1E2347] text-light-subtle cursor-not-allowed'
              }`}
            >
              {isFinishing ? 'Evaluating...' : "I'm Done Teaching"}
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
        {!sessionId && !isStarting && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#171B36] border border-[#292E56] flex items-center justify-center text-[#6C4CF1] shadow-2xl">
              <Bot size={32} />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-white mb-2">Ready to Teach?</h3>
              <p className="text-xs text-light-subtle leading-relaxed mb-6">
                Teaching forces your brain to clarify concepts. You can type or use your <strong>microphone</strong> to explain mathematical reasoning to your junior peer.
              </p>
              <button
                onClick={() => handleStart('order_of_operations')}
                className="px-6 py-3 rounded-2xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-extrabold shadow-lg shadow-[#6C4CF1]/30 transition-all inline-flex items-center gap-2"
              >
                <span>Teach Order of Operations</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isUser ? 'bg-[#6C4CF1] text-white' : 'bg-[#22C3E6]/20 text-[#22C3E6] border border-[#22C3E6]/30'
              }`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className={`p-4 rounded-2xl max-w-xl text-sm leading-relaxed ${
                isUser
                  ? 'bg-[#6C4CF1] text-white rounded-tr-none shadow-md shadow-[#6C4CF1]/20'
                  : 'bg-[#171B36] text-light-panel border border-[#292E56] rounded-tl-none'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                  <span>{isUser ? 'You' : 'Junior Student'}</span>
                  {!isUser && (
                    <button
                      onClick={() => speakText(m.message)}
                      className="hover:text-white transition-all ml-2"
                      title="Read aloud"
                    >
                      <Volume2 size={12} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#22C3E6]/20 text-[#22C3E6] flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-[#171B36] border border-[#292E56] px-4 py-2 rounded-2xl text-xs text-light-subtle flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin text-[#22C3E6]" />
              <span>Junior is thinking...</span>
            </div>
          </div>
        )}

        {/* Evaluation Summary Modal / Card */}
        {evaluation && (
          <div className="p-6 rounded-3xl bg-[#171B36] border-2 border-[#6C4CF1] shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-mastered-green/20 text-mastered-green flex items-center justify-center">
                  <Award size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Teach-Back Evaluation</h3>
                  <p className="text-xs text-light-subtle">Assessment of your explanation depth</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-[#22C3E6]">{evaluation.score}</span>
                <span className="text-xs text-light-subtle"> / 100</span>
              </div>
            </div>

            <p className="text-xs text-white bg-[#0F1226] p-4 rounded-2xl border border-[#292E56] leading-relaxed">
              {evaluation.feedback}
            </p>

            {evaluation.gaps && evaluation.gaps.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-symptom-amber uppercase tracking-wider block">
                  Identified Knowledge Gaps:
                </span>
                {evaluation.gaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-symptom-amber/10 border border-symptom-amber/30 text-xs text-white">
                    <AlertTriangle size={16} className="text-symptom-amber shrink-0 mt-0.5" />
                    <span><strong>{g.topic_id}:</strong> {g.gap}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-mastered-green/10 border border-mastered-green/30 text-xs text-mastered-green font-semibold">
                <CheckCircle2 size={16} />
                <span>No major gaps detected. Solid intuitive explanation!</span>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar with Voice Microphone */}
      {sessionId && !evaluation && (
        <div className="p-4 bg-[#171B36] border-t border-[#292E56] shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Live Voice Status Indicator */}
            {isListening && (
              <div className="flex items-center justify-between px-4 py-2 bg-rootcause-red/15 border border-rootcause-red/40 rounded-xl text-xs text-rootcause-red font-semibold animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rootcause-red animate-ping" />
                  <span>
                    🎙️ Listening to your voice... Speak your explanation in {language === 'ta' ? 'தமிழ் (Tamil)' : 'English'}.
                  </span>
                </div>
                <button
                  onClick={toggleListening}
                  className="px-2 py-0.5 rounded bg-rootcause-red text-white text-[10px] font-bold"
                >
                  Stop Recording
                </button>
              </div>
            )}

            {speechError && (
              <div className="px-4 py-2 bg-symptom-amber/20 border border-symptom-amber/40 rounded-xl text-xs text-symptom-amber flex items-center justify-between">
                <span>{speechError}</span>
                <button onClick={() => setSpeechError(null)} className="font-bold ml-2">✕</button>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Voice Microphone Button */}
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Stop voice recording" : "Speak to explain (Voice input)"}
                className={`p-3.5 rounded-2xl transition-all flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-rootcause-red text-white ring-4 ring-rootcause-red/40 animate-pulse shadow-lg shadow-rootcause-red/40'
                    : 'bg-[#0F1226] border border-[#292E56] hover:border-[#6C4CF1] text-[#22C3E6] hover:text-white'
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  isListening
                    ? (language === 'ta' ? "கேட்கிறது... பேசவும்..." : "Listening... speak your explanation...")
                    : (language === 'ta' ? "விளக்கத்தை இங்கே தட்டச்சு செய்யவும் அல்லது பேசவும்..." : "Type or speak your explanation with an example...")
                }
                disabled={isSending}
                className="flex-1 bg-[#0F1226] border border-[#292E56] rounded-2xl px-5 py-3 text-sm text-white placeholder-light-subtle focus:outline-none focus:border-[#6C4CF1]"
              />

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isSending}
                className="p-3.5 rounded-2xl bg-[#6C4CF1] hover:bg-[#5939D8] disabled:bg-[#1E2347] text-white disabled:text-light-subtle transition-all cursor-pointer shadow-lg shadow-[#6C4CF1]/30"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

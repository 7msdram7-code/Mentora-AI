import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PracticeScreen from './components/PracticeScreen';
import RootCauseMapScreen from './components/RootCauseMapScreen';
import TeachBackScreen from './components/TeachBackScreen';
import RevisionScreen from './components/RevisionScreen';
import NotesScreen from './components/NotesScreen';
import ProgressScreen from './components/ProgressScreen';
import ProfileScreen from './components/ProfileScreen';
import { fetchSubjectGraph, resetDemo, loadDemo } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('practice');
  const [language, setLanguage] = useState('en');
  const [currentSubject, setCurrentSubject] = useState({
    id: 'data_structures_hashing',
    name: 'Data Structures — Hashing'
  });
  const [activeRootCause, setActiveRootCause] = useState(null);
  const [targetQuestionId, setTargetQuestionId] = useState(1);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoNotice, setDemoNotice] = useState(null);

  // Sync active root cause from backend graph
  const refreshGraphMeta = async () => {
    try {
      const data = await fetchSubjectGraph(currentSubject.id, 'demo_student');
      setActiveRootCause(data.active_root_cause);
    } catch (e) {
      console.warn('Failed to sync graph meta:', e);
    }
  };

  useEffect(() => {
    refreshGraphMeta();
  }, [currentSubject.id]);

  // Demo Handlers
  const handleResetDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await resetDemo();
      setDemoNotice('Demo student reset to 0.5 baseline mastery.');
      setActiveRootCause(null);
      setTargetQuestionId(null);
      await refreshGraphMeta();
      setTimeout(() => setDemoNotice(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const data = await loadDemo();
      setDemoNotice('Scripted Demo Loaded: Key 25 into table size 10 using h(k)=k%10.');
      setTargetQuestionId(1);
      setActiveTab('practice');
      await refreshGraphMeta();
      setTimeout(() => setDemoNotice(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F1226] text-white">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDemo={handleResetDemo}
        onLoadDemo={handleLoadDemo}
        isLoadingDemo={isLoadingDemo}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentSubject={currentSubject}
          activeRootCause={activeRootCause}
          language={language}
          setLanguage={setLanguage}
          onNavigateToProfile={() => setActiveTab('profile')}
        />

        {/* Demo Notice Toast */}
        {demoNotice && (
          <div className="bg-[#22C3E6]/20 border-b border-[#22C3E6]/40 px-6 py-2.5 text-xs text-[#22C3E6] font-semibold flex items-center justify-between animate-fadeIn">
            <span>✨ {demoNotice}</span>
            <button onClick={() => setDemoNotice(null)} className="text-[#22C3E6] font-bold">✕</button>
          </div>
        )}

        {/* Dynamic Screen View */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'practice' && (
            <PracticeScreen
              subjectId={currentSubject.id}
              language={language}
              targetQuestionId={targetQuestionId}
              onNavigateToMap={() => setActiveTab('map')}
              onRefreshGraph={refreshGraphMeta}
            />
          )}

          {activeTab === 'map' && (
            <RootCauseMapScreen
              subjectId={currentSubject.id}
              onSelectTopic={(topicId) => {
                setActiveTab('practice');
              }}
            />
          )}

          {activeTab === 'teachback' && (
            <TeachBackScreen
              language={language}
              onNavigateToPractice={() => setActiveTab('practice')}
            />
          )}

          {activeTab === 'revision' && (
            <RevisionScreen
              onPracticeTopic={(topicId) => {
                setActiveTab('practice');
              }}
            />
          )}

          {activeTab === 'notes' && (
            <NotesScreen
              onSubjectAdded={(newSubjectId) => {
                setCurrentSubject({ id: newSubjectId, name: 'Custom Uploaded Subject' });
                setActiveTab('map');
              }}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressScreen
              language={language}
              onNavigateToPractice={(topicId) => {
                setActiveTab('practice');
              }}
              onNavigateToMap={() => setActiveTab('map')}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileScreen language={language} />
          )}
        </main>
      </div>
    </div>
  );
}

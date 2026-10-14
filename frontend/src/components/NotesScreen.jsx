import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  BookOpen, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  Save, 
  X,
  FileCheck
} from 'lucide-react';
import { uploadNotes, commitDraftSubject } from '../api/client';

const STAGES = [
  'Reading notes',
  'Finding topics',
  'Building prerequisites',
  'Writing questions',
  'Ready for review'
];

export default function NotesScreen({ onSubjectAdded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(null);

  // File drop handler
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setCommitSuccess(null);
    setCurrentStage(0);

    // Simulate progress stages for hackathon demo feel
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);

    try {
      const result = await uploadNotes(file, title);
      clearInterval(stageInterval);
      setCurrentStage(4); // Ready for review
      setDraft(result);
    } catch (err) {
      clearInterval(stageInterval);
      setError(err.message || 'Extraction failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Editing draft topics
  const handleTopicNameChange = (index, newName) => {
    if (!draft) return;
    const updatedTopics = [...draft.topics];
    updatedTopics[index].name = newName;
    setDraft({ ...draft, topics: updatedTopics });
  };

  const handleRemoveTopic = (index) => {
    if (!draft) return;
    const updatedTopics = draft.topics.filter((_, i) => i !== index);
    setDraft({ ...draft, topics: updatedTopics });
  };

  // Commit draft to SQLite database
  const handleCommit = async () => {
    if (!draft) return;
    setIsCommitting(true);
    setError(null);

    try {
      const subjectId = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const res = await commitDraftSubject({
        subject_id: subjectId,
        title: draft.title,
        description: draft.description || 'Custom uploaded course notes.',
        topics: draft.topics,
        questions: draft.questions
      });

      setCommitSuccess(res.message);
      setDraft(null);
      setFile(null);
      if (onSubjectAdded) onSubjectAdded(res.subject_id);
    } catch (err) {
      setError(err.message || 'Failed to save subject graph');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-[#0F1226]">
      {/* Top Banner */}
      <div className="bg-[#171B36] p-6 rounded-3xl border border-[#292E56] shadow-xl">
        <h2 className="text-xl font-extrabold text-white">Course Notes to Knowledge Graph</h2>
        <p className="text-xs text-light-subtle mt-1">
          Upload lecture slides, PDF chapters, or diagrams. MistakeMirror extracts key concepts, builds prerequisite relationships, and drafts diagnostic questions.
        </p>
      </div>

      {commitSuccess && (
        <div className="p-4 rounded-2xl bg-mastered-green/15 border border-mastered-green/40 flex items-center gap-3 text-xs text-white">
          <CheckCircle2 size={18} className="text-mastered-green" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rootcause-red/15 border border-rootcause-red/40 flex items-center gap-3 text-xs text-white">
          <AlertCircle size={18} className="text-rootcause-red" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      {!draft && (
        <div className="bg-[#171B36] p-8 rounded-3xl border-2 border-dashed border-[#292E56] hover:border-[#6C4CF1] transition-all text-center">
          <input
            type="file"
            id="notes-file-input"
            onChange={handleFileChange}
            accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg"
            className="hidden"
            disabled={isUploading}
          />
          <label htmlFor="notes-file-input" className="cursor-pointer block space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#6C4CF1]/20 border border-[#6C4CF1]/40 text-[#6C4CF1] mx-auto flex items-center justify-center">
              <Upload size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {file ? file.name : 'Click to select or drag and drop your notes'}
              </p>
              <p className="text-xs text-light-subtle mt-1">
                Supports PDF, PPTX presentation slides, and image notes (Max 25MB)
              </p>
            </div>
          </label>

          {file && (
            <div className="mt-6 max-w-md mx-auto space-y-3">
              <input
                type="text"
                placeholder="Course Subject Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0F1226] border border-[#292E56] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#6C4CF1]"
              />
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-2.5 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-bold transition-all shadow-md shadow-[#6C4CF1]/30 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing Document...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Generate Knowledge Graph</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Progress Stages */}
          {isUploading && (
            <div className="mt-8 max-w-md mx-auto space-y-2 text-left">
              <div className="text-[11px] font-bold text-light-subtle uppercase tracking-wider mb-2">
                Extraction Pipeline:
              </div>
              {STAGES.map((stg, i) => {
                const isPast = currentStage > i;
                const isCurr = currentStage === i;
                return (
                  <div key={stg} className="flex items-center gap-2.5 text-xs">
                    {isPast ? (
                      <CheckCircle2 size={15} className="text-mastered-green" />
                    ) : isCurr ? (
                      <RefreshCw size={15} className="text-[#22C3E6] animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-[#292E56]" />
                    )}
                    <span className={isPast ? 'text-white' : isCurr ? 'text-[#22C3E6] font-bold' : 'text-light-subtle'}>
                      {stg}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review Draft Interface */}
      {draft && (
        <div className="bg-[#171B36] p-6 lg:p-8 rounded-3xl border border-[#292E56] space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#292E56] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-mastered-green">
                <FileCheck size={16} />
                <span>Knowledge Graph Draft Ready</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{draft.title}</h3>
              <p className="text-xs text-light-subtle">{draft.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDraft(null)}
                className="px-4 py-2 rounded-xl bg-[#0F1226] border border-[#292E56] hover:border-rootcause-red text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="px-5 py-2 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-bold shadow-md shadow-[#6C4CF1]/30 flex items-center gap-1.5"
              >
                {isCommitting ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save to Course Catalog</span>
              </button>
            </div>
          </div>

          {/* Topics List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-light-subtle mb-3">
              Proposed Topics ({draft.topics.length}):
            </h4>
            <div className="space-y-3">
              {draft.topics.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="bg-[#0F1226] p-4 rounded-2xl border border-[#292E56] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171B36] text-[#22C3E6]">
                        {t.id}
                      </span>
                      {t.pages && t.pages.length > 0 && (
                        <span className="text-[10px] text-light-subtle flex items-center gap-1">
                          <BookOpen size={11} />
                          Pages {t.pages.join(', ')}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => handleTopicNameChange(idx, e.target.value)}
                      className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-[#6C4CF1] focus:border-[#6C4CF1] focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-light-subtle">
                      Prerequisites:{' '}
                      <strong className="text-white">
                        {t.prerequisites && t.prerequisites.length > 0 ? t.prerequisites.join(', ') : 'None'}
                      </strong>
                    </div>

                    <button
                      onClick={() => handleRemoveTopic(idx)}
                      className="p-1.5 rounded-lg text-light-subtle hover:text-rootcause-red transition-all"
                      title="Remove Topic"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

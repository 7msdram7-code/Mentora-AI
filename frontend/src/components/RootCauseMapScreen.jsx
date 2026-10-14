import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  GitFork, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Info,
  BookOpen
} from 'lucide-react';
import CustomTopicNode from './CustomTopicNode';
import { fetchSubjectGraph } from '../api/client';

const nodeTypes = {
  customTopic: CustomTopicNode
};

// Fixed clean layered layout for both Hashing and Simple Maths topics
const FIXED_LAYOUT = {
  // Data Structures — Hashing
  modulo: { x: 80, y: 50 },
  arrays: { x: 340, y: 50 },
  linked_lists: { x: 600, y: 50 },
  hash_function: { x: 210, y: 220 },
  hash_table: { x: 210, y: 390 },
  chaining: { x: 480, y: 390 },
  linear_probing: { x: 80, y: 560 },
  load_factor: { x: 340, y: 560 },
  rehashing: { x: 340, y: 730 },
  // Simple Maths
  arithmetic_basics: { x: 80, y: 50 },
  multiplication: { x: 340, y: 50 },
  negative_numbers: { x: 600, y: 50 },
  order_of_operations: { x: 210, y: 220 },
  fractions_decimals: { x: 470, y: 220 },
  linear_equations: { x: 120, y: 390 },
  percentages: { x: 470, y: 390 },
  word_problems: { x: 180, y: 560 },
  proportions_scaling: { x: 470, y: 560 },
};

export default function RootCauseMapScreen({ 
  subjectId = 'data_structures_hashing',
  lastDiagnosedTopic,
  onSelectTopic
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeRootCause, setActiveRootCause] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load knowledge graph data from API
  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSubjectGraph(subjectId, 'demo_student');
      setActiveRootCause(data.active_root_cause);

      // Build React Flow nodes
      const rfNodes = data.nodes.map((node, idx) => {
        const pos = FIXED_LAYOUT[node.id] || { x: (idx % 3) * 260 + 50, y: Math.floor(idx / 3) * 180 + 50 };
        const isRoot = node.id === data.active_root_cause || node.diagnostic_role === 'ROOT CAUSE';
        const isSympt = node.diagnostic_role === 'SYMPTOM';

        return {
          id: node.id,
          type: 'customTopic',
          position: pos,
          data: {
            ...node,
            isRootCause: isRoot,
            isSymptom: isSympt
          }
        };
      });

      // Build React Flow edges
      const rfEdges = data.edges.map((edge) => {
        const isEdgeInRootPath = (
          (edge.source === 'modulo' && edge.target === 'hash_function') ||
          (edge.source === 'hash_function' && edge.target === 'hash_table') ||
          (edge.source === 'order_of_operations' && edge.target === 'linear_equations') ||
          (edge.source === 'linear_equations' && edge.target === 'word_problems') ||
          (edge.source === data.active_root_cause)
        );

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: 'needs',
          animated: isEdgeInRootPath,
          style: {
            stroke: isEdgeInRootPath ? '#D93636' : '#3E4575',
            strokeWidth: isEdgeInRootPath ? 3 : 2
          },
          labelStyle: { fill: '#A5A6C2', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: '#171B36', rx: 4, ry: 4 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEdgeInRootPath ? '#D93636' : '#4A5080'
          }
        };
      });

      setNodes(rfNodes);
      setEdges(rfEdges);

      // Default select active root cause or first red/amber node
      const activeNode = data.nodes.find(n => n.id === data.active_root_cause) || data.nodes[0];
      if (activeNode) setSelectedTopic(activeNode);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const onNodeClick = (_, node) => {
    setSelectedTopic(node.data);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#0F1226]">
      {/* React Flow Graph Area */}
      <div className="flex-1 h-full relative">
        {/* Floating Legend Bar */}
        <div className="absolute top-4 left-4 z-10 bg-[#171B36]/90 backdrop-blur-md p-3 rounded-2xl border border-[#292E56] shadow-xl flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rootcause-red shadow-sm shadow-rootcause-red/50" />
            <span className="text-white font-medium">Root Cause (&lt;40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-symptom-amber shadow-sm shadow-symptom-amber/50" />
            <span className="text-white font-medium">Learning (40-69%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-mastered-green shadow-sm shadow-mastered-green/50" />
            <span className="text-white font-medium">Mastered (≥70%)</span>
          </div>
          <button
            onClick={loadGraph}
            className="p-1.5 hover:bg-[#292E56] rounded-lg text-light-subtle hover:text-white transition-all ml-2"
            title="Refresh Graph"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#1E2347" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.data?.isRootCause) return '#D93636';
              if (node.data?.status === 'GREEN') return '#1FB57A';
              return '#F5A524';
            }}
            maskColor="rgba(15, 18, 38, 0.7)"
            style={{ background: '#171B36', border: '1px solid #292E56', borderRadius: '12px' }}
          />
        </ReactFlow>
      </div>

      {/* Side Diagnostic Panel */}
      <div className="w-full lg:w-96 bg-[#171B36] border-t lg:border-t-0 lg:border-l border-[#292E56] p-6 flex flex-col justify-between overflow-y-auto shrink-0 shadow-2xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#292E56] pb-4">
            <div className="flex items-center gap-2">
              <GitFork size={20} className="text-[#6C4CF1]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Topic Intelligence
              </h3>
            </div>
            {selectedTopic?.isRootCause && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rootcause-red/20 text-rootcause-red border border-rootcause-red/40 animate-pulse">
                ROOT CAUSE
              </span>
            )}
          </div>

          {selectedTopic ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-extrabold text-white">
                  {selectedTopic.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-light-subtle">Topic ID:</span>
                  <code className="text-xs bg-[#0F1226] px-2 py-0.5 rounded text-[#22C3E6] font-mono">
                    {selectedTopic.id}
                  </code>
                </div>
              </div>

              {/* Mastery bar */}
              <div className="bg-[#0F1226] p-4 rounded-2xl border border-[#292E56]">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-light-subtle">Current Mastery</span>
                  <span className="font-extrabold text-white">
                    {Math.round((selectedTopic.mastery || 0.5) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-[#171B36] rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round((selectedTopic.mastery || 0.5) * 100)}%`,
                      backgroundColor:
                        selectedTopic.isRootCause || selectedTopic.status === 'RED'
                          ? '#D93636'
                          : selectedTopic.status === 'GREEN'
                          ? '#1FB57A'
                          : '#F5A524'
                    }}
                  />
                </div>
              </div>

              {/* Why Selected as Root Cause */}
              {selectedTopic.isRootCause && (
                <div className="p-4 rounded-2xl bg-rootcause-red/10 border border-rootcause-red/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rootcause-red">
                    <AlertOctagon size={16} />
                    <span>Why This Topic is the Root Cause:</span>
                  </div>
                  <p className="text-xs text-white leading-relaxed">
                    Student answered $50 by evaluating left-to-right: (6 + 4) * 5 = 10 * 5 = 50, performing addition before multiplication. The mistake originates from foundational misunderstanding of <strong>Order of Operations (PEMDAS / BODMAS)</strong>, not reading comprehension of the word problem.
                  </p>
                </div>
              )}

              {/* Prerequisites list */}
              <div>
                <span className="text-xs font-bold text-light-subtle uppercase tracking-wider block mb-2">
                  Prerequisites:
                </span>
                {selectedTopic.prerequisites && selectedTopic.prerequisites.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.prerequisites.map((p) => (
                      <span
                        key={p}
                        className="px-3 py-1 rounded-lg bg-[#0F1226] border border-[#292E56] text-xs font-medium text-white font-mono"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-light-subtle italic">None (Foundational Topic)</span>
                )}
              </div>

              {/* Course notes page reference */}
              {selectedTopic.pages && selectedTopic.pages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-light-subtle">
                  <BookOpen size={14} className="text-[#6C4CF1]" />
                  <span>Referenced in Course Notes: <strong>Pages {selectedTopic.pages.join(', ')}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-light-subtle text-xs">
              Click on any node in the map to view detailed prerequisite diagnosis and mastery telemetry.
            </div>
          )}
        </div>

        {/* Action Button */}
        {selectedTopic && (
          <div className="pt-6 border-t border-[#292E56]">
            <button
              onClick={() => onSelectTopic && onSelectTopic(selectedTopic.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6C4CF1] hover:bg-[#5939D8] text-white text-xs font-bold shadow-lg shadow-[#6C4CF1]/30 transition-all"
            >
              <span>Practice Questions on {selectedTopic.name}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Zap,
  GitBranch,
  Flame,
} from 'lucide-react';
import { useTimetableStore } from '@/stores/use-timetable-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { CspTreeNodeComponent } from '@/components/visualization/CspTreeNode';
import { MinConflictsVisualizer } from '@/components/visualization/MinConflictsVisualizer';
import { buildReactFlowTree } from '@/algorithms/visualization/search-tree-builder';
import { solveTimetableCSP, generateLectureSessions } from '@/algorithms/csp/backtracking';
import { DAYS } from '@/data/demo-data';

const nodeTypes = {
  cspTreeNode: CspTreeNodeComponent,
};

export default function VisualizePage() {
  const {
    subjects,
    professors,
    batches,
    classrooms,
    timeSlots,
    hardConstraints,
    softPreferences,
    traceEvents,
    treeNodes,
    selectedAlgorithm,
    setSolverResult,
  } = useTimetableStore();

  const [activeMode, setActiveMode] = useState<'backtracking' | 'min-conflicts'>(
    selectedAlgorithm === 'min-conflicts' ? 'min-conflicts' : 'backtracking'
  );

  // Playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x = 600ms per step
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // If no trace is loaded yet, generate one on demand
  const handleAutoRun = () => {
    // Generate trace for section A
    const variables = generateLectureSessions(subjects, batches.slice(0, 1), professors);
    const result = solveTimetableCSP(
      variables,
      professors,
      batches.slice(0, 1),
      classrooms,
      timeSlots,
      hardConstraints,
      softPreferences,
      {
        useMRV: true,
        useDegreeHeuristic: true,
        useLCV: true,
        useForwardChecking: true,
        maxSteps: 3000,
        timeLimitMs: 10000,
        recordTrace: true,
      }
    );

    setSolverResult({
      timetable: result.timetable,
      metrics: result.metrics,
      traceEvents: result.recorder.getEvents(),
      treeNodes: result.recorder.getTreeNodes(),
      failureReason: result.failureReason,
    });
    setCurrentStepIndex(0);
  };

  const totalSteps = traceEvents.length;
  const currentEvent = traceEvents[currentStepIndex];

  // Derive visible tree nodes up to the current step
  const visibleTreeNodes = useMemo(() => {
    if (treeNodes.length === 0 || !currentEvent) return treeNodes;
    // Highlight or filter nodes up to current step
    return treeNodes.filter((n) => n.stepNumber <= currentEvent.stepNumber || n.id === 'node-root');
  }, [treeNodes, currentEvent]);

  // Build React Flow graph
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return buildReactFlowTree(visibleTreeNodes, currentEvent?.treeNodeId);
  }, [visibleTreeNodes, currentEvent?.treeNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);

  useEffect(() => {
    setNodes(initialNodes as Node[]);
    setEdges(initialEdges as Edge[]);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Step Controls
  const stepForward = () => {
    setCurrentStepIndex((prev) => {
      if (prev < totalSteps - 1) return prev + 1;
      setIsPlaying(false);
      return prev;
    });
  };

  const stepBackward = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const resetPlay = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(80, Math.round(600 / playbackSpeed));
      timerRef.current = setTimeout(() => {
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, delay);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, totalSteps, playbackSpeed]);

  const currentAssignments = currentEvent ? currentEvent.assignmentsSnapshot : [];
  const domainSizes = currentEvent ? currentEvent.domainSizesSnapshot : {};

  // Teaching slots template for the partial calendar
  const teachingSlots = timeSlots.filter((s) => s.day === 'Monday' && !s.isBreak).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Algorithm Execution Visualizer
            </h1>
            <Badge variant="purple" className="font-semibold text-xs">
              Live Event Trace Replay
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Observe the step-by-step decision dynamics of university timetable scheduling algorithms: systematic CSP tree search vs stochastic local repair.
          </p>
        </div>

        {activeMode === 'backtracking' && totalSteps === 0 && (
          <Button onClick={handleAutoRun} className="sm:self-end">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate & Trace Execution
          </Button>
        )}
      </div>

      {/* Algorithm Mode Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveMode('backtracking')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeMode === 'backtracking'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Backtracking Search Tree (Phase 1)
        </button>
        <button
          onClick={() => setActiveMode('min-conflicts')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeMode === 'min-conflicts'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          Min-Conflicts Local Repair (Phase 2)
        </button>
      </div>

      {activeMode === 'min-conflicts' ? (
        <MinConflictsVisualizer />
      ) : totalSteps === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">No Execution Trace Available</h3>
              <p className="text-xs text-slate-500 mt-1">
                Run the timetable solver from the Generation page or click below to synthesize a demonstration schedule with full execution event logging.
              </p>
            </div>
            <Button onClick={handleAutoRun}>
              Launch Demo Execution Trace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Player Controller Toolbar */}
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Control Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPlay}
                    title="Reset to start of search"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stepBackward}
                    disabled={currentStepIndex === 0}
                    title="Previous step"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-24 bg-blue-600 hover:bg-blue-700"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Play
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stepForward}
                    disabled={currentStepIndex >= totalSteps - 1}
                    title="Next step"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">
                    Step <strong className="text-slate-900">{currentStepIndex + 1}</strong> of{' '}
                    <strong>{totalSteps}</strong>
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">Speed:</span>
                    {[0.5, 1, 2, 5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          playbackSpeed === spd
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={totalSteps - 1}
                value={currentStepIndex}
                onChange={(e) => setCurrentStepIndex(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </CardContent>
          </Card>

          {/* Current Step Event Callout */}
          {currentEvent && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
                currentEvent.type.includes('FAILED') || currentEvent.type.includes('WIPED')
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : currentEvent.type.includes('BACKTRACK')
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : currentEvent.type.includes('SOLUTION')
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-blue-50/80 border-blue-200 text-blue-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      currentEvent.type.includes('FAILED') || currentEvent.type.includes('WIPED')
                        ? 'danger'
                        : currentEvent.type.includes('BACKTRACK')
                        ? 'warning'
                        : currentEvent.type.includes('SOLUTION')
                        ? 'success'
                        : 'purple'
                    }
                    className="font-mono text-[10px] uppercase font-bold"
                  >
                    {currentEvent.type.replace(/_/g, ' ')}
                  </Badge>
                  {currentEvent.variableId && (
                    <span className="text-xs font-semibold">
                      Variable: {currentEvent.variableId}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium leading-relaxed">{currentEvent.reason}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-500 font-mono block">
                  Committed: {currentAssignments.length} sessions
                </span>
              </div>
            </div>
          )}

          {/* Visualization Split View: React Flow Tree on Left, State on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* React Flow Search Tree (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs h-[560px] relative overflow-hidden flex flex-col">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">Search Tree Graph</span>
                  <Badge variant="outline" className="text-[10px]">
                    {visibleTreeNodes.length} Nodes Displayed
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Exploring
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Success
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Backtracked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Conflict
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  minZoom={0.2}
                  maxZoom={1.5}
                >
                  <Background color="#cbd5e1" gap={16} />
                  <Controls />
                </ReactFlow>
              </div>
            </div>

            {/* Right Side: Variable Domains & Partial Timetable (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Variable Domains Status */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>MRV Remaining Domain Sizes</span>
                    <Badge variant="purple" className="text-[9px]">
                      {Object.keys(domainSizes).length} Variables
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-44 overflow-y-auto space-y-1.5 text-xs">
                  {Object.entries(domainSizes).map(([varId, size]) => {
                    const isCurrent = currentEvent?.variableId === varId;
                    const isAssigned = currentAssignments.some((a) => a.variableId === varId);
                    return (
                      <div
                        key={varId}
                        className={`flex items-center justify-between p-2 rounded border transition-colors ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-300 font-semibold text-blue-900'
                            : isAssigned
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                            : 'bg-white border-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="font-mono text-[11px] truncate max-w-[190px]">{varId}</span>
                        <div className="flex items-center gap-2">
                          {isAssigned ? (
                            <Badge variant="success" className="text-[9px] py-0">Assigned</Badge>
                          ) : (
                            <Badge
                              variant={size === 0 ? 'danger' : size <= 2 ? 'warning' : 'default'}
                              className="text-[9px] py-0"
                            >
                              {size} choices
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Partial Timetable State (Updates live with backtracking!) */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Partial Timetable State</span>
                    <Badge variant="default" className="text-[9px]">
                      {currentAssignments.length} Active Slots
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-56 overflow-y-auto">
                  {currentAssignments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      No assignments currently committed at this search step.
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {currentAssignments.map((a) => {
                        const sub = subjects.find((s) => s.id === a.subjectId);
                        const prof = professors.find((p) => p.id === a.professorId);
                        const room = classrooms.find((c) => c.id === a.classroomId);
                        const slot = timeSlots.find((s) => s.id === a.slotId);

                        return (
                          <div
                            key={a.variableId}
                            className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 font-mono text-[11px]">
                                  {sub?.code || a.subjectId}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {a.day} {slot?.startTime}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Prof. {prof?.name?.split(' ')[1] || a.professorId} • {room?.name}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-[9px]">
                              {a.day.slice(0, 3)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


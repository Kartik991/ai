'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Zap,
  Calendar,
  Clock,
  Layers,
  ChevronRight,
  RefreshCw,
  Sliders,
  Eye,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { useTimetableStore } from '@/stores/use-timetable-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { solveTimetableMinConflicts } from '@/algorithms/optimization/min-conflicts';
import { generateLectureSessions } from '@/algorithms/csp/backtracking';
import { DAYS } from '@/data/demo-data';
import type { MinConflictsTraceEvent, DomainValue } from '@/types';

export function MinConflictsVisualizer() {
  const {
    subjects,
    professors,
    batches,
    classrooms,
    timeSlots,
    hardConstraints,
    softPreferences,
    minConflictsTraceEvents,
    minConflictsOptions,
    setMinConflictsResult,
  } = useTimetableStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x = 500ms
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate trace on-demand if none exists
  const handleAutoRun = () => {
    const targetBatches = batches.slice(0, 1); // Section A for quick, clear demonstration
    const variables = generateLectureSessions(subjects, targetBatches, professors);

    const result = solveTimetableMinConflicts(
      variables,
      professors,
      targetBatches,
      classrooms,
      timeSlots,
      hardConstraints,
      softPreferences,
      {
        ...minConflictsOptions,
        maxIterations: 600,
        maxRestarts: 3,
        stagnationThreshold: 40,
        randomSeed: 42,
        initStrategy: 'greedy',
        optimizeSoftPreferences: false,
        recordTrace: true,
      }
    );

    setMinConflictsResult({
      timetable: result.timetable,
      metrics: result.metrics,
      traceEvents: result.recorder.getEvents(),
      failureReason: result.failureReason,
    });
    setCurrentStepIndex(0);
  };

  const totalSteps = minConflictsTraceEvents.length;
  const currentEvent: MinConflictsTraceEvent | undefined = minConflictsTraceEvents[currentStepIndex];

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.max(60, Math.round(500 / playbackSpeed));
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

  const jumpToEnd = () => {
    setIsPlaying(false);
    setCurrentStepIndex(Math.max(0, totalSteps - 1));
  };

  // Recharts conflict curve data
  const chartData = useMemo(() => {
    if (minConflictsTraceEvents.length === 0) return [];
    // Downsample if more than 300 events for smooth rendering
    const stride = Math.max(1, Math.floor(minConflictsTraceEvents.length / 300));
    const data: Array<{
      step: number;
      iteration: number;
      conflicts: number;
      bestConflicts: number;
      isRestart?: boolean;
    }> = [];

    for (let i = 0; i < minConflictsTraceEvents.length; i += stride) {
      const evt = minConflictsTraceEvents[i];
      data.push({
        step: evt.stepNumber,
        iteration: evt.iteration,
        conflicts: evt.totalConflicts,
        bestConflicts: evt.bestConflicts,
        isRestart: evt.type === 'RANDOM_RESTART',
      });
    }

    // Always include the current step and the final step
    if (currentEvent && !data.some((d) => d.step === currentEvent.stepNumber)) {
      data.push({
        step: currentEvent.stepNumber,
        iteration: currentEvent.iteration,
        conflicts: currentEvent.totalConflicts,
        bestConflicts: currentEvent.bestConflicts,
      });
      data.sort((a, b) => a.step - b.step);
    }

    return data;
  }, [minConflictsTraceEvents, currentEvent]);

  // Filter current assignments by selected batch if requested
  const currentAssignments = useMemo(() => {
    if (!currentEvent) return [];
    if (selectedBatchFilter === 'all') return currentEvent.assignmentsSnapshot;
    return currentEvent.assignmentsSnapshot.filter((a) => a.batchId === selectedBatchFilter);
  }, [currentEvent, selectedBatchFilter]);

  // Variable details for current event
  const activeVar = useMemo(() => {
    if (!currentEvent || !currentEvent.variableId) return null;
    const assign = currentEvent.assignmentsSnapshot.find((a) => a.variableId === currentEvent.variableId);
    if (!assign) return null;
    const sub = subjects.find((s) => s.id === assign.subjectId);
    const prof = professors.find((p) => p.id === assign.professorId);
    const batch = batches.find((b) => b.id === assign.batchId);
    return {
      id: currentEvent.variableId,
      subject: sub,
      professor: prof,
      batch,
      assignment: assign,
    };
  }, [currentEvent, subjects, professors, batches]);

  // Group teaching slots for calendar grid
  const teachingSlots = useMemo(() => {
    return timeSlots.filter((s) => !s.isBreak && s.day === 'Monday');
  }, [timeSlots]);

  if (totalSteps === 0) {
    return (
      <Card className="py-16 text-center">
        <CardContent className="space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              No Min-Conflicts Trace Loaded
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Run the Min-Conflicts solver from the Generation page or click below to synthesize a demonstration schedule with complete iterative local repair logging.
            </p>
          </div>
          <Button onClick={handleAutoRun} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Launch Min-Conflicts Demo Trace
          </Button>
        </CardContent>
      </Card>
    );
  }

  const conflictingCount = currentEvent ? currentEvent.conflictingVariableIds.length : 0;
  const isSolution = currentEvent?.type === 'SOLUTION_FOUND';
  const isFailed = currentEvent?.type === 'SEARCH_FAILED';

  return (
    <div className="space-y-6">
      {/* Player Controller Toolbar */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetPlay}
                title="Reset to iteration 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stepBackward}
                disabled={currentStepIndex === 0}
                title="Previous repair step"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-24 ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium`}
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
                title="Next repair step"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={jumpToEnd}
                title="Jump to final state"
                className="text-xs"
              >
                End
              </Button>
            </div>

            {/* Step & Metrics Indicator */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-slate-100 px-2.5 py-1 rounded-md font-mono text-slate-700">
                Step <strong className="text-slate-900">{currentStepIndex + 1}</strong> / {totalSteps}
              </div>
              <div className="bg-slate-100 px-2.5 py-1 rounded-md font-mono text-slate-700">
                Iteration <strong className="text-slate-900">{currentEvent?.iteration ?? 0}</strong>
                {currentEvent && currentEvent.restartCount > 0 && (
                  <span className="text-amber-700 ml-1 font-semibold">(Restart {currentEvent.restartCount})</span>
                )}
              </div>
              <div className={`px-2.5 py-1 rounded-md font-mono font-semibold ${
                currentEvent?.totalConflicts === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                Conflicts: {currentEvent?.totalConflicts ?? 0} (Best: {currentEvent?.bestConflicts ?? 0})
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">Speed:</span>
                {[0.5, 1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-amber-600 text-white'
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
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
        </CardContent>
      </Card>

      {/* Current Step Event Callout */}
      {currentEvent && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
            isSolution
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : isFailed
              ? 'bg-rose-50/90 border-rose-300 text-rose-950'
              : currentEvent.type === 'RANDOM_RESTART' || currentEvent.type === 'STAGNATION_DETECTED'
              ? 'bg-purple-50/90 border-purple-300 text-purple-950'
              : currentEvent.type === 'CONFLICTING_VARIABLE_SELECTED'
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : 'bg-blue-50/90 border-blue-300 text-blue-950'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  isSolution
                    ? 'success'
                    : isFailed
                    ? 'danger'
                    : currentEvent.type === 'RANDOM_RESTART'
                    ? 'purple'
                    : currentEvent.type === 'CONFLICTING_VARIABLE_SELECTED'
                    ? 'warning'
                    : 'default'
                }
                className="font-mono text-[10px] uppercase font-bold"
              >
                {currentEvent.type.replace(/_/g, ' ')}
              </Badge>
              {currentEvent.variableId && (
                <span className="text-xs font-semibold font-mono bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  Target: {currentEvent.variableId}
                </span>
              )}
              {currentEvent.restartCount > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono font-medium">
                  Restart #{currentEvent.restartCount}
                </span>
              )}
            </div>
            <p className="text-xs font-medium leading-relaxed">{currentEvent.reason}</p>
          </div>

          <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
            <div className="text-[11px] text-slate-500 font-mono">
              Conflicting Lectures: <strong className="text-rose-600 font-bold">{conflictingCount}</strong>
            </div>
            {currentEvent.selectedCandidateValue && (
              <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                Repaired → {currentEvent.selectedCandidateValue.day} {currentEvent.selectedCandidateValue.slotId}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Trajectory Line Chart */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Conflict Trajectory (Local Search Progress)
            </CardTitle>
            <CardDescription className="text-[11px]">
              Visualizing the descent from initial conflicts toward 0 constraint violations. Notice plateaus and random restarts.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 font-medium text-rose-600">
              <span className="w-2.5 h-0.5 bg-rose-500 rounded-full" /> Total Conflicts
            </span>
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full" /> Best So Far
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="step" tick={{ fontSize: 10 }} label={{ value: 'Step Number', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: any, name: any) => [
                    `${value} conflicts`,
                    name === 'conflicts' ? 'Total Conflicts' : 'Best Achieved',
                  ]}
                  labelFormatter={(label) => `Step #${label}`}
                />
                <ReferenceLine y={0} stroke="#10b981" strokeDasharray="3 3" />
                {currentEvent && (
                  <ReferenceLine
                    x={currentEvent.stepNumber}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    label={{ value: 'Current', position: 'top', fill: '#d97706', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="conflicts"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  name="conflicts"
                />
                <Line
                  type="stepAfter"
                  dataKey="bestConflicts"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="bestConflicts"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Main Split: Candidate Timetable Grid on Left (7 cols), Variable Inspector on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Candidate Timetable State Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Candidate Timetable State
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {currentAssignments.length} Assigned Sessions
                </Badge>
              </div>

              {/* Batch Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Filter Batch:</span>
                <select
                  value={selectedBatchFilter}
                  onChange={(e) => setSelectedBatchFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.section})
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-3">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] mb-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border border-rose-400 bg-rose-50" />
                  <strong className="text-rose-700">Hard Conflict</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-50" />
                  <strong className="text-amber-700">Selected Variable</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-50" />
                  <strong className="text-emerald-700">Repaired Value</strong>
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-3 rounded border border-slate-200 bg-white" />
                  <span>Conflict-free Session</span>
                </span>
              </div>

              {/* Grid Display: Day-by-Day Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 overflow-x-auto">
                {DAYS.map((day) => {
                  const dayAssignments = currentAssignments.filter((a) => a.day === day);
                  return (
                    <div key={day} className="bg-slate-50/70 rounded-lg p-2 border border-slate-100 flex flex-col min-w-[120px]">
                      <div className="font-semibold text-xs text-center pb-2 border-b border-slate-200 text-slate-800">
                        {day}
                      </div>

                      <div className="space-y-1.5 pt-2 flex-1">
                        {dayAssignments.length === 0 ? (
                          <div className="text-[10px] text-slate-400 text-center py-4 italic">
                            No sessions
                          </div>
                        ) : (
                          dayAssignments.map((a) => {
                            const isConflicted = currentEvent?.conflictingVariableIds.includes(a.variableId);
                            const isSelectedVar = currentEvent?.variableId === a.variableId;
                            const isRepairedNow =
                              currentEvent?.type === 'MINIMUM_CONFLICT_VALUE_SELECTED' &&
                              currentEvent?.variableId === a.variableId;

                            const sub = subjects.find((s) => s.id === a.subjectId);
                            const prof = professors.find((p) => p.id === a.professorId);
                            const room = classrooms.find((c) => c.id === a.classroomId);
                            const slot = timeSlots.find((s) => s.id === a.slotId);

                            return (
                              <div
                                key={a.variableId}
                                className={`p-2 rounded-md border text-left transition-all ${
                                  isRepairedNow
                                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-xs'
                                    : isSelectedVar
                                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 shadow-xs'
                                    : isConflicted
                                    ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold font-mono text-[11px] truncate">
                                    {sub?.code || a.subjectId}
                                  </span>
                                  {isRepairedNow ? (
                                    <Badge variant="success" className="text-[8px] py-0 px-1">Repaired</Badge>
                                  ) : isSelectedVar ? (
                                    <Badge variant="warning" className="text-[8px] py-0 px-1">Active</Badge>
                                  ) : isConflicted ? (
                                    <Badge variant="danger" className="text-[8px] py-0 px-1">Conflict</Badge>
                                  ) : null}
                                </div>

                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {slot?.startTime || a.slotId} • {room?.name || a.classroomId}
                                </div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  {prof?.name || a.professorId}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Variable Inspector & Candidate Evaluations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Variable Details */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Selected Variable Inspector</span>
                {activeVar ? (
                  <Badge variant="warning" className="text-[9px]">
                    Under Repair
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px]">
                    Idle
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs">
              {activeVar ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 space-y-1">
                    <div className="font-bold text-amber-950 text-sm">
                      {activeVar.subject?.code}: {activeVar.subject?.name}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Variable ID: <code className="font-mono">{activeVar.id}</code>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-amber-900 font-medium">
                      <div>Prof: {activeVar.professor?.name}</div>
                      <div>Batch: {activeVar.batch?.name} ({activeVar.batch?.section})</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Current Assignment</span>
                      <strong className="text-slate-800 font-mono">
                        {currentEvent?.currentValue?.day} {currentEvent?.currentValue?.slotId}
                      </strong>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                      <span className="text-emerald-700 block text-[10px]">Assigned Value (Post-Repair)</span>
                      <strong className="text-emerald-950 font-mono">
                        {currentEvent?.selectedCandidateValue
                          ? `${currentEvent.selectedCandidateValue.day} ${currentEvent.selectedCandidateValue.slotId}`
                          : 'Evaluating...'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 italic text-xs">
                  {currentEvent?.type === 'INITIAL_ASSIGNMENT_CREATED'
                    ? 'Initial complete assignment generated. No variable selected yet.'
                    : currentEvent?.type === 'SOLUTION_FOUND'
                    ? 'All hard conflicts resolved! Timetable is valid.'
                    : 'No specific variable is active in this event step.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evaluated Candidate Domain Values */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Evaluated Candidate Values</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Min-Conflict Value Scoring
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {currentEvent?.evaluatedCandidates && currentEvent.evaluatedCandidates.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {currentEvent.evaluatedCandidates.map((cand, idx) => {
                    const isSelected =
                      currentEvent.selectedCandidateValue &&
                      cand.value.day === currentEvent.selectedCandidateValue.day &&
                      cand.value.slotId === currentEvent.selectedCandidateValue.slotId &&
                      cand.value.classroomId === currentEvent.selectedCandidateValue.classroomId;

                    const room = classrooms.find((c) => c.id === cand.value.classroomId);

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-950'
                            : cand.conflictScore === 0
                            ? 'bg-blue-50/50 border-blue-200 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold">
                              {cand.value.day.slice(0, 3)} {cand.value.slotId}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              • {room?.name || cand.value.classroomId}
                            </span>
                          </div>
                          {cand.breakdown.length > 0 ? (
                            <div className="text-[10px] text-rose-600 truncate max-w-[220px]">
                              {cand.breakdown.join('; ')}
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-600">
                              No hard constraint clashes
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={
                              cand.conflictScore === 0
                                ? 'success'
                                : cand.conflictScore <= 1
                                ? 'warning'
                                : 'danger'
                            }
                            className="font-mono text-[9px] py-0"
                          >
                            {cand.conflictScore} {cand.conflictScore === 1 ? 'conflict' : 'conflicts'}
                          </Badge>
                          {isSelected && (
                            <span className="text-emerald-600 text-xs font-bold" title="Selected Candidate">
                              <Check className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 italic text-xs">
                  {currentEvent?.type === 'SOLUTION_FOUND'
                    ? 'Search succeeded with 0 conflicts.'
                    : 'Candidate evaluations will appear when a conflicting variable is being repaired.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trace Event History Jump List */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Recent Trace Events</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Click to jump
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="max-h-40 overflow-y-auto space-y-1">
                {minConflictsTraceEvents
                  .slice(Math.max(0, currentStepIndex - 10), currentStepIndex + 15)
                  .map((evt) => {
                    const isCurrent = evt.stepNumber === currentEvent?.stepNumber;
                    return (
                      <button
                        key={evt.id}
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentStepIndex(evt.stepNumber - 1);
                        }}
                        className={`w-full text-left p-1.5 rounded flex items-center justify-between text-[11px] transition-colors ${
                          isCurrent
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[10px] text-slate-400 w-8">
                            #{evt.stepNumber}
                          </span>
                          <span className="truncate">{evt.type}</span>
                        </div>
                        <Badge
                          variant={evt.totalConflicts === 0 ? 'success' : 'default'}
                          className="text-[9px] py-0 px-1 font-mono shrink-0"
                        >
                          {evt.totalConflicts} conf
                        </Badge>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

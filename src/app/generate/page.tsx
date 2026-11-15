'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PlayCircle,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Network,
  Clock,
  Layers,
  Sparkles,
  Printer,
  ChevronDown,
  Info,
  Calendar,
} from 'lucide-react';
import { useTimetableStore } from '@/stores/use-timetable-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Select,
} from '@/components/ui';
import {
  solveTimetableCSP,
  generateLectureSessions,
} from '@/algorithms/csp/backtracking';
import { SolverOptions, DayOfWeek } from '@/types';
import { formatTime } from '@/lib/utils';
import { DAYS } from '@/data/demo-data';

export default function GeneratePage() {
  const {
    subjects,
    professors,
    batches,
    classrooms,
    timeSlots,
    hardConstraints,
    softPreferences,
    currentTimetable,
    lastFailureReason,
    isGenerating,
    setIsGenerating,
    setSolverResult,
  } = useTimetableStore();

  // Solver Form Configuration
  const [targetBatch, setTargetBatch] = useState<string>('all');
  const [useMRV, setUseMRV] = useState(true);
  const [useDegreeHeuristic, setUseDegreeHeuristic] = useState(true);
  const [useLCV, setUseLCV] = useState(true);
  const [useForwardChecking, setUseForwardChecking] = useState(true);
  const [maxSteps, setMaxSteps] = useState(5000);
  const [timeLimitMs, setTimeLimitMs] = useState(15000);

  // Calendar Filters
  const [filterBatchId, setFilterBatchId] = useState<string>('all');
  const [filterProfId, setFilterProfId] = useState<string>('all');
  const [filterRoomId, setFilterRoomId] = useState<string>('all');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');

  // Generation Handler
  const handleGenerate = () => {
    setIsGenerating(true);

    // Run solver in next tick to let UI render the spinner
    setTimeout(() => {
      try {
        const batchFilter = targetBatch === 'all' ? undefined : [targetBatch];
        const variables = generateLectureSessions(subjects, batches, professors, batchFilter);

        const options: SolverOptions = {
          useMRV,
          useDegreeHeuristic,
          useLCV,
          useForwardChecking,
          maxSteps,
          timeLimitMs,
          recordTrace: true,
          batchIds: batchFilter,
        };

        const result = solveTimetableCSP(
          variables,
          professors,
          batches,
          classrooms,
          timeSlots,
          hardConstraints,
          softPreferences,
          options
        );

        setSolverResult({
          timetable: result.timetable,
          metrics: result.metrics,
          traceEvents: result.recorder.getEvents(),
          treeNodes: result.recorder.getTreeNodes(),
          failureReason: result.failureReason,
        });
      } catch (err) {
        console.error('Generation failed:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (!currentTimetable) return;

    const headers = [
      'Day',
      'Time Slot',
      'Subject Code',
      'Subject Name',
      'Batch',
      'Section',
      'Professor',
      'Classroom',
      'Room Type',
    ];

    const rows = currentTimetable.assignments.map((a) => {
      const sub = subjects.find((s) => s.id === a.subjectId);
      const batch = batches.find((b) => b.id === a.batchId);
      const prof = professors.find((p) => p.id === a.professorId);
      const room = classrooms.find((c) => c.id === a.classroomId);
      const slot = timeSlots.find((s) => s.id === a.slotId);

      return [
        a.day,
        slot ? `${slot.startTime} - ${slot.endTime}` : a.slotId,
        sub?.code || a.subjectId,
        `"${sub?.name || ''}"`,
        `"${batch?.name || ''}"`,
        batch?.section || '',
        `"${prof?.name || ''}"`,
        `"${room?.name || ''}"`,
        room?.roomType || '',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intellisched_timetable_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Exporter
  const handleExportJSON = () => {
    if (!currentTimetable) return;
    const blob = new Blob([JSON.stringify(currentTimetable, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intellisched_timetable_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Assignments for Calendar View
  const filteredAssignments = currentTimetable
    ? currentTimetable.assignments.filter((a) => {
        if (filterBatchId !== 'all' && a.batchId !== filterBatchId) return false;
        if (filterProfId !== 'all' && a.professorId !== filterProfId) return false;
        if (filterRoomId !== 'all' && a.classroomId !== filterRoomId) return false;
        if (filterSubjectId !== 'all' && a.subjectId !== filterSubjectId) return false;
        return true;
      })
    : [];

  // Teaching time slots template (e.g. 09:00 - 10:00, etc.)
  const teachingSlots = timeSlots.filter((s) => s.day === 'Monday');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Direct Timetable Generation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Execute the CSP Backtracking Search engine with configurable heuristics and instant validation.
          </p>
        </div>

        {currentTimetable && (
          <div className="flex items-center gap-2">
            <Link href="/visualize">
              <Button variant="outline" size="sm">
                <Network className="w-4 h-4 mr-2 text-indigo-600" />
                View Search Tree Replay
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
          </div>
        )}
      </div>

      {/* Solver Configuration Panel */}
      <Card className="border-blue-100 bg-gradient-to-b from-white to-blue-50/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            CSP Solver Parameters
          </CardTitle>
          <CardDescription>
            Select student cohorts, active heuristics, and computational search thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Cohort Scope */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Batch Scope
              </label>
              <select
                value={targetBatch}
                onChange={(e) => setTargetBatch(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Registered Batches ({batches.length})</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.section})
                  </option>
                ))}
              </select>
            </div>

            {/* Heuristics toggles */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Variable Selection Heuristics
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMRV}
                    onChange={(e) => setUseMRV(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>
                    <strong>MRV</strong> (Minimum Remaining Values)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDegreeHeuristic}
                    onChange={(e) => setUseDegreeHeuristic(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>
                    <strong>Degree Heuristic</strong> (MRV Tie-Breaker)
                  </span>
                </label>
              </div>
            </div>

            {/* Value & Pruning */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Value Ordering & Pruning
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLCV}
                    onChange={(e) => setUseLCV(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>
                    <strong>LCV</strong> (Least Constraining Value)
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useForwardChecking}
                    onChange={(e) => setUseForwardChecking(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>
                    <strong>Forward Checking</strong> (Domain Pruning)
                  </span>
                </label>
              </div>
            </div>

            {/* Launch Button & Search Limits */}
            <div className="flex flex-col justify-end">
              <Button
                size="lg"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm text-sm"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                    Solving CSP Search Tree...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Start Timetable Generation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failure Alert Banner (if generation failed) */}
      {lastFailureReason && !currentTimetable && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <p className="font-semibold text-sm">Timetable Generation Failed</p>
            <p className="text-rose-700 leading-relaxed">{lastFailureReason}</p>
            <div className="pt-2 flex gap-2">
              <Link href="/data-management">
                <Button size="sm" variant="outline" className="text-xs bg-white">
                  Adjust Capacity / Venues
                </Button>
              </Link>
              <Link href="/constraints">
                <Button size="sm" variant="outline" className="text-xs bg-white">
                  Inspect Constraint Rules
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Execution Metrics Panel (if generated) */}
      {currentTimetable && (
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentTimetable.validation.isValid ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span className="font-semibold text-sm">
                  {currentTimetable.validation.isValid
                    ? 'Conflict-Free Timetable Synthesized'
                    : 'Solver Produced Incomplete/Violated State'}
                </span>
                <Badge
                  variant={currentTimetable.validation.isValid ? 'success' : 'danger'}
                  className="text-[10px]"
                >
                  Status: {currentTimetable.metrics.solutionStatus}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCSV}
                  className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportJSON}
                  className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export JSON
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Execution Time</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {formatTime(currentTimetable.metrics.executionTimeMs)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Assignments Attempted</span>
                <span className="text-lg font-bold font-mono text-white">
                  {currentTimetable.metrics.assignmentsAttempted.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Backtracks Triggered</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {currentTimetable.metrics.backtracksCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Constraint Checks</span>
                <span className="text-lg font-bold font-mono text-blue-400">
                  {currentTimetable.metrics.constraintChecksCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Nodes Explored</span>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {currentTimetable.metrics.exploredNodesCount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Soft Score Compliance</span>
                <span className="text-lg font-bold font-mono text-indigo-300">
                  {currentTimetable.validation.softScore}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timetable Calendar Section */}
      {currentTimetable ? (
        <div className="space-y-4">
          {/* Calendar Filter Toolbar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Interactive Filters:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Batch filter */}
                <select
                  value={filterBatchId}
                  onChange={(e) => setFilterBatchId(e.target.value)}
                  className="border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="all">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.section})
                    </option>
                  ))}
                </select>

                {/* Professor filter */}
                <select
                  value={filterProfId}
                  onChange={(e) => setFilterProfId(e.target.value)}
                  className="border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="all">All Professors</option>
                  {professors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Classroom filter */}
                <select
                  value={filterRoomId}
                  onChange={(e) => setFilterRoomId(e.target.value)}
                  className="border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="all">All Classrooms</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roomType})
                    </option>
                  ))}
                </select>

                {/* Subject filter */}
                <select
                  value={filterSubjectId}
                  onChange={(e) => setFilterSubjectId(e.target.value)}
                  className="border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>

                {(filterBatchId !== 'all' ||
                  filterProfId !== 'all' ||
                  filterRoomId !== 'all' ||
                  filterSubjectId !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterBatchId('all');
                      setFilterProfId('all');
                      setFilterRoomId('all');
                      setFilterSubjectId('all');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule Grid */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="py-3 px-4 text-left w-28 font-semibold uppercase tracking-wider text-[11px] border-r border-slate-200">
                    Time Window
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="py-3 px-4 text-center font-semibold uppercase tracking-wider text-[11px] border-r border-slate-200 last:border-r-0"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {teachingSlots.map((baseSlot) => {
                  const isBreak = baseSlot.isBreak;
                  return (
                    <tr
                      key={baseSlot.id}
                      className={isBreak ? 'bg-amber-50/40 text-amber-900' : 'hover:bg-slate-50/50'}
                    >
                      <td className="py-3 px-3 font-mono font-medium text-slate-700 border-r border-slate-200 bg-slate-50/60 whitespace-nowrap">
                        {baseSlot.startTime} - {baseSlot.endTime}
                        {isBreak && (
                          <span className="block text-[10px] text-amber-700 font-sans font-semibold">
                            Break Recess
                          </span>
                        )}
                      </td>

                      {DAYS.map((day) => {
                        if (isBreak) {
                          return (
                            <td
                              key={day}
                              className="py-3 px-2 text-center text-amber-600 font-medium text-[11px] border-r border-slate-200 last:border-r-0 italic bg-amber-50/30"
                            >
                              Lunch / Recess
                            </td>
                          );
                        }

                        // Find matching assignments for this day and slot interval
                        const cellAssignments = filteredAssignments.filter((a) => {
                          const slot = timeSlots.find((s) => s.id === a.slotId);
                          return a.day === day && slot?.startTime === baseSlot.startTime;
                        });

                        return (
                          <td
                            key={day}
                            className="py-2 px-2 align-top border-r border-slate-200 last:border-r-0 min-h-[70px] min-w-[140px]"
                          >
                            {cellAssignments.length === 0 ? (
                              <div className="h-full min-h-[50px] flex items-center justify-center text-slate-300 text-[11px]">
                                —
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {cellAssignments.map((a) => {
                                  const sub = subjects.find((s) => s.id === a.subjectId);
                                  const prof = professors.find((p) => p.id === a.professorId);
                                  const room = classrooms.find((c) => c.id === a.classroomId);
                                  const batch = batches.find((b) => b.id === a.batchId);

                                  return (
                                    <div
                                      key={a.variableId}
                                      className="p-2 rounded-lg border text-left shadow-2xs space-y-1 transition-all hover:shadow-xs"
                                      style={{
                                        borderLeftColor: sub?.color || '#3b82f6',
                                        borderLeftWidth: '3.5px',
                                        backgroundColor: '#ffffff',
                                      }}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-slate-900 font-mono">
                                          {sub?.code || a.subjectId}
                                        </span>
                                        <Badge
                                          variant={
                                            room?.roomType === 'lab'
                                              ? 'warning'
                                              : 'default'
                                          }
                                          className="text-[9px] py-0 px-1"
                                        >
                                          {room?.name || a.classroomId}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                                        {sub?.name}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                        <span className="line-clamp-1">{prof?.name}</span>
                                        <span className="font-semibold text-blue-600">
                                          {batch?.section}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <Card className="py-12 text-center">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Ready to Synthesize Schedule
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Configure your preferred heuristics above and click "Start Timetable Generation" to run the recursive Backtracking CSP solver.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


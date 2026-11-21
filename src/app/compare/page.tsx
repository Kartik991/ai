'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  GitBranch,
  Flame,
  Layers,
  Sparkles,
  BarChart3,
  TrendingDown,
  Info,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useTimetableStore } from '@/stores/use-timetable-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '@/components/ui';
import { solveTimetableCSP, generateLectureSessions } from '@/algorithms/csp/backtracking';
import { solveTimetableMinConflicts } from '@/algorithms/optimization/min-conflicts';
import { formatTime } from '@/lib/utils';
import {
  ComparisonRun,
  AlgorithmComparisonResult,
  SolverOptions,
  MinConflictsOptions,
  SearchMetrics,
  MinConflictsMetrics,
} from '@/types';
import { ALL_PRESETS } from '@/data/presets';

export default function ComparePage() {
  const {
    subjects,
    professors,
    batches,
    classrooms,
    timeSlots,
    hardConstraints,
    softPreferences,
    activePresetId,
    loadPreset,
    comparisonResult,
    setComparisonResult,
  } = useTimetableStore();

  const [isRunningComparison, setIsRunningComparison] = useState(false);
  const [minConflictsRunsCount, setMinConflictsRunsCount] = useState<number>(3); // Run 3 Min-Conflicts seeds for statistical stability
  const [selectedBatchScope, setSelectedBatchScope] = useState<string>('all');
  const [targetDataset, setTargetDataset] = useState<string>(activePresetId);

  const activePreset = ALL_PRESETS.find((p) => p.id === activePresetId) || ALL_PRESETS[0];

  const handleRunComparison = () => {
    setIsRunningComparison(true);

    setTimeout(() => {
      try {
        const batchFilter = selectedBatchScope === 'all' ? undefined : [selectedBatchScope];
        const variables = generateLectureSessions(subjects, batches, professors, batchFilter);

        // 1. Run Backtracking + MRV
        const btOptions: SolverOptions = {
          useMRV: true,
          useDegreeHeuristic: true,
          useLCV: true,
          useForwardChecking: true,
          maxSteps: 10000,
          timeLimitMs: 15000,
          recordTrace: false,
          batchIds: batchFilter,
        };

        const btResult = solveTimetableCSP(
          variables,
          professors,
          batches,
          classrooms,
          timeSlots,
          hardConstraints,
          softPreferences,
          btOptions
        );

        const btRun: ComparisonRun = {
          algorithm: 'backtracking',
          name: 'Backtracking + MRV',
          success: btResult.success,
          executionTimeMs: btResult.metrics.executionTimeMs,
          primaryWorkMetric: btResult.metrics.exploredNodesCount,
          primaryWorkLabel: 'Explored Nodes',
          secondaryWorkMetric: btResult.metrics.backtracksCount,
          secondaryWorkLabel: 'Backtracks Triggered',
          constraintChecks: btResult.metrics.constraintChecksCount,
          hardViolations: btResult.timetable?.validation.hardViolations.length ?? 999,
          softScore: btResult.timetable?.validation.softScore ?? 0,
          timetable: btResult.timetable,
          status: btResult.metrics.solutionStatus,
        };

        // 2. Run Min-Conflicts across N seeds
        const mcRuns: ComparisonRun[] = [];
        const baseSeeds = [42, 101, 777, 2026, 9999].slice(0, minConflictsRunsCount);

        for (let i = 0; i < baseSeeds.length; i++) {
          const seed = baseSeeds[i];
          const mcOptions: MinConflictsOptions = {
            maxIterations: 1500,
            maxRestarts: 3,
            stagnationThreshold: 50,
            randomSeed: seed,
            initStrategy: 'greedy',
            optimizeSoftPreferences: true,
            timeLimitMs: 15000,
            recordTrace: false,
            batchIds: batchFilter,
          };

          const mcResult = solveTimetableMinConflicts(
            variables,
            professors,
            batches,
            classrooms,
            timeSlots,
            hardConfigToCompare(hardConstraints),
            softPreferences,
            mcOptions
          );

          mcRuns.push({
            algorithm: 'min-conflicts',
            name: `Min-Conflicts (Seed ${seed})`,
            seed,
            success: mcResult.success,
            executionTimeMs: mcResult.metrics.executionTimeMs,
            primaryWorkMetric: mcResult.metrics.totalIterations,
            primaryWorkLabel: 'Total Iterations',
            secondaryWorkMetric: mcResult.metrics.totalRestarts,
            secondaryWorkLabel: 'Restarts Triggered',
            constraintChecks: mcResult.metrics.candidateValuesEvaluatedCount,
            hardViolations: mcResult.timetable?.validation.hardViolations.length ?? mcResult.remainingConflicts,
            softScore: mcResult.timetable?.validation.softScore ?? 0,
            timetable: mcResult.timetable,
            status: mcResult.metrics.solutionStatus,
          });
        }

        // Summary calculations
        const avgMcTime = mcRuns.reduce((sum, r) => sum + r.executionTimeMs, 0) / mcRuns.length;
        const mcSuccessCount = mcRuns.filter((r) => r.success).length;

        const fasterAlgo =
          Math.abs(btRun.executionTimeMs - avgMcTime) < 5
            ? 'tie'
            : btRun.executionTimeMs < avgMcTime
            ? 'backtracking'
            : 'min-conflicts';

        const avgMcSoft = mcRuns.reduce((sum, r) => sum + r.softScore, 0) / mcRuns.length;
        const higherQuality =
          btRun.softScore === avgMcSoft
            ? 'tie'
            : btRun.softScore > avgMcSoft
            ? 'backtracking'
            : 'min-conflicts';

        const notes: string[] = [];
        if (btRun.success) {
          notes.push(`Backtracking found a certified valid solution in ${btRun.executionTimeMs} ms with ${btRun.secondaryWorkMetric} backtrack(s).`);
        } else {
          notes.push('Backtracking exhausted the search space or reached limit.');
        }

        notes.push(
          `Min-Conflicts achieved a ${mcSuccessCount}/${mcRuns.length} (${Math.round(
            (mcSuccessCount / mcRuns.length) * 100
          )}%) success rate across ${mcRuns.length} seeded runs with average execution time ${Math.round(
            avgMcTime
          )} ms.`
        );

        if (fasterAlgo === 'backtracking') {
          notes.push('Backtracking with Forward Checking and MRV was faster due to rapid failure pruning at the top of the search tree.');
        } else if (fasterAlgo === 'min-conflicts') {
          notes.push('Min-Conflicts repaired conflicts rapidly through local heuristic moves without exploring irrelevant subtrees.');
        }

        const compResult: AlgorithmComparisonResult = {
          timestamp: new Date().toISOString(),
          datasetName: activePreset.name,
          variablesCount: variables.length,
          backtrackingRun: btRun,
          minConflictsRuns: mcRuns,
          summary: {
            fasterAlgorithm: fasterAlgo,
            higherQualityAlgorithm: higherQuality,
            timeDifferenceMs: Math.round(Math.abs(btRun.executionTimeMs - avgMcTime)),
            notes,
          },
        };

        setComparisonResult(compResult);
      } catch (err) {
        console.error('Comparison execution failed:', err);
      } finally {
        setIsRunningComparison(false);
      }
    }, 50);
  };

  function hardConfigToCompare(config: any) {
    return { ...config };
  }

  // Chart Data Preparation
  const chartData = comparisonResult
    ? [
        {
          name: 'Backtracking + MRV',
          type: 'Systematic',
          timeMs: comparisonResult.backtrackingRun.executionTimeMs,
          softScore: comparisonResult.backtrackingRun.softScore,
          checksCount: comparisonResult.backtrackingRun.constraintChecks,
          color: '#2563eb',
        },
        ...comparisonResult.minConflictsRuns.map((r, idx) => ({
          name: `Min-Conflicts #${idx + 1} (Seed ${r.seed})`,
          type: 'Local Search',
          timeMs: r.executionTimeMs,
          softScore: r.softScore,
          checksCount: r.constraintChecks,
          color: '#6366f1',
        })),
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Algorithm Benchmark & Comparison
            </h1>
            <Badge variant="purple" className="text-xs font-semibold">
              Phase 2 Benchmark Module
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Empirical comparative analysis between systematic <strong>Backtracking + MRV</strong> and stochastic <strong>Min-Conflicts Local Search</strong> on identical academic problem instances.
          </p>
        </div>
      </div>

      {/* Experimental Setup Controller */}
      <Card className="border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Controlled Experimental Testbed
                </span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white">
                Benchmark Setup: {activePreset.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Both algorithms execute under identical constraint rules, room capacities, faculty availability, and time slots. Min-Conflicts is evaluated across multiple random seeds to measure convergence consistency.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 uppercase font-semibold mb-1">
                  Active Dataset Scenario
                </label>
                <select
                  value={activePresetId}
                  onChange={(e) => loadPreset(e.target.value)}
                  className="bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ALL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.badge}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 uppercase font-semibold mb-1">
                  Min-Conflicts Seeds Count
                </label>
                <select
                  value={minConflictsRunsCount}
                  onChange={(e) => setMinConflictsRunsCount(parseInt(e.target.value))}
                  className="bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">1 Seed Run</option>
                  <option value="3">3 Seeded Runs (Recommended)</option>
                  <option value="5">5 Seeded Runs (Comprehensive)</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  size="lg"
                  disabled={isRunningComparison}
                  onClick={handleRunComparison}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md text-xs font-bold"
                >
                  {isRunningComparison ? (
                    <>
                      <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                      Executing Comparative Benchmark...
                    </>
                  ) : (
                    <>
                      <Scale className="w-4 h-4 mr-2" />
                      Run Side-by-Side Benchmark
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonResult ? (
        <div className="space-y-8">
          {/* Executive Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] text-blue-700 uppercase font-semibold tracking-wider">
                  Faster Execution
                </span>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-900 capitalize">
                    {comparisonResult.summary.fasterAlgorithm.replace('-', ' ')}
                  </h4>
                  <Badge variant="purple" className="text-[10px]">
                    Δ {comparisonResult.summary.timeDifferenceMs} ms
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600">
                  {comparisonResult.summary.fasterAlgorithm === 'backtracking'
                    ? 'MRV heuristic pruned unviable branches earlier.'
                    : 'Local repair solved conflicts without backtracking depth.'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-indigo-50/40">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] text-indigo-700 uppercase font-semibold tracking-wider">
                  Convergence Rate
                </span>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-900">
                    {comparisonResult.backtrackingRun.success ? '100%' : '0%'} (BT) vs{' '}
                    {Math.round(
                      (comparisonResult.minConflictsRuns.filter((r) => r.success).length /
                        comparisonResult.minConflictsRuns.length) *
                        100
                    )}% (MC)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600">
                  Ratio of trials resulting in an independently verified 0-conflict schedule.
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] text-emerald-700 uppercase font-semibold tracking-wider">
                  Schedule Ergonomics Score
                </span>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-900">
                    {comparisonResult.backtrackingRun.softScore}% vs{' '}
                    {Math.round(
                      comparisonResult.minConflictsRuns.reduce((sum, r) => sum + r.softScore, 0) /
                        comparisonResult.minConflictsRuns.length
                    )}%
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600">
                  Pedagogical quality assessing student gap hours and faculty preferences.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Visual Benchmark Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Execution Time (ms) */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Execution Time Comparison (Lower is Faster)
                </CardTitle>
                <CardDescription className="text-xs">
                  Elapsed run time (milliseconds) on identical session variables.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} unit="ms" />
                    <Tooltip
                      formatter={(val: any) => [`${val} ms`, 'Execution Time']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 2: Constraint Checks / Work Units */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Evaluations & Constraint Checks
                </CardTitle>
                <CardDescription className="text-xs">
                  Computational operations performed to reach valid configuration.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [val.toLocaleString(), 'Checks / Evals']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="checksCount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Granular Comparison Table */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Granular Performance Metrics Matrix</CardTitle>
              <CardDescription className="text-xs">
                Detailed comparison distinguishing systematic tree search metrics from stochastic local search iterations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">Trial Instance</th>
                    <th className="p-3.5">Paradigm</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Runtime</th>
                    <th className="p-3.5">Primary Work Metric</th>
                    <th className="p-3.5">Recovery Action</th>
                    <th className="p-3.5">Remaining Conflicts</th>
                    <th className="p-3.5">Soft Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Backtracking Row */}
                  <tr className="bg-blue-50/20 font-medium">
                    <td className="p-3.5 font-bold text-blue-900">
                      {comparisonResult.backtrackingRun.name}
                    </td>
                    <td className="p-3.5 text-slate-600">Systematic Tree Search</td>
                    <td className="p-3.5">
                      <Badge variant={comparisonResult.backtrackingRun.success ? 'success' : 'danger'}>
                        {comparisonResult.backtrackingRun.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-slate-900">
                      {formatTime(comparisonResult.backtrackingRun.executionTimeMs)}
                    </td>
                    <td className="p-3.5 text-slate-700 font-mono">
                      {comparisonResult.backtrackingRun.primaryWorkMetric.toLocaleString()} {comparisonResult.backtrackingRun.primaryWorkLabel}
                    </td>
                    <td className="p-3.5 text-amber-700 font-mono">
                      {comparisonResult.backtrackingRun.secondaryWorkMetric} {comparisonResult.backtrackingRun.secondaryWorkLabel}
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className={comparisonResult.backtrackingRun.hardViolations === 0 ? 'text-emerald-600 font-bold' : 'text-rose-600'}>
                        {comparisonResult.backtrackingRun.hardViolations} violations
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-blue-600">
                      {comparisonResult.backtrackingRun.softScore}%
                    </td>
                  </tr>

                  {/* Min-Conflicts Rows */}
                  {comparisonResult.minConflictsRuns.map((mcRun, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-800">
                        {mcRun.name}
                      </td>
                      <td className="p-3.5 text-slate-600">Stochastic Local Repair</td>
                      <td className="p-3.5">
                        <Badge variant={mcRun.success ? 'success' : 'danger'}>
                          {mcRun.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-mono text-slate-900">
                        {formatTime(mcRun.executionTimeMs)}
                      </td>
                      <td className="p-3.5 text-slate-700 font-mono">
                        {mcRun.primaryWorkMetric.toLocaleString()} {mcRun.primaryWorkLabel}
                      </td>
                      <td className="p-3.5 text-amber-700 font-mono">
                        {mcRun.secondaryWorkMetric} {mcRun.secondaryWorkLabel}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className={mcRun.hardViolations === 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                          {mcRun.hardViolations} violations
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-indigo-600">
                        {mcRun.softScore}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Academic Discussion Notes */}
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="py-4">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Algorithmic Insights & Research Observations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600 leading-relaxed">
              {comparisonResult.summary.notes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Empty State */
        <Card className="py-16 text-center border-dashed">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Ready to Benchmark Algorithms
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Execute Backtracking + MRV and Min-Conflicts side-by-side on the current university dataset to generate comparative runtime charts and accuracy statistics.
              </p>
            </div>
            <Button onClick={handleRunComparison} className="bg-indigo-600 hover:bg-indigo-700 text-xs">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Launch Side-by-Side Benchmark
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

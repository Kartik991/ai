'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  Database,
  Layers,
  PlayCircle,
  Network,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useTimetableStore } from '@/stores/use-timetable-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { formatTime } from '@/lib/utils';
import { generateLectureSessions } from '@/algorithms/csp/backtracking';

export default function DashboardPage() {
  const {
    subjects,
    professors,
    batches,
    classrooms,
    timeSlots,
    currentTimetable,
    lastMetrics,
    lastFailureReason,
  } = useTimetableStore();

  // Calculate total lecture sessions across all batches
  const allSessions = generateLectureSessions(subjects, batches, professors);

  const stats = [
    {
      label: 'Academic Subjects',
      value: subjects.length,
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      desc: `${subjects.filter((s) => s.requiredRoomType === 'lab').length} Labs, ${subjects.filter((s) => s.requiredRoomType === 'lecture_hall').length} Lecture courses`,
    },
    {
      label: 'Teaching Faculty',
      value: professors.length,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      desc: 'With individual availability slots & preferences',
    },
    {
      label: 'Student Batches',
      value: batches.length,
      icon: GraduationCap,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      desc: `${batches.reduce((sum, b) => sum + b.studentCount, 0)} total enrolled students`,
    },
    {
      label: 'Classrooms & Labs',
      value: classrooms.length,
      icon: Building2,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      desc: `${classrooms.reduce((sum, r) => sum + r.capacity, 0)} aggregate seat capacity`,
    },
    {
      label: 'Total CSP Variables',
      value: allSessions.length,
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      desc: 'Individual lecture sessions to schedule',
    },
    {
      label: 'Time Slots / Week',
      value: timeSlots.filter((s) => !s.isBreak).length,
      icon: Clock,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      desc: 'Weekly teaching windows across 5 days',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 1 Academic Release: Constraint Satisfaction Problem Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              IntelliSched Timetable Management
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automated university schedule synthesis powered by exact CSP algorithms. Implements recursive Backtracking with Minimum Remaining Values (MRV), Degree Heuristic tie-breaking, Least Constraining Value (LCV) ordering, and Forward Checking with live search-tree replay.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/generate">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white shadow-md">
                <PlayCircle className="w-5 h-5 mr-2" />
                Generate Schedule
              </Button>
            </Link>
            <Link href="/visualize">
              <Button size="lg" variant="outline" className="border-slate-600 bg-slate-800/60 text-white hover:bg-slate-800 hover:text-white">
                <Network className="w-5 h-5 mr-2 text-indigo-400" />
                Visualizer Tree
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <Card key={st.label} className="hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg border ${st.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{st.value}</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-700">{st.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{st.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Status & Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Generation Status & Latest Solution */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Timetable Generation Status</CardTitle>
                <CardDescription>Current state of the CSP scheduling engine</CardDescription>
              </div>
              {currentTimetable ? (
                <Badge variant={currentTimetable.validation.isValid ? 'success' : 'danger'}>
                  {currentTimetable.validation.isValid ? 'Valid Solution Active' : 'Violations Found'}
                </Badge>
              ) : (
                <Badge variant="outline">No Timetable Generated Yet</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {currentTimetable ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">Total Scheduled</span>
                      <span className="text-lg font-bold text-slate-900">
                        {currentTimetable.assignments.length} / {allSessions.length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">Hard Violations</span>
                      <span className={`text-lg font-bold ${currentTimetable.validation.hardViolations.length === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {currentTimetable.validation.hardViolations.length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">Soft Compliance</span>
                      <span className="text-lg font-bold text-blue-600">
                        {currentTimetable.validation.softScore}%
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block">Solver Run Time</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatTime(currentTimetable.metrics.executionTimeMs)}
                      </span>
                    </div>
                  </div>

                  {currentTimetable.validation.isValid ? (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-900">
                        <p className="font-semibold">Independent Verification Complete</p>
                        <p className="text-emerald-700 mt-0.5">
                          The schedule strictly satisfies all 8 hard constraints without professor double-booking, room clashes, or capacity shortages.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-rose-900">
                        <p className="font-semibold">Hard Constraint Violations Detected</p>
                        <p className="text-rose-700 mt-0.5">
                          {currentTimetable.validation.hardViolations.map((v) => v.description).join('; ')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Generated at {new Date(currentTimetable.createdAt).toLocaleTimeString()}
                    </span>
                    <div className="flex gap-2">
                      <Link href="/generate">
                        <Button size="sm">
                          View Weekly Grid <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                      <Link href="/visualize">
                        <Button size="sm" variant="outline">
                          Replay Search Tree
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">No Timetable Generated Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Click below to execute the CSP Backtracking algorithm on the university dataset.
                    </p>
                  </div>
                  <Link href="/generate">
                    <Button size="sm">Launch Generator</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/data-management" className="group">
              <Card className="h-full hover:border-blue-300 hover:shadow-xs transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="p-2 w-fit rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Manage Academic Data</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    CRUD interfaces for courses, professors, batches, classrooms, and time windows.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/constraints" className="group">
              <Card className="h-full hover:border-blue-300 hover:shadow-xs transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="p-2 w-fit rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Configure Constraints</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Toggle 8 hard rules and adjust optimization weights for gaps and preferences.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/learn" className="group">
              <Card className="h-full hover:border-blue-300 hover:shadow-xs transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Learning Center</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Deep educational guides for CSP, MRV, Degree, LCV, and Min-Conflicts theory.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Algorithm Overview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSP Algorithm Suite</CardTitle>
              <CardDescription>Implemented algorithms & heuristics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <GitBranch className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">Backtracking Search</span>
                      <Badge variant="success" className="text-[10px] py-0">Active</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recursive depth-first search with complete undo and state restoration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">MRV Heuristic</span>
                      <Badge variant="purple" className="text-[10px] py-0">Variable</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chooses unassigned lecture with fewest remaining legal domain values.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Layers className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">Degree Tie-Breaker</span>
                      <Badge variant="purple" className="text-[10px] py-0">Tie-Breaker</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Selects variable constraining greatest number of unassigned neighbors.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Sliders className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">LCV Heuristic</span>
                      <Badge variant="default" className="text-[10px] py-0">Value</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Orders slots to leave maximal choices open for neighboring variables.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">Forward Checking</span>
                      <Badge variant="success" className="text-[10px] py-0">Pruning</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Prunes conflicting choices immediately and detects domain wipeout early.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/learn">
                  <Button variant="outline" size="sm" className="w-full">
                    Explore Algorithm Mechanics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

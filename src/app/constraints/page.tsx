'use client';

import React from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles,
  Users,
  Building2,
  GraduationCap,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { useTimetableStore } from '@/stores/use-timetable-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';
import { DEFAULT_HARD_CONSTRAINTS, DEFAULT_SOFT_PREFERENCES } from '@/data/demo-data';

export default function ConstraintsPage() {
  const {
    hardConstraints,
    softPreferences,
    setHardConstraints,
    setSoftPreferences,
  } = useTimetableStore();

  const handleResetDefaults = () => {
    setHardConstraints(DEFAULT_HARD_CONSTRAINTS);
    setSoftPreferences(DEFAULT_SOFT_PREFERENCES);
  };

  const hardRules = [
    {
      key: 'noProfessorClash' as const,
      title: 'Professor Double-Booking Prevention',
      description: 'A professor cannot teach two lectures at the same day and time slot.',
      severity: 'Strict Mandatory',
      icon: Users,
    },
    {
      key: 'noClassroomClash' as const,
      title: 'Classroom Double-Booking Prevention',
      description: 'A classroom cannot host two lecture sessions simultaneously.',
      severity: 'Strict Mandatory',
      icon: Building2,
    },
    {
      key: 'noBatchClash' as const,
      title: 'Student Batch Double-Booking Prevention',
      description: 'A student section cannot attend two classes simultaneously.',
      severity: 'Strict Mandatory',
      icon: GraduationCap,
    },
    {
      key: 'classroomCapacity' as const,
      title: 'Room Capacity Compliance',
      description: 'Classroom capacity must be greater than or equal to student batch count.',
      severity: 'Strict Mandatory',
      icon: LayoutGrid,
    },
    {
      key: 'professorAvailability' as const,
      title: 'Professor Availability Windows',
      description: 'Lectures can only be assigned to slots where the assigned professor is marked available.',
      severity: 'Strict Mandatory',
      icon: Clock,
    },
    {
      key: 'classroomSuitability' as const,
      title: 'Room Type & Equipment Suitability',
      description: 'Lab courses must be placed in labs; lecture courses in lecture halls.',
      severity: 'Strict Mandatory',
      icon: Building2,
    },
    {
      key: 'allSessionsScheduled' as const,
      title: 'All Required Sessions Scheduled',
      description: 'Every weekly lecture required by course syllabi must be scheduled.',
      severity: 'Strict Mandatory',
      icon: CheckCircle2,
    },
    {
      key: 'noBreakSlotClash' as const,
      title: 'Break & Recess Protection',
      description: 'No sessions may be scheduled during official lunch or break intervals.',
      severity: 'Strict Mandatory',
      icon: Clock,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Constraint Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure the CSP solver rules. Distinguish between mandatory hard constraints and heuristic soft preferences.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleResetDefaults}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All to Defaults
        </Button>
      </div>

      {/* Advisory Callout */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-semibold">CSP Constraint Hierarchy in IntelliSched</p>
          <p className="text-blue-700 leading-relaxed">
            <strong>Hard Constraints</strong> define the valid search space. If a proposed assignment violates any active hard constraint, the Backtracking search prunes it immediately or backtracks. <strong>Soft Preferences</strong> do not invalidate solutions; instead, they evaluate timetable quality and schedule ergonomics on a scale of 0 to 100.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Hard Constraints */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Mandatory Hard Constraints</h2>
              <p className="text-xs text-slate-500">Violations render a timetable mathematically invalid</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {hardRules.map((rule) => {
                const Icon = rule.icon;
                const isEnabled = hardConstraints[rule.key];
                return (
                  <div key={rule.key} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-slate-900">{rule.title}</h4>
                          <Badge variant={isEnabled ? 'danger' : 'outline'} className="text-[10px] py-0">
                            {isEnabled ? 'Enforced' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{rule.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => setHardConstraints({ [rule.key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Soft Preferences */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Optimization Soft Preferences</h2>
              <p className="text-xs text-slate-500">Weight parameters for ergonomic and pedagogical quality</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-5 space-y-6">
              {/* 1. Student Gaps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Minimize Student Batch Gaps</h4>
                    <p className="text-xs text-slate-500">Penalizes idle intermediate gap hours in student schedules</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={softPreferences.minimizeStudentGaps}
                    onChange={(e) => setSoftPreferences({ minimizeStudentGaps: e.target.checked })}
                    className="rounded text-indigo-600 h-4 w-4"
                  />
                </div>
                {softPreferences.minimizeStudentGaps && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-slate-400 w-16">Weight: {softPreferences.studentGapWeight}/10</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={softPreferences.studentGapWeight}
                      onChange={(e) => setSoftPreferences({ studentGapWeight: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* 2. Professor Gaps */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Minimize Faculty Gaps</h4>
                    <p className="text-xs text-slate-500">Penalizes unproductive idle hours between teaching slots</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={softPreferences.minimizeProfessorGaps}
                    onChange={(e) => setSoftPreferences({ minimizeProfessorGaps: e.target.checked })}
                    className="rounded text-indigo-600 h-4 w-4"
                  />
                </div>
                {softPreferences.minimizeProfessorGaps && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-slate-400 w-16">Weight: {softPreferences.professorGapWeight}/10</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={softPreferences.professorGapWeight}
                      onChange={(e) => setSoftPreferences({ professorGapWeight: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* 3. Even Distribution */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Distribute Lectures Across Week</h4>
                    <p className="text-xs text-slate-500">Prevents clustering all lectures of a subject on the same day</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={softPreferences.distributeLecturesEvenly}
                    onChange={(e) => setSoftPreferences({ distributeLecturesEvenly: e.target.checked })}
                    className="rounded text-indigo-600 h-4 w-4"
                  />
                </div>
                {softPreferences.distributeLecturesEvenly && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-slate-400 w-16">Weight: {softPreferences.distributionWeight}/10</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={softPreferences.distributionWeight}
                      onChange={(e) => setSoftPreferences({ distributionWeight: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* 4. Consecutive Limit */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Avoid Excessive Consecutive Lectures</h4>
                    <p className="text-xs text-slate-500">Avoids more than {softPreferences.consecutiveLimit} back-to-back hours</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={softPreferences.avoidExcessiveConsecutive}
                    onChange={(e) => setSoftPreferences({ avoidExcessiveConsecutive: e.target.checked })}
                    className="rounded text-indigo-600 h-4 w-4"
                  />
                </div>
                {softPreferences.avoidExcessiveConsecutive && (
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">Max consecutive:</span>
                      <select
                        value={softPreferences.consecutiveLimit}
                        onChange={(e) => setSoftPreferences({ consecutiveLimit: parseInt(e.target.value) || 3 })}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="2">2 Hours</option>
                        <option value="3">3 Hours</option>
                        <option value="4">4 Hours</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] text-slate-400 w-16">Weight: {softPreferences.consecutiveWeight}/10</span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={softPreferences.consecutiveWeight}
                        onChange={(e) => setSoftPreferences({ consecutiveWeight: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Preferred Slots */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Respect Preferred Faculty Slots</h4>
                    <p className="text-xs text-slate-500">Prioritizes scheduling faculty during their designated preferred hours</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={softPreferences.respectPreferredSlots}
                    onChange={(e) => setSoftPreferences({ respectPreferredSlots: e.target.checked })}
                    className="rounded text-indigo-600 h-4 w-4"
                  />
                </div>
                {softPreferences.respectPreferredSlots && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-slate-400 w-16">Weight: {softPreferences.preferredSlotsWeight}/10</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={softPreferences.preferredSlotsWeight}
                      onChange={(e) => setSoftPreferences({ preferredSlotsWeight: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>

              {/* 6. Classroom Utilization */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Maximize Classroom Utilization</h4>
                    <p className="text-xs text-slate-500">Penalizes large seat waste when smaller fitting venues are available</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={softPreferences.maximizeRoomUtilization}
                    onChange={(e) => setSoftPreferences({ maximizeRoomUtilization: e.target.checked })}
                    className="rounded text-indigo-600 h-4 w-4"
                  />
                </div>
                {softPreferences.maximizeRoomUtilization && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[11px] text-slate-400 w-16">Weight: {softPreferences.utilizationWeight}/10</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={softPreferences.utilizationWeight}
                      onChange={(e) => setSoftPreferences({ utilizationWeight: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


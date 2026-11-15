'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Coffee,
  Calendar,
  Sparkles,
  Sliders,
  CheckCircle2,
  Ban,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTimetableStore } from '@/stores/use-timetable-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  Modal,
} from '@/components/ui';
import {
  Subject,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  RoomType,
  DayOfWeek,
} from '@/types';
import { DAYS } from '@/data/demo-data';
import { ALL_PRESETS, AcademicPreset } from '@/data/presets';

type TabType = 'slots' | 'subjects' | 'professors' | 'batches' | 'classrooms';

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('slots');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');

  const {
    subjects,
    professors,
    batches,
    classrooms,
    timeSlots,
    activePresetId,
    loadPreset,
    addSubject,
    updateSubject,
    deleteSubject,
    addProfessor,
    updateProfessor,
    deleteProfessor,
    addBatch,
    updateBatch,
    deleteBatch,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    addTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    toggleTimeSlotDisabled,
    toggleTimeSlotBreak,
    toggleDayDisabled,
  } = useTimetableStore();

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states with manual validation
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    weeklyLectures: 3,
    requiredRoomType: 'lecture_hall' as RoomType,
    requiredCapacity: 45,
    color: '#3B82F6',
  });

  const [profForm, setProfForm] = useState({
    name: '',
    email: '',
    department: '',
    assignedSubjectIds: [] as string[],
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as DayOfWeek[],
  });

  const [batchForm, setBatchForm] = useState({
    name: '',
    section: '',
    studentCount: 40,
    program: 'Computer Science',
    subjectIds: [] as string[],
  });

  const [roomForm, setRoomForm] = useState({
    name: '',
    capacity: 50,
    roomType: 'lecture_hall' as RoomType,
    building: 'Main Block',
  });

  const [slotForm, setSlotForm] = useState({
    day: 'Monday' as DayOfWeek,
    startTime: '09:00',
    endTime: '10:00',
    isBreak: false,
    disabled: false,
    label: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset forms
  const openAddModal = () => {
    setEditingId(null);
    setFormErrors({});
    if (activeTab === 'subjects') {
      setSubjectForm({
        code: '',
        name: '',
        weeklyLectures: 3,
        requiredRoomType: 'lecture_hall',
        requiredCapacity: 45,
        color: '#3B82F6',
      });
    } else if (activeTab === 'professors') {
      setProfForm({
        name: '',
        email: '',
        department: 'Computer Science',
        assignedSubjectIds: subjects.slice(0, 1).map((s) => s.id),
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      });
    } else if (activeTab === 'batches') {
      setBatchForm({
        name: 'B.Tech CSE - Year 3',
        section: 'Section C',
        studentCount: 40,
        program: 'CSE',
        subjectIds: subjects.slice(0, 3).map((s) => s.id),
      });
    } else if (activeTab === 'classrooms') {
      setRoomForm({
        name: 'Hall 103',
        capacity: 50,
        roomType: 'lecture_hall',
        building: 'Science Block',
      });
    } else if (activeTab === 'slots') {
      setSlotForm({
        day: 'Monday',
        startTime: '16:00',
        endTime: '17:00',
        isBreak: false,
        disabled: false,
        label: '16:00 - 17:00',
      });
    }
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setFormErrors({});
    if (activeTab === 'subjects') {
      setSubjectForm({
        code: item.code,
        name: item.name,
        weeklyLectures: item.weeklyLectures,
        requiredRoomType: item.requiredRoomType,
        requiredCapacity: item.requiredCapacity,
        color: item.color || '#3B82F6',
      });
    } else if (activeTab === 'professors') {
      setProfForm({
        name: item.name,
        email: item.email,
        department: item.department,
        assignedSubjectIds: item.assignedSubjectIds || [],
        availableDays: Array.from(new Set(item.availableSlots.map((s: any) => s.day))) as DayOfWeek[],
      });
    } else if (activeTab === 'batches') {
      setBatchForm({
        name: item.name,
        section: item.section,
        studentCount: item.studentCount,
        program: item.program,
        subjectIds: item.subjectIds || [],
      });
    } else if (activeTab === 'classrooms') {
      setRoomForm({
        name: item.name,
        capacity: item.capacity,
        roomType: item.roomType,
        building: item.building,
      });
    } else if (activeTab === 'slots') {
      setSlotForm({
        day: item.day,
        startTime: item.startTime,
        endTime: item.endTime,
        isBreak: item.isBreak,
        disabled: !!item.disabled,
        label: item.label,
      });
    }
    setModalOpen(true);
  };

  // Submit Handler with manual validation
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (activeTab === 'subjects') {
      if (!subjectForm.code.trim()) errors.code = 'Subject code is required';
      if (!subjectForm.name.trim()) errors.name = 'Subject name is required';
      if (subjectForm.weeklyLectures < 1 || subjectForm.weeklyLectures > 10) {
        errors.weeklyLectures = 'Must be between 1 and 10';
      }
      if (subjectForm.requiredCapacity < 1) errors.requiredCapacity = 'Must be greater than 0';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      if (editingId) {
        updateSubject(editingId, subjectForm);
      } else {
        addSubject(subjectForm);
      }
    } else if (activeTab === 'professors') {
      if (!profForm.name.trim()) errors.name = 'Professor name is required';
      if (!profForm.email.trim() || !profForm.email.includes('@')) errors.email = 'Valid email is required';
      if (profForm.assignedSubjectIds.length === 0) errors.assignedSubjectIds = 'Assign at least one subject';
      if (profForm.availableDays.length === 0) errors.availableDays = 'Select at least one available day';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      const availableSlots = timeSlots
        .filter((s) => !s.disabled && !s.isBreak && profForm.availableDays.includes(s.day))
        .map((s) => ({ day: s.day, slotId: s.id }));

      const payload = {
        name: profForm.name,
        email: profForm.email,
        department: profForm.department,
        assignedSubjectIds: profForm.assignedSubjectIds,
        availableSlots,
        preferredSlots: availableSlots.slice(0, 4),
      };

      if (editingId) {
        updateProfessor(editingId, payload);
      } else {
        addProfessor(payload);
      }
    } else if (activeTab === 'batches') {
      if (!batchForm.name.trim()) errors.name = 'Batch name is required';
      if (!batchForm.section.trim()) errors.section = 'Section is required';
      if (batchForm.studentCount < 1) errors.studentCount = 'Must have at least 1 student';
      if (batchForm.subjectIds.length === 0) errors.subjectIds = 'Select at least one subject';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      if (editingId) {
        updateBatch(editingId, batchForm);
      } else {
        addBatch(batchForm);
      }
    } else if (activeTab === 'classrooms') {
      if (!roomForm.name.trim()) errors.name = 'Room name is required';
      if (roomForm.capacity < 1) errors.capacity = 'Capacity must be greater than 0';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      if (editingId) {
        updateClassroom(editingId, roomForm);
      } else {
        addClassroom(roomForm);
      }
    } else if (activeTab === 'slots') {
      if (!slotForm.startTime) errors.startTime = 'Start time is required';
      if (!slotForm.endTime) errors.endTime = 'End time is required';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      const payload = {
        ...slotForm,
        label: slotForm.label || `${slotForm.startTime} - ${slotForm.endTime}`,
      };

      if (editingId) {
        updateTimeSlot(editingId, payload);
      } else {
        addTimeSlot(payload);
      }
    }

    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    if (activeTab === 'subjects') deleteSubject(deleteConfirmId);
    if (activeTab === 'professors') deleteProfessor(deleteConfirmId);
    if (activeTab === 'batches') deleteBatch(deleteConfirmId);
    if (activeTab === 'classrooms') deleteClassroom(deleteConfirmId);
    if (activeTab === 'slots') deleteTimeSlot(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // Distinct time intervals for rows (e.g. 09:00 - 10:00)
  const distinctIntervals = Array.from(
    new Set(timeSlots.map((s) => `${s.startTime}-${s.endTime}`))
  ).map((interval) => {
    const [start, end] = interval.split('-');
    return { start, end };
  }).sort((a, b) => a.start.localeCompare(b.start));

  // Time slots stats
  const activeTeachingSlotsCount = timeSlots.filter((s) => !s.disabled && !s.isBreak).length;
  const breakSlotsCount = timeSlots.filter((s) => !s.disabled && s.isBreak).length;
  const disabledSlotsCount = timeSlots.filter((s) => s.disabled).length;

  const currentPreset = ALL_PRESETS.find((p) => p.id === activePresetId) || ALL_PRESETS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Data Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual editor for curriculum courses, faculty availability, cohorts, facilities, and weekly time grids.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddModal} className="sm:self-end">
            <Plus className="w-4 h-4 mr-2" />
            Add New {activeTab === 'slots' ? 'Slot' : activeTab.slice(0, -1)}
          </Button>
        </div>
      </div>

      {/* Preset Selector Card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Academic Scenarios & Presets
                </span>
                <Badge
                  variant={
                    currentPreset.badge === 'Small'
                      ? 'success'
                      : currentPreset.badge === 'Challenging'
                      ? 'warning'
                      : currentPreset.badge === 'Big'
                      ? 'purple'
                      : 'default'
                  }
                  className="text-[10px] py-0 px-2 font-bold"
                >
                  {currentPreset.badge}
                </Badge>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {currentPreset.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentPreset.description}
              </p>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-300">
                <span className="bg-white/10 px-2 py-0.5 rounded">
                  <strong>{currentPreset.stats.subjectsCount}</strong> Subjects
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded">
                  <strong>{currentPreset.stats.professorsCount}</strong> Professors
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded">
                  <strong>{currentPreset.stats.batchesCount}</strong> Batches
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded">
                  <strong>{currentPreset.stats.classroomsCount}</strong> Rooms
                </span>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded font-mono font-medium">
                  {currentPreset.stats.expectedSessions} Lecture Sessions
                </span>
              </div>
            </div>

            {/* Preset Selector Dropdown */}
            <div className="shrink-0 flex flex-col gap-2">
              <label className="text-xs text-slate-300 font-medium">Switch Academic Scenario:</label>
              <select
                value={activePresetId}
                onChange={(e) => loadPreset(e.target.value)}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[260px]"
              >
                {ALL_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.badge}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { key: 'slots', label: 'Visual Weekly Time Slots', icon: Clock, count: timeSlots.length },
          { key: 'subjects', label: 'Subjects & Courses', icon: BookOpen, count: subjects.length },
          { key: 'professors', label: 'Faculty & Availability', icon: Users, count: professors.length },
          { key: 'batches', label: 'Student Batches', icon: GraduationCap, count: batches.length },
          { key: 'classrooms', label: 'Classrooms & Labs', icon: Building2, count: classrooms.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as TabType);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: VISUAL TIME SLOTS EDITOR                                      */}
      {/* ==================================================================== */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          {/* Stats Bar & Quick Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-200">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="font-semibold">{activeTeachingSlotsCount} Active Teaching Slots</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold">{breakSlotsCount} Break Recesses</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                <Ban className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">{disabledSlotsCount} Disabled Slots</span>
              </div>
            </div>

            <div className="text-xs text-slate-500 italic">
              Tip: Click on any slot card to toggle between Active, Break, or Disabled. Disabled slots are excluded from generation without deletion.
            </div>
          </div>

          {/* Day-level Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 mr-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Day Controls:
            </span>
            {DAYS.map((day) => {
              const daySlots = timeSlots.filter((s) => s.day === day);
              const allDisabled = daySlots.length > 0 && daySlots.every((s) => s.disabled);
              return (
                <div key={day} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 text-xs shadow-2xs">
                  <span className="font-medium text-slate-800">{day}</span>
                  <button
                    onClick={() => toggleDayDisabled(day, !allDisabled)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                      allDisabled
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {allDisabled ? 'Day Disabled (Click to Enable)' : 'Active (Click to Disable Day)'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Interactive Weekly Time Slots Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full border-collapse min-w-[850px] text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                  <th className="py-3 px-4 text-left w-32 font-semibold uppercase tracking-wider text-[11px] border-r border-slate-200">
                    Time Interval
                  </th>
                  {DAYS.map((day) => {
                    const daySlots = timeSlots.filter((s) => s.day === day);
                    const allDisabled = daySlots.length > 0 && daySlots.every((s) => s.disabled);
                    return (
                      <th
                        key={day}
                        className={`py-3 px-3 text-center font-semibold uppercase tracking-wider text-[11px] border-r border-slate-200 last:border-r-0 ${
                          allDisabled ? 'bg-slate-200/60 text-slate-400' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{day}</span>
                          {allDisabled && (
                            <span className="text-[9px] font-normal text-rose-600 bg-rose-50 px-1.5 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {distinctIntervals.map(({ start, end }) => (
                  <tr key={`${start}-${end}`} className="hover:bg-slate-50/40">
                    {/* Time Column */}
                    <td className="py-3 px-3 font-mono font-medium text-slate-700 border-r border-slate-200 bg-slate-50/60 whitespace-nowrap">
                      {start} - {end}
                    </td>

                    {/* Day Cells */}
                    {DAYS.map((day) => {
                      const slot = timeSlots.find(
                        (s) => s.day === day && s.startTime === start && s.endTime === end
                      );

                      if (!slot) {
                        return (
                          <td
                            key={day}
                            className="py-2 px-2 text-center text-slate-300 border-r border-slate-200 last:border-r-0"
                          >
                            —
                          </td>
                        );
                      }

                      const isDisabled = slot.disabled;
                      const isBreak = slot.isBreak;

                      return (
                        <td
                          key={day}
                          className={`py-2 px-2 border-r border-slate-200 last:border-r-0 transition-colors ${
                            isDisabled
                              ? 'bg-slate-100/80'
                              : isBreak
                              ? 'bg-amber-50/50'
                              : 'bg-white hover:bg-blue-50/30'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg border text-left space-y-1.5 transition-all shadow-2xs ${
                              isDisabled
                                ? 'border-dashed border-slate-300 bg-slate-100 text-slate-400'
                                : isBreak
                                ? 'border-amber-300 bg-amber-50/90 text-amber-900'
                                : 'border-blue-200 bg-white text-slate-800 hover:border-blue-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              {isDisabled ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-400">
                                  Disabled
                                </Badge>
                              ) : isBreak ? (
                                <Badge variant="warning" className="text-[9px] py-0 px-1">
                                  Break
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[9px] py-0 px-1">
                                  Teaching
                                </Badge>
                              )}
                            </div>

                            {/* Slot Quick Action Buttons */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                              <button
                                onClick={() => toggleTimeSlotDisabled(slot.id)}
                                title={isDisabled ? 'Enable this slot for scheduling' : 'Disable this slot for generation'}
                                className={`p-1 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                                  isDisabled
                                    ? 'text-blue-600 hover:bg-blue-100'
                                    : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                                }`}
                              >
                                {isDisabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                <span>{isDisabled ? 'Enable' : 'Disable'}</span>
                              </button>

                              {!isDisabled && (
                                <button
                                  onClick={() => toggleTimeSlotBreak(slot.id)}
                                  title={isBreak ? 'Convert back to teaching slot' : 'Mark as break period'}
                                  className={`p-1 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                                    isBreak
                                      ? 'text-amber-700 hover:bg-amber-100'
                                      : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <Coffee className="w-3 h-3" />
                                  <span>{isBreak ? 'Break' : 'Teaching'}</span>
                                </button>
                              )}

                              <button
                                onClick={() => openEditModal(slot)}
                                title="Edit times"
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SUBJECTS                                                      */}
      {/* ==================================================================== */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by code or subject name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {subjects.length} registered courses
            </span>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Weekly Sessions</th>
                    <th className="py-3 px-4">Required Room</th>
                    <th className="py-3 px-4">Capacity Needed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects
                    .filter(
                      (s) =>
                        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-md shadow-2xs"
                              style={{ backgroundColor: s.color || '#3b82f6' }}
                            />
                            {s.code}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{s.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="purple">{s.weeklyLectures} lectures / week</Badge>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <Badge variant={s.requiredRoomType === 'lab' ? 'warning' : 'default'}>
                            {s.requiredRoomType.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{s.requiredCapacity} seats</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PROFESSORS                                                    */}
      {/* ==================================================================== */}
      {activeTab === 'professors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search faculty members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {professors.length} faculty instructors
            </span>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Assigned Courses</th>
                    <th className="py-3 px-4">Available Days</th>
                    <th className="py-3 px-4">Preferred Windows</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {professors
                    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((p) => {
                      const days = Array.from(new Set(p.availableSlots.map((s) => s.day)));
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.email}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{p.department}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {p.assignedSubjectIds.map((sid) => {
                                const sub = subjects.find((s) => s.id === sid);
                                return (
                                  <Badge key={sid} variant="default" className="font-mono">
                                    {sub?.code || sid}
                                  </Badge>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {days.map((d) => (
                                <Badge key={d} variant="outline" className="text-[10px]">
                                  {d.slice(0, 3)}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {p.preferredSlots?.length || 0} designated slots
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: BATCHES                                                       */}
      {/* ==================================================================== */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {batches.length} enrolled cohorts
            </span>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Batch Cohort</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Degree Program</th>
                    <th className="py-3 px-4">Students Enrolled</th>
                    <th className="py-3 px-4">Curriculum Courses</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches
                    .filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{b.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="purple">{b.section}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{b.program}</td>
                        <td className="py-3 px-4 font-mono font-medium">{b.studentCount} students</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {b.subjectIds.map((sid) => {
                              const sub = subjects.find((s) => s.id === sid);
                              return (
                                <Badge key={sid} variant="default" className="font-mono">
                                  {sub?.code || sid}
                                </Badge>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: CLASSROOMS                                                    */}
      {/* ==================================================================== */}
      {activeTab === 'classrooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search rooms or buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {classrooms.length} venues configured
            </span>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Room Name</th>
                    <th className="py-3 px-4">Building Location</th>
                    <th className="py-3 px-4">Facility Type</th>
                    <th className="py-3 px-4">Seating Capacity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classrooms
                    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 text-slate-600">{c.building}</td>
                        <td className="py-3 px-4 capitalize">
                          <Badge variant={c.roomType === 'lab' ? 'warning' : 'default'}>
                            {c.roomType.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">{c.capacity} seats</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingId ? 'Edit' : 'Add New'} ${activeTab === 'slots' ? 'Time Slot' : activeTab.slice(0, -1)}`}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleFormSubmit}>
              {editingId ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {activeTab === 'subjects' && (
            <>
              <Input
                label="Subject Code"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                error={formErrors.code}
                placeholder="e.g. CS305"
                required
              />
              <Input
                label="Subject Name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                error={formErrors.name}
                placeholder="e.g. Distributed Systems"
                required
              />
              <Input
                label="Weekly Lectures Count"
                type="number"
                min="1"
                max="10"
                value={subjectForm.weeklyLectures}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, weeklyLectures: parseInt(e.target.value) || 1 })
                }
                error={formErrors.weeklyLectures}
                required
              />
              <Select
                label="Required Room Type"
                value={subjectForm.requiredRoomType}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, requiredRoomType: e.target.value as RoomType })
                }
              >
                <option value="lecture_hall">Lecture Hall</option>
                <option value="lab">Computer Lab</option>
                <option value="seminar">Seminar Room</option>
              </Select>
              <Input
                label="Required Capacity"
                type="number"
                value={subjectForm.requiredCapacity}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, requiredCapacity: parseInt(e.target.value) || 10 })
                }
                error={formErrors.requiredCapacity}
                required
              />
            </>
          )}

          {activeTab === 'professors' && (
            <>
              <Input
                label="Professor Name"
                value={profForm.name}
                onChange={(e) => setProfForm({ ...profForm, name: e.target.value })}
                error={formErrors.name}
                placeholder="e.g. Dr. John von Neumann"
                required
              />
              <Input
                label="Email"
                type="email"
                value={profForm.email}
                onChange={(e) => setProfForm({ ...profForm, email: e.target.value })}
                error={formErrors.email}
                placeholder="e.g. john@university.edu"
                required
              />
              <Input
                label="Department"
                value={profForm.department}
                onChange={(e) => setProfForm({ ...profForm, department: e.target.value })}
                placeholder="e.g. Computer Science"
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Assigned Subjects
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {subjects.map((sub) => {
                    const isChecked = profForm.assignedSubjectIds.includes(sub.id);
                    return (
                      <label key={sub.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSubs = e.target.checked
                              ? [...profForm.assignedSubjectIds, sub.id]
                              : profForm.assignedSubjectIds.filter((id) => id !== sub.id);
                            setProfForm({ ...profForm, assignedSubjectIds: newSubs });
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>{sub.code}</span>
                      </label>
                    );
                  })}
                </div>
                {formErrors.assignedSubjectIds && (
                  <p className="text-xs text-rose-600 font-medium">
                    {formErrors.assignedSubjectIds}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Available Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const isChecked = profForm.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const newDays = isChecked
                            ? profForm.availableDays.filter((d) => d !== day)
                            : [...profForm.availableDays, day];
                          setProfForm({ ...profForm, availableDays: newDays });
                        }}
                        className={`px-3 py-1 text-xs rounded-md border font-medium transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'batches' && (
            <>
              <Input
                label="Batch Name"
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                error={formErrors.name}
                placeholder="e.g. B.Tech CSE - Year 2"
                required
              />
              <Input
                label="Section"
                value={batchForm.section}
                onChange={(e) => setBatchForm({ ...batchForm, section: e.target.value })}
                error={formErrors.section}
                placeholder="e.g. Section A"
                required
              />
              <Input
                label="Student Count"
                type="number"
                value={batchForm.studentCount}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, studentCount: parseInt(e.target.value) || 10 })
                }
                error={formErrors.studentCount}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enrolled Subjects
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {subjects.map((sub) => {
                    const isChecked = batchForm.subjectIds.includes(sub.id);
                    return (
                      <label key={sub.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newSubs = e.target.checked
                              ? [...batchForm.subjectIds, sub.id]
                              : batchForm.subjectIds.filter((id) => id !== sub.id);
                            setBatchForm({ ...batchForm, subjectIds: newSubs });
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>{sub.code} - {sub.name}</span>
                      </label>
                    );
                  })}
                </div>
                {formErrors.subjectIds && (
                  <p className="text-xs text-rose-600 font-medium">{formErrors.subjectIds}</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'classrooms' && (
            <>
              <Input
                label="Room Name"
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                error={formErrors.name}
                placeholder="e.g. LH 201"
                required
              />
              <Input
                label="Capacity (Seats)"
                type="number"
                value={roomForm.capacity}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 10 })
                }
                error={formErrors.capacity}
                required
              />
              <Select
                label="Room Type"
                value={roomForm.roomType}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, roomType: e.target.value as RoomType })
                }
              >
                <option value="lecture_hall">Lecture Hall</option>
                <option value="lab">Computer Lab</option>
                <option value="seminar">Seminar Room</option>
              </Select>
              <Input
                label="Building / Location"
                value={roomForm.building}
                onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                placeholder="e.g. Turing Block"
              />
            </>
          )}

          {activeTab === 'slots' && (
            <>
              <Select
                label="Day of Week"
                value={slotForm.day}
                onChange={(e) => setSlotForm({ ...slotForm, day: e.target.value as DayOfWeek })}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={slotForm.startTime}
                  onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                  error={formErrors.startTime}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={slotForm.endTime}
                  onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                  error={formErrors.endTime}
                  required
                />
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slotForm.isBreak}
                    onChange={(e) => setSlotForm({ ...slotForm, isBreak: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium">Mark as Break / Lunch Recess</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slotForm.disabled}
                    onChange={(e) => setSlotForm({ ...slotForm, disabled: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-rose-600">Disable slot for next generation (inactive)</span>
                </label>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Deletion"
        description="Are you sure you want to delete this record? Remember you can also just disable time slots instead of deleting them."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete Record
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This action will immediately update the active dataset in localStorage.
        </p>
      </Modal>
    </div>
  );
}

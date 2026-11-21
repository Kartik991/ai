'use client';

import { create } from 'zustand';
import {
  Subject,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  HardConstraintConfig,
  SoftPreferenceConfig,
  Timetable,
  SearchMetrics,
  TraceEvent,
  SearchTreeNode,
  DayOfWeek,
  AlgorithmType,
  MinConflictsMetrics,
  MinConflictsOptions,
  MinConflictsTraceEvent,
  AlgorithmComparisonResult,
} from '@/types';
import {
  DEMO_SUBJECTS,
  DEMO_PROFESSORS,
  DEMO_BATCHES,
  DEMO_CLASSROOMS,
  DEMO_TIME_SLOTS,
  DEFAULT_HARD_CONSTRAINTS,
  DEFAULT_SOFT_PREFERENCES,
} from '@/data/demo-data';
import { ALL_PRESETS } from '@/data/presets';

export interface AppState {
  // Academic Data
  subjects: Subject[];
  professors: Professor[];
  batches: Batch[];
  classrooms: Classroom[];
  timeSlots: TimeSlot[];

  // Constraints
  hardConstraints: HardConstraintConfig;
  softPreferences: SoftPreferenceConfig;

  // Generated Result
  currentTimetable: Timetable | null;
  savedTimetables: Timetable[];
  lastMetrics: SearchMetrics | null;
  lastFailureReason: string | null;

  // Visualization Trace
  traceEvents: TraceEvent[];
  treeNodes: SearchTreeNode[];
  minConflictsTraceEvents: MinConflictsTraceEvent[];

  // Algorithm Selection & Phase 2 Options
  selectedAlgorithm: AlgorithmType;
  minConflictsOptions: MinConflictsOptions;
  lastMinConflictsMetrics: MinConflictsMetrics | null;
  comparisonResult: AlgorithmComparisonResult | null;

  // Status
  isGenerating: boolean;
  hasHydrated: boolean;

  // Actions
  hydrate: () => void;
  resetToDemoData: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;

  // Subject CRUD
  addSubject: (subject: Omit<Subject, 'id'>) => Subject;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Professor CRUD
  addProfessor: (prof: Omit<Professor, 'id'>) => Professor;
  updateProfessor: (id: string, updates: Partial<Professor>) => void;
  deleteProfessor: (id: string) => void;

  // Batch CRUD
  addBatch: (batch: Omit<Batch, 'id'>) => Batch;
  updateBatch: (id: string, updates: Partial<Batch>) => void;
  deleteBatch: (id: string) => void;

  // Classroom CRUD
  addClassroom: (room: Omit<Classroom, 'id'>) => Classroom;
  updateClassroom: (id: string, updates: Partial<Classroom>) => void;
  deleteClassroom: (id: string) => void;

  // TimeSlot Actions
  addTimeSlot: (slot: Omit<TimeSlot, 'id'>) => TimeSlot;
  updateTimeSlot: (id: string, updates: Partial<TimeSlot>) => void;
  deleteTimeSlot: (id: string) => void;
  toggleTimeSlotDisabled: (id: string) => void;
  toggleTimeSlotBreak: (id: string) => void;
  toggleDayDisabled: (day: DayOfWeek, disabled: boolean) => void;

  // Preset Action
  activePresetId: string;
  loadPreset: (presetId: string) => void;

  // Constraints actions
  setHardConstraints: (config: Partial<HardConstraintConfig>) => void;
  setSoftPreferences: (config: Partial<SoftPreferenceConfig>) => void;

  setSelectedAlgorithm: (algo: AlgorithmType) => void;
  setMinConflictsOptions: (opts: Partial<MinConflictsOptions>) => void;
  setComparisonResult: (result: AlgorithmComparisonResult | null) => void;
  setMinConflictsResult: (params: {
    timetable: Timetable | null;
    metrics: MinConflictsMetrics;
    traceEvents: MinConflictsTraceEvent[];
    failureReason?: string;
  }) => void;

  // Solver execution results
  setIsGenerating: (isGenerating: boolean) => void;
  setSolverResult: (params: {
    timetable: Timetable | null;
    metrics: SearchMetrics;
    traceEvents: TraceEvent[];
    treeNodes: SearchTreeNode[];
    failureReason?: string;
  }) => void;
}

const STORAGE_KEY = 'intellisched_v1_data';

export const useTimetableStore = create<AppState>((set, get) => ({
  subjects: DEMO_SUBJECTS,
  professors: DEMO_PROFESSORS,
  batches: DEMO_BATCHES,
  classrooms: DEMO_CLASSROOMS,
  timeSlots: DEMO_TIME_SLOTS,
  hardConstraints: DEFAULT_HARD_CONSTRAINTS,
  softPreferences: DEFAULT_SOFT_PREFERENCES,
  currentTimetable: null,
  savedTimetables: [],
  lastMetrics: null,
  lastFailureReason: null,
  traceEvents: [],
  treeNodes: [],
  minConflictsTraceEvents: [],
  selectedAlgorithm: 'backtracking',
  minConflictsOptions: {
    maxIterations: 1000,
    maxRestarts: 3,
    stagnationThreshold: 50,
    randomSeed: 42,
    initStrategy: 'greedy',
    optimizeSoftPreferences: false,
    timeLimitMs: 15000,
    recordTrace: true,
  },
  lastMinConflictsMetrics: null,
  comparisonResult: null,
  isGenerating: false,
  hasHydrated: false,
  activePresetId: 'preset-standard',

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Fix room capacity if user had older demo data
        const classrooms = (parsed.classrooms?.length > 0 ? parsed.classrooms : DEMO_CLASSROOMS).map((c: Classroom) => {
          if (c.id === 'room-sem-301' && c.capacity < 45) {
            return { ...c, capacity: 50 };
          }
          return c;
        });

        set({
          subjects: parsed.subjects?.length > 0 ? parsed.subjects : DEMO_SUBJECTS,
          professors: parsed.professors?.length > 0 ? parsed.professors : DEMO_PROFESSORS,
          batches: parsed.batches?.length > 0 ? parsed.batches : DEMO_BATCHES,
          classrooms,
          timeSlots: parsed.timeSlots?.length > 0 ? parsed.timeSlots : DEMO_TIME_SLOTS,
          hardConstraints: parsed.hardConstraints || DEFAULT_HARD_CONSTRAINTS,
          softPreferences: parsed.softPreferences || DEFAULT_SOFT_PREFERENCES,
          currentTimetable: parsed.currentTimetable || null,
          savedTimetables: parsed.savedTimetables || [],
          lastMetrics: parsed.lastMetrics || null,
          hasHydrated: true,
        });
        return;
      }
    } catch (e) {
      console.error('Failed to parse stored IntelliSched state:', e);
    }
    set({ hasHydrated: true });
  },

  resetToDemoData: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({
      subjects: DEMO_SUBJECTS,
      professors: DEMO_PROFESSORS,
      batches: DEMO_BATCHES,
      classrooms: DEMO_CLASSROOMS,
      timeSlots: DEMO_TIME_SLOTS,
      hardConstraints: DEFAULT_HARD_CONSTRAINTS,
      softPreferences: DEFAULT_SOFT_PREFERENCES,
      currentTimetable: null,
      lastMetrics: null,
      lastFailureReason: null,
      traceEvents: [],
      treeNodes: [],
    });
  },

  exportDataJson: () => {
    const state = get();
    const dataToExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      subjects: state.subjects,
      professors: state.professors,
      batches: state.batches,
      classrooms: state.classrooms,
      timeSlots: state.timeSlots,
      hardConstraints: state.hardConstraints,
      softPreferences: state.softPreferences,
      currentTimetable: state.currentTimetable,
    };
    return JSON.stringify(dataToExport, null, 2);
  },

  importDataJson: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        !Array.isArray(parsed.subjects) ||
        !Array.isArray(parsed.professors) ||
        !Array.isArray(parsed.batches) ||
        !Array.isArray(parsed.classrooms) ||
        !Array.isArray(parsed.timeSlots)
      ) {
        return false;
      }

      set({
        subjects: parsed.subjects,
        professors: parsed.professors,
        batches: parsed.batches,
        classrooms: parsed.classrooms,
        timeSlots: parsed.timeSlots,
        hardConstraints: parsed.hardConstraints || DEFAULT_HARD_CONSTRAINTS,
        softPreferences: parsed.softPreferences || DEFAULT_SOFT_PREFERENCES,
        currentTimetable: parsed.currentTimetable || null,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  },

  // Subject CRUD
  addSubject: (data) => {
    const id = `sub-${Date.now()}`;
    const newSubject: Subject = { ...data, id };
    set((state) => {
      const updated = [...state.subjects, newSubject];
      saveToLocalStorage({ ...state, subjects: updated });
      return { subjects: updated };
    });
    return newSubject;
  },

  updateSubject: (id, updates) => {
    set((state) => {
      const updated = state.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveToLocalStorage({ ...state, subjects: updated });
      return { subjects: updated };
    });
  },

  deleteSubject: (id) => {
    set((state) => {
      const updated = state.subjects.filter((s) => s.id !== id);
      saveToLocalStorage({ ...state, subjects: updated });
      return { subjects: updated };
    });
  },

  // Professor CRUD
  addProfessor: (data) => {
    const id = `prof-${Date.now()}`;
    const newProf: Professor = { ...data, id };
    set((state) => {
      const updated = [...state.professors, newProf];
      saveToLocalStorage({ ...state, professors: updated });
      return { professors: updated };
    });
    return newProf;
  },

  updateProfessor: (id, updates) => {
    set((state) => {
      const updated = state.professors.map((p) => (p.id === id ? { ...p, ...updates } : p));
      saveToLocalStorage({ ...state, professors: updated });
      return { professors: updated };
    });
  },

  deleteProfessor: (id) => {
    set((state) => {
      const updated = state.professors.filter((p) => p.id !== id);
      saveToLocalStorage({ ...state, professors: updated });
      return { professors: updated };
    });
  },

  // Batch CRUD
  addBatch: (data) => {
    const id = `batch-${Date.now()}`;
    const newBatch: Batch = { ...data, id };
    set((state) => {
      const updated = [...state.batches, newBatch];
      saveToLocalStorage({ ...state, batches: updated });
      return { batches: updated };
    });
    return newBatch;
  },

  updateBatch: (id, updates) => {
    set((state) => {
      const updated = state.batches.map((b) => (b.id === id ? { ...b, ...updates } : b));
      saveToLocalStorage({ ...state, batches: updated });
      return { batches: updated };
    });
  },

  deleteBatch: (id) => {
    set((state) => {
      const updated = state.batches.filter((b) => b.id !== id);
      saveToLocalStorage({ ...state, batches: updated });
      return { batches: updated };
    });
  },

  // Classroom CRUD
  addClassroom: (data) => {
    const id = `room-${Date.now()}`;
    const newRoom: Classroom = { ...data, id };
    set((state) => {
      const updated = [...state.classrooms, newRoom];
      saveToLocalStorage({ ...state, classrooms: updated });
      return { classrooms: updated };
    });
    return newRoom;
  },

  updateClassroom: (id, updates) => {
    set((state) => {
      const updated = state.classrooms.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveToLocalStorage({ ...state, classrooms: updated });
      return { classrooms: updated };
    });
  },

  deleteClassroom: (id) => {
    set((state) => {
      const updated = state.classrooms.filter((c) => c.id !== id);
      saveToLocalStorage({ ...state, classrooms: updated });
      return { classrooms: updated };
    });
  },

  // TimeSlot CRUD
  addTimeSlot: (data) => {
    const id = `slot-${Date.now()}`;
    const newSlot: TimeSlot = { ...data, id };
    set((state) => {
      const updated = [...state.timeSlots, newSlot];
      saveToLocalStorage({ ...state, timeSlots: updated });
      return { timeSlots: updated };
    });
    return newSlot;
  },

  updateTimeSlot: (id, updates) => {
    set((state) => {
      const updated = state.timeSlots.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveToLocalStorage({ ...state, timeSlots: updated });
      return { timeSlots: updated };
    });
  },

  deleteTimeSlot: (id) => {
    set((state) => {
      const updated = state.timeSlots.filter((s) => s.id !== id);
      saveToLocalStorage({ ...state, timeSlots: updated });
      return { timeSlots: updated };
    });
  },

  toggleTimeSlotDisabled: (id) => {
    set((state) => {
      const updated = state.timeSlots.map((s) =>
        s.id === id ? { ...s, disabled: !s.disabled } : s
      );
      saveToLocalStorage({ ...state, timeSlots: updated });
      return { timeSlots: updated };
    });
  },

  toggleTimeSlotBreak: (id) => {
    set((state) => {
      const updated = state.timeSlots.map((s) =>
        s.id === id ? { ...s, isBreak: !s.isBreak } : s
      );
      saveToLocalStorage({ ...state, timeSlots: updated });
      return { timeSlots: updated };
    });
  },

  toggleDayDisabled: (day, disabled) => {
    set((state) => {
      const updated = state.timeSlots.map((s) =>
        s.day === day ? { ...s, disabled } : s
      );
      saveToLocalStorage({ ...state, timeSlots: updated });
      return { timeSlots: updated };
    });
  },

  loadPreset: (presetId) => {
    const preset = ALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    set({
      activePresetId: preset.id,
      subjects: preset.data.subjects,
      professors: preset.data.professors,
      batches: preset.data.batches,
      classrooms: preset.data.classrooms,
      timeSlots: preset.data.timeSlots,
      hardConstraints: preset.data.hardConstraints || DEFAULT_HARD_CONSTRAINTS,
      softPreferences: preset.data.softPreferences || DEFAULT_SOFT_PREFERENCES,
      currentTimetable: null,
      lastMetrics: null,
      lastFailureReason: null,
      traceEvents: [],
      treeNodes: [],
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activePresetId: preset.id,
          subjects: preset.data.subjects,
          professors: preset.data.professors,
          batches: preset.data.batches,
          classrooms: preset.data.classrooms,
          timeSlots: preset.data.timeSlots,
          hardConstraints: preset.data.hardConstraints || DEFAULT_HARD_CONSTRAINTS,
          softPreferences: preset.data.softPreferences || DEFAULT_SOFT_PREFERENCES,
          currentTimetable: null,
        })
      );
    }
  },

  // Constraints
  setHardConstraints: (updates) => {
    set((state) => {
      const updated = { ...state.hardConstraints, ...updates };
      saveToLocalStorage({ ...state, hardConstraints: updated });
      return { hardConstraints: updated };
    });
  },

  setSoftPreferences: (updates) => {
    set((state) => {
      const updated = { ...state.softPreferences, ...updates };
      saveToLocalStorage({ ...state, softPreferences: updated });
      return { softPreferences: updated };
    });
  },

  setSelectedAlgorithm: (selectedAlgorithm) => set({ selectedAlgorithm }),

  setMinConflictsOptions: (opts) =>
    set((state) => ({ minConflictsOptions: { ...state.minConflictsOptions, ...opts } })),

  setComparisonResult: (comparisonResult) => set({ comparisonResult }),

  setMinConflictsResult: ({ timetable, metrics, traceEvents, failureReason }) => {
    set((state) => {
      const savedTimetables = timetable ? [timetable, ...state.savedTimetables.slice(0, 4)] : state.savedTimetables;
      const newState = {
        currentTimetable: timetable,
        savedTimetables,
        lastMetrics: null,
        lastMinConflictsMetrics: metrics,
        lastFailureReason: failureReason || null,
        minConflictsTraceEvents: traceEvents,
        isGenerating: false,
      };
      saveToLocalStorage({ ...state, ...newState });
      return newState;
    });
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setSolverResult: ({ timetable, metrics, traceEvents, treeNodes, failureReason }) => {
    set((state) => {
      const savedTimetables = timetable ? [timetable, ...state.savedTimetables.slice(0, 4)] : state.savedTimetables;
      const newState = {
        currentTimetable: timetable,
        savedTimetables,
        lastMetrics: metrics,
        lastFailureReason: failureReason || null,
        traceEvents,
        treeNodes,
        isGenerating: false,
      };
      saveToLocalStorage({ ...state, ...newState });
      return newState;
    });
  },
}));

function saveToLocalStorage(state: Partial<AppState>) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      subjects: state.subjects,
      professors: state.professors,
      batches: state.batches,
      classrooms: state.classrooms,
      timeSlots: state.timeSlots,
      hardConstraints: state.hardConstraints,
      softPreferences: state.softPreferences,
      currentTimetable: state.currentTimetable,
      savedTimetables: state.savedTimetables,
      lastMetrics: state.lastMetrics,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not persist to localStorage:', err);
  }
}


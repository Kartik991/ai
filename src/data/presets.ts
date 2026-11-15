import type {
  Subject,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  HardConstraintConfig,
  SoftPreferenceConfig,
  DayOfWeek,
} from '../types/index.ts';
import {
  DEMO_SUBJECTS,
  DEMO_PROFESSORS,
  DEMO_BATCHES,
  DEMO_CLASSROOMS,
  DEMO_TIME_SLOTS,
  DEFAULT_HARD_CONSTRAINTS,
  DEFAULT_SOFT_PREFERENCES,
  generateWeeklySlots,
} from './demo-data.ts';

export interface AcademicPreset {
  id: string;
  name: string;
  badge: 'Small' | 'Medium' | 'Big' | 'Challenging' | 'Custom';
  description: string;
  stats: {
    subjectsCount: number;
    professorsCount: number;
    batchesCount: number;
    classroomsCount: number;
    expectedSessions: number;
  };
  data: {
    subjects: Subject[];
    professors: Professor[];
    batches: Batch[];
    classrooms: Classroom[];
    timeSlots: TimeSlot[];
    hardConstraints?: HardConstraintConfig;
    softPreferences?: SoftPreferenceConfig;
  };
}

// ----------------------------------------------------------------------------
// Preset 1: Standard Balanced (Medium)
// ----------------------------------------------------------------------------
const standardPreset: AcademicPreset = {
  id: 'preset-standard',
  name: 'Standard CS Department',
  badge: 'Medium',
  description: 'Realistic Computer Science department with 7 courses, 5 professors, 2 batches, and 4 rooms. Ideal baseline.',
  stats: {
    subjectsCount: DEMO_SUBJECTS.length,
    professorsCount: DEMO_PROFESSORS.length,
    batchesCount: DEMO_BATCHES.length,
    classroomsCount: DEMO_CLASSROOMS.length,
    expectedSessions: 21,
  },
  data: {
    subjects: DEMO_SUBJECTS,
    professors: DEMO_PROFESSORS,
    batches: DEMO_BATCHES,
    classrooms: DEMO_CLASSROOMS,
    timeSlots: DEMO_TIME_SLOTS,
    hardConstraints: DEFAULT_HARD_CONSTRAINTS,
    softPreferences: DEFAULT_SOFT_PREFERENCES,
  },
};

// ----------------------------------------------------------------------------
// Preset 2: Minimal Demo (Small) - Great for Step-by-Step Visualization
// ----------------------------------------------------------------------------
const smallSlots: TimeSlot[] = [
  { id: 'mon-s1', day: 'Monday', startTime: '09:00', endTime: '10:00', isBreak: false, label: 'Mon 09:00 - 10:00' },
  { id: 'mon-s2', day: 'Monday', startTime: '10:00', endTime: '11:00', isBreak: false, label: 'Mon 10:00 - 11:00' },
  { id: 'mon-s3', day: 'Monday', startTime: '11:15', endTime: '12:15', isBreak: false, label: 'Mon 11:15 - 12:15' },
  { id: 'tue-s1', day: 'Tuesday', startTime: '09:00', endTime: '10:00', isBreak: false, label: 'Tue 09:00 - 10:00' },
  { id: 'tue-s2', day: 'Tuesday', startTime: '10:00', endTime: '11:00', isBreak: false, label: 'Tue 10:00 - 11:00' },
  { id: 'tue-s3', day: 'Tuesday', startTime: '11:15', endTime: '12:15', isBreak: false, label: 'Tue 11:15 - 12:15' },
  { id: 'wed-s1', day: 'Wednesday', startTime: '09:00', endTime: '10:00', isBreak: false, label: 'Wed 09:00 - 10:00' },
  { id: 'wed-s2', day: 'Wednesday', startTime: '10:00', endTime: '11:00', isBreak: false, label: 'Wed 10:00 - 11:00' },
  { id: 'wed-s3', day: 'Wednesday', startTime: '11:15', endTime: '12:15', isBreak: false, label: 'Wed 11:15 - 12:15' },
];

const smallSubjects: Subject[] = [
  { id: 'sub-prog', code: 'CS100', name: 'Intro Programming', weeklyLectures: 2, requiredRoomType: 'lecture_hall', requiredCapacity: 30, color: '#3B82F6' },
  { id: 'sub-math', code: 'MA100', name: 'Calculus I', weeklyLectures: 2, requiredRoomType: 'lecture_hall', requiredCapacity: 30, color: '#10B981' },
  { id: 'sub-web', code: 'CS105', name: 'Web Fundamentals', weeklyLectures: 2, requiredRoomType: 'lecture_hall', requiredCapacity: 30, color: '#F59E0B' },
];

const smallProfessors: Professor[] = [
  {
    id: 'prof-smith',
    name: 'Prof. Alice Smith',
    email: 'smith@uni.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['sub-prog', 'sub-web'],
    availableSlots: smallSlots.map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: smallSlots.slice(0, 3).map((s) => ({ day: s.day, slotId: s.id })),
  },
  {
    id: 'prof-euler',
    name: 'Dr. Leonhard Euler',
    email: 'euler@uni.edu',
    department: 'Mathematics',
    assignedSubjectIds: ['sub-math'],
    availableSlots: smallSlots.map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: smallSlots.slice(3, 6).map((s) => ({ day: s.day, slotId: s.id })),
  },
];

const smallBatches: Batch[] = [
  {
    id: 'batch-freshman',
    name: 'Freshman CS Cohort',
    section: 'Sec 1',
    studentCount: 28,
    program: 'Computer Science',
    subjectIds: ['sub-prog', 'sub-math', 'sub-web'],
  },
];

const smallRooms: Classroom[] = [
  { id: 'room-101', name: 'Room 101', capacity: 35, roomType: 'lecture_hall', building: 'Alpha Block' },
  { id: 'room-102', name: 'Room 102', capacity: 40, roomType: 'lecture_hall', building: 'Alpha Block' },
];

const minimalPreset: AcademicPreset = {
  id: 'preset-minimal',
  name: 'Minimal / Quick Demo (Small)',
  badge: 'Small',
  description: 'Compact 6-session scenario with 3 courses, 2 professors, and 1 batch. Instant solving, perfect for stepping through the search tree node-by-node.',
  stats: {
    subjectsCount: smallSubjects.length,
    professorsCount: smallProfessors.length,
    batchesCount: smallBatches.length,
    classroomsCount: smallRooms.length,
    expectedSessions: 6,
  },
  data: {
    subjects: smallSubjects,
    professors: smallProfessors,
    batches: smallBatches,
    classrooms: smallRooms,
    timeSlots: smallSlots,
    hardConstraints: DEFAULT_HARD_CONSTRAINTS,
    softPreferences: DEFAULT_SOFT_PREFERENCES,
  },
};

// ----------------------------------------------------------------------------
// Preset 3: Dense Faculty & Tight Rooms (Challenging) - Triggers Backtracking
// ----------------------------------------------------------------------------
const tightSlots = generateWeeklySlots().slice(0, 15); // Only 15 slots total across the week
const tightRooms: Classroom[] = [
  { id: 'tight-hall-1', name: 'Only Hall A', capacity: 45, roomType: 'lecture_hall', building: 'Old Block' },
  { id: 'tight-lab-1', name: 'Only Lab B', capacity: 45, roomType: 'lab', building: 'Old Block' },
];

const tightSubjects: Subject[] = [
  { id: 't-cs1', code: 'CS201', name: 'Data Structures', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 40, color: '#3B82F6' },
  { id: 't-cs2', code: 'CS202', name: 'Algorithms', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 40, color: '#10B981' },
  { id: 't-cs3', code: 'CS203', name: 'Operating Systems', weeklyLectures: 2, requiredRoomType: 'lecture_hall', requiredCapacity: 40, color: '#8B5CF6' },
  { id: 't-lab', code: 'CS204L', name: 'Systems Lab', weeklyLectures: 2, requiredRoomType: 'lab', requiredCapacity: 40, color: '#EC4899' },
  { id: 't-math', code: 'MA201', name: 'Discrete Math', weeklyLectures: 2, requiredRoomType: 'lecture_hall', requiredCapacity: 40, color: '#06B6D4' },
];

const tightProfs: Professor[] = [
  {
    id: 'prof-turing-tight',
    name: 'Dr. Turing',
    email: 'turing@uni.edu',
    department: 'CS',
    assignedSubjectIds: ['t-cs1', 't-cs2'],
    availableSlots: tightSlots.slice(0, 10).map((s) => ({ day: s.day, slotId: s.id })), // limited availability
    preferredSlots: [],
  },
  {
    id: 'prof-hopper-tight',
    name: 'Dr. Hopper',
    email: 'hopper@uni.edu',
    department: 'CS',
    assignedSubjectIds: ['t-cs3', 't-lab'],
    availableSlots: tightSlots.slice(4, 14).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-boole-tight',
    name: 'Dr. Boole',
    email: 'boole@uni.edu',
    department: 'Math',
    assignedSubjectIds: ['t-math'],
    availableSlots: tightSlots.map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
];

const tightBatches: Batch[] = [
  {
    id: 'tight-batch-a',
    name: 'Batch Alpha',
    section: 'A',
    studentCount: 38,
    program: 'CSE',
    subjectIds: ['t-cs1', 't-cs3', 't-lab', 't-math'],
  },
  {
    id: 'tight-batch-b',
    name: 'Batch Beta',
    section: 'B',
    studentCount: 38,
    program: 'CSE',
    subjectIds: ['t-cs2', 't-cs3', 't-lab'],
  },
];

const challengingPreset: AcademicPreset = {
  id: 'preset-challenging',
  name: 'Tight Constraints & Scarce Rooms',
  badge: 'Challenging',
  description: 'Heavily constrained scenario with only 2 physical rooms and restricted faculty availability. Designed to force multiple backtracks and demonstrate forward checking domain wipeouts in the search tree!',
  stats: {
    subjectsCount: tightSubjects.length,
    professorsCount: tightProfs.length,
    batchesCount: tightBatches.length,
    classroomsCount: tightRooms.length,
    expectedSessions: 16,
  },
  data: {
    subjects: tightSubjects,
    professors: tightProfs,
    batches: tightBatches,
    classrooms: tightRooms,
    timeSlots: tightSlots,
    hardConstraints: DEFAULT_HARD_CONSTRAINTS,
    softPreferences: DEFAULT_SOFT_PREFERENCES,
  },
};

// ----------------------------------------------------------------------------
// Preset 4: Large Engineering College (Big)
// ----------------------------------------------------------------------------
const bigSubjects: Subject[] = [
  { id: 'big-cs1', code: 'CS101', name: 'Programming Fundamentals', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#3B82F6' },
  { id: 'big-cs2', code: 'CS201', name: 'Data Structures & Algorithms', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#10B981' },
  { id: 'big-cs3', code: 'CS301', name: 'Database Management Systems', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#8B5CF6' },
  { id: 'big-cs4', code: 'CS302', name: 'Operating Systems', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#F59E0B' },
  { id: 'big-cs5', code: 'CS401', name: 'Computer Networks', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#06B6D4' },
  { id: 'big-ai', code: 'AI401', name: 'Artificial Intelligence', weeklyLectures: 2, requiredRoomType: 'seminar', requiredCapacity: 45, color: '#6366F1' },
  { id: 'big-cloud', code: 'CS405', name: 'Cloud Computing Architecture', weeklyLectures: 2, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#14B8A6' },
  { id: 'big-lab1', code: 'CS205L', name: 'Software Development Lab', weeklyLectures: 2, requiredRoomType: 'lab', requiredCapacity: 45, color: '#EC4899' },
  { id: 'big-lab2', code: 'CS305L', name: 'Networks & Systems Lab', weeklyLectures: 2, requiredRoomType: 'lab', requiredCapacity: 45, color: '#D946EF' },
  { id: 'big-ee1', code: 'EE201', name: 'Digital Logic & Circuit Design', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#F97316' },
  { id: 'big-ee2', code: 'EE301', name: 'Microprocessors & Microcontrollers', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#EAB308' },
  { id: 'big-ma', code: 'MA201', name: 'Engineering Mathematics & Stats', weeklyLectures: 3, requiredRoomType: 'lecture_hall', requiredCapacity: 50, color: '#64748B' },
];

const bigRooms: Classroom[] = [
  { id: 'big-lh1', name: 'Grand Hall 1', capacity: 70, roomType: 'lecture_hall', building: 'Central Block' },
  { id: 'big-lh2', name: 'Auditorium 2', capacity: 60, roomType: 'lecture_hall', building: 'Central Block' },
  { id: 'big-lh3', name: 'Hall 103', capacity: 55, roomType: 'lecture_hall', building: 'West Wing' },
  { id: 'big-lab1', name: 'Advanced Software Lab', capacity: 50, roomType: 'lab', building: 'Computing Center' },
  { id: 'big-lab2', name: 'Hardware & Circuits Lab', capacity: 50, roomType: 'lab', building: 'Electrical Wing' },
  { id: 'big-sem1', name: 'Executive Seminar Room', capacity: 50, roomType: 'seminar', building: 'Academic Tower' },
];

const bigProfs: Professor[] = [
  {
    id: 'prof-turing-big',
    name: 'Dr. Alan Turing',
    email: 'turing@uni.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['big-cs1', 'big-ai'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-lovelace-big',
    name: 'Dr. Ada Lovelace',
    email: 'lovelace@uni.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['big-cs2', 'big-lab1'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-codd-big',
    name: 'Dr. Edgar Codd',
    email: 'codd@uni.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['big-cs3', 'big-cloud'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-hopper-big',
    name: 'Dr. Grace Hopper',
    email: 'hopper@uni.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['big-cs4', 'big-lab2'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-cerf-big',
    name: 'Dr. Vint Cerf',
    email: 'cerf@uni.edu',
    department: 'Computer Networks',
    assignedSubjectIds: ['big-cs5'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-shannon-big',
    name: 'Dr. Claude Shannon',
    email: 'shannon@uni.edu',
    department: 'Electrical Engineering',
    assignedSubjectIds: ['big-ee1', 'big-ee2'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
  {
    id: 'prof-gauss-big',
    name: 'Dr. Carl Gauss',
    email: 'gauss@uni.edu',
    department: 'Mathematics',
    assignedSubjectIds: ['big-ma'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({ day: s.day, slotId: s.id })),
    preferredSlots: [],
  },
];

const bigBatches: Batch[] = [
  {
    id: 'batch-cse-2a',
    name: 'CSE Year 2',
    section: 'Sec A',
    studentCount: 46,
    program: 'B.Tech CSE',
    subjectIds: ['big-cs1', 'big-cs2', 'big-lab1', 'big-ma'],
  },
  {
    id: 'batch-cse-3a',
    name: 'CSE Year 3',
    section: 'Sec A',
    studentCount: 48,
    program: 'B.Tech CSE',
    subjectIds: ['big-cs3', 'big-cs4', 'big-cs5', 'big-lab2'],
  },
  {
    id: 'batch-cse-4a',
    name: 'CSE Year 4 (Honors)',
    section: 'Sec A',
    studentCount: 40,
    program: 'B.Tech CSE',
    subjectIds: ['big-ai', 'big-cloud', 'big-cs5'],
  },
  {
    id: 'batch-ece-2a',
    name: 'ECE Year 2',
    section: 'Sec A',
    studentCount: 45,
    program: 'B.Tech ECE',
    subjectIds: ['big-ee1', 'big-ee2', 'big-cs1', 'big-ma'],
  },
];

const largePreset: AcademicPreset = {
  id: 'preset-large',
  name: 'Large Engineering College (Big)',
  badge: 'Big',
  description: 'Enterprise university scale: 12 courses across CSE and ECE, 7 senior professors, 4 student batches, and 6 specialized halls and labs. Tests CSP scalability on large academic faculties.',
  stats: {
    subjectsCount: bigSubjects.length,
    professorsCount: bigProfs.length,
    batchesCount: bigBatches.length,
    classroomsCount: bigRooms.length,
    expectedSessions: 39,
  },
  data: {
    subjects: bigSubjects,
    professors: bigProfs,
    batches: bigBatches,
    classrooms: bigRooms,
    timeSlots: DEMO_TIME_SLOTS,
    hardConstraints: DEFAULT_HARD_CONSTRAINTS,
    softPreferences: DEFAULT_SOFT_PREFERENCES,
  },
};

// ----------------------------------------------------------------------------
// Preset 5: 4-Day University Week (Friday Disabled)
// ----------------------------------------------------------------------------
const fourDaySlots: TimeSlot[] = DEMO_TIME_SLOTS.map((slot) => ({
  ...slot,
  disabled: slot.day === 'Friday', // All Friday slots disabled!
}));

const fourDayPreset: AcademicPreset = {
  id: 'preset-4day',
  name: '4-Day Academic Week (No Friday)',
  badge: 'Custom',
  description: 'Full weekly syllabus packed into Monday through Thursday with all Friday time slots disabled. Demonstrates day-disabling functionality.',
  stats: {
    subjectsCount: DEMO_SUBJECTS.length,
    professorsCount: DEMO_PROFESSORS.length,
    batchesCount: 1,
    classroomsCount: DEMO_CLASSROOMS.length,
    expectedSessions: 11,
  },
  data: {
    subjects: DEMO_SUBJECTS,
    professors: DEMO_PROFESSORS,
    batches: DEMO_BATCHES.slice(0, 1),
    classrooms: DEMO_CLASSROOMS,
    timeSlots: fourDaySlots,
    hardConstraints: DEFAULT_HARD_CONSTRAINTS,
    softPreferences: DEFAULT_SOFT_PREFERENCES,
  },
};

export const ALL_PRESETS: AcademicPreset[] = [
  standardPreset,
  minimalPreset,
  challengingPreset,
  largePreset,
  fourDayPreset,
];


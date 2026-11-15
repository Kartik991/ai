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

export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const INITIAL_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', day: 'Monday', startTime: '09:00', endTime: '10:00', isBreak: false, label: '09:00 - 10:00' },
  { id: 'slot-2', day: 'Monday', startTime: '10:00', endTime: '11:00', isBreak: false, label: '10:00 - 11:00' },
  { id: 'slot-3', day: 'Monday', startTime: '11:15', endTime: '12:15', isBreak: false, label: '11:15 - 12:15' },
  { id: 'slot-4', day: 'Monday', startTime: '12:15', endTime: '13:15', isBreak: false, label: '12:15 - 13:15' },
  { id: 'slot-5', day: 'Monday', startTime: '13:15', endTime: '14:00', isBreak: true, label: '13:15 - 14:00 (Lunch Break)' },
  { id: 'slot-6', day: 'Monday', startTime: '14:00', endTime: '15:00', isBreak: false, label: '14:00 - 15:00' },
  { id: 'slot-7', day: 'Monday', startTime: '15:00', endTime: '16:00', isBreak: false, label: '15:00 - 16:00' },
];

// Helper to generate slots for all days based on template
export function generateWeeklySlots(baseSlots: TimeSlot[] = INITIAL_TIME_SLOTS): TimeSlot[] {
  const weekly: TimeSlot[] = [];
  DAYS.forEach((day) => {
    baseSlots.forEach((slot) => {
      weekly.push({
        ...slot,
        id: `${day.toLowerCase().slice(0, 3)}-${slot.id}`,
        day,
        label: `${day.slice(0, 3)} ${slot.startTime} - ${slot.endTime}`,
      });
    });
  });
  return weekly;
}

export const DEMO_TIME_SLOTS: TimeSlot[] = generateWeeklySlots();

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 'sub-cs101',
    code: 'CS101',
    name: 'Introduction to Computing',
    weeklyLectures: 3,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 45,
    color: '#3B82F6', // Blue
  },
  {
    id: 'sub-cs201',
    code: 'CS201',
    name: 'Data Structures & Algorithms',
    weeklyLectures: 3,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 45,
    color: '#10B981', // Emerald
  },
  {
    id: 'sub-cs301',
    code: 'CS301',
    name: 'Database Management Systems',
    weeklyLectures: 3,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 45,
    color: '#8B5CF6', // Purple
  },
  {
    id: 'sub-cs302',
    code: 'CS302',
    name: 'Operating Systems & Architecture',
    weeklyLectures: 2,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 45,
    color: '#F59E0B', // Amber
  },
  {
    id: 'sub-cs205',
    code: 'CS205',
    name: 'Advanced Programming Lab',
    weeklyLectures: 2,
    requiredRoomType: 'lab',
    requiredCapacity: 40,
    color: '#EC4899', // Pink
  },
  {
    id: 'sub-ma101',
    code: 'MA101',
    name: 'Discrete Mathematics & Logic',
    weeklyLectures: 3,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 45,
    color: '#06B6D4', // Cyan
  },
  {
    id: 'sub-ai401',
    code: 'AI401',
    name: 'Artificial Intelligence & CSP',
    weeklyLectures: 2,
    requiredRoomType: 'seminar',
    requiredCapacity: 35,
    color: '#6366F1', // Indigo
  },
];

export const DEMO_PROFESSORS: Professor[] = [
  {
    id: 'prof-alan',
    name: 'Dr. Alan Turing',
    email: 'alan.turing@university.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['sub-cs101', 'sub-ai401'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak && s.day !== 'Friday').map((s) => ({
      day: s.day,
      slotId: s.id,
    })),
    preferredSlots: DEMO_TIME_SLOTS.filter(
      (s) => !s.isBreak && (s.startTime === '09:00' || s.startTime === '10:00')
    ).map((s) => ({ day: s.day, slotId: s.id })),
  },
  {
    id: 'prof-ada',
    name: 'Dr. Ada Lovelace',
    email: 'ada.lovelace@university.edu',
    department: 'Computer Science',
    assignedSubjectIds: ['sub-cs201', 'sub-cs205'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({
      day: s.day,
      slotId: s.id,
    })),
    preferredSlots: DEMO_TIME_SLOTS.filter(
      (s) => !s.isBreak && (s.startTime === '10:00' || s.startTime === '11:15')
    ).map((s) => ({ day: s.day, slotId: s.id })),
  },
  {
    id: 'prof-edgar',
    name: 'Dr. Edgar Codd',
    email: 'edgar.codd@university.edu',
    department: 'Information Systems',
    assignedSubjectIds: ['sub-cs301'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak && s.day !== 'Wednesday').map((s) => ({
      day: s.day,
      slotId: s.id,
    })),
    preferredSlots: DEMO_TIME_SLOTS.filter(
      (s) => !s.isBreak && s.startTime === '14:00'
    ).map((s) => ({ day: s.day, slotId: s.id })),
  },
  {
    id: 'prof-grace',
    name: 'Dr. Grace Hopper',
    email: 'grace.hopper@university.edu',
    department: 'Computer Engineering',
    assignedSubjectIds: ['sub-cs302'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({
      day: s.day,
      slotId: s.id,
    })),
    preferredSlots: DEMO_TIME_SLOTS.filter(
      (s) => !s.isBreak && s.startTime === '11:15'
    ).map((s) => ({ day: s.day, slotId: s.id })),
  },
  {
    id: 'prof-george',
    name: 'Dr. George Boole',
    email: 'george.boole@university.edu',
    department: 'Mathematics',
    assignedSubjectIds: ['sub-ma101'],
    availableSlots: DEMO_TIME_SLOTS.filter((s) => !s.isBreak).map((s) => ({
      day: s.day,
      slotId: s.id,
    })),
    preferredSlots: DEMO_TIME_SLOTS.filter(
      (s) => !s.isBreak && (s.startTime === '09:00' || s.startTime === '14:00')
    ).map((s) => ({ day: s.day, slotId: s.id })),
  },
];

export const DEMO_BATCHES: Batch[] = [
  {
    id: 'batch-cs-3a',
    name: 'B.Tech CSE - Year 3',
    section: 'Section A',
    studentCount: 45,
    program: 'Computer Science & Engineering',
    subjectIds: ['sub-cs201', 'sub-cs301', 'sub-cs302', 'sub-ma101'],
  },
  {
    id: 'batch-cs-3b',
    name: 'B.Tech CSE - Year 3',
    section: 'Section B',
    studentCount: 42,
    program: 'Computer Science & Engineering',
    subjectIds: ['sub-cs101', 'sub-cs205', 'sub-ai401', 'sub-ma101'],
  },
];

export const DEMO_CLASSROOMS: Classroom[] = [
  {
    id: 'room-lh-101',
    name: 'Lecture Hall 101',
    capacity: 60,
    roomType: 'lecture_hall',
    building: 'Alan Turing Science Block',
  },
  {
    id: 'room-lh-102',
    name: 'Lecture Hall 102',
    capacity: 50,
    roomType: 'lecture_hall',
    building: 'Alan Turing Science Block',
  },
  {
    id: 'room-lab-201',
    name: 'Computing Lab 201',
    capacity: 45,
    roomType: 'lab',
    building: 'Software Engineering Wing',
  },
  {
    id: 'room-sem-301',
    name: 'Seminar Room 301',
    capacity: 50,
    roomType: 'seminar',
    building: 'Academic Complex',
  },
];

export const DEFAULT_HARD_CONSTRAINTS: HardConstraintConfig = {
  noProfessorClash: true,
  noClassroomClash: true,
  noBatchClash: true,
  classroomCapacity: true,
  professorAvailability: true,
  classroomSuitability: true,
  allSessionsScheduled: true,
  noBreakSlotClash: true,
};

export const DEFAULT_SOFT_PREFERENCES: SoftPreferenceConfig = {
  minimizeStudentGaps: true,
  studentGapWeight: 8,
  minimizeProfessorGaps: true,
  professorGapWeight: 7,
  distributeLecturesEvenly: true,
  distributionWeight: 9,
  avoidExcessiveConsecutive: true,
  consecutiveLimit: 3,
  consecutiveWeight: 6,
  respectPreferredSlots: true,
  preferredSlotsWeight: 5,
  maximizeRoomUtilization: true,
  utilizationWeight: 4,
};

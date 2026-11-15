import assert from 'node:assert';
import type {
  Subject,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  LectureSession,
  TimetableAssignment,
  HardConstraintConfig,
  SoftPreferenceConfig,
  DomainValue,
} from '../src/types/index.ts';
import { isAssignmentValid, validateAllHardConstraints } from '../src/algorithms/constraints/hard-constraints.ts';
import { evaluateSoftPreferences } from '../src/algorithms/constraints/soft-constraints.ts';
import { validateCompleteTimetable } from '../src/algorithms/constraints/constraint-validator.ts';
import { DomainManager } from '../src/algorithms/csp/domain-manager.ts';
import { selectUnassignedVariable, calculateDegree } from '../src/algorithms/csp/variable-selection.ts';
import { orderDomainValues } from '../src/algorithms/csp/value-ordering.ts';
import { forwardCheck } from '../src/algorithms/csp/forward-checking.ts';
import { solveTimetableCSP, generateLectureSessions } from '../src/algorithms/csp/backtracking.ts';
import {
  DEMO_SUBJECTS,
  DEMO_PROFESSORS,
  DEMO_BATCHES,
  DEMO_CLASSROOMS,
  DEMO_TIME_SLOTS,
  DEFAULT_HARD_CONSTRAINTS,
  DEFAULT_SOFT_PREFERENCES,
} from '../src/data/demo-data.ts';

console.log('====================================================');
console.log('IntelliSched CSP Algorithm & Constraint Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`✗ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// Test 1: Professor Conflicts
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Detects professor double-booking conflict', () => {
  const variable: LectureSession = {
    id: 'var-1',
    subjectId: 'sub-cs101',
    batchId: 'batch-b',
    professorId: 'prof-alan',
    sessionIndex: 1,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 30,
    label: 'CS101 Session 1',
  };

  const existing: TimetableAssignment[] = [
    {
      variableId: 'var-0',
      subjectId: 'sub-ai401',
      batchId: 'batch-a',
      professorId: 'prof-alan', // same professor!
      day: 'Monday',
      slotId: 'mon-slot-1',
      classroomId: 'room-lh-101',
    },
  ];

  const val: DomainValue = {
    day: 'Monday',
    slotId: 'mon-slot-1',
    classroomId: 'room-lh-102', // different room, but same prof and time
  };

  const context = {
    variables: new Map([['var-1', variable]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map(DEMO_CLASSROOMS.map((c) => [c.id, c])),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(variable, val, existing, context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to professor clash');
  assert.strictEqual(result.ruleId, 'noProfessorClash');
});

// ----------------------------------------------------------------------------
// Test 2: Batch Conflicts
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Detects student batch double-booking conflict', () => {
  const variable: LectureSession = {
    id: 'var-2',
    subjectId: 'sub-cs201',
    batchId: 'batch-cs-3a',
    professorId: 'prof-ada',
    sessionIndex: 1,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 40,
    label: 'CS201 Session 1',
  };

  const existing: TimetableAssignment[] = [
    {
      variableId: 'var-prior',
      subjectId: 'sub-cs301',
      batchId: 'batch-cs-3a', // same batch!
      professorId: 'prof-edgar',
      day: 'Tuesday',
      slotId: 'tue-slot-2',
      classroomId: 'room-lh-101',
    },
  ];

  const val: DomainValue = {
    day: 'Tuesday',
    slotId: 'tue-slot-2', // same time slot
    classroomId: 'room-lh-102',
  };

  const context = {
    variables: new Map([['var-2', variable]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map(DEMO_CLASSROOMS.map((c) => [c.id, c])),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(variable, val, existing, context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to batch clash');
  assert.strictEqual(result.ruleId, 'noBatchClash');
});

// ----------------------------------------------------------------------------
// Test 3: Classroom Conflicts
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Detects classroom double-booking conflict', () => {
  const variable: LectureSession = {
    id: 'var-3',
    subjectId: 'sub-cs101',
    batchId: 'batch-cs-3b',
    professorId: 'prof-alan',
    sessionIndex: 1,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 40,
    label: 'CS101 Session 1',
  };

  const existing: TimetableAssignment[] = [
    {
      variableId: 'var-prior',
      subjectId: 'sub-cs201',
      batchId: 'batch-cs-3a', // different batch
      professorId: 'prof-ada', // different prof
      day: 'Wednesday',
      slotId: 'wed-slot-1',
      classroomId: 'room-lh-101', // SAME ROOM!
    },
  ];

  const val: DomainValue = {
    day: 'Wednesday',
    slotId: 'wed-slot-1',
    classroomId: 'room-lh-101',
  };

  const context = {
    variables: new Map([['var-3', variable]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map(DEMO_CLASSROOMS.map((c) => [c.id, c])),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(variable, val, existing, context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to classroom clash');
  assert.strictEqual(result.ruleId, 'noClassroomClash');
});

// ----------------------------------------------------------------------------
// Test 4: Capacity Violations
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Detects room capacity shortage', () => {
  const smallRoom: Classroom = {
    id: 'room-small',
    name: 'Small Seminar',
    capacity: 20,
    roomType: 'lecture_hall',
    building: 'Main',
  };

  const variable: LectureSession = {
    id: 'var-4',
    subjectId: 'sub-cs101',
    batchId: 'batch-cs-3a',
    professorId: 'prof-alan',
    sessionIndex: 1,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 45, // needs 45, room has only 20
    label: 'CS101 Session 1',
  };

  const val: DomainValue = {
    day: 'Monday',
    slotId: 'mon-slot-1',
    classroomId: 'room-small',
  };

  const context = {
    variables: new Map([['var-4', variable]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map([[smallRoom.id, smallRoom]]),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(variable, val, [], context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to room capacity violation');
  assert.strictEqual(result.ruleId, 'classroomCapacity');
});

// ----------------------------------------------------------------------------
// Test 5: Professor Availability
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Rejects assignment during professor unavailable time slot', () => {
  // Dr. Alan Turing is unavailable on Friday
  const variable: LectureSession = {
    id: 'var-5',
    subjectId: 'sub-cs101',
    batchId: 'batch-cs-3a',
    professorId: 'prof-alan',
    sessionIndex: 1,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 40,
    label: 'CS101 Session 1',
  };

  const val: DomainValue = {
    day: 'Friday', // Turing unavailable on Friday!
    slotId: 'fri-slot-1',
    classroomId: 'room-lh-101',
  };

  const context = {
    variables: new Map([['var-5', variable]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map(DEMO_CLASSROOMS.map((c) => [c.id, c])),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(variable, val, [], context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to professor unavailability');
  assert.strictEqual(result.ruleId, 'professorAvailability');
});

// ----------------------------------------------------------------------------
// Test 6: Classroom Suitability
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Rejects assigning lab subject to lecture hall', () => {
  const labSession: LectureSession = {
    id: 'var-lab',
    subjectId: 'sub-cs205',
    batchId: 'batch-cs-3b',
    professorId: 'prof-ada',
    sessionIndex: 1,
    requiredRoomType: 'lab', // requires lab!
    requiredCapacity: 30,
    label: 'Programming Lab Session 1',
  };

  const val: DomainValue = {
    day: 'Monday',
    slotId: 'mon-slot-1',
    classroomId: 'room-lh-101', // lecture hall, not lab
  };

  const context = {
    variables: new Map([['var-lab', labSession]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map(DEMO_CLASSROOMS.map((c) => [c.id, c])),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(labSession, val, [], context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to room type mismatch');
  assert.strictEqual(result.ruleId, 'classroomSuitability');
});

// ----------------------------------------------------------------------------
// Test 7: Break Slot Clash
// ----------------------------------------------------------------------------
runTest('Hard Constraint: Rejects scheduling lecture during lunch break slot', () => {
  const session: LectureSession = {
    id: 'var-lunch',
    subjectId: 'sub-cs101',
    batchId: 'batch-cs-3a',
    professorId: 'prof-alan',
    sessionIndex: 1,
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 40,
    label: 'CS101 Session 1',
  };

  const breakSlot = DEMO_TIME_SLOTS.find((s) => s.isBreak)!;
  const val: DomainValue = {
    day: breakSlot.day,
    slotId: breakSlot.id,
    classroomId: 'room-lh-101',
  };

  const context = {
    variables: new Map([['var-lunch', session]]),
    professors: new Map(DEMO_PROFESSORS.map((p) => [p.id, p])),
    batches: new Map(DEMO_BATCHES.map((b) => [b.id, b])),
    classrooms: new Map(DEMO_CLASSROOMS.map((c) => [c.id, c])),
    timeSlots: new Map(DEMO_TIME_SLOTS.map((s) => [s.id, s])),
    config: DEFAULT_HARD_CONSTRAINTS,
  };

  const result = isAssignmentValid(session, val, [], context);
  assert.strictEqual(result.valid, false, 'Should be invalid due to break slot clash');
  assert.strictEqual(result.ruleId, 'noBreakSlotClash');
});

// ----------------------------------------------------------------------------
// Test 8: MRV Variable Selection
// ----------------------------------------------------------------------------
runTest('MRV Heuristic: Correctly selects variable with smallest legal domain size', () => {
  const vars: LectureSession[] = [
    { id: 'v1', subjectId: 's1', batchId: 'b1', professorId: 'p1', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V1' },
    { id: 'v2', subjectId: 's2', batchId: 'b1', professorId: 'p2', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V2' },
    { id: 'v3', subjectId: 's3', batchId: 'b1', professorId: 'p3', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V3' },
  ];

  const dm = new DomainManager(vars, DEMO_CLASSROOMS, DEMO_TIME_SLOTS, DEMO_PROFESSORS, DEMO_BATCHES, DEFAULT_HARD_CONSTRAINTS);
  // Force v2 to have smaller domain (size 2)
  dm.setDomain('v1', [{ day: 'Monday', slotId: 's1', classroomId: 'r1' }, { day: 'Monday', slotId: 's2', classroomId: 'r1' }, { day: 'Monday', slotId: 's3', classroomId: 'r1' }]);
  dm.setDomain('v2', [{ day: 'Monday', slotId: 's1', classroomId: 'r1' }, { day: 'Monday', slotId: 's2', classroomId: 'r1' }]); // smallest: 2
  dm.setDomain('v3', [{ day: 'Monday', slotId: 's1', classroomId: 'r1' }, { day: 'Monday', slotId: 's2', classroomId: 'r1' }, { day: 'Monday', slotId: 's3', classroomId: 'r1' }, { day: 'Monday', slotId: 's4', classroomId: 'r1' }]);

  const selection = selectUnassignedVariable(vars, dm, { useMRV: true, useDegreeHeuristic: false });
  assert.strictEqual(selection.selected.id, 'v2', 'MRV must select v2 with smallest domain');
  assert.strictEqual(selection.domainSize, 2);
});

// ----------------------------------------------------------------------------
// Test 9: Degree Heuristic Tie-Breaker
// ----------------------------------------------------------------------------
runTest('Degree Heuristic: Breaks ties by picking variable with most unassigned constraints', () => {
  const vA: LectureSession = { id: 'vA', subjectId: 's1', batchId: 'b1', professorId: 'prof-solo', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'VA' };
  const vB: LectureSession = { id: 'vB', subjectId: 's2', batchId: 'b1', professorId: 'prof-shared', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'VB' };
  const vC: LectureSession = { id: 'vC', subjectId: 's3', batchId: 'b2', professorId: 'prof-shared', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'VC' };

  const vars = [vA, vB, vC];
  const dm = new DomainManager(vars, DEMO_CLASSROOMS, DEMO_TIME_SLOTS, DEMO_PROFESSORS, DEMO_BATCHES, DEFAULT_HARD_CONSTRAINTS);

  // Both vA and vB have identical domain size 2 (tied)
  const dummyDomain = [{ day: 'Monday', slotId: 's1', classroomId: 'r1' }, { day: 'Monday', slotId: 's2', classroomId: 'r1' }] as DomainValue[];
  dm.setDomain('vA', [...dummyDomain]);
  dm.setDomain('vB', [...dummyDomain]);
  dm.setDomain('vC', [...dummyDomain, { day: 'Monday', slotId: 's3', classroomId: 'r1' }]);

  // When unassigned vars are [vA, vB, vC]:
  // MRV filters to [vA, vB] because their domain size is 2 (vC has 3).
  // Then Degree Heuristic calculates degree against all unassigned variables [vA, vB, vC]:
  // vB shares batch with vA AND professor with vC (degree 2)
  // vA only shares batch with vB (degree 1)
  // Therefore vB must win!
  const selection = selectUnassignedVariable([vA, vB, vC], dm, { useMRV: true, useDegreeHeuristic: true });
  assert.strictEqual(selection.selected.id, 'vB', 'Degree heuristic should select vB over vA when domain sizes tie');
});

// ----------------------------------------------------------------------------
// Test 10: Forward Checking & Wipeout Detection
// ----------------------------------------------------------------------------
runTest('Forward Checking: Detects domain wipeout and prunes incompatible choices', () => {
  const v1: LectureSession = { id: 'v1', subjectId: 's1', batchId: 'b1', professorId: 'prof-alan', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V1' };
  const v2: LectureSession = { id: 'v2', subjectId: 's2', batchId: 'b1', professorId: 'prof-ada', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V2' };

  const vars = [v1, v2];
  const dm = new DomainManager(vars, DEMO_CLASSROOMS, DEMO_TIME_SLOTS, DEMO_PROFESSORS, DEMO_BATCHES, DEFAULT_HARD_CONSTRAINTS);

  const sharedSlot: DomainValue = { day: 'Monday', slotId: 'mon-slot-1', classroomId: 'room-lh-101' };
  dm.setDomain('v1', [sharedSlot]);
  dm.setDomain('v2', [sharedSlot]); // v2 only has this one choice!

  // Assigning sharedSlot to v1 will conflict with v2 (same batch b1 and same time/room)
  const fc = forwardCheck(v1, sharedSlot, [v2], dm);
  assert.strictEqual(fc.wipeout, true, 'Wipeout must be detected when neighbor domain reaches 0');
  assert.strictEqual(fc.wipeoutVariableId, 'v2');
  assert.strictEqual(dm.getDomainSize('v2'), 0, 'v2 domain should now be empty');
});

// ----------------------------------------------------------------------------
// Test 11: Domain Restoration after Backtracking
// ----------------------------------------------------------------------------
runTest('Domain Restoration: Cleanly restores pruned domain values when backtracking', () => {
  const v1: LectureSession = { id: 'v1', subjectId: 's1', batchId: 'b1', professorId: 'p1', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V1' };
  const v2: LectureSession = { id: 'v2', subjectId: 's2', batchId: 'b1', professorId: 'p2', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V2' };

  const dm = new DomainManager([v1, v2], DEMO_CLASSROOMS, DEMO_TIME_SLOTS, DEMO_PROFESSORS, DEMO_BATCHES, DEFAULT_HARD_CONSTRAINTS);
  const initialV2Domain: DomainValue[] = [
    { day: 'Monday', slotId: 'mon-slot-1', classroomId: 'room-lh-101' },
    { day: 'Monday', slotId: 'mon-slot-2', classroomId: 'room-lh-101' },
  ];
  dm.setDomain('v2', [...initialV2Domain]);

  const assignedVal: DomainValue = { day: 'Monday', slotId: 'mon-slot-1', classroomId: 'room-lh-101' };
  const fc = forwardCheck(v1, assignedVal, [v2], dm);
  assert.strictEqual(dm.getDomainSize('v2'), 1, 'v2 should have lost 1 choice');

  // Now restore
  dm.restorePrunedValues(fc.prunedMap);
  assert.strictEqual(dm.getDomainSize('v2'), 2, 'v2 must have fully restored its original domain size');
});

// ----------------------------------------------------------------------------
// Test 12: Least Constraining Value (LCV)
// ----------------------------------------------------------------------------
runTest('LCV Heuristic: Sorts values in ascending order of neighbor choices eliminated', () => {
  const v1: LectureSession = { id: 'v1', subjectId: 's1', batchId: 'b1', professorId: 'prof-alan', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V1' };
  const v2: LectureSession = { id: 'v2', subjectId: 's2', batchId: 'b1', professorId: 'prof-ada', sessionIndex: 1, requiredRoomType: 'lecture_hall', requiredCapacity: 30, label: 'V2' };

  const dm = new DomainManager([v1, v2], DEMO_CLASSROOMS, DEMO_TIME_SLOTS, DEMO_PROFESSORS, DEMO_BATCHES, DEFAULT_HARD_CONSTRAINTS);

  // Val A clashes with v2's slot, Val B does NOT clash with v2
  const valA: DomainValue = { day: 'Monday', slotId: 'mon-slot-1', classroomId: 'room-lh-101' };
  const valB: DomainValue = { day: 'Wednesday', slotId: 'wed-slot-3', classroomId: 'room-lh-102' };

  dm.setDomain('v1', [valA, valB]);
  dm.setDomain('v2', [valA]); // v2 uses valA's slot

  const ordered = orderDomainValues(v1, [valA, valB], [v1, v2], dm, true);
  // valB eliminates 0 choices for v2, while valA eliminates 1 choice for v2.
  // Therefore valB (least constraining) must come FIRST!
  assert.strictEqual(ordered[0].day, 'Wednesday', 'Least constraining value (valB) must be ordered first');
  assert.strictEqual(ordered[1].day, 'Monday');
});

// ----------------------------------------------------------------------------
// Test 13: Full Backtracking Success on Academic Data
// ----------------------------------------------------------------------------
runTest('Backtracking Search: Successfully solves university timetable without hard violations', () => {
  // Generate variables for Year 3 Section A
  const variables = generateLectureSessions(
    DEMO_SUBJECTS,
    DEMO_BATCHES.slice(0, 1),
    DEMO_PROFESSORS
  );

  assert.ok(variables.length > 0, 'Variables should be generated');

  const result = solveTimetableCSP(
    variables,
    DEMO_PROFESSORS,
    DEMO_BATCHES.slice(0, 1),
    DEMO_CLASSROOMS,
    DEMO_TIME_SLOTS,
    DEFAULT_HARD_CONSTRAINTS,
    DEFAULT_SOFT_PREFERENCES,
    {
      useMRV: true,
      useDegreeHeuristic: true,
      useLCV: true,
      useForwardChecking: true,
      maxSteps: 5000,
      timeLimitMs: 10000,
      recordTrace: true,
    }
  );

  assert.strictEqual(result.success, true, 'Solver must succeed for realistic single-batch load');
  assert.ok(result.timetable !== null);
  assert.strictEqual(result.timetable.validation.isValid, true, 'Result timetable must be strictly valid');
  assert.strictEqual(result.timetable.validation.hardViolations.length, 0, 'Must have 0 hard constraint violations');
  assert.strictEqual(result.timetable.assignments.length, variables.length, 'Every lecture session must be scheduled');
  assert.ok(result.metrics.assignmentsAttempted > 0);
  assert.ok(result.recorder.getEvents().length > 0, 'Execution trace must contain recorded events');
});

// ----------------------------------------------------------------------------
// Test 14: Backtracking Failure on Unsatisfiable Constraints
// ----------------------------------------------------------------------------
runTest('Backtracking Search: Correctly detects and reports failure on overconstrained problem', () => {
  // Overconstrained: 10 sessions need to fit into 1 slot in 1 room
  const singleSlot: TimeSlot[] = [
    { id: 'only-slot', day: 'Monday', startTime: '09:00', endTime: '10:00', isBreak: false, label: 'Mon 9-10' },
  ];
  const singleRoom: Classroom[] = [
    { id: 'only-room', name: 'Room 1', capacity: 50, roomType: 'lecture_hall', building: 'Block A' },
  ];

  // 2 sessions for the same batch
  const subject: Subject = {
    id: 's-over',
    code: 'OVER1',
    name: 'Overconstrained',
    weeklyLectures: 2, // 2 sessions but only 1 slot exists!
    requiredRoomType: 'lecture_hall',
    requiredCapacity: 30,
  };
  const prof: Professor = {
    id: 'p-over',
    name: 'Dr. Over',
    email: 'over@uni.edu',
    department: 'CS',
    assignedSubjectIds: ['s-over'],
    availableSlots: [{ day: 'Monday', slotId: 'only-slot' }],
    preferredSlots: [],
  };
  const batch: Batch = {
    id: 'b-over',
    name: 'Batch Over',
    section: 'A',
    studentCount: 30,
    program: 'CS',
    subjectIds: ['s-over'],
  };

  const variables = generateLectureSessions([subject], [batch], [prof]);
  assert.strictEqual(variables.length, 2);

  const result = solveTimetableCSP(
    variables,
    [prof],
    [batch],
    singleRoom,
    singleSlot,
    DEFAULT_HARD_CONSTRAINTS,
    DEFAULT_SOFT_PREFERENCES,
    {
      useMRV: true,
      useDegreeHeuristic: true,
      useLCV: true,
      useForwardChecking: true,
      maxSteps: 1000,
      timeLimitMs: 5000,
      recordTrace: true,
    }
  );

  assert.strictEqual(result.success, false, 'Solver must fail when problem is provably unsatisfiable');
  assert.strictEqual(result.timetable, null);
  assert.strictEqual(result.metrics.solutionStatus, 'NO_SOLUTION_EXISTS');
});

// ----------------------------------------------------------------------------
// Test 15: Slot Disabling Respect
// ----------------------------------------------------------------------------
runTest('Time Slot Control: Excludes disabled slots and disabled days from generation', () => {
  // Disable all Friday slots
  const slotsWithFridayDisabled = DEMO_TIME_SLOTS.map((s) => ({
    ...s,
    disabled: s.day === 'Friday',
  }));

  const variables = generateLectureSessions(
    DEMO_SUBJECTS,
    DEMO_BATCHES.slice(0, 1),
    DEMO_PROFESSORS
  );

  const result = solveTimetableCSP(
    variables,
    DEMO_PROFESSORS,
    DEMO_BATCHES.slice(0, 1),
    DEMO_CLASSROOMS,
    slotsWithFridayDisabled,
    DEFAULT_HARD_CONSTRAINTS,
    DEFAULT_SOFT_PREFERENCES,
    {
      useMRV: true,
      useDegreeHeuristic: true,
      useLCV: true,
      useForwardChecking: true,
      maxSteps: 5000,
      timeLimitMs: 10000,
      recordTrace: false,
    }
  );

  assert.strictEqual(result.success, true, 'Solver must succeed with Friday disabled');
  assert.ok(result.timetable !== null);
  // Ensure NO assignment was scheduled on Friday
  const fridayAssignments = result.timetable.assignments.filter((a) => a.day === 'Friday');
  assert.strictEqual(fridayAssignments.length, 0, 'No lecture session may be placed on a disabled day');
});

console.log('\n====================================================');
console.log(`All ${passedTests}/${totalTests} CSP Algorithm Tests PASSED Successfully!`);
console.log('====================================================');

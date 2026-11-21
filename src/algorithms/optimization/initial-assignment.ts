import type {
  LectureSession,
  DomainValue,
  TimetableAssignment,
  Classroom,
  TimeSlot,
  Professor,
  Batch,
  HardConstraintConfig,
} from '../../types/index.ts';
import { SeededPRNG } from './prng.ts';
import { evaluateCandidateValue, type ConflictContext } from './conflict-evaluator.ts';

export type InitialStrategy = 'random' | 'greedy';

/**
 * Builds candidate domain values for a variable that respect unary constraints:
 * (non-disabled slot, non-break slot, suitable room type, capacity met, professor available).
 * If no value satisfies all unary checks (e.g. overconstrained scenario), falls back to all non-disabled slots & suitable rooms.
 */
export function getUnaryFilteredDomain(
  variable: LectureSession,
  classrooms: Classroom[],
  timeSlots: TimeSlot[],
  professors: Professor[],
  batches: Batch[],
  config: HardConstraintConfig
): DomainValue[] {
  const profMap = new Map(professors.map((p) => [p.id, p]));
  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const prof = profMap.get(variable.professorId);
  const batch = batchMap.get(variable.batchId);
  const neededCapacity = Math.max(variable.requiredCapacity, batch ? batch.studentCount : 0);

  // Filter classrooms matching capacity and room type
  const suitableRooms = classrooms.filter((room) => {
    if (config.classroomSuitability && room.roomType !== variable.requiredRoomType) {
      return false;
    }
    if (config.classroomCapacity && room.capacity < neededCapacity) {
      return false;
    }
    return true;
  });

  const validSlots = timeSlots.filter((slot) => !slot.disabled && (!config.noBreakSlotClash || !slot.isBreak));

  const domain: DomainValue[] = [];

  for (const slot of validSlots) {
    if (config.professorAvailability && prof) {
      const isProfAvailable = prof.availableSlots.some(
        (s) => s.day === slot.day && s.slotId === slot.id
      );
      if (!isProfAvailable) continue;
    }

    for (const room of suitableRooms) {
      if (room.availableSlots && room.availableSlots.length > 0) {
        const isRoomAvailable = room.availableSlots.some(
          (s) => s.day === slot.day && s.slotId === slot.id
        );
        if (!isRoomAvailable) continue;
      }

      domain.push({
        day: slot.day,
        slotId: slot.id,
        classroomId: room.id,
      });
    }
  }

  // Fallback: If unary filtering yielded 0 values (e.g., highly restrictive inputs),
  // relax availability to ensure a complete assignment can still be formed for Min-Conflicts to repair.
  if (domain.length === 0) {
    const fallbackRooms = suitableRooms.length > 0 ? suitableRooms : classrooms;
    const fallbackSlots = validSlots.length > 0 ? validSlots : timeSlots.filter((s) => !s.disabled);
    for (const slot of fallbackSlots) {
      for (const room of fallbackRooms) {
        domain.push({
          day: slot.day,
          slotId: slot.id,
          classroomId: room.id,
        });
      }
    }
  }

  return domain;
}

/**
 * Generates an initial complete assignment for all variables.
 * Independent of Backtracking.
 */
export function generateInitialAssignment(
  variables: LectureSession[],
  classrooms: Classroom[],
  timeSlots: TimeSlot[],
  professors: Professor[],
  batches: Batch[],
  config: HardConstraintConfig,
  strategy: InitialStrategy,
  prng: SeededPRNG,
  conflictContext?: ConflictContext
): TimetableAssignment[] {
  const assignments: TimetableAssignment[] = [];

  // Pre-calculate unary domain for each variable
  const variableDomains = new Map<string, DomainValue[]>();
  for (const v of variables) {
    const domain = getUnaryFilteredDomain(v, classrooms, timeSlots, professors, batches, config);
    variableDomains.set(v.id, domain);
  }

  for (const v of variables) {
    const domain = variableDomains.get(v.id) || [];
    if (domain.length === 0) {
      continue;
    }

    let chosenValue: DomainValue;

    if (strategy === 'greedy' && conflictContext && assignments.length > 0) {
      // Greedy strategy: pick candidate value that minimizes immediate conflicts with already assigned variables
      let minConflicts = Infinity;
      let bestCandidates: DomainValue[] = [];

      for (const candidate of domain) {
        const evalResult = evaluateCandidateValue(v, candidate, assignments, conflictContext);
        if (evalResult.conflictScore < minConflicts) {
          minConflicts = evalResult.conflictScore;
          bestCandidates = [candidate];
        } else if (evalResult.conflictScore === minConflicts) {
          bestCandidates.push(candidate);
        }
      }

      chosenValue = prng.choice(bestCandidates);
    } else {
      // Random strategy: select randomly from the unary filtered domain
      chosenValue = prng.choice(domain);
    }

    assignments.push({
      variableId: v.id,
      subjectId: v.subjectId,
      batchId: v.batchId,
      professorId: v.professorId,
      day: chosenValue.day,
      slotId: chosenValue.slotId,
      classroomId: chosenValue.classroomId,
    });
  }

  return assignments;
}

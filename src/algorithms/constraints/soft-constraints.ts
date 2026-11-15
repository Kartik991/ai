import type {
  TimetableAssignment,
  LectureSession,
  SoftPreferenceConfig,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  SoftConstraintViolation,
  DayOfWeek,
} from '../../types/index.ts';

export interface SoftEvaluationContext {
  variables: Map<string, LectureSession>;
  professors: Map<string, Professor>;
  batches: Map<string, Batch>;
  classrooms: Map<string, Classroom>;
  timeSlots: Map<string, TimeSlot>;
  timeSlotsList: TimeSlot[];
  config: SoftPreferenceConfig;
}

/**
 * Evaluates soft preference compliance of a timetable.
 * Returns an array of violations (with penalty amounts) and an overall score out of 100.
 */
export function evaluateSoftPreferences(
  assignments: TimetableAssignment[],
  context: SoftEvaluationContext
): { violations: SoftConstraintViolation[]; score: number } {
  const violations: SoftConstraintViolation[] = [];
  const { config, professors, batches, classrooms, timeSlotsList } = context;

  if (assignments.length === 0) {
    return { violations: [], score: 100 };
  }

  // Helper: map slotId to its ordered chronological index within its day
  const slotsByDay: Record<DayOfWeek, TimeSlot[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  timeSlotsList.forEach((slot) => {
    if (!slot.isBreak && slotsByDay[slot.day]) {
      slotsByDay[slot.day].push(slot);
    }
  });

  // Sort each day's slots by startTime
  Object.keys(slotsByDay).forEach((dayKey) => {
    const d = dayKey as DayOfWeek;
    slotsByDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const getSlotOrderIndex = (day: DayOfWeek, slotId: string): number => {
    const daySlots = slotsByDay[day] || [];
    return daySlots.findIndex((s) => s.id === slotId);
  };

  let totalPenalty = 0;

  // --------------------------------------------------------------------------
  // 1. Student Batch Gaps
  // --------------------------------------------------------------------------
  if (config.minimizeStudentGaps) {
    const batchDayAssignments = new Map<string, TimetableAssignment[]>();
    for (const a of assignments) {
      const key = `${a.batchId}_${a.day}`;
      if (!batchDayAssignments.has(key)) batchDayAssignments.set(key, []);
      batchDayAssignments.get(key)!.push(a);
    }

    batchDayAssignments.forEach((dayAssignments, key) => {
      if (dayAssignments.length <= 1) return;
      const [batchId, day] = key.split('_') as [string, DayOfWeek];
      const indices = dayAssignments
        .map((a) => getSlotOrderIndex(day, a.slotId))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);

      let gaps = 0;
      for (let i = 0; i < indices.length - 1; i++) {
        const diff = indices[i + 1] - indices[i] - 1;
        if (diff > 0) gaps += diff;
      }

      if (gaps > 0) {
        const penalty = gaps * config.studentGapWeight * 2;
        totalPenalty += penalty;
        const b = batches.get(batchId);
        violations.push({
          ruleId: 'minimizeStudentGaps',
          description: `Batch ${b ? b.name : batchId} has ${gaps} idle gap period(s) on ${day}`,
          penaltyScore: penalty,
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. Professor Gaps
  // --------------------------------------------------------------------------
  if (config.minimizeProfessorGaps) {
    const profDayAssignments = new Map<string, TimetableAssignment[]>();
    for (const a of assignments) {
      const key = `${a.professorId}_${a.day}`;
      if (!profDayAssignments.has(key)) profDayAssignments.set(key, []);
      profDayAssignments.get(key)!.push(a);
    }

    profDayAssignments.forEach((dayAssignments, key) => {
      if (dayAssignments.length <= 1) return;
      const [profId, day] = key.split('_') as [string, DayOfWeek];
      const indices = dayAssignments
        .map((a) => getSlotOrderIndex(day, a.slotId))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);

      let gaps = 0;
      for (let i = 0; i < indices.length - 1; i++) {
        const diff = indices[i + 1] - indices[i] - 1;
        if (diff > 0) gaps += diff;
      }

      if (gaps > 0) {
        const penalty = gaps * config.professorGapWeight * 2;
        totalPenalty += penalty;
        const p = professors.get(profId);
        violations.push({
          ruleId: 'minimizeProfessorGaps',
          description: `Prof. ${p ? p.name : profId} has ${gaps} idle slot gap(s) on ${day}`,
          penaltyScore: penalty,
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // 3. Even Distribution Across the Week
  // --------------------------------------------------------------------------
  if (config.distributeLecturesEvenly) {
    const subjectBatchDays = new Map<string, Map<DayOfWeek, number>>();
    for (const a of assignments) {
      const key = `${a.subjectId}_${a.batchId}`;
      if (!subjectBatchDays.has(key)) subjectBatchDays.set(key, new Map());
      const dayCounts = subjectBatchDays.get(key)!;
      dayCounts.set(a.day, (dayCounts.get(a.day) || 0) + 1);
    }

    subjectBatchDays.forEach((dayCounts, key) => {
      dayCounts.forEach((count, day) => {
        if (count > 1) {
          const excess = count - 1;
          const penalty = excess * config.distributionWeight * 3;
          totalPenalty += penalty;
          const [subjectId, batchId] = key.split('_');
          const v = context.variables.get(subjectId);
          violations.push({
            ruleId: 'distributeLecturesEvenly',
            description: `Subject ${v?.label || subjectId} has ${count} lectures clustered on ${day} for batch ${batchId}`,
            penaltyScore: penalty,
          });
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 4. Excessive Consecutive Lectures
  // --------------------------------------------------------------------------
  if (config.avoidExcessiveConsecutive) {
    const batchDayAssignments = new Map<string, TimetableAssignment[]>();
    for (const a of assignments) {
      const key = `${a.batchId}_${a.day}`;
      if (!batchDayAssignments.has(key)) batchDayAssignments.set(key, []);
      batchDayAssignments.get(key)!.push(a);
    }

    batchDayAssignments.forEach((dayAssignments, key) => {
      if (dayAssignments.length <= config.consecutiveLimit) return;
      const [batchId, day] = key.split('_') as [string, DayOfWeek];
      const indices = dayAssignments
        .map((a) => getSlotOrderIndex(day, a.slotId))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);

      let currentStreak = 1;
      let maxStreak = 1;
      for (let i = 0; i < indices.length - 1; i++) {
        if (indices[i + 1] === indices[i] + 1) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
          currentStreak = 1;
        }
      }

      if (maxStreak > config.consecutiveLimit) {
        const excess = maxStreak - config.consecutiveLimit;
        const penalty = excess * config.consecutiveWeight * 4;
        totalPenalty += penalty;
        const b = batches.get(batchId);
        violations.push({
          ruleId: 'avoidExcessiveConsecutive',
          description: `Batch ${b ? b.name : batchId} has ${maxStreak} consecutive lecture hours on ${day} (exceeds limit of ${config.consecutiveLimit})`,
          penaltyScore: penalty,
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // 5. Preferred Teaching Slots
  // --------------------------------------------------------------------------
  if (config.respectPreferredSlots) {
    for (const a of assignments) {
      const prof = professors.get(a.professorId);
      if (prof && prof.preferredSlots && prof.preferredSlots.length > 0) {
        const isPreferred = prof.preferredSlots.some(
          (s) => s.day === a.day && s.slotId === a.slotId
        );
        if (!isPreferred) {
          const penalty = config.preferredSlotsWeight * 1.5;
          totalPenalty += penalty;
          violations.push({
            ruleId: 'respectPreferredSlots',
            description: `Prof. ${prof.name} scheduled outside preferred slots on ${a.day} ${a.slotId}`,
            penaltyScore: penalty,
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Classroom Utilization
  // --------------------------------------------------------------------------
  if (config.maximizeRoomUtilization) {
    for (const a of assignments) {
      const room = classrooms.get(a.classroomId);
      const batch = batches.get(a.batchId);
      if (room && batch) {
        const unusedSeats = room.capacity - batch.studentCount;
        // If unused seats is greater than 30 and represents > 50% waste
        if (unusedSeats > 25 && unusedSeats / room.capacity > 0.45) {
          const penalty = Math.round((unusedSeats / room.capacity) * config.utilizationWeight * 2);
          totalPenalty += penalty;
          violations.push({
            ruleId: 'maximizeRoomUtilization',
            description: `Room ${room.name} (${room.capacity} seats) underutilized by Batch ${batch.name} (${batch.studentCount} students)`,
            penaltyScore: penalty,
          });
        }
      }
    }
  }

  // Normalize score between 0 and 100
  // Each penalty reduces score; scale gracefully
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty / (assignments.length * 0.75 + 1))));

  return { violations, score };
}

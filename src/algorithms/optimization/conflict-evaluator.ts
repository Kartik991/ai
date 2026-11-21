import type {
  LectureSession,
  DomainValue,
  TimetableAssignment,
  HardConstraintConfig,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  CandidateEvaluation,
} from '../../types/index.ts';

export interface ConflictContext {
  variables: Map<string, LectureSession>;
  professors: Map<string, Professor>;
  batches: Map<string, Batch>;
  classrooms: Map<string, Classroom>;
  timeSlots: Map<string, TimeSlot>;
  config: HardConstraintConfig;
}

/**
 * Evaluates the number of hard conflicts that a variable would produce if assigned `candidateValue`,
 * in the context of the rest of the current timetable assignments (excluding this variable's current assignment).
 */
export function evaluateCandidateValue(
  variable: LectureSession,
  candidateValue: DomainValue,
  otherAssignments: TimetableAssignment[],
  context: ConflictContext
): CandidateEvaluation {
  let conflictScore = 0;
  const breakdown: string[] = [];
  const { config, professors, batches, classrooms, timeSlots } = context;

  // Unary Constraint 1: Disabled or Break Slot
  const slot = timeSlots.get(candidateValue.slotId);
  if (slot?.disabled) {
    conflictScore++;
    breakdown.push(`Slot ${slot.label} is disabled`);
  } else if (config.noBreakSlotClash && slot?.isBreak) {
    conflictScore++;
    breakdown.push(`Slot ${slot.label} is a break recess`);
  }

  // Unary Constraint 2: Classroom Suitability
  if (config.classroomSuitability) {
    const room = classrooms.get(candidateValue.classroomId);
    if (room && room.roomType !== variable.requiredRoomType) {
      conflictScore++;
      breakdown.push(`Room type mismatch: requires ${variable.requiredRoomType}, got ${room.roomType}`);
    }
  }

  // Unary Constraint 3: Classroom Capacity
  if (config.classroomCapacity) {
    const room = classrooms.get(candidateValue.classroomId);
    const batch = batches.get(variable.batchId);
    const needed = Math.max(variable.requiredCapacity, batch ? batch.studentCount : 0);
    if (room && room.capacity < needed) {
      conflictScore++;
      breakdown.push(`Capacity deficit: room ${room.capacity} < needed ${needed}`);
    }
  }

  // Unary Constraint 4: Professor Availability
  if (config.professorAvailability) {
    const prof = professors.get(variable.professorId);
    if (prof) {
      const isAvailable = prof.availableSlots.some(
        (s) => s.day === candidateValue.day && s.slotId === candidateValue.slotId
      );
      if (!isAvailable) {
        conflictScore++;
        breakdown.push(`Prof. ${prof.name} unavailable on ${candidateValue.day} ${candidateValue.slotId}`);
      }
    }
  }

  // Binary Constraints: Clashes with other lectures at the same day & time slot
  for (const other of otherAssignments) {
    // Must be a different lecture session
    if (other.variableId === variable.id) continue;

    if (other.day === candidateValue.day && other.slotId === candidateValue.slotId) {
      // Professor Clash
      if (config.noProfessorClash && other.professorId === variable.professorId) {
        conflictScore++;
        const prof = professors.get(variable.professorId);
        breakdown.push(`Professor conflict with ${other.variableId} (${prof?.name || variable.professorId})`);
      }

      // Classroom Clash
      if (config.noClassroomClash && other.classroomId === candidateValue.classroomId) {
        conflictScore++;
        const room = classrooms.get(candidateValue.classroomId);
        breakdown.push(`Classroom conflict with ${other.variableId} (${room?.name || candidateValue.classroomId})`);
      }

      // Student Batch Clash
      if (config.noBatchClash && other.batchId === variable.batchId) {
        conflictScore++;
        const batch = batches.get(variable.batchId);
        breakdown.push(`Batch conflict with ${other.variableId} (${batch?.name || variable.batchId})`);
      }
    }
  }

  return {
    value: candidateValue,
    conflictScore,
    breakdown,
  };
}

/**
 * Calculates all variable IDs currently involved in at least one hard conflict.
 */
export function getAllConflictingVariables(
  variables: LectureSession[],
  assignments: TimetableAssignment[],
  context: ConflictContext
): string[] {
  const conflictingVarIds = new Set<string>();
  const assignmentMap = new Map<string, TimetableAssignment>();
  assignments.forEach((a) => assignmentMap.set(a.variableId, a));

  const { config, professors, batches, classrooms, timeSlots } = context;

  // Check unary violations
  for (const a of assignments) {
    const v = context.variables.get(a.variableId);
    if (!v) continue;

    const slot = timeSlots.get(a.slotId);
    if (slot?.disabled || (config.noBreakSlotClash && slot?.isBreak)) {
      conflictingVarIds.add(a.variableId);
      continue;
    }

    if (config.classroomSuitability) {
      const room = classrooms.get(a.classroomId);
      if (room && room.roomType !== v.requiredRoomType) {
        conflictingVarIds.add(a.variableId);
        continue;
      }
    }

    if (config.classroomCapacity) {
      const room = classrooms.get(a.classroomId);
      const batch = batches.get(v.batchId);
      const needed = Math.max(v.requiredCapacity, batch ? batch.studentCount : 0);
      if (room && room.capacity < needed) {
        conflictingVarIds.add(a.variableId);
        continue;
      }
    }

    if (config.professorAvailability) {
      const prof = professors.get(v.professorId);
      if (prof) {
        const isAvailable = prof.availableSlots.some(
          (s) => s.day === a.day && s.slotId === a.slotId
        );
        if (!isAvailable) {
          conflictingVarIds.add(a.variableId);
          continue;
        }
      }
    }
  }

  // Check binary pairwise clashes
  for (let i = 0; i < assignments.length; i++) {
    const a1 = assignments[i];
    for (let j = i + 1; j < assignments.length; j++) {
      const a2 = assignments[j];

      if (a1.day === a2.day && a1.slotId === a2.slotId) {
        let clash = false;
        if (config.noProfessorClash && a1.professorId === a2.professorId) {
          clash = true;
        }
        if (config.noClassroomClash && a1.classroomId === a2.classroomId) {
          clash = true;
        }
        if (config.noBatchClash && a1.batchId === a2.batchId) {
          clash = true;
        }

        if (clash) {
          conflictingVarIds.add(a1.variableId);
          conflictingVarIds.add(a2.variableId);
        }
      }
    }
  }

  return Array.from(conflictingVarIds);
}

/**
 * Calculates total number of distinct hard constraint conflicts across the entire timetable.
 */
export function countTotalHardConflicts(
  variables: LectureSession[],
  assignments: TimetableAssignment[],
  context: ConflictContext
): number {
  let totalConflicts = 0;
  const { config, professors, batches, classrooms, timeSlots } = context;

  // Unary conflicts
  for (const a of assignments) {
    const v = context.variables.get(a.variableId);
    if (!v) continue;

    const slot = timeSlots.get(a.slotId);
    if (slot?.disabled) totalConflicts++;
    else if (config.noBreakSlotClash && slot?.isBreak) totalConflicts++;

    if (config.classroomSuitability) {
      const room = classrooms.get(a.classroomId);
      if (room && room.roomType !== v.requiredRoomType) totalConflicts++;
    }

    if (config.classroomCapacity) {
      const room = classrooms.get(a.classroomId);
      const batch = batches.get(v.batchId);
      const needed = Math.max(v.requiredCapacity, batch ? batch.studentCount : 0);
      if (room && room.capacity < needed) totalConflicts++;
    }

    if (config.professorAvailability) {
      const prof = professors.get(v.professorId);
      if (prof) {
        const isAvailable = prof.availableSlots.some(
          (s) => s.day === a.day && s.slotId === a.slotId
        );
        if (!isAvailable) totalConflicts++;
      }
    }
  }

  // Binary conflicts (each colliding pair counts as 1 clash per resource)
  for (let i = 0; i < assignments.length; i++) {
    const a1 = assignments[i];
    for (let j = i + 1; j < assignments.length; j++) {
      const a2 = assignments[j];

      if (a1.day === a2.day && a1.slotId === a2.slotId) {
        if (config.noProfessorClash && a1.professorId === a2.professorId) {
          totalConflicts++;
        }
        if (config.noClassroomClash && a1.classroomId === a2.classroomId) {
          totalConflicts++;
        }
        if (config.noBatchClash && a1.batchId === a2.batchId) {
          totalConflicts++;
        }
      }
    }
  }

  return totalConflicts;
}

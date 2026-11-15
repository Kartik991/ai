import type {
  TimetableAssignment,
  LectureSession,
  DomainValue,
  HardConstraintConfig,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  HardConstraintViolation,
} from '../../types/index.ts';

export interface ConstraintContext {
  variables: Map<string, LectureSession>;
  professors: Map<string, Professor>;
  batches: Map<string, Batch>;
  classrooms: Map<string, Classroom>;
  timeSlots: Map<string, TimeSlot>;
  config: HardConstraintConfig;
}

/**
 * Checks whether a proposed assignment (varId, value) is compatible with current assigned sessions.
 * Returns true if valid, or false + violation details if invalid.
 */
export function isAssignmentValid(
  variable: LectureSession,
  value: DomainValue,
  currentAssignments: TimetableAssignment[],
  context: ConstraintContext
): { valid: boolean; violationReason?: string; ruleId?: string } {
  const { config, professors, batches, classrooms, timeSlots } = context;

  // 1. Break slot or disabled slot check
  const slot = timeSlots.get(value.slotId);
  if (slot?.disabled) {
    return {
      valid: false,
      violationReason: `Slot ${slot.label} has been disabled for this generation`,
      ruleId: 'disabledSlotClash',
    };
  }

  if (config.noBreakSlotClash && slot?.isBreak) {
    return {
      valid: false,
      violationReason: `Slot ${slot.label} is marked as a break/unavailable slot`,
      ruleId: 'noBreakSlotClash',
    };
  }

  // 2. Classroom suitability check (room type matches subject/session required type)
  if (config.classroomSuitability) {
    const room = classrooms.get(value.classroomId);
    if (room && room.roomType !== variable.requiredRoomType) {
      return {
        valid: false,
        violationReason: `Room ${room.name} (${room.roomType}) does not match required room type (${variable.requiredRoomType})`,
        ruleId: 'classroomSuitability',
      };
    }
  }

  // 3. Classroom capacity check (room capacity >= batch student count / required capacity)
  if (config.classroomCapacity) {
    const room = classrooms.get(value.classroomId);
    const batch = batches.get(variable.batchId);
    const neededCapacity = Math.max(variable.requiredCapacity, batch ? batch.studentCount : 0);
    if (room && room.capacity < neededCapacity) {
      return {
        valid: false,
        violationReason: `Room ${room.name} capacity (${room.capacity}) is less than required (${neededCapacity})`,
        ruleId: 'classroomCapacity',
      };
    }
  }

  // 4. Professor availability check
  if (config.professorAvailability) {
    const prof = professors.get(variable.professorId);
    if (prof) {
      const isAvailable = prof.availableSlots.some(
        (s) => s.day === value.day && s.slotId === value.slotId
      );
      if (!isAvailable) {
        return {
          valid: false,
          violationReason: `Professor ${prof.name} is not available on ${value.day} at ${value.slotId}`,
          ruleId: 'professorAvailability',
        };
      }
    }
  }

  // Check conflicts with already assigned sessions
  for (const assigned of currentAssignments) {
    // Only check if they occur on the same day and time slot
    if (assigned.day === value.day && assigned.slotId === value.slotId) {
      // 5. Professor clash (same professor cannot teach two lectures simultaneously)
      if (config.noProfessorClash && assigned.professorId === variable.professorId) {
        const prof = professors.get(variable.professorId);
        return {
          valid: false,
          violationReason: `Professor ${prof ? prof.name : variable.professorId} is already teaching another lecture at ${value.day} ${value.slotId}`,
          ruleId: 'noProfessorClash',
        };
      }

      // 6. Classroom clash (same classroom cannot host two lectures simultaneously)
      if (config.noClassroomClash && assigned.classroomId === value.classroomId) {
        const room = classrooms.get(value.classroomId);
        return {
          valid: false,
          violationReason: `Classroom ${room ? room.name : value.classroomId} is already occupied at ${value.day} ${value.slotId}`,
          ruleId: 'noClassroomClash',
        };
      }

      // 7. Batch clash (same batch cannot attend two lectures simultaneously)
      if (config.noBatchClash && assigned.batchId === variable.batchId) {
        const batch = batches.get(variable.batchId);
        return {
          valid: false,
          violationReason: `Batch ${batch ? `${batch.name} (${batch.section})` : variable.batchId} already has a lecture at ${value.day} ${value.slotId}`,
          ruleId: 'noBatchClash',
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Checks all hard constraints across an entire completed timetable.
 */
export function validateAllHardConstraints(
  assignments: TimetableAssignment[],
  allVariables: LectureSession[],
  context: ConstraintContext
): HardConstraintViolation[] {
  const violations: HardConstraintViolation[] = [];
  const { config, professors, batches, classrooms, timeSlots } = context;

  // 1. Check all required sessions scheduled
  if (config.allSessionsScheduled) {
    const assignedIds = new Set(assignments.map((a) => a.variableId));
    for (const v of allVariables) {
      if (!assignedIds.has(v.id)) {
        violations.push({
          ruleId: 'allSessionsScheduled',
          description: `Lecture session "${v.label}" is missing from the schedule`,
          affectedVariableIds: [v.id],
        });
      }
    }
  }

  // 2. Pairwise clash checks
  for (let i = 0; i < assignments.length; i++) {
    const a1 = assignments[i];
    const v1 = context.variables.get(a1.variableId);

    // Break check
    if (config.noBreakSlotClash) {
      const slot = timeSlots.get(a1.slotId);
      if (slot && slot.isBreak) {
        violations.push({
          ruleId: 'noBreakSlotClash',
          description: `Lecture "${v1?.label || a1.variableId}" scheduled in break slot`,
          affectedVariableIds: [a1.variableId],
        });
      }
    }

    // Classroom suitability
    if (config.classroomSuitability && v1) {
      const room = classrooms.get(a1.classroomId);
      if (room && room.roomType !== v1.requiredRoomType) {
        violations.push({
          ruleId: 'classroomSuitability',
          description: `Room "${room.name}" (${room.roomType}) incompatible with "${v1.label}" (${v1.requiredRoomType})`,
          affectedVariableIds: [a1.variableId],
        });
      }
    }

    // Capacity check
    if (config.classroomCapacity && v1) {
      const room = classrooms.get(a1.classroomId);
      const batch = batches.get(a1.batchId);
      const needed = Math.max(v1.requiredCapacity, batch ? batch.studentCount : 0);
      if (room && room.capacity < needed) {
        violations.push({
          ruleId: 'classroomCapacity',
          description: `Room "${room.name}" capacity (${room.capacity}) smaller than needed (${needed}) for "${v1.label}"`,
          affectedVariableIds: [a1.variableId],
        });
      }
    }

    // Professor availability
    if (config.professorAvailability) {
      const prof = professors.get(a1.professorId);
      if (prof) {
        const ok = prof.availableSlots.some((s) => s.day === a1.day && s.slotId === a1.slotId);
        if (!ok) {
          violations.push({
            ruleId: 'professorAvailability',
            description: `Professor "${prof.name}" is marked unavailable on ${a1.day} ${a1.slotId}`,
            affectedVariableIds: [a1.variableId],
          });
        }
      }
    }

    // Pairwise conflicts
    for (let j = i + 1; j < assignments.length; j++) {
      const a2 = assignments[j];
      if (a1.day === a2.day && a1.slotId === a2.slotId) {
        // Professor clash
        if (config.noProfessorClash && a1.professorId === a2.professorId) {
          const prof = professors.get(a1.professorId);
          violations.push({
            ruleId: 'noProfessorClash',
            description: `Professor "${prof?.name || a1.professorId}" double-booked at ${a1.day} ${a1.slotId}`,
            affectedVariableIds: [a1.variableId, a2.variableId],
          });
        }

        // Classroom clash
        if (config.noClassroomClash && a1.classroomId === a2.classroomId) {
          const room = classrooms.get(a1.classroomId);
          violations.push({
            ruleId: 'noClassroomClash',
            description: `Classroom "${room?.name || a1.classroomId}" double-booked at ${a1.day} ${a1.slotId}`,
            affectedVariableIds: [a1.variableId, a2.variableId],
          });
        }

        // Batch clash
        if (config.noBatchClash && a1.batchId === a2.batchId) {
          const batch = batches.get(a1.batchId);
          violations.push({
            ruleId: 'noBatchClash',
            description: `Batch "${batch ? `${batch.name} (${batch.section})` : a1.batchId}" double-booked at ${a1.day} ${a1.slotId}`,
            affectedVariableIds: [a1.variableId, a2.variableId],
          });
        }
      }
    }
  }

  return violations;
}

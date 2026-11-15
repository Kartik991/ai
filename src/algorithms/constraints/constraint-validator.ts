import type {
  TimetableAssignment,
  LectureSession,
  TimetableValidationResult,
  HardConstraintConfig,
  SoftPreferenceConfig,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
} from '../../types/index.ts';
import { validateAllHardConstraints, type ConstraintContext } from './hard-constraints.ts';
import { evaluateSoftPreferences, type SoftEvaluationContext } from './soft-constraints.ts';

export function validateCompleteTimetable(
  assignments: TimetableAssignment[],
  variables: LectureSession[],
  professors: Professor[],
  batches: Batch[],
  classrooms: Classroom[],
  timeSlots: TimeSlot[],
  hardConfig: HardConstraintConfig,
  softConfig: SoftPreferenceConfig
): TimetableValidationResult {
  const varMap = new Map<string, LectureSession>(variables.map((v) => [v.id, v]));
  const profMap = new Map<string, Professor>(professors.map((p) => [p.id, p]));
  const batchMap = new Map<string, Batch>(batches.map((b) => [b.id, b]));
  const roomMap = new Map<string, Classroom>(classrooms.map((c) => [c.id, c]));
  const slotMap = new Map<string, TimeSlot>(timeSlots.map((s) => [s.id, s]));

  const hardContext: ConstraintContext = {
    variables: varMap,
    professors: profMap,
    batches: batchMap,
    classrooms: roomMap,
    timeSlots: slotMap,
    config: hardConfig,
  };

  const softContext: SoftEvaluationContext = {
    variables: varMap,
    professors: profMap,
    batches: batchMap,
    classrooms: roomMap,
    timeSlots: slotMap,
    timeSlotsList: timeSlots,
    config: softConfig,
  };

  const hardViolations = validateAllHardConstraints(assignments, variables, hardContext);
  const { violations: softViolations, score: softScore } = evaluateSoftPreferences(
    assignments,
    softContext
  );

  return {
    isValid: hardViolations.length === 0,
    hardViolations,
    softViolations,
    softScore: hardViolations.length === 0 ? softScore : 0,
  };
}

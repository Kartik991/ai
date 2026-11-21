import type {
  LectureSession,
  DomainValue,
  TimetableAssignment,
  Timetable,
  Subject,
  Professor,
  Batch,
  Classroom,
  TimeSlot,
  HardConstraintConfig,
  SoftPreferenceConfig,
  MinConflictsOptions,
  MinConflictsMetrics,
} from '../../types/index.ts';
import { SeededPRNG } from './prng.ts';
import {
  getAllConflictingVariables,
  countTotalHardConflicts,
  evaluateCandidateValue,
  type ConflictContext,
} from './conflict-evaluator.ts';
import { generateInitialAssignment, getUnaryFilteredDomain } from './initial-assignment.ts';
import { RestartManager } from './restart-manager.ts';
import { MinConflictsTraceRecorder } from '../visualization/min-conflicts-events.ts';
import { validateCompleteTimetable } from '../constraints/constraint-validator.ts';
import { evaluateSoftPreferences, type SoftEvaluationContext } from '../constraints/soft-constraints.ts';

export interface MinConflictsResult {
  success: boolean;
  timetable: Timetable | null;
  bestAssignment: TimetableAssignment[];
  remainingConflicts: number;
  metrics: MinConflictsMetrics;
  recorder: MinConflictsTraceRecorder;
  failureReason?: string;
}

/**
 * Solves the university timetable CSP using the genuine Min-Conflicts Local Search algorithm.
 */
export function solveTimetableMinConflicts(
  variables: LectureSession[],
  professors: Professor[],
  batches: Batch[],
  classrooms: Classroom[],
  timeSlots: TimeSlot[],
  hardConfig: HardConstraintConfig,
  softConfig: SoftPreferenceConfig,
  options: MinConflictsOptions
): MinConflictsResult {
  const startTime = Date.now();
  const prng = new SeededPRNG(options.randomSeed);
  const recorder = new MinConflictsTraceRecorder(options.recordTrace, options.maxIterations * 3);

  // Fast entity lookup maps
  const varMap = new Map<string, LectureSession>(variables.map((v) => [v.id, v]));
  const profMap = new Map<string, Professor>(professors.map((p) => [p.id, p]));
  const batchMap = new Map<string, Batch>(batches.map((b) => [b.id, b]));
  const roomMap = new Map<string, Classroom>(classrooms.map((c) => [c.id, c]));
  const slotMap = new Map<string, TimeSlot>(timeSlots.map((s) => [s.id, s]));

  const conflictContext: ConflictContext = {
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

  const metrics: MinConflictsMetrics = {
    executionTimeMs: 0,
    totalIterations: 0,
    totalRestarts: 0,
    initialConflictsCount: 0,
    finalConflictsCount: 0,
    bestConflictsCount: Infinity,
    variablesExaminedCount: 0,
    candidateValuesEvaluatedCount: 0,
    successfulRepairsCount: 0,
    stagnationEventsCount: 0,
    solutionStatus: 'UNRESOLVED_CONFLICTS',
    variablesCount: variables.length,
  };

  if (variables.length === 0) {
    metrics.executionTimeMs = Date.now() - startTime;
    metrics.solutionStatus = 'SUCCESS';
    metrics.bestConflictsCount = 0;
    return {
      success: true,
      timetable: {
        id: `tt-mc-${Date.now()}`,
        name: 'Empty Timetable (Min-Conflicts)',
        createdAt: new Date().toISOString(),
        batchIds: [],
        algorithmUsed: 'min-conflicts',
        assignments: [],
        validation: { isValid: true, hardViolations: [], softViolations: [], softScore: 100 },
        metrics,
        minConflictsMetrics: metrics,
      },
      bestAssignment: [],
      remainingConflicts: 0,
      metrics,
      recorder,
    };
  }

  // Pre-calculate unary filtered domains for all variables
  const domains = new Map<string, DomainValue[]>();
  for (const v of variables) {
    domains.set(v.id, getUnaryFilteredDomain(v, classrooms, timeSlots, professors, batches, hardConfig));
  }

  const restartManager = new RestartManager(options.maxRestarts, options.stagnationThreshold);

  // Generate initial complete assignment
  let currentAssignments = generateInitialAssignment(
    variables,
    classrooms,
    timeSlots,
    professors,
    batches,
    hardConfig,
    options.initStrategy,
    prng,
    conflictContext
  );

  let initialConflicts = countTotalHardConflicts(variables, currentAssignments, conflictContext);
  metrics.initialConflictsCount = initialConflicts;
  metrics.bestConflictsCount = initialConflicts;
  restartManager.recordState(initialConflicts, currentAssignments);

  let conflictingVarIds = getAllConflictingVariables(variables, currentAssignments, conflictContext);

  recorder.record({
    iteration: 0,
    restartCount: 0,
    type: 'INITIAL_ASSIGNMENT_CREATED',
    conflictingVariableIds: conflictingVarIds,
    totalConflicts: initialConflicts,
    bestConflicts: initialConflicts,
    reason: `Initial complete assignment generated via ${options.initStrategy} strategy with ${initialConflicts} initial hard conflict(s)`,
    details: { strategy: options.initStrategy, seed: options.randomSeed },
    assignmentsSnapshot: currentAssignments,
  });

  // Check if initial assignment is already conflict-free
  if (initialConflicts === 0) {
    const validation = validateCompleteTimetable(
      currentAssignments,
      variables,
      professors,
      batches,
      classrooms,
      timeSlots,
      hardConfig,
      softConfig
    );

    if (validation.isValid) {
      metrics.executionTimeMs = Date.now() - startTime;
      metrics.solutionStatus = 'SUCCESS';
      metrics.finalConflictsCount = 0;
      metrics.bestConflictsCount = 0;

      recorder.record({
        iteration: 0,
        restartCount: 0,
        type: 'SOLUTION_FOUND',
        conflictingVariableIds: [],
        totalConflicts: 0,
        bestConflicts: 0,
        reason: 'Initial assignment is strictly valid with 0 hard conflicts!',
        assignmentsSnapshot: currentAssignments,
      });

      const timetable: Timetable = {
        id: `tt-mc-${Date.now()}`,
        name: `Timetable (Min-Conflicts) ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        batchIds: Array.from(new Set(variables.map((v) => v.batchId))),
        algorithmUsed: 'min-conflicts',
        assignments: currentAssignments,
        validation,
        metrics,
        minConflictsMetrics: metrics,
      };

      return {
        success: true,
        timetable,
        bestAssignment: currentAssignments,
        remainingConflicts: 0,
        metrics,
        recorder,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Main Min-Conflicts Local Search Iteration Loop
  // --------------------------------------------------------------------------
  let iteration = 0;

  while (iteration < options.maxIterations) {
    // Timeout check
    if (Date.now() - startTime > options.timeLimitMs) {
      metrics.solutionStatus = 'TIMEOUT';
      break;
    }

    iteration++;
    metrics.totalIterations = iteration;

    // 1. If no conflicts remain, we found a potential solution!
    if (conflictingVarIds.length === 0) {
      const validation = validateCompleteTimetable(
        currentAssignments,
        variables,
        professors,
        batches,
        classrooms,
        timeSlots,
        hardConfig,
        softConfig
      );

      if (validation.isValid) {
        metrics.executionTimeMs = Date.now() - startTime;
        metrics.solutionStatus = 'SUCCESS';
        metrics.finalConflictsCount = 0;
        metrics.bestConflictsCount = 0;

        // Optional Second Stage: Soft Preference Local Improvement
        if (options.optimizeSoftPreferences) {
          currentAssignments = optimizeSoftPreferencesLocally(
            currentAssignments,
            variables,
            domains,
            conflictContext,
            softContext,
            prng,
            50
          );
        }

        const finalValidation = validateCompleteTimetable(
          currentAssignments,
          variables,
          professors,
          batches,
          classrooms,
          timeSlots,
          hardConfig,
          softConfig
        );

        recorder.record({
          iteration,
          restartCount: restartManager.getRestartsCount(),
          type: 'SOLUTION_FOUND',
          conflictingVariableIds: [],
          totalConflicts: 0,
          bestConflicts: 0,
          reason: `Valid conflict-free schedule synthesized at iteration ${iteration} (Soft Score: ${finalValidation.softScore}%)`,
          assignmentsSnapshot: currentAssignments,
        });

        const timetable: Timetable = {
          id: `tt-mc-${Date.now()}`,
          name: `Timetable (Min-Conflicts) ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(),
          batchIds: Array.from(new Set(variables.map((v) => v.batchId))),
          algorithmUsed: 'min-conflicts',
          assignments: currentAssignments,
          validation: finalValidation,
          metrics,
          minConflictsMetrics: metrics,
        };

        return {
          success: true,
          timetable,
          bestAssignment: currentAssignments,
          remainingConflicts: 0,
          metrics,
          recorder,
        };
      }
    }

    // 2. Conflicting Variable Selection
    // Pick one variable randomly from the set of currently conflicting variables
    const selectedVarId = prng.choice(conflictingVarIds);
    const selectedVar = varMap.get(selectedVarId)!;
    metrics.variablesExaminedCount++;

    const currentAssignIndex = currentAssignments.findIndex((a) => a.variableId === selectedVarId);
    const currentAssign = currentAssignments[currentAssignIndex];
    const currentVal: DomainValue = {
      day: currentAssign.day,
      slotId: currentAssign.slotId,
      classroomId: currentAssign.classroomId,
    };

    recorder.record({
      iteration,
      restartCount: restartManager.getRestartsCount(),
      type: 'CONFLICTING_VARIABLE_SELECTED',
      variableId: selectedVarId,
      currentValue: currentVal,
      conflictingVariableIds: conflictingVarIds,
      totalConflicts: countTotalHardConflicts(variables, currentAssignments, conflictContext),
      bestConflicts: restartManager.getBestConflictCount(),
      reason: `Selected conflicting variable "${selectedVar.label}" (assigned ${currentVal.day} ${currentVal.slotId})`,
      assignmentsSnapshot: currentAssignments,
    });

    // 3. Minimum-Conflict Value Selection
    // Evaluate candidate domain values for selectedVar
    const candidateDomain = domains.get(selectedVarId) || [];
    const otherAssignments = currentAssignments.filter((a) => a.variableId !== selectedVarId);

    let minConflictScore = Infinity;
    let bestValueCandidates: DomainValue[] = [];
    const candidateEvals: Array<{ value: DomainValue; conflictScore: number; breakdown: string[] }> = [];

    for (const val of candidateDomain) {
      metrics.candidateValuesEvaluatedCount++;
      const evalResult = evaluateCandidateValue(selectedVar, val, otherAssignments, conflictContext);
      candidateEvals.push(evalResult);

      if (evalResult.conflictScore < minConflictScore) {
        minConflictScore = evalResult.conflictScore;
        bestValueCandidates = [val];
      } else if (evalResult.conflictScore === minConflictScore) {
        bestValueCandidates.push(val);
      }
    }

    // Tie-breaking: choose randomly among values with the same minimum conflict score
    const chosenValue = prng.choice(bestValueCandidates);

    // 4. Update assignment
    const isValueChanged =
      chosenValue.day !== currentAssign.day ||
      chosenValue.slotId !== currentAssign.slotId ||
      chosenValue.classroomId !== currentAssign.classroomId;

    if (isValueChanged) {
      currentAssignments[currentAssignIndex] = {
        ...currentAssign,
        day: chosenValue.day,
        slotId: chosenValue.slotId,
        classroomId: chosenValue.classroomId,
      };
      metrics.successfulRepairsCount++;
    }

    // Recalculate global conflict count & conflicting variables
    const currentTotalConflicts = countTotalHardConflicts(variables, currentAssignments, conflictContext);
    conflictingVarIds = getAllConflictingVariables(variables, currentAssignments, conflictContext);

    // Record state in restart manager (handles stagnation detection)
    restartManager.recordState(currentTotalConflicts, currentAssignments);
    metrics.bestConflictsCount = restartManager.getBestConflictCount();

    recorder.record({
      iteration,
      restartCount: restartManager.getRestartsCount(),
      type: 'MINIMUM_CONFLICT_VALUE_SELECTED',
      variableId: selectedVarId,
      currentValue: currentVal,
      selectedCandidateValue: chosenValue,
      conflictingVariableIds: conflictingVarIds,
      totalConflicts: currentTotalConflicts,
      bestConflicts: restartManager.getBestConflictCount(),
      evaluatedCandidates: candidateEvals.slice(0, 8), // keep top candidates for UI inspection
      reason: `Reassigned "${selectedVar.label}" to ${chosenValue.day} ${chosenValue.slotId} (${chosenValue.classroomId}) with local conflict score: ${minConflictScore}. Total timetable conflicts now: ${currentTotalConflicts}`,
      assignmentsSnapshot: currentAssignments,
    });

    // 5. Stagnation Detection & Random Restart
    if (restartManager.isStagnated()) {
      metrics.stagnationEventsCount++;
      recorder.record({
        iteration,
        restartCount: restartManager.getRestartsCount(),
        type: 'STAGNATION_DETECTED',
        conflictingVariableIds: conflictingVarIds,
        totalConflicts: currentTotalConflicts,
        bestConflicts: restartManager.getBestConflictCount(),
        reason: `Search stalled without conflict reduction for ${options.stagnationThreshold} iterations`,
        assignmentsSnapshot: currentAssignments,
      });

      if (restartManager.canRestart()) {
        const { restartCount } = restartManager.triggerRestart();
        metrics.totalRestarts = restartCount;

        // Generate a fresh complete initial assignment with a different random seed trajectory
        currentAssignments = generateInitialAssignment(
          variables,
          classrooms,
          timeSlots,
          professors,
          batches,
          hardConfig,
          options.initStrategy,
          prng,
          conflictContext
        );

        const restartConflicts = countTotalHardConflicts(variables, currentAssignments, conflictContext);
        conflictingVarIds = getAllConflictingVariables(variables, currentAssignments, conflictContext);
        restartManager.recordState(restartConflicts, currentAssignments);

        recorder.record({
          iteration,
          restartCount,
          type: 'RANDOM_RESTART',
          conflictingVariableIds: conflictingVarIds,
          totalConflicts: restartConflicts,
          bestConflicts: restartManager.getBestConflictCount(),
          reason: `Random restart triggered (${restartCount}/${options.maxRestarts}). New initial state created with ${restartConflicts} conflicts.`,
          assignmentsSnapshot: currentAssignments,
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Search Finished Without Valid Solution
  // --------------------------------------------------------------------------
  metrics.executionTimeMs = Date.now() - startTime;
  if (metrics.solutionStatus !== 'TIMEOUT') {
    metrics.solutionStatus = 'ITERATION_LIMIT_EXCEEDED';
  }

  // Use the best assignment seen across all iterations/restarts
  const bestAssignment = restartManager.getBestAssignment().length > 0
    ? restartManager.getBestAssignment()
    : currentAssignments;

  const bestConflicts = restartManager.getBestConflictCount() !== Infinity
    ? restartManager.getBestConflictCount()
    : countTotalHardConflicts(variables, bestAssignment, conflictContext);

  metrics.finalConflictsCount = bestConflicts;
  metrics.bestConflictsCount = bestConflicts;

  // Independent verification on the best candidate
  const validation = validateCompleteTimetable(
    bestAssignment,
    variables,
    professors,
    batches,
    classrooms,
    timeSlots,
    hardConfig,
    softConfig
  );

  const failureReason =
    metrics.solutionStatus === 'TIMEOUT'
      ? `Search timed out after ${options.timeLimitMs}ms with ${bestConflicts} remaining hard conflict(s).`
      : `Min-Conflicts reached iteration limit (${options.maxIterations}) with ${bestConflicts} remaining hard conflict(s). Consider increasing iterations, allowing more restarts, or trying Backtracking + MRV.`;

  recorder.record({
    iteration: metrics.totalIterations,
    restartCount: restartManager.getRestartsCount(),
    type: 'SEARCH_FAILED',
    conflictingVariableIds: getAllConflictingVariables(variables, bestAssignment, conflictContext),
    totalConflicts: bestConflicts,
    bestConflicts,
    reason: failureReason,
    assignmentsSnapshot: bestAssignment,
  });

  return {
    success: false,
    timetable: null,
    bestAssignment,
    remainingConflicts: bestConflicts,
    metrics,
    recorder,
    failureReason,
  };
}

/**
 * Stage 2 Optimization: Hill-climbing local improvement on Soft Preferences
 * that guarantees NEVER increasing hard conflicts (> 0).
 */
function optimizeSoftPreferencesLocally(
  initialAssignments: TimetableAssignment[],
  variables: LectureSession[],
  domains: Map<string, DomainValue[]>,
  conflictContext: ConflictContext,
  softContext: SoftEvaluationContext,
  prng: SeededPRNG,
  maxSwaps = 50
): TimetableAssignment[] {
  let current = initialAssignments.map((a) => ({ ...a }));
  let currentSoftScore = evaluateSoftPreferences(current, softContext).score;

  for (let s = 0; s < maxSwaps; s++) {
    // Pick a random variable
    const randomVar = prng.choice(variables);
    const domain = domains.get(randomVar.id) || [];
    if (domain.length <= 1) continue;

    const assignIndex = current.findIndex((a) => a.variableId === randomVar.id);
    const oldAssign = current[assignIndex];
    const candidateVal = prng.choice(domain);

    const otherAssigns = current.filter((a) => a.variableId !== randomVar.id);
    const hardEval = evaluateCandidateValue(randomVar, candidateVal, otherAssigns, conflictContext);

    // Hard constraint preservation rule: MUST have 0 hard conflicts!
    if (hardEval.conflictScore === 0) {
      const trialAssignment = [...current];
      trialAssignment[assignIndex] = {
        ...oldAssign,
        day: candidateVal.day,
        slotId: candidateVal.slotId,
        classroomId: candidateVal.classroomId,
      };

      const trialSoftScore = evaluateSoftPreferences(trialAssignment, softContext).score;

      // If soft score improves or stays equal, accept the move
      if (trialSoftScore >= currentSoftScore) {
        current = trialAssignment;
        currentSoftScore = trialSoftScore;
      }
    }
  }

  return current;
}

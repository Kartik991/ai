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
  SolverOptions,
  SearchMetrics,
  SearchTreeNode,
} from '../../types/index.ts';
import { DomainManager } from './domain-manager.ts';
import { selectUnassignedVariable } from './variable-selection.ts';
import { orderDomainValues } from './value-ordering.ts';
import { forwardCheck } from './forward-checking.ts';
import { isAssignmentValid, type ConstraintContext } from '../constraints/hard-constraints.ts';
import { validateCompleteTimetable } from '../constraints/constraint-validator.ts';
import { TraceRecorder } from '../visualization/execution-events.ts';

export interface SolverResult {
  success: boolean;
  timetable: Timetable | null;
  metrics: SearchMetrics;
  recorder: TraceRecorder;
  failureReason?: string;
}

/**
 * Generates the CSP variables (individual lecture sessions) from academic data.
 */
export function generateLectureSessions(
  subjects: Subject[],
  batches: Batch[],
  professors: Professor[],
  targetBatchIds?: string[]
): LectureSession[] {
  const variables: LectureSession[] = [];
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Find a qualified professor for each subject
  const profForSubject = (subjectId: string): Professor | undefined => {
    return professors.find((p) => p.assignedSubjectIds.includes(subjectId));
  };

  const batchesToProcess = targetBatchIds && targetBatchIds.length > 0
    ? batches.filter((b) => targetBatchIds.includes(b.id))
    : batches;

  for (const batch of batchesToProcess) {
    for (const subjectId of batch.subjectIds) {
      const subject = subjectMap.get(subjectId);
      if (!subject) continue;

      const prof = profForSubject(subjectId);
      if (!prof) {
        console.warn(`No professor found for subject ${subject.code} (${subject.id})`);
        continue;
      }

      for (let session = 1; session <= subject.weeklyLectures; session++) {
        const id = `${batch.id}_${subject.id}_s${session}`;
        variables.push({
          id,
          subjectId: subject.id,
          batchId: batch.id,
          professorId: prof.id,
          sessionIndex: session,
          requiredRoomType: subject.requiredRoomType,
          requiredCapacity: Math.max(subject.requiredCapacity, batch.studentCount),
          label: `${subject.code} (${batch.section}) #${session}`,
        });
      }
    }
  }

  return variables;
}

/**
 * Solves the timetable CSP using genuine recursive Backtracking Search
 * with MRV, Degree Heuristic, LCV, and Forward Checking.
 */
export function solveTimetableCSP(
  variables: LectureSession[],
  professors: Professor[],
  batches: Batch[],
  classrooms: Classroom[],
  timeSlots: TimeSlot[],
  hardConfig: HardConstraintConfig,
  softConfig: SoftPreferenceConfig,
  options: SolverOptions
): SolverResult {
  const startTime = Date.now();
  const recorder = new TraceRecorder(options.recordTrace, options.maxSteps * 2);

  // Setup maps for fast constraint lookups
  const varMap = new Map<string, LectureSession>(variables.map((v) => [v.id, v]));
  const profMap = new Map<string, Professor>(professors.map((p) => [p.id, p]));
  const batchMap = new Map<string, Batch>(batches.map((b) => [b.id, b]));
  const roomMap = new Map<string, Classroom>(classrooms.map((c) => [c.id, c]));
  const slotMap = new Map<string, TimeSlot>(timeSlots.map((s) => [s.id, s]));

  const constraintContext: ConstraintContext = {
    variables: varMap,
    professors: profMap,
    batches: batchMap,
    classrooms: roomMap,
    timeSlots: slotMap,
    config: hardConfig,
  };

  // Initialize domains
  const domainManager = new DomainManager(
    variables,
    classrooms,
    timeSlots,
    professors,
    batches,
    hardConfig
  );

  const metrics: SearchMetrics = {
    executionTimeMs: 0,
    assignmentsAttempted: 0,
    backtracksCount: 0,
    constraintChecksCount: 0,
    exploredNodesCount: 0,
    domainWipeoutsCount: 0,
    solutionStatus: 'NO_SOLUTION_EXISTS',
    variablesCount: variables.length,
    assignedCount: 0,
  };

  if (variables.length === 0) {
    metrics.solutionStatus = 'SUCCESS';
    metrics.executionTimeMs = Date.now() - startTime;
    return {
      success: true,
      timetable: {
        id: `tt-${Date.now()}`,
        name: 'Empty Timetable',
        createdAt: new Date().toISOString(),
        batchIds: [],
        assignments: [],
        validation: { isValid: true, hardViolations: [], softViolations: [], softScore: 100 },
        metrics,
      },
      metrics,
      recorder,
    };
  }

  // Pre-check: check if any variable already has an empty initial domain
  for (const v of variables) {
    if (domainManager.getDomainSize(v.id) === 0) {
      metrics.executionTimeMs = Date.now() - startTime;
      recorder.record({
        type: 'DOMAIN_WIPED_OUT',
        variableId: v.id,
        reason: `Initial domain for ${v.label} is empty (no valid room or available professor slot)`,
        assignmentsSnapshot: [],
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: 'root',
      });
      return {
        success: false,
        timetable: null,
        metrics,
        recorder,
        failureReason: `Variable "${v.label}" has 0 possible slots. Check professor availability or classroom capacity/suitability.`,
      };
    }
  }

  // Root tree node
  const rootNode: SearchTreeNode = {
    id: 'node-root',
    variableId: 'root',
    variableLabel: 'Start Search',
    status: 'exploring',
    depth: 0,
    childrenIds: [],
    stepNumber: 0,
  };
  recorder.addTreeNode(rootNode);

  let nodeCounter = 0;
  let terminatedEarly = false;
  let terminationReason = '';

  const currentAssignments: TimetableAssignment[] = [];
  const assignedVarIds = new Set<string>();

  /**
   * Recursive Backtracking Function
   */
  function backtrack(
    depth: number,
    parentNodeId: string
  ): boolean {
    // Check limits (timeout or max steps)
    if (Date.now() - startTime > options.timeLimitMs) {
      terminatedEarly = true;
      terminationReason = `Search timed out after ${options.timeLimitMs}ms`;
      metrics.solutionStatus = 'TIMEOUT';
      return false;
    }

    if (metrics.assignmentsAttempted >= options.maxSteps) {
      terminatedEarly = true;
      terminationReason = `Exceeded maximum search step limit of ${options.maxSteps}`;
      metrics.solutionStatus = 'STEP_LIMIT_EXCEEDED';
      return false;
    }

    // 1. Goal test: are all variables assigned?
    if (assignedVarIds.size === variables.length) {
      recorder.record({
        type: 'SOLUTION_FOUND',
        reason: 'All variables successfully assigned without hard constraint violations',
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: parentNodeId,
      });
      return true;
    }

    // 2. Select unassigned variable (MRV + Degree Heuristic)
    const unassigned = variables.filter((v) => !assignedVarIds.has(v.id));
    const { selected: currentVar, domainSize, degree, candidatesCount } = selectUnassignedVariable(
      unassigned,
      domainManager,
      {
        useMRV: options.useMRV,
        useDegreeHeuristic: options.useDegreeHeuristic,
      }
    );

    metrics.exploredNodesCount++;

    recorder.record({
      type: 'VARIABLE_SELECTED',
      variableId: currentVar.id,
      reason: `Selected ${currentVar.label} (Domain size: ${domainSize}, Degree: ${degree}, Candidates considered: ${candidatesCount})`,
      details: { domainSize, degree, candidatesCount, useMRV: options.useMRV, useDegree: options.useDegreeHeuristic },
      assignmentsSnapshot: currentAssignments,
      domainSizesSnapshot: domainManager.getAllDomainSizes(),
      treeNodeId: parentNodeId,
    });

    // 3. Domain values ordering (LCV Heuristic)
    const domain = domainManager.getDomain(currentVar.id);
    const orderedDomain = orderDomainValues(
      currentVar,
      domain,
      unassigned,
      domainManager,
      options.useLCV
    );

    // 4. Iterate through values in domain
    for (const val of orderedDomain) {
      nodeCounter++;
      const currentNodeId = `node-${nodeCounter}`;
      const slot = slotMap.get(val.slotId);
      const room = roomMap.get(val.classroomId);

      const treeNode: SearchTreeNode = {
        id: currentNodeId,
        parentId: parentNodeId,
        variableId: currentVar.id,
        variableLabel: `${currentVar.label} -> ${val.day} ${slot?.startTime || val.slotId} [${room?.name || val.classroomId}]`,
        value: val,
        status: 'exploring',
        depth: depth + 1,
        childrenIds: [],
        stepNumber: metrics.assignmentsAttempted + 1,
      };
      recorder.addTreeNode(treeNode);

      metrics.assignmentsAttempted++;

      recorder.record({
        type: 'VALUE_SELECTED',
        variableId: currentVar.id,
        value: val,
        reason: `Considering slot ${val.day} ${slot?.startTime || ''} in room ${room?.name || val.classroomId}`,
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: currentNodeId,
        parentTreeNodeId: parentNodeId,
      });

      // 5. Hard constraint check
      metrics.constraintChecksCount++;
      recorder.record({
        type: 'CONSTRAINT_CHECK_STARTED',
        variableId: currentVar.id,
        value: val,
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: currentNodeId,
        parentTreeNodeId: parentNodeId,
      });

      const checkResult = isAssignmentValid(
        currentVar,
        val,
        currentAssignments,
        constraintContext
      );

      if (!checkResult.valid) {
        recorder.record({
          type: 'CONSTRAINT_CHECK_FAILED',
          variableId: currentVar.id,
          value: val,
          reason: checkResult.violationReason,
          details: { ruleId: checkResult.ruleId },
          assignmentsSnapshot: currentAssignments,
          domainSizesSnapshot: domainManager.getAllDomainSizes(),
          treeNodeId: currentNodeId,
          parentTreeNodeId: parentNodeId,
        });

        recorder.updateTreeNode(currentNodeId, {
          status: 'failed',
          failureReason: checkResult.violationReason,
        });
        continue; // Try next value
      }

      // Constraint check passed
      recorder.record({
        type: 'CONSTRAINT_CHECK_PASSED',
        variableId: currentVar.id,
        value: val,
        reason: 'All hard constraints satisfied',
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: currentNodeId,
        parentTreeNodeId: parentNodeId,
      });

      // 6. Assign value
      const newAssignment: TimetableAssignment = {
        variableId: currentVar.id,
        subjectId: currentVar.subjectId,
        batchId: currentVar.batchId,
        professorId: currentVar.professorId,
        day: val.day,
        slotId: val.slotId,
        classroomId: val.classroomId,
      };

      currentAssignments.push(newAssignment);
      assignedVarIds.add(currentVar.id);
      metrics.assignedCount = assignedVarIds.size;

      recorder.record({
        type: 'ASSIGNMENT_COMMITTED',
        variableId: currentVar.id,
        value: val,
        reason: `Assigned ${currentVar.label} to ${val.day} ${slot?.startTime || val.slotId} (${room?.name || val.classroomId})`,
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: currentNodeId,
        parentTreeNodeId: parentNodeId,
      });

      // 7. Forward Checking (if enabled)
      let forwardCheckPassed = true;
      let prunedMap = new Map<string, DomainValue[]>();

      if (options.useForwardChecking) {
        const remainingUnassigned = variables.filter((v) => !assignedVarIds.has(v.id));
        const fcResult = forwardCheck(currentVar, val, remainingUnassigned, domainManager);
        prunedMap = fcResult.prunedMap;

        if (fcResult.totalPrunedCount > 0) {
          recorder.record({
            type: 'DOMAIN_UPDATED',
            variableId: currentVar.id,
            reason: `Forward checking pruned ${fcResult.totalPrunedCount} values from ${prunedMap.size} unassigned variable(s)`,
            details: { totalPruned: fcResult.totalPrunedCount, affectedVars: Array.from(prunedMap.keys()) },
            assignmentsSnapshot: currentAssignments,
            domainSizesSnapshot: domainManager.getAllDomainSizes(),
            treeNodeId: currentNodeId,
            parentTreeNodeId: parentNodeId,
          });
        }

        if (fcResult.wipeout) {
          forwardCheckPassed = false;
          metrics.domainWipeoutsCount++;
          const wipedVar = varMap.get(fcResult.wipeoutVariableId || '');

          recorder.record({
            type: 'DOMAIN_WIPED_OUT',
            variableId: fcResult.wipeoutVariableId,
            reason: `Domain wipeout detected: Variable "${wipedVar?.label || fcResult.wipeoutVariableId}" has 0 remaining legal values`,
            assignmentsSnapshot: currentAssignments,
            domainSizesSnapshot: domainManager.getAllDomainSizes(),
            treeNodeId: currentNodeId,
            parentTreeNodeId: parentNodeId,
          });

          recorder.updateTreeNode(currentNodeId, {
            status: 'failed',
            failureReason: `Domain wipeout for ${wipedVar?.label || 'unassigned variable'}`,
          });
        }
      }

      // 8. Recursive step
      if (forwardCheckPassed) {
        recorder.record({
          type: 'NODE_EXPANDED',
          variableId: currentVar.id,
          reason: `Advancing to depth ${depth + 1}`,
          assignmentsSnapshot: currentAssignments,
          domainSizesSnapshot: domainManager.getAllDomainSizes(),
          treeNodeId: currentNodeId,
          parentTreeNodeId: parentNodeId,
        });

        const success = backtrack(depth + 1, currentNodeId);
        if (success) {
          recorder.updateTreeNode(currentNodeId, { status: 'success' });
          return true;
        }
      }

      // 9. Backtrack: undo assignment and restore pruned domains
      metrics.backtracksCount++;

      recorder.record({
        type: 'BACKTRACK_STARTED',
        variableId: currentVar.id,
        value: val,
        reason: `Subtree exploration failed. Undoing assignment of ${currentVar.label}`,
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: currentNodeId,
        parentTreeNodeId: parentNodeId,
      });

      // Restore forward checked pruned values
      if (options.useForwardChecking && prunedMap.size > 0) {
        domainManager.restorePrunedValues(prunedMap);
        recorder.record({
          type: 'DOMAIN_UPDATED',
          variableId: currentVar.id,
          reason: `Restored ${prunedMap.size} domains after backtrack`,
          assignmentsSnapshot: currentAssignments,
          domainSizesSnapshot: domainManager.getAllDomainSizes(),
          treeNodeId: currentNodeId,
          parentTreeNodeId: parentNodeId,
        });
      }

      // Remove assignment
      currentAssignments.pop();
      assignedVarIds.delete(currentVar.id);
      metrics.assignedCount = assignedVarIds.size;

      recorder.record({
        type: 'ASSIGNMENT_REMOVED',
        variableId: currentVar.id,
        value: val,
        reason: `Removed assignment for ${currentVar.label}`,
        assignmentsSnapshot: currentAssignments,
        domainSizesSnapshot: domainManager.getAllDomainSizes(),
        treeNodeId: currentNodeId,
        parentTreeNodeId: parentNodeId,
      });

      recorder.updateTreeNode(currentNodeId, { status: 'backtracked' });

      if (terminatedEarly) {
        return false;
      }
    }

    // No value worked for currentVar
    return false;
  }

  // Launch search
  const foundSolution = backtrack(0, 'node-root');
  metrics.executionTimeMs = Date.now() - startTime;

  if (foundSolution) {
    metrics.solutionStatus = 'SUCCESS';
    recorder.updateTreeNode('node-root', { status: 'success' });

    // Independent post-generation validation check
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

    const timetable: Timetable = {
      id: `tt-${Date.now()}`,
      name: `Timetable ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      batchIds: Array.from(new Set(variables.map((v) => v.batchId))),
      assignments: currentAssignments,
      validation,
      metrics,
    };

    return {
      success: true,
      timetable,
      metrics,
      recorder,
    };
  }

  // If search failed
  recorder.record({
    type: 'SEARCH_FAILED',
    reason: terminationReason || 'Search space exhausted: No conflict-free assignment exists for the given constraints',
    assignmentsSnapshot: currentAssignments,
    domainSizesSnapshot: domainManager.getAllDomainSizes(),
    treeNodeId: 'node-root',
  });
  recorder.updateTreeNode('node-root', { status: 'failed', failureReason: terminationReason || 'Exhausted' });

  return {
    success: false,
    timetable: null,
    metrics,
    recorder,
    failureReason:
      terminationReason ||
      'No valid timetable could be generated without violating hard constraints. Consider relaxing professor availability, expanding classroom capacity, or adding more time slots.',
  };
}

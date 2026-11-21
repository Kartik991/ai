// ============================================================================
// IntelliSched Phase 1 - Type Definitions
// ============================================================================

export type RoomType = 'lecture_hall' | 'lab' | 'seminar';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimeSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "10:00"
  isBreak: boolean;
  disabled?: boolean; // When true, slot is inactive/unavailable for generation
  label: string;     // e.g. "Mon 09:00 - 10:00"
}

export interface Subject {
  id: string;
  code: string;       // e.g. "CS301"
  name: string;       // e.g. "Algorithms & Complexity"
  weeklyLectures: number; // e.g. 3 lectures/week
  requiredRoomType: RoomType;
  requiredCapacity: number;
  color?: string;     // Hex code or Tailwind color
}

export interface Professor {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedSubjectIds: string[]; // subjects they are qualified/assigned to teach
  availableSlots: Array<{ day: DayOfWeek; slotId: string }>;
  preferredSlots: Array<{ day: DayOfWeek; slotId: string }>;
}

export interface Batch {
  id: string;
  name: string;       // e.g. "Computer Science 2026"
  section: string;    // e.g. "Section A"
  studentCount: number;
  program: string;    // e.g. "B.Tech CSE"
  subjectIds: string[]; // subjects this batch is enrolled in
}

export interface Classroom {
  id: string;
  name: string;       // e.g. "Hall 101"
  capacity: number;
  roomType: RoomType;
  building: string;
  availableSlots?: Array<{ day: DayOfWeek; slotId: string }>;
}

// ----------------------------------------------------------------------------
// CSP Model Types
// ----------------------------------------------------------------------------

/**
 * A Variable in our CSP represents an individual lecture session that must be scheduled.
 * For example, if CS301 requires 3 weekly lectures for Batch A, there will be 3 distinct
 * LectureSession variables: CS301-B1-L1, CS301-B1-L2, CS301-B1-L3.
 */
export interface LectureSession {
  id: string;                  // e.g. "CS301_BATCH1_L1"
  subjectId: string;
  batchId: string;
  professorId: string;
  sessionIndex: number;        // 1, 2, 3...
  requiredRoomType: RoomType;
  requiredCapacity: number;
  label: string;               // e.g. "CS301 (Sec A) - Lecture 1"
}

/**
 * A Domain Value is a concrete assignment coordinate for a lecture session.
 */
export interface DomainValue {
  day: DayOfWeek;
  slotId: string;
  classroomId: string;
}

/**
 * A concrete assignment in a timetable.
 */
export interface TimetableAssignment {
  variableId: string;
  subjectId: string;
  batchId: string;
  professorId: string;
  day: DayOfWeek;
  slotId: string;
  classroomId: string;
}

// ----------------------------------------------------------------------------
// Constraints
// ----------------------------------------------------------------------------

export interface HardConstraintConfig {
  noProfessorClash: boolean;
  noClassroomClash: boolean;
  noBatchClash: boolean;
  classroomCapacity: boolean;
  professorAvailability: boolean;
  classroomSuitability: boolean;
  allSessionsScheduled: boolean;
  noBreakSlotClash: boolean;
}

export interface SoftPreferenceConfig {
  minimizeStudentGaps: boolean;
  studentGapWeight: number; // 1-10
  minimizeProfessorGaps: boolean;
  professorGapWeight: number; // 1-10
  distributeLecturesEvenly: boolean;
  distributionWeight: number; // 1-10
  avoidExcessiveConsecutive: boolean;
  consecutiveLimit: number; // default 3
  consecutiveWeight: number; // 1-10
  respectPreferredSlots: boolean;
  preferredSlotsWeight: number; // 1-10
  maximizeRoomUtilization: boolean;
  utilizationWeight: number; // 1-10
}

export interface HardConstraintViolation {
  ruleId: string;
  description: string;
  affectedVariableIds: string[];
}

export interface SoftConstraintViolation {
  ruleId: string;
  description: string;
  penaltyScore: number;
}

export interface TimetableValidationResult {
  isValid: boolean;
  hardViolations: HardConstraintViolation[];
  softViolations: SoftConstraintViolation[];
  softScore: number; // 0 to 100 (100 = perfect compliance)
}

export type AlgorithmType = 'backtracking' | 'min-conflicts';

export interface MinConflictsMetrics {
  executionTimeMs: number;
  totalIterations: number;
  totalRestarts: number;
  initialConflictsCount: number;
  finalConflictsCount: number;
  bestConflictsCount: number;
  variablesExaminedCount: number;
  candidateValuesEvaluatedCount: number;
  successfulRepairsCount: number;
  stagnationEventsCount: number;
  solutionStatus: 'SUCCESS' | 'ITERATION_LIMIT_EXCEEDED' | 'TIMEOUT' | 'UNRESOLVED_CONFLICTS';
  variablesCount: number;
}

export interface MinConflictsOptions {
  maxIterations: number;
  maxRestarts: number;
  stagnationThreshold: number;
  randomSeed?: number;
  initStrategy: 'random' | 'greedy';
  optimizeSoftPreferences: boolean;
  timeLimitMs: number;
  recordTrace: boolean;
  batchIds?: string[];
}

export type MinConflictsTraceEventType =
  | 'INITIAL_ASSIGNMENT_CREATED'
  | 'CONFLICTS_DETECTED'
  | 'CONFLICTING_VARIABLE_SELECTED'
  | 'CANDIDATE_EVALUATION_STARTED'
  | 'CANDIDATE_EVALUATED'
  | 'MINIMUM_CONFLICT_VALUE_SELECTED'
  | 'ASSIGNMENT_UPDATED'
  | 'CONFLICT_COUNT_UPDATED'
  | 'STAGNATION_DETECTED'
  | 'RANDOM_RESTART'
  | 'SOLUTION_FOUND'
  | 'SEARCH_FAILED';

export interface CandidateEvaluation {
  value: DomainValue;
  conflictScore: number;
  breakdown: string[];
}

export interface MinConflictsTraceEvent {
  id: string;
  stepNumber: number;
  iteration: number;
  restartCount: number;
  type: MinConflictsTraceEventType;
  timestamp: number;
  variableId?: string;
  currentValue?: DomainValue;
  selectedCandidateValue?: DomainValue;
  conflictingVariableIds: string[];
  totalConflicts: number;
  bestConflicts: number;
  evaluatedCandidates?: CandidateEvaluation[];
  reason?: string;
  details?: Record<string, unknown>;
  assignmentsSnapshot: TimetableAssignment[];
}

export interface Timetable {
  id: string;
  name: string;
  createdAt: string;
  batchIds: string[];
  algorithmUsed: AlgorithmType;
  assignments: TimetableAssignment[];
  validation: TimetableValidationResult;
  metrics: SearchMetrics | MinConflictsMetrics;
  minConflictsMetrics?: MinConflictsMetrics;
  backtrackingMetrics?: SearchMetrics;
}

// ----------------------------------------------------------------------------
// Algorithm Comparison Types
// ----------------------------------------------------------------------------

export interface ComparisonRun {
  algorithm: AlgorithmType;
  name: string;
  seed?: number;
  success: boolean;
  executionTimeMs: number;
  primaryWorkMetric: number; // Explored Nodes (BT) vs Total Iterations (MC)
  primaryWorkLabel: string;
  secondaryWorkMetric: number; // Backtracks (BT) vs Restarts (MC)
  secondaryWorkLabel: string;
  constraintChecks: number;
  hardViolations: number;
  softScore: number;
  timetable: Timetable | null;
  status: string;
}

export interface AlgorithmComparisonResult {
  timestamp: string;
  datasetName: string;
  variablesCount: number;
  backtrackingRun: ComparisonRun;
  minConflictsRuns: ComparisonRun[];
  summary: {
    fasterAlgorithm: AlgorithmType | 'tie';
    higherQualityAlgorithm: AlgorithmType | 'tie';
    timeDifferenceMs: number;
    notes: string[];
  };
}

// ----------------------------------------------------------------------------
// Algorithm Execution & Visualization Event System
// ----------------------------------------------------------------------------

export type TraceEventType =
  | 'VARIABLE_SELECTED'
  | 'VALUE_SELECTED'
  | 'ASSIGNMENT_ATTEMPTED'
  | 'CONSTRAINT_CHECK_STARTED'
  | 'CONSTRAINT_CHECK_PASSED'
  | 'CONSTRAINT_CHECK_FAILED'
  | 'ASSIGNMENT_COMMITTED'
  | 'DOMAIN_UPDATED'
  | 'DOMAIN_WIPED_OUT'
  | 'BACKTRACK_STARTED'
  | 'ASSIGNMENT_REMOVED'
  | 'NODE_EXPANDED'
  | 'SOLUTION_FOUND'
  | 'SEARCH_FAILED';

export interface TraceEvent {
  id: string;
  stepNumber: number;
  type: TraceEventType;
  timestamp: number;
  variableId?: string;
  value?: DomainValue;
  reason?: string;
  details?: Record<string, unknown>;
  assignmentsSnapshot: TimetableAssignment[];
  domainSizesSnapshot: Record<string, number>;
  treeNodeId: string;
  parentTreeNodeId?: string;
}

export interface SearchTreeNode {
  id: string;
  parentId?: string;
  variableId: string;
  variableLabel: string;
  value?: DomainValue;
  status: 'exploring' | 'success' | 'failed' | 'backtracked' | 'pruned';
  depth: number;
  childrenIds: string[];
  failureReason?: string;
  stepNumber: number;
}

export interface SearchMetrics {
  executionTimeMs: number;
  assignmentsAttempted: number;
  backtracksCount: number;
  constraintChecksCount: number;
  exploredNodesCount: number;
  domainWipeoutsCount: number;
  solutionStatus: 'SUCCESS' | 'NO_SOLUTION_EXISTS' | 'TIMEOUT' | 'STEP_LIMIT_EXCEEDED';
  variablesCount: number;
  assignedCount: number;
}

export interface SolverOptions {
  useMRV: boolean;
  useDegreeHeuristic: boolean;
  useLCV: boolean;
  useForwardChecking: boolean;
  maxSteps: number;
  timeLimitMs: number;
  recordTrace: boolean;
  batchIds?: string[]; // filter to specific batches or schedule all
}


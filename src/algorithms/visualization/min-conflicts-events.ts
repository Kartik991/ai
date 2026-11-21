import type {
  MinConflictsTraceEvent,
  MinConflictsTraceEventType,
  DomainValue,
  TimetableAssignment,
  CandidateEvaluation,
} from '../../types/index.ts';

export class MinConflictsTraceRecorder {
  private events: MinConflictsTraceEvent[] = [];
  private stepCounter = 0;
  private isRecording = true;
  private maxEvents = 10000;

  constructor(isRecording = true, maxEvents = 10000) {
    this.isRecording = isRecording;
    this.maxEvents = maxEvents;
  }

  public record(params: {
    iteration: number;
    restartCount: number;
    type: MinConflictsTraceEventType;
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
  }): void {
    if (!this.isRecording) return;
    if (this.events.length >= this.maxEvents) return;

    this.stepCounter++;
    const event: MinConflictsTraceEvent = {
      id: `mc-evt-${this.stepCounter}`,
      stepNumber: this.stepCounter,
      iteration: params.iteration,
      restartCount: params.restartCount,
      type: params.type,
      timestamp: Date.now(),
      variableId: params.variableId,
      currentValue: params.currentValue ? { ...params.currentValue } : undefined,
      selectedCandidateValue: params.selectedCandidateValue ? { ...params.selectedCandidateValue } : undefined,
      conflictingVariableIds: [...params.conflictingVariableIds],
      totalConflicts: params.totalConflicts,
      bestConflicts: params.bestConflicts,
      evaluatedCandidates: params.evaluatedCandidates ? params.evaluatedCandidates.map((c) => ({ ...c, value: { ...c.value } })) : undefined,
      reason: params.reason,
      details: params.details,
      assignmentsSnapshot: params.assignmentsSnapshot.map((a) => ({ ...a })),
    };

    this.events.push(event);
  }

  public getEvents(): MinConflictsTraceEvent[] {
    return this.events;
  }

  public getStepCount(): number {
    return this.stepCounter;
  }

  public clear(): void {
    this.events = [];
    this.stepCounter = 0;
  }
}

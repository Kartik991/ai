import type { TimetableAssignment } from '../../types/index.ts';

export class RestartManager {
  private maxRestarts: number;
  private stagnationThreshold: number;
  private restartsCount = 0;
  private iterationsSinceImprovement = 0;
  private bestConflictCount = Infinity;
  private bestAssignment: TimetableAssignment[] = [];
  private stagnationEventsCount = 0;

  constructor(maxRestarts: number, stagnationThreshold: number) {
    this.maxRestarts = maxRestarts;
    this.stagnationThreshold = stagnationThreshold;
  }

  public recordState(currentConflicts: number, assignment: TimetableAssignment[]): void {
    if (currentConflicts < this.bestConflictCount) {
      this.bestConflictCount = currentConflicts;
      this.bestAssignment = assignment.map((a) => ({ ...a }));
      this.iterationsSinceImprovement = 0;
    } else {
      this.iterationsSinceImprovement++;
    }
  }

  public isStagnated(): boolean {
    return this.iterationsSinceImprovement >= this.stagnationThreshold;
  }

  public canRestart(): boolean {
    return this.restartsCount < this.maxRestarts;
  }

  public triggerRestart(): { restartCount: number; stagnationCount: number } {
    this.restartsCount++;
    this.stagnationEventsCount++;
    this.iterationsSinceImprovement = 0;
    return {
      restartCount: this.restartsCount,
      stagnationCount: this.stagnationEventsCount,
    };
  }

  public getRestartsCount(): number {
    return this.restartsCount;
  }

  public getStagnationEventsCount(): number {
    return this.stagnationEventsCount;
  }

  public getBestConflictCount(): number {
    return this.bestConflictCount;
  }

  public getBestAssignment(): TimetableAssignment[] {
    return this.bestAssignment.map((a) => ({ ...a }));
  }
}

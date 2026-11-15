import type {
  LectureSession,
  DomainValue,
  Classroom,
  TimeSlot,
  Professor,
  Batch,
  HardConstraintConfig,
} from '../../types/index.ts';

export class DomainManager {
  private initialDomains: Map<string, DomainValue[]> = new Map();
  private currentDomains: Map<string, DomainValue[]> = new Map();

  constructor(
    variables: LectureSession[],
    classrooms: Classroom[],
    timeSlots: TimeSlot[],
    professors: Professor[],
    batches: Batch[],
    config: HardConstraintConfig
  ) {
    const profMap = new Map(professors.map((p) => [p.id, p]));
    const batchMap = new Map(batches.map((b) => [b.id, b]));

    // Filter available classrooms & time slots (exclude disabled slots and breaks)
    const validSlots = timeSlots.filter(
      (slot) => !slot.disabled && (!config.noBreakSlotClash || !slot.isBreak)
    );

    for (const variable of variables) {
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

      const domain: DomainValue[] = [];

      for (const slot of validSlots) {
        // Professor availability check upfront during initial domain generation
        if (config.professorAvailability && prof) {
          const isProfAvailable = prof.availableSlots.some(
            (s) => s.day === slot.day && s.slotId === slot.id
          );
          if (!isProfAvailable) continue;
        }

        for (const room of suitableRooms) {
          // If room has specific available slots check
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

      this.initialDomains.set(variable.id, domain);
      this.currentDomains.set(variable.id, [...domain]);
    }
  }

  public getDomain(variableId: string): DomainValue[] {
    return this.currentDomains.get(variableId) || [];
  }

  public getDomainSize(variableId: string): number {
    return (this.currentDomains.get(variableId) || []).length;
  }

  public getAllDomainSizes(): Record<string, number> {
    const sizes: Record<string, number> = {};
    this.currentDomains.forEach((domain, varId) => {
      sizes[varId] = domain.length;
    });
    return sizes;
  }

  public setDomain(variableId: string, domain: DomainValue[]): void {
    this.currentDomains.set(variableId, domain);
  }

  /**
   * Prunes a specific value from a variable's current domain.
   */
  public pruneValue(variableId: string, value: DomainValue): boolean {
    const domain = this.currentDomains.get(variableId);
    if (!domain) return false;

    const filtered = domain.filter(
      (v) =>
        !(
          v.day === value.day &&
          v.slotId === value.slotId &&
          v.classroomId === value.classroomId
        )
    );

    if (filtered.length !== domain.length) {
      this.currentDomains.set(variableId, filtered);
      return true;
    }
    return false;
  }

  /**
   * Restores a set of values pruned during forward checking.
   */
  public restorePrunedValues(prunedMap: Map<string, DomainValue[]>): void {
    prunedMap.forEach((prunedValues, varId) => {
      const current = this.currentDomains.get(varId) || [];
      const restored = [...current, ...prunedValues];
      this.currentDomains.set(varId, restored);
    });
  }

  /**
   * Clones domain snapshot for state backtracking.
   */
  public snapshot(): Map<string, DomainValue[]> {
    const copy = new Map<string, DomainValue[]>();
    this.currentDomains.forEach((val, key) => {
      copy.set(key, [...val]);
    });
    return copy;
  }

  public restoreSnapshot(snapshot: Map<string, DomainValue[]>): void {
    this.currentDomains = new Map();
    snapshot.forEach((val, key) => {
      this.currentDomains.set(key, [...val]);
    });
  }
}

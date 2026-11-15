import type { LectureSession, DomainValue } from '../../types/index.ts';
import { DomainManager } from './domain-manager.ts';

export interface ForwardCheckResult {
  wipeout: boolean;
  wipeoutVariableId?: string;
  prunedMap: Map<string, DomainValue[]>;
  totalPrunedCount: number;
}

/**
 * Performs Forward Checking after assigning `value` to `variable`.
 * Removes incompatible choices from all unassigned variables.
 * Returns pruned choices map (for exact backtrack restoration) and whether a domain wipeout occurred.
 */
export function forwardCheck(
  variable: LectureSession,
  value: DomainValue,
  unassignedVars: LectureSession[],
  domainManager: DomainManager
): ForwardCheckResult {
  const prunedMap = new Map<string, DomainValue[]>();
  let totalPrunedCount = 0;
  let wipeout = false;
  let wipeoutVariableId: string | undefined = undefined;

  for (const neighbor of unassignedVars) {
    if (neighbor.id === variable.id) continue;

    const currentDomain = domainManager.getDomain(neighbor.id);
    const prunedForNeighbor: DomainValue[] = [];
    const remainingForNeighbor: DomainValue[] = [];

    const sharesProf = neighbor.professorId === variable.professorId;
    const sharesBatch = neighbor.batchId === variable.batchId;

    for (const nVal of currentDomain) {
      let conflicts = false;

      // Check if neighbor value occurs at the exact same day and time slot
      if (nVal.day === value.day && nVal.slotId === value.slotId) {
        // Same room cannot be used simultaneously
        if (nVal.classroomId === value.classroomId) {
          conflicts = true;
        }
        // Same professor cannot teach simultaneously
        else if (sharesProf) {
          conflicts = true;
        }
        // Same batch cannot attend simultaneously
        else if (sharesBatch) {
          conflicts = true;
        }
      }

      if (conflicts) {
        prunedForNeighbor.push(nVal);
      } else {
        remainingForNeighbor.push(nVal);
      }
    }

    if (prunedForNeighbor.length > 0) {
      prunedMap.set(neighbor.id, prunedForNeighbor);
      totalPrunedCount += prunedForNeighbor.length;
      domainManager.setDomain(neighbor.id, remainingForNeighbor);

      // Wipeout check: if domain becomes empty, this assignment leads to a dead end
      if (remainingForNeighbor.length === 0) {
        wipeout = true;
        wipeoutVariableId = neighbor.id;
        break; // Stop further checks on this branch; wipeout detected
      }
    }
  }

  return {
    wipeout,
    wipeoutVariableId,
    prunedMap,
    totalPrunedCount,
  };
}

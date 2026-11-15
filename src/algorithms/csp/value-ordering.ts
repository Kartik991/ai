import type { LectureSession, DomainValue } from '../../types/index.ts';
import { DomainManager } from './domain-manager.ts';

/**
 * Orders domain values using Least Constraining Value (LCV) heuristic.
 * Values that rule out the fewest choices for neighboring unassigned variables
 * are prioritized and placed first.
 */
export function orderDomainValues(
  variable: LectureSession,
  domain: DomainValue[],
  unassignedVars: LectureSession[],
  domainManager: DomainManager,
  useLCV: boolean
): DomainValue[] {
  if (!useLCV || domain.length <= 1 || unassignedVars.length <= 1) {
    return [...domain];
  }

  // Find neighbor variables that share professor, batch, or could conflict
  const neighbors = unassignedVars.filter((other) => other.id !== variable.id);

  // For each candidate value, count how many domain values in neighbors would be ruled out
  const scoredValues = domain.map((val) => {
    let eliminatedCount = 0;

    for (const neighbor of neighbors) {
      const neighborDomain = domainManager.getDomain(neighbor.id);
      const sharesProf = neighbor.professorId === variable.professorId;
      const sharesBatch = neighbor.batchId === variable.batchId;

      for (const nVal of neighborDomain) {
        if (nVal.day === val.day && nVal.slotId === val.slotId) {
          // Clash in classroom
          if (nVal.classroomId === val.classroomId) {
            eliminatedCount++;
          }
          // Clash in professor
          else if (sharesProf) {
            eliminatedCount++;
          }
          // Clash in batch
          else if (sharesBatch) {
            eliminatedCount++;
          }
        }
      }
    }

    return { val, eliminatedCount };
  });

  // Ascending order: lowest eliminatedCount comes first
  scoredValues.sort((a, b) => a.eliminatedCount - b.eliminatedCount);

  return scoredValues.map((item) => item.val);
}

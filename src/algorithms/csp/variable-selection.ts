import type { LectureSession } from '../../types/index.ts';
import { DomainManager } from './domain-manager.ts';

export interface VariableSelectionOptions {
  useMRV: boolean;
  useDegreeHeuristic: boolean;
}

/**
 * Calculates how many unassigned neighbors a variable shares constraints with:
 * - Same professor (cannot teach simultaneously)
 * - Same batch (cannot attend simultaneously)
 * - Same required room type (compete for limited classrooms)
 */
export function calculateDegree(
  targetVar: LectureSession,
  unassignedVars: LectureSession[]
): number {
  let degree = 0;
  for (const other of unassignedVars) {
    if (other.id === targetVar.id) continue;

    // Two variables are neighbors in the CSP constraint graph if they cannot
    // be scheduled at the same time (shares same professor or same student batch)
    const sharesProf = other.professorId === targetVar.professorId;
    const sharesBatch = other.batchId === targetVar.batchId;

    if (sharesProf || sharesBatch) {
      degree++;
    }
  }
  return degree;
}

/**
 * Selects the next unassigned variable using MRV and Degree Heuristic tie-breaker.
 */
export function selectUnassignedVariable(
  unassignedVars: LectureSession[],
  domainManager: DomainManager,
  options: VariableSelectionOptions
): { selected: LectureSession; domainSize: number; degree: number; candidatesCount: number } {
  if (unassignedVars.length === 0) {
    throw new Error('No unassigned variables remaining');
  }

  // Baseline: if neither MRV nor Degree is enabled, pick the first variable
  if (!options.useMRV && !options.useDegreeHeuristic) {
    const selected = unassignedVars[0];
    const domainSize = domainManager.getDomainSize(selected.id);
    const degree = calculateDegree(selected, unassignedVars);
    return { selected, domainSize, degree, candidatesCount: 1 };
  }

  let candidates: Array<{
    variable: LectureSession;
    domainSize: number;
    degree: number;
  }> = [];

  // Calculate domain sizes for all unassigned variables
  for (const v of unassignedVars) {
    const domainSize = domainManager.getDomainSize(v.id);
    candidates.push({
      variable: v,
      domainSize,
      degree: 0, // calculated if needed
    });
  }

  // Apply MRV (Minimum Remaining Values)
  if (options.useMRV) {
    let minSize = Infinity;
    for (const c of candidates) {
      if (c.domainSize < minSize) {
        minSize = c.domainSize;
      }
    }
    // Filter to variables that share the minimum remaining domain size
    candidates = candidates.filter((c) => c.domainSize === minSize);
  }

  // If there's only 1 candidate left after MRV (or if MRV wasn't used but we have 1 candidate)
  if (candidates.length === 1) {
    const chosen = candidates[0];
    const degree = calculateDegree(chosen.variable, unassignedVars);
    return {
      selected: chosen.variable,
      domainSize: chosen.domainSize,
      degree,
      candidatesCount: 1,
    };
  }

  // Apply Degree Heuristic as tie-breaker (or primary if only Degree is enabled)
  if (options.useDegreeHeuristic) {
    let maxDegree = -1;
    let bestCandidate = candidates[0];

    for (const c of candidates) {
      c.degree = calculateDegree(c.variable, unassignedVars);
      if (c.degree > maxDegree) {
        maxDegree = c.degree;
        bestCandidate = c;
      }
    }

    return {
      selected: bestCandidate.variable,
      domainSize: bestCandidate.domainSize,
      degree: bestCandidate.degree,
      candidatesCount: candidates.length,
    };
  }

  // If Degree Heuristic not used as tie-breaker, pick the first tied candidate
  const chosen = candidates[0];
  return {
    selected: chosen.variable,
    domainSize: chosen.domainSize,
    degree: 0,
    candidatesCount: candidates.length,
  };
}

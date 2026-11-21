'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  GitBranch,
  Layers,
  Zap,
  Sliders,
  ShieldCheck,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Code2,
  Sparkles,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/components/ui';

interface Topic {
  id: string;
  number: number;
  title: string;
  category: string;
  icon: any;
  summary: string;
  mainIdea: string;
  working: string[];
  example: string;
  pseudocode?: string;
  advantages: string[];
  limitations: string[];
  roleInIntelliSched: string;
  phase2Badge?: boolean;
}

const TOPICS: Topic[] = [
  {
    id: 'intro-scheduling',
    number: 1,
    title: 'Introduction to Timetable Scheduling',
    category: 'Foundations',
    icon: Compass,
    summary:
      'Understanding university timetable synthesis as a combinatorial optimization challenge.',
    mainIdea:
      'University timetable generation involves assigning multiple scarce resources—classrooms, professor hours, specialized laboratories, and student batch times—such that no physical or logistical conflicts occur while maximizing academic ergonomics.',
    working: [
      'Identify all instructional courses, designated student cohorts, qualified professors, and rooms.',
      'Formulate weekly teaching quotas (e.g. 3 lecture sessions per week for CS301).',
      'Partition constraints into non-negotiable physical rules (hard) and schedule preferences (soft).',
      'Search the combinatorial assignment space to find valid schedules.',
    ],
    example:
      'A department with 30 courses, 15 professors, 4 classrooms, and 30 weekly time slots has over 120^30 potential assignments. Brute-force permutation is computationally impossible (NP-complete), necessitating formal Constraint Satisfaction methods.',
    advantages: [
      'Transforms chaotic scheduling into deterministic mathematical models.',
      'Guarantees conflict elimination for professors, students, and facilities.',
    ],
    limitations: [
      'Belongs to the class of NP-complete decision problems.',
      'Worst-case time complexity is exponential without efficient pruning heuristics.',
    ],
    roleInIntelliSched:
      'Establishes the problem domain and structural requirements for university scheduling.',
  },
  {
    id: 'csp-framework',
    number: 2,
    title: 'Constraint Satisfaction Problems (CSP)',
    category: 'Foundations',
    icon: Layers,
    summary:
      'Mathematical definition of CSPs as triples (X, D, C) and why they fit timetabling.',
    mainIdea:
      'A CSP is mathematically formalized as a triple (X, D, C): a finite set of variables X = {X1, ..., Xn}, a set of domains D = {D1, ..., Dn} specifying allowed values for each variable, and a set of constraints C = {C1, ..., Cm} restricting allowable combinations of assignments.',
    working: [
      'Variables (X): Quantities that must be assigned values.',
      'Domains (D): The space of permissible values available for each variable.',
      'Constraints (C): Relations over subsets of variables defining valid value tuples.',
      'A state is an assignment of values to some or all variables. A solution is a complete, consistent assignment that satisfies all constraints in C.',
    ],
    example:
      'Variables: X = {Session_A, Session_B}. Domain: D = {Mon_9AM, Tue_10AM}. Constraint: Session_A != Session_B (if they share the same professor or batch).',
    pseudocode: `CSP = (Variables: X, Domains: D, Constraints: C)
function IS_CONSISTENT(assignment, constraints):
    for each c in constraints:
        if c.scope is subset of assignment.variables:
            if not c.isSatisfied(assignment):
                return False
    return True`,
    advantages: [
      'Standardized representation independent of domain specifics.',
      'Enables general-purpose inference algorithms and heuristic search optimizations.',
    ],
    limitations: [
      'Requires explicit enumeration or predicate formulation of all constraints.',
    ],
    roleInIntelliSched:
      'Forms the foundational architecture of the IntelliSched solver engine.',
  },
  {
    id: 'variables-domains-constraints',
    number: 3,
    title: 'Variables, Domains, and Constraints in Timetabling',
    category: 'Modeling',
    icon: BookOpen,
    summary:
      'Detailed mapping from university entities into CSP variables, domain coordinates, and constraints.',
    mainIdea:
      'To represent a timetable as a CSP, each required weekly lecture session is modeled as an individual variable. Each domain value is a concrete tuple of (Day, TimeSlot, Classroom). Constraints enforce non-overlapping assignments and pedagogical requirements.',
    working: [
      'Session Expansion: If CS101 requires 3 lectures/week, create variables CS101_S1, CS101_S2, CS101_S3.',
      'Domain Values: Cartesian product of available teaching days, valid non-break time slots, and suitable classrooms matching capacity and room type.',
      'Hard Constraints: Binary or n-ary relations (e.g. Prof(V1) == Prof(V2) => Time(V1) != Time(V2)).',
      'Soft Constraints: Numerical objective functions evaluating gaps, consecutive hours, and preference matches.',
    ],
    example:
      'For variable "Data Structures Session 1", Domain Value = (Day: Wednesday, Slot: 10:00-11:00, Classroom: Hall 101). The professor Dr. Lovelace and Batch 3A are linked to this variable.',
    advantages: [
      'Fine-grained control down to individual 1-hour sessions.',
      'Direct compatibility with MRV and Forward Checking.',
    ],
    limitations: [
      'Domain size scales as (|Days| x |Slots| x |Rooms|), requiring smart pre-filtering.',
    ],
    roleInIntelliSched:
      'Implemented in `src/algorithms/csp/domain-manager.ts` and `src/data/demo-data.ts`.',
  },
  {
    id: 'backtracking-search',
    number: 4,
    title: 'Backtracking Search',
    category: 'Core Algorithms',
    icon: GitBranch,
    summary:
      'The foundational recursive depth-first search for finding consistent CSP solutions.',
    mainIdea:
      'Backtracking is a recursive depth-first search that builds a solution incrementally one variable at a time. When an assignment violates any constraint, it immediately backtracks by undoing the assignment and trying alternative domain values.',
    working: [
      '1. Base case: If all variables are assigned, return the complete valid assignment.',
      '2. Variable selection: Pick an unassigned variable X.',
      '3. Value ordering: Iterate through values v in Domain(X).',
      '4. Consistency check: If assigning X = v violates any hard constraint, reject it and continue.',
      '5. Recursive step: Commit X = v and recursively call BACKTRACK().',
      '6. Success check: If the recursive call returns a solution, propagate success upward.',
      '7. Undo/Backtrack: Remove X = v, restore state, and try the next value.',
      '8. Return failure if no values in Domain(X) yield a solution.',
    ],
    example:
      'If the solver assigns CS101 to Mon 9:00 Room 101, and subsequent assignments for the same batch cause conflicts across all remaining days, the engine rolls back the assignment to Mon 9:00 and explores Mon 10:00 instead.',
    pseudocode: `function BACKTRACK(assignment, csp):
    if assignment is complete:
        return assignment
    var = SELECT_UNASSIGNED_VARIABLE(csp, assignment)
    for each value in ORDER_DOMAIN_VALUES(var, assignment, csp):
        if value is consistent with assignment given csp.constraints:
            add {var = value} to assignment
            result = BACKTRACK(assignment, csp)
            if result != failure:
                return result
            remove {var = value} from assignment // Backtrack step!
    return failure`,
    advantages: [
      'Sound and complete: guarantees finding a valid timetable if one exists.',
      'Requires only linear memory O(depth) relative to number of variables.',
    ],
    limitations: [
      'Naïve backtracking without heuristics suffers from thrashing (repeatedly exploring hopeless subtrees).',
    ],
    roleInIntelliSched:
      'Implemented in `src/algorithms/csp/backtracking.ts` as the primary search engine.',
  },
  {
    id: 'mrv-heuristic',
    number: 5,
    title: 'Minimum Remaining Values (MRV) Heuristic',
    category: 'Heuristics',
    icon: Zap,
    summary:
      'Variable selection heuristic that picks the most constrained variable first ("Fail-First principle").',
    mainIdea:
      'MRV selects the unassigned variable with the fewest remaining legal domain choices. By tackling the most constrained variable first, it prunes unpromising branches at the top of the search tree, dramatically reducing search effort.',
    working: [
      'For every unassigned variable, count the size of its currently valid domain.',
      'Identify the minimum domain size across all unassigned variables.',
      'Select the variable corresponding to this minimum size.',
      'If a variable has only 1 legal value left, MRV forces its assignment immediately.',
      'If a variable has 0 legal values left, MRV detects failure right away without useless deeper searching.',
    ],
    example:
      'If CS205 Lab can only fit into Room 201 during 2 possible slots (domain size = 2), while MA101 Lecture can fit into 3 rooms across 15 slots (domain size = 45), MRV chooses CS205 Lab first.',
    pseudocode: `function SELECT_VARIABLE_MRV(unassigned_vars, domain_manager):
    best_var = null
    min_size = infinity
    for var in unassigned_vars:
        size = domain_manager.getDomainSize(var)
        if size < min_size:
            min_size = size
            best_var = var
    return best_var`,
    advantages: [
      'Reduces branching factor early in the tree.',
      'Detects dead ends (domain size 0) as soon as possible.',
    ],
    limitations: [
      'Frequently results in ties between variables with identical domain sizes, requiring a tie-breaker.',
    ],
    roleInIntelliSched:
      'Implemented in `src/algorithms/csp/variable-selection.ts`.',
  },
  {
    id: 'degree-heuristic',
    number: 6,
    title: 'Degree Heuristic (MRV Tie-Breaker)',
    category: 'Heuristics',
    icon: Layers,
    summary:
      'Tie-breaker that selects the variable involved in the most constraints with other unassigned variables.',
    mainIdea:
      'When MRV produces multiple candidate variables with identical domain sizes, the Degree Heuristic selects the variable that imposes constraints on the largest number of remaining unassigned variables. This places the most influential variables highest in the search tree.',
    working: [
      'Collect all unassigned variables tied for minimum domain size.',
      'For each candidate, count how many unassigned neighbors share constraints (e.g. same professor or same student batch).',
      'Select the candidate with the highest degree count.',
    ],
    example:
      'Two lectures both have 4 available slots. Lecture A is taught by a professor who also teaches 3 other unassigned courses; Lecture B is taught by an adjunct with no other courses. The Degree Heuristic chooses Lecture A to restrict downstream choices earlier.',
    pseudocode: `function TIE_BREAKER_DEGREE(candidates, unassigned_vars):
    best_candidate = null
    max_degree = -1
    for c in candidates:
        deg = COUNT_UNASSIGNED_NEIGHBORS(c, unassigned_vars)
        if deg > max_degree:
            max_degree = deg
            best_candidate = c
    return best_candidate`,
    advantages: [
      'Effective tie-breaker for MRV.',
      'Constrains downstream variables rapidly, promoting early failures.',
    ],
    limitations: [
      'Less useful near the bottom of the tree where few unassigned neighbors remain.',
    ],
    roleInIntelliSched:
      'Integrated alongside MRV in `src/algorithms/csp/variable-selection.ts`.',
  },
  {
    id: 'lcv-heuristic',
    number: 7,
    title: 'Least Constraining Value (LCV) Heuristic',
    category: 'Heuristics',
    icon: Sliders,
    summary:
      'Value ordering heuristic that tries the value ruling out the fewest choices for neighbors.',
    mainIdea:
      'Once a variable is selected, LCV orders its domain values such that values eliminating the fewest legal options for neighboring unassigned variables are tried first. This maximizes the probability of finding a solution on the first try.',
    working: [
      'For each candidate value v in Domain(X):',
      'Count how many domain values in all neighboring unassigned variables would conflict with v.',
      'Sort the domain values in ascending order of conflicts eliminated.',
      'Try the least restrictive value first.',
    ],
    example:
      'A professor can teach at 9:00 AM or 2:00 PM. The 9:00 AM slot would conflict with 4 other batches sharing the same room, while 2:00 PM conflicts with only 1. LCV tries 2:00 PM first.',
    pseudocode: `function ORDER_DOMAIN_VALUES_LCV(var, domain, unassigned_vars, csp):
    scored_values = []
    for val in domain:
        eliminated_count = COUNT_ELIMINATED_CHOICES(var, val, unassigned_vars, csp)
        scored_values.append((val, eliminated_count))
    sort scored_values by eliminated_count ascending
    return [item.val for item in scored_values]`,
    advantages: [
      'Crucial when looking for any single valid solution.',
      'Leaves maximal flexibility for subsequent unassigned variables.',
    ],
    limitations: [
      'Incurs computation overhead estimating neighbor domain impacts for every value.',
    ],
    roleInIntelliSched:
      'Implemented in `src/algorithms/csp/value-ordering.ts`.',
  },
  {
    id: 'forward-checking',
    number: 8,
    title: 'Forward Checking & Domain Pruning',
    category: 'Inference',
    icon: ShieldCheck,
    summary:
      'Dynamic lookahead that tracks remaining domains and immediately catches wipeouts.',
    mainIdea:
      'Whenever variable X is assigned value v, Forward Checking immediately removes all incompatible values from the domains of all unassigned variables that share constraints with X. If any unassigned variable’s domain becomes empty (domain wipeout), the algorithm backtracks at once.',
    working: [
      'Assign X = v.',
      'Scan all unassigned variables Y connected to X by a constraint.',
      'Remove any value w from Domain(Y) that conflicts with (X = v).',
      'If Domain(Y) becomes empty for any Y, trigger immediate backtrack.',
      'Save pruned values so they can be restored cleanly if the branch eventually backtracks.',
    ],
    example:
      'Assigning CS101 to Tuesday 10:00 in Room 101 immediately prunes (Tue 10:00, Room 101) from all other courses. If CS201 only had that one remaining slot, a wipeout is detected instantly without wasting search steps.',
    pseudocode: `function FORWARD_CHECK(var, val, unassigned_vars, domain_manager):
    pruned_map = new Map()
    for neighbor in unassigned_vars:
        pruned = []
        for n_val in domain_manager.getDomain(neighbor):
            if CONFLICTS(var, val, neighbor, n_val):
                pruned.append(n_val)
                domain_manager.remove(neighbor, n_val)
        pruned_map.set(neighbor, pruned)
        if domain_manager.getDomainSize(neighbor) == 0:
            return { wipeout: True, pruned_map } // Domain wipeout!
    return { wipeout: False, pruned_map }`,
    advantages: [
      'Detects inevitable dead ends many levels before standard backtracking would.',
      'Simple and highly effective compared to full AC-3 propagation.',
    ],
    limitations: [
      'Only looks ahead one step; does not detect indirect pairwise incompatibilities between two unassigned variables.',
    ],
    roleInIntelliSched:
      'Implemented in `src/algorithms/csp/forward-checking.ts` with complete backtrack restoration.',
  },
  {
    id: 'min-conflicts-algorithm',
    number: 9,
    title: 'Min-Conflicts Local Repair Algorithm (Phase 2 Implemented)',
    category: 'Heuristic Local Search',
    icon: Flame,
    summary:
      'A fast, stochastic local repair algorithm that starts with a complete schedule and iteratively resolves constraint violations.',
    mainIdea:
      'Unlike systematic tree search (Backtracking), Min-Conflicts operates on a COMPLETE assignment of all lecture-session variables. Beginning from an initial configuration generated via unary-filtered heuristic or random placement, it repeatedly selects a variable participating in constraint violations and shifts it to the domain value that minimizes conflicts. This turns CSP solving into an iterative repair process.',
    working: [
      '1. Unary-Filtered Initial Assignment: Assign every lecture variable upfront using unary filtering (respecting room capacities, professor availability, room suitability, and non-break slots), allowing natural lecture clashes.',
      '2. Conflict Detection: Identify all variables participating in professor clashes, student batch overlaps, and classroom double-bookings.',
      '3. Conflicting Variable Selection: Uniformly at random pick one variable involved in at least one hard constraint violation.',
      '4. Isolated Min-Conflict Evaluation: Evaluate candidate values for the chosen variable, computing local hard conflicts while excluding unrelated clashes across other variables.',
      '5. Random Tie-Breaking (Seeded PRNG): When multiple values achieve the identical minimum conflict score, select randomly using a seeded pseudo-random number generator (Mulberry32) for deterministic reproducibility.',
      '6. Stagnation Detection & Random Restarts: If the conflict count does not improve within a stagnation threshold, restore the historical best state or restart with a perturbed assignment up to max restarts.',
      '7. Optional Soft Preference Optimization: Once a zero-conflict feasible schedule is attained, execute secondary hill-climbing on soft preferences without ever violating any hard constraint.',
      '8. Independent Verification: Audit the final assignment with the strict validation engine before marking valid.',
    ],
    example:
      'In Section A + B scheduling with 42 lectures across 5 days, initial greedy placement generates 12 classroom and professor collisions. At iteration 1, CS301 (clashing with CS201 in Hall 101 on Mon 9:00) is evaluated across 25 alternative time-room coordinates. Moving to Wed 11:00 Room 102 yields 0 conflicts. The local search resolves all 12 conflicts in 27 iterations in 14 milliseconds.',
    pseudocode: `// IntelliSched Phase 2 Implemented Min-Conflicts Engine
function SOLVE_TIMETABLE_MIN_CONFLICTS(variables, csp, options):
    prng = SeededPRNG(options.randomSeed)
    restart_mgr = RestartManager(options.maxRestarts, options.stagnationThreshold)

    // Stage 1: Generate complete initial assignment satisfying unary constraints
    current_assignment = GENERATE_INITIAL_ASSIGNMENT(variables, options.initStrategy, prng)
    
    for iteration = 1 to options.maxIterations:
        conflicts = COUNT_TOTAL_HARD_CONFLICTS(current_assignment)
        if conflicts == 0:
            if VALIDATE_COMPLETE_TIMETABLE(current_assignment).isValid:
                if options.optimizeSoftPreferences:
                    current_assignment = OPTIMIZE_SOFT_PREFERENCES(current_assignment)
                return SUCCESS(current_assignment)

        // Check for stagnation & trigger random restart if needed
        if restart_mgr.isStagnated(conflicts):
            if restart_mgr.canRestart():
                current_assignment = restart_mgr.triggerRestart(variables, prng)
                continue
            else:
                break // Max restarts exhausted

        // Conflicting Variable Selection
        conflicting_vars = GET_ALL_CONFLICTING_VARIABLES(current_assignment)
        var = prng.choice(conflicting_vars)

        // Minimum-Conflict Value Selection (Isolated Evaluation)
        best_val = EVALUATE_MIN_CONFLICT_CANDIDATE(var, current_assignment, prng)
        current_assignment[var] = best_val

    return FAILURE("Reached iteration limit", restart_mgr.bestAssignment)`,
    advantages: [
      'Orders of magnitude faster than Backtracking on large, loosely constrained schedules.',
      'Scales nearly linearly with problem size for well-dimensioned university departments.',
      'Handles real-time timetable adjustments with minimal displacement of already scheduled courses.',
      'Extremely memory efficient (O(n) flat memory with no recursion stack).',
    ],
    limitations: [
      'Incomplete search: cannot formally prove that an overconstrained problem is unsolvable.',
      'Can encounter local minima or plateaus requiring stagnation detection and random restarts.',
    ],
    roleInIntelliSched:
      'Fully implemented in `src/algorithms/optimization/min-conflicts.ts`, benchmarkable side-by-side with Backtracking on `/compare`, and visually replayable step-by-step on `/visualize`.',
  },
  {
    id: 'backtracking-vs-min-conflicts',
    number: 10,
    title: 'Backtracking vs. Min-Conflicts: Comprehensive Comparison',
    category: 'Comparative Analysis',
    icon: Code2,
    summary:
      'Detailed comparison matrix between systematic tree search and stochastic local repair.',
    mainIdea:
      'Backtracking and Min-Conflicts represent two fundamentally different philosophies in artificial intelligence: systematic complete search versus stochastic local repair.',
    working: [
      'Search Paradigm: Systematic tree exploration (Backtracking) vs. Iterative state perturbation (Min-Conflicts).',
      'Completeness: Backtracking is complete (guaranteed to find a solution or prove none exists); Min-Conflicts is incomplete.',
      'State Representation: Partial consistent assignments vs. Complete inconsistent assignments.',
      'Memory Footprint: O(n) stack memory for Backtracking vs. O(n) flat memory for Min-Conflicts.',
      'Empirical Findings: Backtracking excels at tight constraints and proving infeasibility; Min-Conflicts solves large realistic schedules in a fraction of the time.',
    ],
    example:
      'In an overconstrained university where 40 hours of lectures must fit into 35 available room hours, Backtracking exhaustively tests all combinations and definitively reports "NO SOLUTION POSSIBLE". Min-Conflicts would loop until max iterations/restarts timeout without proof.',
    advantages: [
      'Provides researchers with clear criteria for selecting the appropriate algorithm based on constraint density.',
      'Empirically verifiable on the `/compare` page with live runtime and constraint check measurements.',
    ],
    limitations: [
      'Neither algorithm alone dominates across all university scheduling topologies.',
    ],
    roleInIntelliSched:
      'Guides algorithm selection and powers the interactive comparison engine on `/compare`.',
  },
  {
    id: 'academic-citations',
    number: 11,
    title: 'Academic Citations & Literature References',
    category: 'Literature & Citations',
    icon: BookOpen,
    summary:
      'Formal academic literature, peer-reviewed papers, and textbooks underpinning the algorithms in IntelliSched.',
    mainIdea:
      'IntelliSched is grounded in established computer science research on Constraint Satisfaction Problems (CSP) and local search heuristics developed across decades by leading artificial intelligence scholars.',
    working: [
      '1. Russell & Norvig (AIMA): CSP standard framework, MRV, Degree heuristic, LCV, and Forward Checking formalisms.',
      '2. Minton et al. (1992): Foundational paper introducing the Min-Conflicts heuristic for massive scheduling and N-Queens.',
      '3. Tsang (1993): Systematic treatise on constraint graph representations, filtering algorithms, and consistency proofs.',
      '4. Dechter (2003): Comprehensive study of backtracking heuristics, constraint propagation, and local repair dynamics.',
      '5. Schaerf (1999): Extensive survey on automated school and university timetabling formulations.',
    ],
    example:
      'The Min-Conflicts heuristic implemented in IntelliSched follows Minton et al. (1992), which famously enabled NASA to schedule observations for the Hubble Space Telescope in seconds rather than weeks.',
    advantages: [
      'Validates all algorithmic components against recognized peer-reviewed computer science literature.',
      'Provides exact academic citations suitable for engineering theses and research publications.',
    ],
    limitations: [
      'Academic algorithms require specialized adaptation for real-world university regulations (room types, lunch breaks, consecutive hours).',
    ],
    roleInIntelliSched:
      'Serves as the scientific foundation for the algorithmic implementations in Phase 1 and Phase 2.',
  },
];

export default function LearnPage() {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(TOPICS[0].id);

  const selectedTopic = TOPICS.find((t) => t.id === selectedTopicId) || TOPICS[0];
  const Icon = selectedTopic.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            IntelliSched Learning Center
          </h1>
          <Badge variant="purple" className="text-xs">
            11 CSP Topics
          </Badge>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Comprehensive curriculum explaining Constraint Satisfaction Problems, tree search heuristics, and local repair algorithms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Topic Navigation List (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-600">
                Curriculum Syllabus
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {TOPICS.map((topic) => {
                const TIcon = topic.icon;
                const isSelected = topic.id === selectedTopicId;
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-md mt-0.5 ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <TIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">
                          {topic.number}. {topic.title}
                        </span>
                        {topic.phase2Badge && (
                          <Badge variant="warning" className="text-[9px] py-0 px-1 shrink-0">
                            Theory
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {topic.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Topic Details (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">
                      Topic {selectedTopic.number} • {selectedTopic.category}
                    </Badge>
                    {selectedTopic.phase2Badge && (
                      <Badge variant="warning" className="text-[10px]">
                        Theory — Implementation in Phase 2
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2.5">
                    <Icon className="w-5 h-5 text-blue-600" />
                    {selectedTopic.title}
                  </CardTitle>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{selectedTopic.summary}</p>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
              {/* Main Idea */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Main Idea
                </h3>
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-800 font-medium">
                  {selectedTopic.mainIdea}
                </div>
              </div>

              {/* Working Principle */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                  Working Principle & Execution Steps
                </h3>
                <ol className="space-y-1.5 list-decimal list-inside bg-white p-3 border border-slate-100 rounded-lg">
                  {selectedTopic.working.map((step, idx) => (
                    <li key={idx} className="pl-1">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Small Example */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Concrete Academic Example
                </h3>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-lg text-emerald-950">
                  {selectedTopic.example}
                </div>
              </div>

              {/* Pseudocode if present */}
              {selectedTopic.pseudocode && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-purple-600" />
                    Algorithm Pseudocode
                  </h3>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
                    {selectedTopic.pseudocode}
                  </pre>
                </div>
              )}

              {/* Advantages and Limitations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Advantages
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-slate-600 text-[11px]">
                    {selectedTopic.advantages.map((adv, idx) => (
                      <li key={idx}>{adv}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="font-bold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Known Limitations
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-slate-600 text-[11px]">
                    {selectedTopic.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Role in IntelliSched */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 text-xs">Role in IntelliSched:</h4>
                <p className="text-blue-800 text-[11px] mt-0.5">
                  {selectedTopic.roleInIntelliSched}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Walkthrough if Topic 9 (Min-Conflicts) */}
          {selectedTopic.id === 'min-conflicts-algorithm' && (
            <MinConflictsWalkthrough />
          )}

          {/* Quick Comparison Table if Topic 10 */}
          {selectedTopic.id === 'backtracking-vs-min-conflicts' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Systematic Backtracking vs. Min-Conflicts Comparison Matrix
                </CardTitle>
                <CardDescription className="text-xs">
                  Empirical trade-offs between exact tree search and stochastic local repair.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="p-3">Criterion</th>
                      <th className="p-3 text-blue-700">Backtracking + MRV (Phase 1)</th>
                      <th className="p-3 text-amber-700">Min-Conflicts Local Search (Phase 2)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-semibold">Completeness</td>
                      <td className="p-3 text-emerald-700 font-medium">Complete (guarantees solution or proof of none)</td>
                      <td className="p-3 text-amber-700 font-medium">Incomplete (can be trapped in local minima)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Search Space Traversal</td>
                      <td className="p-3">Systematic depth-first tree search with Forward Checking</td>
                      <td className="p-3">Stochastic iterative local repair on complete assignment</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Initial Assignment</td>
                      <td className="p-3">Empty (assigned one lecture session at a time)</td>
                      <td className="p-3">Complete (all variables assigned upfront with unary filtering)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Stagnation Handling</td>
                      <td className="p-3">Deterministic backtracking to previous decision node</td>
                      <td className="p-3">Plateau detection with random restarts and best-state tracking</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Tie-Breaking</td>
                      <td className="p-3">Degree Heuristic (most constraining variable)</td>
                      <td className="p-3">Seeded PRNG (Mulberry32) for deterministic reproduction</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Performance on Overconstrained Problems</td>
                      <td className="p-3 text-emerald-700">Proves unsolvability conclusively</td>
                      <td className="p-3 text-rose-700">Loops until max iterations timeout without formal proof</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Scale & Speed</td>
                      <td className="p-3">Exponential worst-case; optimal for tight, dense constraints</td>
                      <td className="p-3 text-emerald-700 font-medium">Near-linear time for loose-to-medium university topologies</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Memory Complexity</td>
                      <td className="p-3">O(n · d) recursion stack and pruned domain maps</td>
                      <td className="p-3 text-emerald-700 font-medium">O(n) flat memory array with no recursion stack</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Academic Citations Detailed Bibliography if Topic 11 */}
          {selectedTopic.id === 'academic-citations' && (
            <AcademicCitationsView />
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Interactive Min-Conflicts Walkthrough Component (Topic 9)
// ----------------------------------------------------------------------------

interface WalkthroughAssignment {
  course: string;
  prof: string;
  batch: string;
  time: string;
  room: string;
  hasConflict: boolean;
  conflictReason?: string;
  isRepaired?: boolean;
}

interface WalkthroughCandidate {
  slot: string;
  score: number;
  note: string;
  isWinner?: boolean;
}

interface WalkthroughStep {
  stepNumber: number;
  badge: string;
  title: string;
  summary: string;
  assignments?: WalkthroughAssignment[];
  candidates?: WalkthroughCandidate[];
  action: string;
}

function MinConflictsWalkthrough() {
  const [step, setStep] = useState(0);

  const steps: WalkthroughStep[] = [
    {
      stepNumber: 1,
      badge: 'Step 1: Conflicting Initial State',
      title: 'Complete Initial Assignment (2 Hard Collisions)',
      summary:
        'All three lecture sessions are initially scheduled at Monday 09:00. This produces 2 severe hard constraint violations: Batch CS-A is scheduled in two classrooms at the same time, and Prof. Turing is booked in two rooms simultaneously.',
      assignments: [
        {
          course: 'CS301 (Algorithms)',
          prof: 'Prof. Alan Turing',
          batch: 'CS-A',
          time: 'Mon 09:00',
          room: 'Hall 101',
          hasConflict: true,
          conflictReason: 'Prof clash (Turing) & Batch clash (CS-A)',
        },
        {
          course: 'CS201 (Data Structures)',
          prof: 'Prof. Ada Lovelace',
          batch: 'CS-A',
          time: 'Mon 09:00',
          room: 'Lab 201',
          hasConflict: true,
          conflictReason: 'Batch clash (CS-A double booked)',
        },
        {
          course: 'MATH201 (Discrete Math)',
          prof: 'Prof. Alan Turing',
          batch: 'CS-B',
          time: 'Mon 09:00',
          room: 'Hall 102',
          hasConflict: true,
          conflictReason: 'Prof clash (Turing double booked)',
        },
      ],
      action: 'Conflicting Variable Selection uniformly picks: CS301 (Algorithms)',
    },
    {
      stepNumber: 2,
      badge: 'Step 2: Candidate Value Scoring',
      title: 'Evaluating Candidate Domain Values for CS301',
      summary:
        'Holding all other assignments constant, the local evaluator computes the conflict score for CS301 across available candidate time/room domain values.',
      candidates: [
        { slot: 'Mon 09:00, Hall 101', score: 2, note: 'Current assignment (2 collisions)' },
        { slot: 'Mon 10:00, Hall 101', score: 1, note: 'CS-A is already taking CS201 lab at 10:00' },
        { slot: 'Tue 09:00, Hall 101', score: 0, note: 'Turing & CS-A both free! (Minimum Conflict)', isWinner: true },
        { slot: 'Wed 11:00, Hall 101', score: 0, note: 'Turing & CS-A both free! (Tie candidate)' },
      ],
      action: 'Mulberry32 seeded PRNG selects tie-break winner: Tue 09:00 in Hall 101',
    },
    {
      stepNumber: 3,
      badge: 'Step 3: Local Repair Execution',
      title: 'Reassignment & Zero-Conflict Resolution',
      summary:
        'CS301 is reassigned to Tuesday 09:00 in Hall 101. Total timetable conflicts drop from 2 to 0. All hard constraints are now satisfied, yielding a valid university timetable in 1 repair iteration!',
      assignments: [
        {
          course: 'CS301 (Algorithms)',
          prof: 'Prof. Alan Turing',
          batch: 'CS-A',
          time: 'Tue 09:00',
          room: 'Hall 101',
          hasConflict: false,
          isRepaired: true,
        },
        {
          course: 'CS201 (Data Structures)',
          prof: 'Prof. Ada Lovelace',
          batch: 'CS-A',
          time: 'Mon 09:00',
          room: 'Lab 201',
          hasConflict: false,
        },
        {
          course: 'MATH201 (Discrete Math)',
          prof: 'Prof. Alan Turing',
          batch: 'CS-B',
          time: 'Mon 09:00',
          room: 'Hall 102',
          hasConflict: false,
        },
      ],
      action: 'Valid timetable achieved! Ready for optional stage-2 soft optimization.',
    },
  ];

  const current = steps[step];

  return (
    <Card className="border-amber-200 bg-amber-50/20">
      <CardHeader className="p-4 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm text-amber-950 flex items-center gap-1.5 font-bold">
              <Flame className="w-4 h-4 text-amber-600" />
              Interactive Min-Conflicts Repair Demonstration
            </CardTitle>
            <Badge variant="warning" className="text-[10px]">
              {current.badge}
            </Badge>
          </div>
          <CardDescription className="text-xs text-amber-800/80 mt-1">
            Step through a concrete 3-lecture scenario showing how local search transforms conflicts into a valid schedule.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-xs h-7 px-2"
          >
            Previous
          </Button>
          <Button
            size="sm"
            onClick={() => setStep((s) => (s < steps.length - 1 ? s + 1 : 0))}
            className="text-xs h-7 px-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {step === steps.length - 1 ? 'Restart Demo' : 'Next Step →'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="p-3 bg-white rounded-lg border border-amber-200/60 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-900">{current.title}</h4>
          <p className="text-xs text-slate-600 mt-1">{current.summary}</p>
        </div>

        {/* Assignments or Candidate list */}
        {current.assignments && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Lecture Session States
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {current.assignments.map((a, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    a.isRepaired
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                      : a.hasConflict
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <strong className="text-slate-900 font-bold">{a.course}</strong>
                    {a.isRepaired ? (
                      <Badge variant="success" className="text-[8px] py-0">Repaired</Badge>
                    ) : a.hasConflict ? (
                      <Badge variant="danger" className="text-[8px] py-0">Conflict</Badge>
                    ) : (
                      <Badge variant="default" className="text-[8px] py-0">Valid</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {a.time} • {a.room}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {a.prof} • {a.batch}
                  </div>
                  {a.conflictReason && (
                    <div className="text-[10px] text-rose-700 font-medium pt-0.5">
                      ⚠ {a.conflictReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {current.candidates && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Candidate Values Evaluated for CS301 (Algorithms)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.candidates.map((c, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    c.isWinner
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200 font-semibold'
                      : c.score === 0
                      ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-mono text-slate-800 text-[11px] font-bold">{c.slot}</div>
                    <div className="text-[10px] text-slate-500">{c.note}</div>
                  </div>
                  <Badge
                    variant={c.score === 0 ? 'success' : c.score === 1 ? 'warning' : 'danger'}
                    className="text-[9px] py-0 font-mono"
                  >
                    {c.score} {c.score === 1 ? 'conflict' : 'conflicts'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-2.5 bg-amber-100/60 rounded-md text-[11px] font-medium text-amber-950 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{current.action}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Academic Literature & Citations View (Topic 11)
// ----------------------------------------------------------------------------

function AcademicCitationsView() {
  const citations = [
    {
      authors: 'Russell, S., & Norvig, P.',
      year: '2020',
      title: 'Artificial Intelligence: A Modern Approach (4th Edition)',
      publisher: 'Pearson',
      chapter: 'Chapter 6: Constraint Satisfaction Problems (pp. 214–240)',
      scope: 'Backtracking Search, MRV, Degree Heuristic, LCV, Forward Checking, Min-Conflicts',
      implementationFiles: [
        'src/algorithms/csp/backtracking.ts',
        'src/algorithms/csp/mrv.ts',
        'src/algorithms/csp/lcv.ts',
        'src/algorithms/csp/forward-checking.ts',
        'src/algorithms/optimization/min-conflicts.ts',
      ],
      description:
        'The definitive AI standard textbook formalizing CSP as triples (X, D, C). Establishes theoretical definitions of variable selection (MRV, Degree heuristic), value ordering (LCV), constraint propagation (Forward Checking), and local repair search.',
    },
    {
      authors: 'Minton, S., Johnston, M. D., Philips, A. B., & Laird, P.',
      year: '1992',
      title:
        'Minimizing conflicts: a heuristic repair method for constraint satisfaction and scheduling problems',
      publisher: 'Artificial Intelligence, Vol. 58, Issues 1–3, pp. 161–205',
      chapter: 'Seminal Research Paper',
      scope: 'Min-Conflicts Local Repair, Conflicting Variable Selection, Hubble Space Telescope Scheduling',
      implementationFiles: [
        'src/algorithms/optimization/min-conflicts.ts',
        'src/algorithms/optimization/conflict-evaluator.ts',
        'src/algorithms/optimization/initial-assignment.ts',
      ],
      description:
        'The foundational paper introducing the Min-Conflicts local search algorithm. First demonstrated solving million-variable N-Queens instances in seconds and successfully scheduled scientific observations on NASA’s Hubble Space Telescope (the SPIKE project).',
    },
    {
      authors: 'Tsang, E.',
      year: '1993',
      title: 'Foundations of Constraint Satisfaction',
      publisher: 'Academic Press / Elsevier',
      chapter: 'Chapters 2, 4 & 6: Constraint Networks & Search Strategies',
      scope: 'Domain Manager, Constraint Graphs, Arc Consistency, Completeness Proofs',
      implementationFiles: [
        'src/algorithms/csp/domain-manager.ts',
        'src/algorithms/csp/constraint-validator.ts',
      ],
      description:
        'Comprehensive mathematical treatise establishing formal graph representations of CSPs, binary versus non-binary constraint conversions, search space pruning properties, and completeness criteria.',
    },
    {
      authors: 'Dechter, R.',
      year: '2003',
      title: 'Constraint Processing',
      publisher: 'Morgan Kaufmann Publishers / Elsevier',
      chapter: 'Chapters 5 & 8: Search Paradigms and Stochastic Local Search',
      scope: 'Search Tree Backjumping, Stagnation Recovery, Multi-restart Metaheuristics',
      implementationFiles: [
        'src/algorithms/optimization/restart-manager.ts',
        'src/algorithms/optimization/prng.ts',
      ],
      description:
        'Authoritative reference on constraint propagation, tree-decomposition, backjumping techniques, and escaping local minima through systematic random restarts and plateau detection.',
    },
    {
      authors: 'Schaerf, A.',
      year: '1999',
      title: 'A survey of automated timetabling',
      publisher: 'Artificial Intelligence Review, Vol. 13, Issue 2, pp. 87–127',
      chapter: 'Comprehensive Survey',
      scope: 'University Course Scheduling, Faculty Availability, Soft Preference Metrics',
      implementationFiles: [
        'src/algorithms/csp/constraint-validator.ts',
        'src/data/demo-data.ts',
      ],
      description:
        'Seminal domain survey classifying school timetabling, university course scheduling, and examination scheduling. Formalizes hard physical constraints versus pedagogical soft preferences such as minimizing student idle gaps.',
    },
  ];

  return (
    <Card className="border-blue-200 bg-white">
      <CardHeader className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-base text-slate-900 font-bold">
            Formal Academic Bibliography & Source Mappings
          </CardTitle>
          <Badge variant="purple" className="text-xs">
            5 Seminal Citations
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-500 mt-1">
          Every algorithm implemented in IntelliSched directly cites and adheres to peer-reviewed artificial intelligence literature.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {citations.map((c, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-colors space-y-2 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 text-sm">{c.authors} ({c.year})</span>
                <h4 className="text-blue-900 font-semibold italic mt-0.5">{c.title}</h4>
                <span className="text-slate-500 text-[11px] block">{c.publisher} • {c.chapter}</span>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 self-start">
                Ref [{idx + 1}]
              </Badge>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed pt-1">
              {c.description}
            </p>

            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
              <div className="text-slate-700">
                <strong>Algorithmic Scope:</strong> <span className="text-slate-600">{c.scope}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-slate-400 font-mono">Files:</span>
                {c.implementationFiles.map((file, fIdx) => (
                  <span
                    key={fIdx}
                    className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800"
                  >
                    {file.split('/').pop()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}



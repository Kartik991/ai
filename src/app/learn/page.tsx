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
    id: 'min-conflicts-theory',
    number: 9,
    title: 'Min-Conflicts Local Search (Theory — Phase 2)',
    category: 'Heuristic Local Search',
    icon: Flame,
    phase2Badge: true,
    summary:
      'Theoretical exploration of Min-Conflicts: a local search heuristic algorithm designed for massive CSPs.',
    mainIdea:
      'Min-Conflicts is a local search heuristic for CSPs. Unlike Backtracking, which begins with an empty assignment and builds consistently, Min-Conflicts begins with a COMPLETE (but initially conflicting) assignment and iteratively repairs conflicts by reassigning conflicting variables to values that minimize constraint violations.',
    working: [
      '1. Initial State: Assign a value to every variable (e.g. randomly or via greedy min-conflicts heuristic).',
      '2. Conflicting Variable Selection: Randomly choose a variable that is currently involved in at least one constraint violation.',
      '3. Min-Conflict Value Selection: Evaluate all domain values for this variable, counting total conflicts for each. Reassign the variable to the value that minimizes total constraint violations.',
      '4. Iteration: Repeat until all constraints are satisfied (0 conflicts) or a maximum iteration threshold is reached.',
      '5. Plateaus & Escapes: If trapped in a local minimum, apply random restarts or random walk perturbations.',
    ],
    example:
      'Suppose all 30 lecture sessions are randomly scheduled on Monday. 25 conflicts exist. The algorithm randomly picks conflicting session CS101. It evaluates moving CS101 to Tue 9:00 (1 conflict), Wed 11:00 (0 conflicts), or Thu 14:00 (2 conflicts). It moves CS101 to Wed 11:00, reducing total system conflicts.',
    pseudocode: `// THEORY ONLY — Phase 2 Architectural Blueprint
function MIN_CONFLICTS(csp, max_steps):
    current_assignment = GENERATE_INITIAL_COMPLETE_ASSIGNMENT(csp)
    for step = 1 to max_steps:
        if IS_SOLUTION(current_assignment, csp):
            return current_assignment
        conflicted_vars = GET_CONFLICTED_VARIABLES(current_assignment, csp)
        var = RANDOM_CHOICE(conflicted_vars)
        best_value = VALUE_MINIMIZING_CONFLICTS(var, current_assignment, csp)
        current_assignment[var] = best_value
    return failure // Reached max steps without resolving all conflicts`,
    advantages: [
      'Often solves massive CSPs in nearly linear time (e.g. Million-Queens problem).',
      'Extremely fast for loosely constrained or dense problems.',
      'Naturally accommodates dynamic real-time schedule perturbations (e.g. room maintenance).',
    ],
    limitations: [
      'Incomplete: can get trapped in local minima or cycles and fail even when a solution exists.',
      'Struggles with tightly constrained problems where valid states are extremely sparse.',
    ],
    roleInIntelliSched:
      'Documented for educational theory in Phase 1. Scheduled for full implementation and comparative benchmark in Phase 2.',
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
    ],
    example:
      'In an overconstrained university where 40 hours of lectures must fit into 35 available room hours, Backtracking exhaustively tests all combinations and definitively reports "NO SOLUTION POSSIBLE". Min-Conflicts would loop endlessly trying to resolve the unsolvable conflict.',
    advantages: [
      'Provides researchers with clear criteria for selecting the appropriate algorithm based on constraint density.',
    ],
    limitations: [
      'Neither algorithm alone dominates across all university scheduling topologies.',
    ],
    roleInIntelliSched:
      'Guides the architectural transition from Phase 1 (exact Backtracking) to Phase 2 (hybrid metaheuristics).',
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
            10 CSP Topics
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

          {/* Quick Comparison Table if Topic 10 */}
          {selectedTopic.id === 'backtracking-vs-min-conflicts' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Systematic Backtracking vs. Min-Conflicts Comparison Matrix
                </CardTitle>
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
                      <td className="p-3">Systematic depth-first tree search</td>
                      <td className="p-3">Stochastic iterative repair on complete assignment</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Initial Assignment</td>
                      <td className="p-3">Empty (assigned one variable at a time)</td>
                      <td className="p-3">Complete (all variables assigned, initially conflicting)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Performance on Overconstrained Problems</td>
                      <td className="p-3 text-emerald-700">Proves unsolvability conclusively</td>
                      <td className="p-3 text-rose-700">Loops until max iterations timeout without proof</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Scale & Speed</td>
                      <td className="p-3">Exponential worst-case; optimal for structured schedules</td>
                      <td className="p-3">Near-linear for loosely constrained vast problem spaces</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


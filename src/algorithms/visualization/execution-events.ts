import type {
  TraceEvent,
  TraceEventType,
  DomainValue,
  TimetableAssignment,
  SearchTreeNode,
} from '../../types/index.ts';

export class TraceRecorder {
  private events: TraceEvent[] = [];
  private nodes: Map<string, SearchTreeNode> = new Map();
  private stepCounter = 0;
  private isRecording = true;
  private maxEvents = 15000; // Safeguard against memory explosion for massive searches

  constructor(isRecording = true, maxEvents = 15000) {
    this.isRecording = isRecording;
    this.maxEvents = maxEvents;
  }

  public record(params: {
    type: TraceEventType;
    variableId?: string;
    value?: DomainValue;
    reason?: string;
    details?: Record<string, unknown>;
    assignmentsSnapshot: TimetableAssignment[];
    domainSizesSnapshot: Record<string, number>;
    treeNodeId: string;
    parentTreeNodeId?: string;
  }): void {
    if (!this.isRecording) return;
    if (this.events.length >= this.maxEvents) return;

    this.stepCounter++;
    const event: TraceEvent = {
      id: `evt-${this.stepCounter}`,
      stepNumber: this.stepCounter,
      type: params.type,
      timestamp: Date.now(),
      variableId: params.variableId,
      value: params.value,
      reason: params.reason,
      details: params.details,
      assignmentsSnapshot: params.assignmentsSnapshot.map((a) => ({ ...a })),
      domainSizesSnapshot: { ...params.domainSizesSnapshot },
      treeNodeId: params.treeNodeId,
      parentTreeNodeId: params.parentTreeNodeId,
    };

    this.events.push(event);
  }

  public addTreeNode(node: SearchTreeNode): void {
    if (!this.isRecording) return;
    this.nodes.set(node.id, { ...node });
    if (node.parentId && this.nodes.has(node.parentId)) {
      const parent = this.nodes.get(node.parentId)!;
      if (!parent.childrenIds.includes(node.id)) {
        parent.childrenIds.push(node.id);
      }
    }
  }

  public updateTreeNode(id: string, updates: Partial<SearchTreeNode>): void {
    if (!this.isRecording) return;
    const existing = this.nodes.get(id);
    if (existing) {
      this.nodes.set(id, { ...existing, ...updates });
    }
  }

  public getEvents(): TraceEvent[] {
    return this.events;
  }

  public getTreeNodes(): SearchTreeNode[] {
    return Array.from(this.nodes.values());
  }

  public getStepCount(): number {
    return this.stepCounter;
  }

  public clear(): void {
    this.events = [];
    this.nodes.clear();
    this.stepCounter = 0;
  }
}

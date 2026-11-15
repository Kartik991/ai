'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { SearchTreeNode } from '@/types';
import { CheckCircle2, XCircle, RotateCcw, Clock, Sparkles } from 'lucide-react';

export function CspTreeNodeComponent({ data }: { data: { node: SearchTreeNode; isCurrent?: boolean } }) {
  const { node, isCurrent } = data;

  const isRoot = node.variableId === 'root';

  const statusColors = {
    exploring: 'border-blue-400 bg-blue-50/70 text-blue-900',
    success: 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs',
    failed: 'border-rose-400 bg-rose-50 text-rose-950',
    backtracked: 'border-amber-400 bg-amber-50 text-amber-950',
    pruned: 'border-slate-300 bg-slate-100 text-slate-600',
  };

  const statusIcons = {
    exploring: <Clock className="w-3 h-3 text-blue-600 animate-pulse" />,
    success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    failed: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    backtracked: <RotateCcw className="w-3 h-3 text-amber-600" />,
    pruned: <XCircle className="w-3 h-3 text-slate-400" />,
  };

  return (
    <div
      className={`px-3 py-2 rounded-lg border text-left min-w-[130px] max-w-[200px] transition-all ${
        statusColors[node.status]
      } ${
        isCurrent
          ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 shadow-md'
          : 'hover:border-slate-400'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-slate-400" />

      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
          {isRoot ? 'START' : `D${node.depth}`}
        </span>
        <div className="flex items-center gap-1">
          {statusIcons[node.status]}
          <span className="text-[9px] font-medium capitalize">{node.status}</span>
        </div>
      </div>

      <div className="text-xs font-semibold truncate" title={node.variableLabel}>
        {node.variableLabel}
      </div>

      {node.failureReason && (
        <div className="text-[9px] text-rose-700 mt-1 line-clamp-2 leading-tight bg-rose-100/60 p-1 rounded">
          {node.failureReason}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-slate-400" />
    </div>
  );
}


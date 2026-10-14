import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

const CustomTopicNode = ({ data, selected }) => {
  const { name, mastery = 0.5, status = 'AMBER', diagnostic_role, isRootCause, isSymptom } = data;
  const pct = Math.round(mastery * 100);

  // Determine appearance
  let borderColor = '#292E56';
  let badgeBg = 'rgba(245, 165, 36, 0.2)';
  let badgeColor = '#F5A524';
  let statusText = 'LEARNING';
  let Icon = AlertTriangle;

  if (isRootCause || diagnostic_role === 'ROOT CAUSE' || status === 'RED') {
    borderColor = '#D93636';
    badgeBg = 'rgba(217, 54, 54, 0.25)';
    badgeColor = '#D93636';
    statusText = 'ROOT CAUSE';
    Icon = AlertOctagon;
  } else if (isSymptom || diagnostic_role === 'SYMPTOM') {
    borderColor = '#F5A524';
    badgeBg = 'rgba(245, 165, 36, 0.25)';
    badgeColor = '#F5A524';
    statusText = 'SYMPTOM';
    Icon = AlertTriangle;
  } else if (status === 'GREEN') {
    borderColor = '#1FB57A';
    badgeBg = 'rgba(31, 181, 122, 0.25)';
    badgeColor = '#1FB57A';
    statusText = 'OK';
    Icon = CheckCircle2;
  }

  const isHighlighted = isRootCause || isSymptom || selected;

  return (
    <div
      className={`px-4 py-3 rounded-xl bg-[#171B36] border-2 shadow-lg transition-all duration-300 min-w-[190px] ${
        isRootCause ? 'ring-4 ring-rootcause-red/40 animate-pulse' : ''
      }`}
      style={{
        borderColor: borderColor,
        boxShadow: isHighlighted ? `0 0 20px ${badgeColor}33` : '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#6C4CF1] !w-3 !h-3" />

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold tracking-wider text-light-subtle uppercase truncate max-w-[120px]">
          {statusText}
        </span>
        <Icon size={14} style={{ color: badgeColor }} />
      </div>

      <div className="text-sm font-bold text-white mb-2 leading-snug">
        {name}
      </div>

      {/* Mastery Progress Bar */}
      <div className="w-full bg-[#0F1226] rounded-full h-2 mb-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: badgeColor
          }}
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-light-subtle">
        <span>Mastery</span>
        <span className="font-semibold text-white">{pct}%</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#6C4CF1] !w-3 !h-3" />
    </div>
  );
};

export default memo(CustomTopicNode);

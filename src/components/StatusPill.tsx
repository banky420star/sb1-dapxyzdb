import React from 'react';
import { motion } from 'framer-motion';

interface StatusPillProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label: string;
  latency?: number;
  className?: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ 
  status, 
  label, 
  latency, 
  className = '' 
}) => {
  const statusConfig = {
    online: {
      color: 'bg-accent',
      dotColor: 'bg-accent',
      textColor: 'text-accent'
    },
    offline: {
      color: 'bg-gray-600',
      dotColor: 'bg-gray-400',
      textColor: 'text-gray-400'
    },
    warning: {
      color: 'bg-yellow-600',
      dotColor: 'bg-yellow-400',
      textColor: 'text-yellow-400'
    },
    error: {
      color: 'bg-critical',
      dotColor: 'bg-critical',
      textColor: 'text-critical'
    }
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface border border-gray-700 ${className}`}
    >
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`}></div>
        <span className={`text-sm font-medium ${config.textColor}`}>
          {label}
        </span>
      </div>
      {latency && (
        <span className="text-xs text-gray-500">
          {latency}ms
        </span>
      )}
    </motion.div>
  );
};

export default StatusPill; 
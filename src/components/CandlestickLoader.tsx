import React from 'react';
import { motion } from 'framer-motion';

interface CandlestickLoaderProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CandlestickLoader: React.FC<CandlestickLoaderProps> = ({ 
  progress, 
  size = 'md',
  className = '' 
}) => {
  const sizeConfig = {
    sm: { width: 16, height: 24, wickHeight: 4 },
    md: { width: 20, height: 32, wickHeight: 6 },
    lg: { width: 24, height: 40, wickHeight: 8 }
  };

  const config = sizeConfig[size];
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  // Color transitions from azure to teal as progress increases
  const getColor = (progress: number) => {
    if (progress < 50) {
      return '#0E76FD'; // Azure Blue
    } else {
      return '#20C997'; // Teal Green
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* Wick */}
        <div 
          className="bg-gray-600 mx-auto"
          style={{ 
            width: '2px', 
            height: `${config.wickHeight}px` 
          }}
        />
        
        {/* Candle Body */}
        <div 
          className="relative mx-auto border border-gray-600"
          style={{ 
            width: `${config.width}px`, 
            height: `${config.height}px` 
          }}
        >
          {/* Progress Fill */}
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            style={{ 
              backgroundColor: getColor(clampedProgress),
              height: `${clampedProgress}%`
            }}
            initial={{ height: 0 }}
            animate={{ height: `${clampedProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
      
      {/* Progress Text */}
      <div className="mt-2 text-center">
        <div className="text-xs font-mono text-gray-400">
          {clampedProgress.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default CandlestickLoader; 
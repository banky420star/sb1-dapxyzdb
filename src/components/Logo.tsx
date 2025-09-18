import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  animated?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '', animated = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const animatedValue = <T,>(value: T): T | undefined => (animated ? value : undefined);

  return (
    <motion.div 
      className={`flex items-center space-x-2 sm:space-x-3 ${className}`}
      initial={animatedValue({ opacity: 0, scale: 0.8 })}
      animate={animatedValue({ opacity: 1, scale: 1 })}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Logo Icon */}
      <motion.div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden`}
        whileHover={animatedValue({ scale: 1.05, rotate: 2 })}
        whileTap={animatedValue({ scale: 0.95 })}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {/* Animated background pattern */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20"
          animate={animatedValue({ 
            background: [
              "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)",
              "linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
              "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)"
            ]
          })}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Chart line with animation */}
        <motion.svg 
          className={`${iconSizes[size]} text-white`} 
          viewBox="0 0 20 20" 
          fill="none"
          initial={animatedValue({ pathLength: 0 })}
          animate={animatedValue({ pathLength: 1 })}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          <motion.path 
            d="M2 12 L5 10 L8 13 L12 8 L16 6 L18 4" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            initial={animatedValue({ pathLength: 0 })}
            animate={animatedValue({ pathLength: 1 })}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </motion.svg>
        
        {/* AI circuit dots with enhanced animations */}
        <motion.div 
          className="absolute top-1 left-1 w-1 h-1 bg-yellow-400 rounded-full"
          animate={animatedValue({ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          })}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1 right-1 w-1 h-1 bg-green-400 rounded-full"
          animate={animatedValue({ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          })}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div 
          className="absolute bottom-1 left-1 w-1 h-1 bg-red-400 rounded-full"
          animate={animatedValue({ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          })}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div 
          className="absolute bottom-1 right-1 w-1 h-1 bg-purple-400 rounded-full"
          animate={animatedValue({ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          })}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        
        {/* Glowing effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-xl"
          animate={animatedValue({ opacity: [0.3, 0.6, 0.3] })}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      
      {/* Logo Text */}
      {showText && (
        <motion.div 
          className="flex flex-col"
          initial={animatedValue({ opacity: 0, x: -20 })}
          animate={animatedValue({ opacity: 1, x: 0 })}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <motion.h1 
            className={`${textSizes[size]} font-bold text-white leading-tight`}
            whileHover={animatedValue({ scale: 1.02 })}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            MetaTrader Pro
          </motion.h1>
          <motion.p 
            className="text-xs text-gray-300 font-medium"
            initial={animatedValue({ opacity: 0 })}
            animate={animatedValue({ opacity: 1 })}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          >
            AI-Powered Trading
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Logo; 

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
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

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20 animate-pulse"></div>
        
        {/* Chart line */}
        <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="none">
          <path 
            d="M2 12 L5 10 L8 13 L12 8 L16 6 L18 4" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        
        {/* AI circuit dots */}
        <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
        <div className="absolute top-1 right-1 w-1 h-1 bg-green-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-1 left-1 w-1 h-1 bg-red-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1 right-1 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizes[size]} font-bold text-gray-900 dark:text-white leading-tight`}>
            MetaTrader Pro
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            AI-Powered Trading
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo; 
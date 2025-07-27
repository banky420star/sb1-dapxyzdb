import React from 'react';

// Simple split pane implementation without external dependency
interface SplitPaneProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  defaultSizes?: number[];
  className?: string;
}

const SplitPane: React.FC<SplitPaneProps> = ({ 
  children, 
  direction = 'horizontal', 
  defaultSizes = [70, 30],
  className = '' 
}) => {
  const [sizes, setSizes] = React.useState(defaultSizes);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const position = direction === 'horizontal' ? e.clientX - rect.left : e.clientY - rect.top;
    const percentage = (position / (direction === 'horizontal' ? rect.width : rect.height)) * 100;
    
    setSizes([percentage, 100 - percentage]);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const childrenArray = React.Children.toArray(children);

  return (
    <div 
      className={`flex ${direction === 'vertical' ? 'flex-col' : 'flex-row'} h-full ${className}`}
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          <div 
            className="flex-1 overflow-hidden"
            style={{ 
              flex: `${sizes[index]} 0 0%`,
              minWidth: direction === 'horizontal' ? '100px' : 'auto',
              minHeight: direction === 'vertical' ? '100px' : 'auto'
            }}
          >
            {child}
          </div>
          {index < childrenArray.length - 1 && (
            <div
              className={`bg-gray-700 hover:bg-primary transition-colors ${
                direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
              }`}
              onMouseDown={handleMouseDown}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SplitPane; 

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  delay = 400, 
  position = 'right',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        
        let top = 0;
        let left = 0;
        const gap = 8; // Distance from element

        // Basic positioning logic
        switch (position) {
          case 'right':
            top = rect.top + (rect.height / 2);
            left = rect.right + gap;
            break;
          case 'left':
            top = rect.top + (rect.height / 2);
            left = rect.left - gap;
            break;
          case 'top':
            top = rect.top - gap;
            left = rect.left + (rect.width / 2);
            break;
          case 'bottom':
            top = rect.bottom + gap;
            left = rect.left + (rect.width / 2);
            break;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Close on scroll or resize to prevent floating issues
  useEffect(() => {
    const handleScroll = () => setIsVisible(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <>
      <div 
        ref={targetRef}
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div 
          className="fixed z-[10000] px-3 py-1.5 text-xs font-medium text-[#E6E4DD] bg-[#1A1917] dark:bg-[#E6E4DD] dark:text-[#1A1917] rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap"
          style={{ 
            top: coords.top, 
            left: coords.left,
            transform: position === 'right' ? 'translateY(-50%)' : 
                       position === 'left' ? 'translate(-100%, -50%)' :
                       position === 'top' ? 'translate(-50%, -100%)' : 
                       'translate(-50%, 0)'
          }}
        >
          {content}
          {/* Arrow */}
          <div 
            className={`
              absolute w-2 h-2 bg-[#1A1917] dark:bg-[#E6E4DD] rotate-45
              ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
              ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
              ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
              ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
            `} 
          />
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;

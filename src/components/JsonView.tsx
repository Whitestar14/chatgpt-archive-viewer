
import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonNodeProps {
  name: string;
  value: any;
  isLast?: boolean;
  depth?: number;
  highlightId?: string | null;
}

const JsonNode: React.FC<JsonNodeProps> = ({ name, value, isLast = true, depth = 0, highlightId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && Object.keys(value).length === 0;
  
  const isHighlighted = highlightId && name === highlightId;
  const nodeRef = useRef<HTMLDivElement>(null);

  // Auto expand root or if it contains the target ID (simple heuristic for flat mapping)
  useEffect(() => {
     if (depth === 0) {
        setIsExpanded(true);
     } else if (isObject && highlightId && Object.prototype.hasOwnProperty.call(value, highlightId)) {
        setIsExpanded(true);
     }
  }, [depth, isObject, highlightId, value]);

  // Scroll to highlight
  useEffect(() => {
     if (isHighlighted && nodeRef.current) {
        // Slight delay to ensure layout is stable
        setTimeout(() => {
            nodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
     }
  }, [isHighlighted]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = JSON.stringify(value, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (val: any) => {
    if (val === null) return <span className="text-red-400">null</span>;
    if (typeof val === 'string') return <span className="text-green-600 dark:text-green-400 whitespace-pre-wrap break-words">"{val}"</span>;
    if (typeof val === 'number') return <span className="text-blue-600 dark:text-blue-400">{val}</span>;
    if (typeof val === 'boolean') return <span className="text-purple-600 dark:text-purple-400">{val.toString()}</span>;
    return <span>{String(val)}</span>;
  };

  if (!isObject) {
    return (
      <div 
        ref={nodeRef}
        className={`
            font-mono text-sm leading-6 px-1 rounded transition-colors group relative
            ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500/50 -mx-2 px-3 py-1 my-1' : 'hover:bg-black/5 dark:hover:bg-white/5'}
        `}
      >
        <span className="text-gray-500 dark:text-gray-400 select-none">
          {Array(depth).fill('\u00A0\u00A0').join('')}
        </span>
        <span className="text-gray-800 dark:text-gray-200 font-semibold">{name}</span>
        <span className="text-gray-500">: </span>
        {renderValue(value)}
        {!isLast && <span className="text-gray-500">,</span>}
        
        {/* Hover Copy Button */}
        <button 
            onClick={handleCopy}
            className={`
                absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded 
                text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10
                opacity-0 group-hover:opacity-100 transition-opacity
            `}
            title="Copy Value"
        >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  return (
    <div ref={nodeRef} className={`font-mono text-sm leading-6 transition-all ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500/50 rounded-lg -mx-2 px-2 py-1 my-1' : ''}`}>
      <div 
        className="flex items-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer px-1 rounded group relative"
        onClick={!isEmpty ? toggleExpand : undefined}
      >
        <span className="text-gray-500 dark:text-gray-400 select-none">
          {Array(depth).fill('\u00A0\u00A0').join('')}
        </span>
        
        <div className="w-4 h-4 mr-1 flex items-center justify-center text-gray-400">
           {!isEmpty && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        </div>

        <span className="text-gray-800 dark:text-gray-200 font-semibold">{name}</span>
        <span className="text-gray-500">: </span>
        <span className="text-gray-500">{isArray ? '[' : '{'}</span>
        
        {!isExpanded && !isEmpty && (
           <span className="text-gray-400 text-xs ml-2">
             {isArray ? `Array(${value.length})` : 'Object'} ...
           </span>
        )}
        
        {isEmpty && (
            <span className="text-gray-500">{isArray ? ']' : '}'}{!isLast && ','}</span>
        )}

        {/* Hover Copy Button for Object/Array */}
        <button 
            onClick={handleCopy}
            className={`
                absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded 
                text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10
                opacity-0 group-hover:opacity-100 transition-opacity z-10
            `}
            title="Copy Object JSON"
        >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {isExpanded && !isEmpty && (
        <div>
          {Object.entries(value).map(([key, val], idx, arr) => (
            <JsonNode 
              key={key} 
              name={key} 
              value={val} 
              isLast={idx === arr.length - 1} 
              depth={depth + 1} 
              highlightId={highlightId}
            />
          ))}
          <div className="hover:bg-black/5 dark:hover:bg-white/5 px-1 rounded">
             <span className="text-gray-500 dark:text-gray-400 select-none">
                {Array(depth).fill('\u00A0\u00A0').join('')}
             </span>
             <span className="ml-5 text-gray-500">{isArray ? ']' : '}'}{!isLast && ','}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const JsonView: React.FC<{ data: any; highlightId?: string | null }> = ({ data, highlightId }) => {
  return (
    <div className="p-4 overflow-auto h-full bg-white dark:bg-[#1A1917]">
      <div className="max-w-full">
         <JsonNode name="conversation" value={data} highlightId={highlightId} />
      </div>
    </div>
  );
};

export default JsonView;

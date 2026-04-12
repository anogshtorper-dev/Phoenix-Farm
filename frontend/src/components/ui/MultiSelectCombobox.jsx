import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Smart natural sort: handles pure alpha, pure numeric, alpha+numeric, numeric+alpha
function smartSort(a, b) {
  const str_a = typeof a === 'string' ? a : String(a);
  const str_b = typeof b === 'string' ? b : String(b);

  // Split each string into chunks of digits and non-digits
  const tokenize = (s) => s.match(/(\d+|\D+)/g) || [];
  const ta = tokenize(str_a);
  const tb = tokenize(str_b);

  for (let i = 0; i < Math.max(ta.length, tb.length); i++) {
    if (i >= ta.length) return -1;
    if (i >= tb.length) return 1;
    const isNumA = /^\d+$/.test(ta[i]);
    const isNumB = /^\d+$/.test(tb[i]);
    if (isNumA && isNumB) {
      const diff = parseInt(ta[i], 10) - parseInt(tb[i], 10);
      if (diff !== 0) return diff;
    } else {
      const cmp = ta[i].localeCompare(tb[i], undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export default function MultiSelectCombobox({ options = [], selected = [], onChange, placeholder = 'Filter...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options
    .filter(opt => {
      if (!opt) return false;
      const str = typeof opt === 'string' ? opt : String(opt);
      return str.toLowerCase().includes(search.toLowerCase());
    })
    .sort(smartSort);

  const toggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative w-full">
      <div
        className={cn(
          'flex items-center justify-between gap-1 px-2 py-1 rounded border bg-white text-xs cursor-pointer min-h-[28px]',
          open ? 'border-slate-400 ring-1 ring-slate-300' : 'border-slate-200 hover:border-slate-300'
        )}
        onClick={() => setOpen(o => !o)}
      >
        <span className={cn('truncate', selected.length === 0 ? 'text-slate-400' : 'text-slate-700')}>
          {displayText}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {selected.length > 0 && (
            <X
              className="w-3 h-3 text-slate-400 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            />
          )}
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-max min-w-full max-w-[200px] bg-white border border-slate-200 rounded shadow-lg">
          <div className="p-1 border-b">
            <input
              autoFocus
              className="w-full px-2 py-1 text-xs outline-none"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">No options</div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggle(opt); }}
                >
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                    selected.includes(opt) ? 'bg-teal-600 border-teal-600' : 'border-slate-300'
                  )}>
                    {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="truncate">{opt}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';

export default function PondMap({ department, ponds, getPondStatus, onPondClick }) {
  const rows = department.gridRows || 5;
  const cols = department.gridColumns || 5;

  const getPondAtPosition = (row, col) => {
    return ponds.find(p => p.gridRow === row && p.gridColumn === col);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500 hover:bg-green-600 border-green-600';
      case 'outdated':
        return 'bg-orange-500 hover:bg-orange-600 border-orange-600';
      case 'abnormal':
        return 'bg-red-500 hover:bg-red-600 border-red-600';
      default:
        return 'bg-slate-200 hover:bg-slate-300 border-slate-300';
    }
  };

  return (
    <div className="flex justify-center">
      <div 
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }).map((_, rowIndex) => 
          Array.from({ length: cols }).map((_, colIndex) => {
            const pond = getPondAtPosition(rowIndex, colIndex);
            
            if (!pond) {
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50"
                />
              );
            }

            const status = getPondStatus(pond);
            
            return (
              <button
                key={pond.id}
                onClick={() => onPondClick(pond)}
                className={`w-24 h-24 rounded-lg border-2 ${getStatusColor(status)} text-white font-semibold text-lg transition-all hover:scale-105 shadow-md flex items-center justify-center`}
                title={`${pond.number} - ${pond.species || 'No species'}`}
              >
                {pond.number}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
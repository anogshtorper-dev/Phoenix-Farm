// src/components/reports/ForSaleReport.jsx
// Changes: Removed base44 import. Pond.list, RASSystem.list, FishBatch.filter.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Printer, ChevronDown, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Pond, RASSystem, FishBatch } from '@/api';

const SORT_OPTIONS = [
  { key:'tank_asc',  label:'Tank ↑ (A→Z)',  icon:ArrowUp },  { key:'tank_desc', label:'Tank ↓ (Z→A)',  icon:ArrowDown },
  { key:'group_asc', label:'Group ↑ (A→Z)', icon:ArrowUp },  { key:'group_desc',label:'Group ↓ (Z→A)', icon:ArrowDown },
  { key:'line_asc',  label:'Line ↑ (A→Z)',  icon:ArrowUp },  { key:'line_desc', label:'Line ↓ (Z→A)',  icon:ArrowDown },
  { key:'size_asc',  label:'Size ↑ (A→Z)',  icon:ArrowUp },  { key:'size_desc', label:'Size ↓ (Z→A)',  icon:ArrowDown },
];

function smartNum(str) { return String(str||'').split(/(\d+)/).map((s,i) => i%2===1 ? parseInt(s,10) : s.toLowerCase()); }
function smartCompare(a,b) { const ta=smartNum(a),tb=smartNum(b); for(let i=0;i<Math.max(ta.length,tb.length);i++){const av=ta[i]??'',bv=tb[i]??'';if(av<bv)return -1;if(av>bv)return 1;}return 0; }

function ColumnFilter({ label, options, selected, onChange }) {
  const [open,setOpen]=useState(false); const ref=useRef(null);
  useEffect(()=>{const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const toggle=(val)=>onChange(selected.includes(val)?selected.filter(v=>v!==val):[...selected,val]);
  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={()=>setOpen(o=>!o)} className={`flex items-center gap-1 font-semibold text-sm hover:text-teal-700 ${selected.length>0?'text-teal-700':''}`}>
        {label}<ChevronDown className={`w-3 h-3 transition-transform ${open?'rotate-180':''}`}/>
        {selected.length>0&&<span className="ml-1 px-1.5 py-0.5 bg-teal-600 text-white text-xs rounded-full leading-none" onClick={e=>{e.stopPropagation();onChange([]);}}>{selected.length}</span>}
      </button>
      {open&&(<div className="absolute z-50 top-full left-0 mt-1 bg-white border rounded-md shadow-lg min-w-[160px]">
        {options.map(opt=>(<label key={opt} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"><input type="checkbox" checked={selected.includes(opt)} onChange={()=>toggle(opt)} className="accent-teal-600"/>{opt}</label>))}
        {options.length===0&&<div className="px-3 py-2 text-xs text-slate-400">No options</div>}
      </div>)}
    </div>
  );
}

export default function ForSaleReport() {
  const [forSaleFilter,setForSaleFilter]=useState('Yes');
  const [systemId,setSystemId]=useState('all');
  const [sortKey,setSortKey]=useState(null);
  const [sortOpen,setSortOpen]=useState(false);
  const [colSystems,setColSystems]=useState([]);
  const [colGroups,setColGroups]=useState([]);
  const [colLines,setColLines]=useState([]);
  const [colDensity,setColDensity]=useState([]);
  const [colForSale,setColForSale]=useState([]);

  useEffect(()=>{if(!sortOpen)return;const h=()=>setSortOpen(false);document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[sortOpen]);

  const { data:ponds=[] }   = useQuery({ queryKey:['ponds'],             queryFn:()=>Pond.list() });
  const { data:systems=[] } = useQuery({ queryKey:['ras-systems'],        queryFn:()=>RASSystem.list() });
  const { data:batches=[] } = useQuery({ queryKey:['batches-all-active'], queryFn:()=>FishBatch.filter({isActive:true}) });

  const getSystemName = (id) => systems.find(s=>s.id===id)?.systemName||'—';

  const batchesByPond = useMemo(()=>{const map={};for(const b of batches){if(b.currentTankId){if(!map[b.currentTankId])map[b.currentTankId]=[];map[b.currentTankId].push(b);}}return map;},[batches]);

  const enrichedPonds = useMemo(()=>ponds.map(p=>{
    const pb=batchesByPond[p.id]||[];
    return {...p,_groupStr:[...new Set(pb.map(b=>b.group).filter(Boolean))].join(', ')||p.species||'',_lineStr:[...new Set(pb.map(b=>b.line).filter(Boolean))].join(', ')||p.strainOrLine||''};
  }),[ponds,batchesByPond]);

  const basePonds = enrichedPonds.filter(p=>{
    if(p.isActive===false)return false;
    if(p.tankStatus==='Empty')return false;
    if(forSaleFilter!=='all'&&p.forSale!==forSaleFilter)return false;
    if(systemId!=='all'&&p.systemId!==systemId)return false;
    return true;
  });

  const uniqueSystems = [...new Set(basePonds.map(p=>getSystemName(p.systemId)).filter(v=>v!=='—'))].sort();
  const uniqueGroups  = [...new Set(basePonds.map(p=>p._groupStr).filter(Boolean))].sort();
  const uniqueLines   = [...new Set(basePonds.map(p=>p._lineStr).filter(Boolean))].sort();
  const uniqueDensity = [...new Set(basePonds.map(p=>p.density).filter(Boolean))].sort();
  const uniqueForSale = [...new Set(basePonds.map(p=>p.forSale).filter(Boolean))].sort();

  const filteredPonds = useMemo(()=>{
    const arr=[...basePonds.filter(p=>{
      if(colSystems.length>0&&!colSystems.includes(getSystemName(p.systemId)))return false;
      if(colGroups.length>0&&!colGroups.includes(p._groupStr))return false;
      if(colLines.length>0&&!colLines.includes(p._lineStr))return false;
      if(colDensity.length>0&&!colDensity.includes(p.density))return false;
      if(colForSale.length>0&&!colForSale.includes(p.forSale))return false;
      return true;
    })];
    arr.sort((a,b)=>{switch(sortKey){case'tank_asc':return smartCompare(a.number,b.number);case'tank_desc':return smartCompare(b.number,a.number);case'group_asc':return smartCompare(a._groupStr,b._groupStr);case'group_desc':return smartCompare(b._groupStr,a._groupStr);case'line_asc':return smartCompare(a._lineStr,b._lineStr);case'line_desc':return smartCompare(b._lineStr,a._lineStr);case'size_asc':return smartCompare(a.fishSize,b.fishSize);case'size_desc':return smartCompare(b.fishSize,a.fishSize);default:return smartCompare(a.number,b.number);}});
    return arr;
  },[basePonds,colSystems,colGroups,colLines,colDensity,colForSale,sortKey]);

  const clearAll=()=>{setForSaleFilter('Yes');setSystemId('all');setSortKey(null);setColSystems([]);setColGroups([]);setColLines([]);setColDensity([]);setColForSale([]);};

  const exportXLSX=()=>{
    const rows=filteredPonds.map(p=>({'System':getSystemName(p.systemId),'Tank #':p.number||'','Group':p._groupStr||'','Line':p._lineStr||'','Fish Size (cm)':p.fishSize||'','Density':p.density||'','For Sale':p.forSale||'','Notes':p.notes||''}));
    const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=Object.keys(rows[0]||{}).map(k=>({wch:Math.max(k.length,16)}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'For Sale');
    XLSX.writeFile(wb,`for-sale-report-${format(new Date(),'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div><Label>For Sale</Label><Select value={forSaleFilter} onValueChange={setForSaleFilter}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Yes">Yes (For Sale)</SelectItem><SelectItem value="No">No (Not For Sale)</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select></div>
            <div><Label>System</Label><Select value={systemId} onValueChange={setSystemId}><SelectTrigger className="w-48"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Systems</SelectItem>{systems.filter(s=>s.isActive!==false).map(s=><SelectItem key={s.id} value={s.id}>{s.systemName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Sort By</Label>
              <div className="relative" onMouseDown={e=>e.stopPropagation()}>
                <button type="button" className={`flex items-center gap-2 h-9 px-3 rounded-md border text-sm min-w-[180px] ${sortKey?'border-teal-500 bg-teal-50 text-teal-800':'border-input bg-white text-slate-700'} hover:bg-slate-50`} onClick={()=>setSortOpen(o=>!o)}>
                  <ArrowUpDown className="w-4 h-4 shrink-0"/><span className="flex-1 text-left truncate">{sortKey?SORT_OPTIONS.find(o=>o.key===sortKey)?.label:'Default Order'}</span>
                  {sortKey&&<X className="w-3.5 h-3.5 shrink-0 text-teal-600 hover:text-red-500" onClick={e=>{e.stopPropagation();setSortKey(null);setSortOpen(false);}}/>}
                </button>
                {sortOpen&&<div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border rounded-md shadow-lg overflow-hidden">{SORT_OPTIONS.map(opt=><button key={opt.key} type="button" className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-100 text-left ${sortKey===opt.key?'bg-teal-50 text-teal-800 font-medium':'text-slate-700'}`} onClick={()=>{setSortKey(opt.key);setSortOpen(false);}}><opt.icon className="w-3.5 h-3.5 shrink-0 text-slate-400"/>{opt.label}</button>)}</div>}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={clearAll}>Clear</Button>
              <Button onClick={exportXLSX} disabled={filteredPonds.length===0} className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4"/> Export</Button>
              <Button variant="outline" onClick={()=>window.print()} className="gap-2"><Printer className="w-4 h-4"/> Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">For Sale — {filteredPonds.length} tank{filteredPonds.length!==1?'s':''}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-2"><ColumnFilter label="System" options={uniqueSystems} selected={colSystems} onChange={setColSystems}/></th>
                  <th className="text-left p-2 font-semibold">Tank #</th>
                  <th className="text-left p-2"><ColumnFilter label="Group" options={uniqueGroups} selected={colGroups} onChange={setColGroups}/></th>
                  <th className="text-left p-2"><ColumnFilter label="Line" options={uniqueLines} selected={colLines} onChange={setColLines}/></th>
                  <th className="text-left p-2 font-semibold">Fish Size (cm)</th>
                  <th className="text-left p-2"><ColumnFilter label="Density" options={uniqueDensity} selected={colDensity} onChange={setColDensity}/></th>
                  <th className="text-left p-2"><ColumnFilter label="For Sale" options={uniqueForSale} selected={colForSale} onChange={setColForSale}/></th>
                  <th className="text-left p-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPonds.map(pond=>(
                  <tr key={pond.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 text-slate-600">{getSystemName(pond.systemId)}</td>
                    <td className="p-2 font-medium">{pond.number}</td>
                    <td className="p-2">{pond._groupStr?<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">{pond._groupStr}</span>:'—'}</td>
                    <td className="p-2 italic text-slate-600">{pond._lineStr||'—'}</td>
                    <td className="p-2">{pond.fishSize||'—'}</td>
                    <td className="p-2">{pond.density||'—'}</td>
                    <td className="p-2">{pond.forSale==='Yes'?<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span>:pond.forSale==='No'?<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">No</span>:'—'}</td>
                    <td className="p-2 text-slate-500 max-w-xs truncate">{pond.notes||'—'}</td>
                  </tr>
                ))}
                {filteredPonds.length===0&&<tr><td colSpan={8} className="p-8 text-center text-slate-400">No tanks match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

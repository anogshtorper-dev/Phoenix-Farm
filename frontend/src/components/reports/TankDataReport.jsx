// src/components/reports/TankDataReport.jsx
// Changes: Removed base44 import. Department.list, Pond.list, RASSystem.list,
// AuditHistory.list, Species.list, Line.list, FishBatch.filter replace entity calls.
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Printer, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Department, Pond, RASSystem, AuditHistory, Species, Line, FishBatch } from '@/api';

function smartNum(s) { return String(s||'').split(/(\d+)/).map((p,i)=>i%2?parseInt(p,10):p); }
function smartCompare(a,b){const pa=smartNum(a),pb=smartNum(b);for(let i=0;i<Math.max(pa.length,pb.length);i++){const x=pa[i]??'',y=pb[i]??'';if(x<y)return -1;if(x>y)return 1;}return 0;}

const SORT_OPTIONS=[
  {key:'tank_asc',  label:'Tank ↑ (A→Z)',  icon:ArrowUp},  {key:'tank_desc', label:'Tank ↓ (Z→A)',  icon:ArrowDown},
  {key:'group_asc', label:'Group ↑ (A→Z)', icon:ArrowUp},  {key:'group_desc',label:'Group ↓ (Z→A)', icon:ArrowDown},
  {key:'line_asc',  label:'Line ↑ (A→Z)',  icon:ArrowUp},  {key:'line_desc', label:'Line ↓ (Z→A)',  icon:ArrowDown},
  {key:'dept_asc',  label:'Dept ↑ (A→Z)',  icon:ArrowUp},  {key:'dept_desc', label:'Dept ↓ (Z→A)',  icon:ArrowDown},
];
const SPECIES_COLORS=['bg-teal-100 text-teal-800','bg-blue-100 text-blue-800','bg-purple-100 text-purple-800','bg-orange-100 text-orange-800','bg-pink-100 text-pink-800','bg-yellow-100 text-yellow-800','bg-green-100 text-green-800','bg-red-100 text-red-800'];

export default function TankDataReport() {
  const [departmentId,    setDepartmentId]    = useState('all');
  const [systemId,        setSystemId]        = useState('all');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [line,            setLine]            = useState('all');
  const [sortKey,         setSortKey]         = useState(null);
  const [sortOpen,        setSortOpen]        = useState(false);

  useEffect(()=>{if(!sortOpen)return;const h=()=>setSortOpen(false);document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[sortOpen]);

  const { data:departments=[] } = useQuery({ queryKey:['departments'],  queryFn:()=>Department.list() });
  const { data:ponds=[] }       = useQuery({ queryKey:['ponds'],         queryFn:()=>Pond.list() });
  const { data:systems=[] }     = useQuery({ queryKey:['ras-systems'],   queryFn:()=>RASSystem.list() });
  const { data:history=[] }     = useQuery({ queryKey:['audit-history'], queryFn:()=>AuditHistory.list({limit:2000}) });
  const { data:speciesList=[] } = useQuery({ queryKey:['species'],       queryFn:()=>Species.list() });
  const { data:linesList=[] }   = useQuery({ queryKey:['lines'],         queryFn:()=>Line.list() });
  const { data:fishBatches=[] } = useQuery({ queryKey:['fish-batches'],  queryFn:()=>FishBatch.filter({isActive:true}) });

  const batchByPond = useMemo(()=>{const map={};fishBatches.forEach(b=>{if(b.currentTankId)map[b.currentTankId]=b;});return map;},[fishBatches]);

  const speciesColorMap={};speciesList.filter(s=>s.isActive!==false).forEach((s,i)=>{speciesColorMap[s.name]=SPECIES_COLORS[i%SPECIES_COLORS.length];});

  const filteredLines=selectedSpecies==='all'?linesList.filter(l=>l.isActive!==false):linesList.filter(l=>l.isActive!==false&&l.speciesName===selectedSpecies);

  const getGroup=p=>p.species||batchByPond[p.id]?.group||'';
  const getLine =p=>p.strainOrLine||batchByPond[p.id]?.line||'';

  const filteredPonds=useMemo(()=>{
    const arr=ponds.filter(p=>{
      if(departmentId!=='all'&&p.departmentId!==departmentId)return false;
      if(systemId!=='all'&&p.systemId!==systemId)return false;
      if(selectedSpecies!=='all'&&getGroup(p)!==selectedSpecies)return false;
      if(line!=='all'&&getLine(p)!==line)return false;
      return true;
    });
    const getDeptName=id=>departments.find(d=>d.id===id)?.name||'';
    arr.sort((a,b)=>{switch(sortKey){case'tank_asc':return smartCompare(a.number,b.number);case'tank_desc':return smartCompare(b.number,a.number);case'group_asc':return smartCompare(getGroup(a),getGroup(b));case'group_desc':return smartCompare(getGroup(b),getGroup(a));case'line_asc':return smartCompare(getLine(a),getLine(b));case'line_desc':return smartCompare(getLine(b),getLine(a));case'dept_asc':return smartCompare(getDeptName(a.departmentId),getDeptName(b.departmentId));case'dept_desc':return smartCompare(getDeptName(b.departmentId),getDeptName(a.departmentId));default:return smartCompare(a.number,b.number);}});
    return arr;
  },[ponds,departmentId,systemId,selectedSpecies,line,sortKey,departments,batchByPond]);

  const getTreatments=(pondId)=>history.filter(h=>h.entityId===pondId&&h.description&&h.description.toLowerCase().includes('treat')).map(h=>`${h.description} (${h.performedAt||h.createdAt?format(new Date(h.performedAt||h.createdAt),'yyyy-MM-dd'):''})` ).join('; ');

  const exportXLSX=()=>{
    const rows=filteredPonds.map(pond=>{const dept=departments.find(d=>d.id===pond.departmentId);const sys=systems.find(s=>s.id===pond.systemId);return {'Department':dept?.name||'','Tank Number':pond.number||'','Species Group':getGroup(pond),'Line':getLine(pond),'System':sys?.systemName||'','Density':pond.density||'','Stage':pond.stage||'','Batch Code':pond.batchCode||'','Stocking Date':pond.stockingDate||'','Transfer Date':pond.transferDate||'','Treatment History':getTreatments(pond.id),'Status':pond.tankStatus||'','Notes':pond.notes||''};});
    const ws=XLSX.utils.json_to_sheet(rows);ws['!cols']=Object.keys(rows[0]||{}).map(k=>({wch:Math.max(k.length,14)}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Tank Data');
    XLSX.writeFile(wb,`tank-data-report-${format(new Date(),'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div><Label>Department</Label><Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.filter(d=>d.isActive!==false).map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Group (Species)</Label><Select value={selectedSpecies} onValueChange={v=>{setSelectedSpecies(v);setLine('all');}}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Groups</SelectItem>{speciesList.filter(s=>s.isActive!==false).map(s=><SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Line</Label><Select value={line} onValueChange={setLine}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Lines</SelectItem>{filteredLines.map(l=><SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>System</Label><Select value={systemId} onValueChange={setSystemId}><SelectTrigger className="w-44"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Systems</SelectItem>{systems.filter(s=>s.isActive!==false).map(s=><SelectItem key={s.id} value={s.id}>{s.systemName}</SelectItem>)}</SelectContent></Select></div>
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
              <Button variant="outline" onClick={()=>{setDepartmentId('all');setSystemId('all');setSelectedSpecies('all');setLine('all');setSortKey(null);}}>Clear</Button>
              <Button onClick={exportXLSX} disabled={filteredPonds.length===0} className="bg-teal-600 hover:bg-teal-700 gap-2"><Download className="w-4 h-4"/> Export</Button>
              <Button variant="outline" onClick={()=>window.print()} className="gap-2"><Printer className="w-4 h-4"/> Print</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Preview — {filteredPonds.length} tank{filteredPonds.length!==1?'s':''}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50">{['Tank #','Department','Species Group','Line','Density','Stage','Batch Code','Status'].map(h=><th key={h} className="text-left p-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {filteredPonds.map(pond=>{const dept=departments.find(d=>d.id===pond.departmentId);const col=speciesColorMap[getGroup(pond)]||'bg-slate-100 text-slate-700';return(
                  <tr key={pond.id} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium">{pond.number}</td>
                    <td className="p-2">{dept?.name||'—'}</td>
                    <td className="p-2">{getGroup(pond)?<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${col}`}>{getGroup(pond)}</span>:'—'}</td>
                    <td className="p-2 italic text-slate-600">{getLine(pond)||'—'}</td>
                    <td className="p-2">{pond.density||'—'}</td>
                    <td className="p-2">{pond.stage||'—'}</td>
                    <td className="p-2">{pond.batchCode||'—'}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pond.tankStatus==='Active'?'bg-green-100 text-green-800':'bg-slate-100 text-slate-600'}`}>{pond.tankStatus||'—'}</span></td>
                  </tr>
                );})}
                {filteredPonds.length===0&&<tr><td colSpan={8} className="p-8 text-center text-slate-400">No tanks match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

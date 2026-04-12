// src/pages/Dashboard.jsx
// Changes from original:
//   - Removed base44 import; all entity calls replaced with named imports from @/api
//   - base44.auth.me() removed; user comes from useAuth()
//   - base44.entities.Pond.update() replaced with Pond.update()
//   - All other entities replaced inline
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import {
  Pond,
  RASSystem,
  PondGroup,
  Department,
  FishBatch,
  MetricAcknowledgment,
} from '@/api';
import PondMap from '../components/dashboard/PondMap';
import PondDetailModal from '../components/dashboard/PondDetailModal';
import SystemMetricsModal from '../components/dashboard/SystemMetricsModal';
import AddPondModal from '../components/dashboard/AddPondModal';
import { List, Droplets, Plus, Search, GripVertical, Save, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedPond, setSelectedPond]             = useState(null);
  const [showMetricsModal, setShowMetricsModal]     = useState(false);
  const [showAddPondModal, setShowAddPondModal]     = useState(false);
  const [searchQuery, setSearchQuery]               = useState('');
  const [isEditMode, setIsEditMode]                 = useState(false);
  const [editedPonds, setEditedPonds]               = useState([]);
  const [outdatedFilter, setOutdatedFilter]         = useState(false);
  const [selectedSystem, setSelectedSystem]         = useState(null);
  const queryClient = useQueryClient();

  const { data: systems = [], isLoading: loadingSystems } = useQuery({
    queryKey: ['systems'],
    queryFn: async () => {
      const list = await RASSystem.list();
      return list.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    },
  });

  const { data: ponds = [], refetch: refetchPonds } = useQuery({
    queryKey: ['ponds', selectedSystem?.id],
    queryFn: async () => {
      if (!selectedSystem) return [];
      const result = await Pond.filter({ systemId: selectedSystem.id });
      return result
        .filter((p) => p.isActive !== false)
        .sort((a, b) => {
          const numA = parseInt(a.number?.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.number?.replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });
    },
    enabled: !!selectedSystem,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => PondGroup.list(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => Department.list(),
  });

  const { data: fishBatches = [] } = useQuery({
    queryKey: ['fishBatches'],
    queryFn: () => FishBatch.filter({ isActive: true }),
  });

  const { data: allPondsForAlerts = [] } = useQuery({
    queryKey: ['all-ponds-for-alerts'],
    queryFn: () => Pond.list(),
  });

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ['acknowledgments'],
    queryFn: () => MetricAcknowledgment.list(),
  });

  // Build pondId -> fish label map
  const pondFishMap = useMemo(() => {
    const map = {};
    fishBatches.forEach((b) => {
      if (!b.currentTankId) return;
      if (!map[b.currentTankId]) map[b.currentTankId] = {};
      const group = b.group || '?';
      if (!map[b.currentTankId][group]) map[b.currentTankId][group] = new Set();
      if (b.line) map[b.currentTankId][group].add(b.line);
    });
    const result = {};
    Object.entries(map).forEach(([pondId, groupMap]) => {
      const parts = Object.entries(groupMap).map(([group, lines]) => {
        const lineArr = [...lines];
        return lineArr.length > 0 ? `${lineArr.join(', ')} ${group}` : group;
      });
      result[pondId] = parts.join('; ');
    });
    return result;
  }, [fishBatches]);

  React.useEffect(() => {
    if (systems.length > 0 && !selectedSystem) {
      setSelectedSystem(systems[0]);
    }
  }, [systems]);

  const getPondStatus = (pond) => {
    if (!pond.lastUpdated) return 'outdated';
    const daysSinceUpdate =
      (Date.now() - new Date(pond.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) return 'outdated';

    const group = groups.find((g) => g.id === pond.groupId);
    if (!group) return 'normal';

    const metrics = [
      { value: pond.temperature, min: group.tempMin,       max: group.tempMax       },
      { value: pond.ph,          min: group.phMin,         max: group.phMax         },
      { value: pond.ec,          min: group.ecMin,         max: group.ecMax         },
      { value: pond.do,          min: group.doMin,         max: group.doMax         },
      { value: pond.alkalinity,  min: group.alkalinityMin, max: group.alkalinityMax },
      { value: pond.ammonia,     min: group.ammoniaMin,    max: group.ammoniaMax    },
      { value: pond.nitrite,     min: group.nitriteMin,    max: group.nitriteMax    },
      { value: pond.nitrate,     min: group.nitrateMin,    max: group.nitrateMax    },
    ];

    for (const m of metrics) {
      if (m.value != null) {
        if (m.min != null && m.value < m.min) return 'abnormal';
        if (m.max != null && m.value > m.max) return 'abnormal';
      }
    }
    return 'normal';
  };

  const openAlertsCount = useMemo(() => {
    let count = 0;
    systems.forEach((system) => {
      const systemPonds = allPondsForAlerts.filter((p) => p.systemId === system.id);
      const systemGroup = groups.find((g) => systemPonds.some((p) => p.groupId === g.id));
      if (!systemGroup || systemPonds.length === 0) return;

      const avg = (key) => {
        const vals = systemPonds.map((p) => p[key]).filter((v) => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };

      const metrics = [
        { type: 'temperature', value: avg('temperature'), min: systemGroup.tempMin,       max: systemGroup.tempMax       },
        { type: 'ph',          value: avg('ph'),          min: systemGroup.phMin,         max: systemGroup.phMax         },
        { type: 'ec',          value: avg('ec'),          min: systemGroup.ecMin,         max: systemGroup.ecMax         },
        { type: 'do',          value: avg('do'),          min: systemGroup.doMin,         max: systemGroup.doMax         },
        { type: 'alkalinity',  value: avg('alkalinity'),  min: systemGroup.alkalinityMin, max: systemGroup.alkalinityMax },
        { type: 'ammonia',     value: avg('ammonia'),     min: systemGroup.ammoniaMin,    max: systemGroup.ammoniaMax    },
        { type: 'nitrite',     value: avg('nitrite'),     min: systemGroup.nitriteMin,    max: systemGroup.nitriteMax    },
        { type: 'nitrate',     value: avg('nitrate'),     min: systemGroup.nitrateMin,    max: systemGroup.nitrateMax    },
      ];

      metrics.forEach(({ type, value, min, max }) => {
        if (value == null) return;
        const isAck = acknowledgments.some(
          (a) => a.pondId === system.id && a.metricType === type
        );
        if (isAck) return;
        if ((min != null && value < min) || (max != null && value > max)) count++;
      });
    });
    return count;
  }, [systems, allPondsForAlerts, groups, acknowledgments]);

  const allPonds    = ponds;
  const outdatedPonds = allPonds.filter((p) => {
    if (!p.lastUpdated) return true;
    return (Date.now() - new Date(p.lastUpdated).getTime()) / (1000 * 60 * 60 * 24) > 7;
  });

  React.useEffect(() => {
    if (isEditMode && ponds.length > 0) {
      setEditedPonds(ponds.map((p) => ({ ...p })));
    }
  }, [isEditMode, ponds]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(editedPonds);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setEditedPonds(items);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const cols = 4;
      await Promise.all(
        editedPonds.map((pond, i) =>
          Pond.update(pond.id, {
            gridRow:    Math.floor(i / cols),
            gridColumn: i % cols,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ponds']);
      setIsEditMode(false);
    },
  });

  const handleSaveOrder = () => updateMutation.mutate();

  return (
    <div
      className="min-h-screen p-3 md:p-6 bg-white relative flex items-center justify-center overflow-x-hidden"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'auto',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10 w-full">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
            <p className="text-xs md:text-sm text-slate-600 mb-1">Total Tanks</p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{allPonds.length}</p>
          </div>
          <div
            className="bg-white rounded-lg shadow-sm border p-3 md:p-4 cursor-pointer hover:bg-red-50 hover:border-red-300 transition-colors"
            onClick={() => navigate(createPageUrl('Alerts'))}
          >
            <p className="text-xs md:text-sm text-slate-600 mb-1">Open Alerts</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{openAlertsCount}</p>
          </div>
          <div
            className="bg-white rounded-lg shadow-sm border p-3 md:p-4 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors"
            onClick={() => setOutdatedFilter(true)}
          >
            <p className="text-xs md:text-sm text-slate-600 mb-1">Not Updated +7 Days</p>
            <p className="text-xl md:text-2xl font-bold text-orange-600">{outdatedPonds.length}</p>
          </div>
        </div>

        <Tabs
          value={selectedSystem?.id}
          onValueChange={(id) => setSelectedSystem(systems.find((s) => s.id === id))}
        >
          <TabsList className="mb-4 md:mb-6 w-full flex-wrap h-auto gap-2 grid grid-cols-2 md:grid-cols-4">
            {systems.map((sys) => (
              <TabsTrigger key={sys.id} value={sys.id} className="flex-1 min-w-[120px]">
                {sys.systemName.replace(/\bSystem\b/gi, '').trim()}
              </TabsTrigger>
            ))}
          </TabsList>

          {systems.map((sys) => (
            <TabsContent key={sys.id} value={sys.id}>
              <div className="bg-white rounded-xl shadow-sm border p-3 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900">
                      {sys.systemName.replace(/\bSystem\b/gi, '').trim()}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-600">
                      Code: {sys.systemCode} | Volume: {sys.systemVolume || 'N/A'} liters
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-slate-600">Normal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-slate-600">&gt;7d</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-slate-600">Abnormal</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isEditMode ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setShowMetricsModal(true)}
                          className="bg-teal-600 hover:bg-teal-700 text-xs"
                        >
                          <Droplets className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Update
                        </Button>
                        <Link to={createPageUrl('GroupView')}>
                          <Button size="sm" variant="outline" className="text-xs">
                            <List className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Table
                          </Button>
                        </Link>
                        {user?.role === 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditMode(true)}
                            className="text-xs"
                          >
                            <GripVertical className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                            Edit Order
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={handleSaveOrder}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <Save className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditMode(false)}
                          className="text-xs"
                        >
                          <X className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {outdatedFilter && (
                  <div className="mb-4 flex items-center justify-between bg-orange-50 border border-orange-300 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-orange-700">
                      🔶 Showing only tanks not updated for more than 7 days
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-orange-400 text-orange-700 hover:bg-orange-100"
                      onClick={() => setOutdatedFilter(false)}
                    >
                      <X className="w-3 h-3 mr-1" /> Show All
                    </Button>
                  </div>
                )}

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by tank number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>

                {isEditMode ? (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="ponds" direction="horizontal">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 overflow-x-auto"
                        >
                          {editedPonds.map((pond, index) => {
                            const status = getPondStatus(pond);
                            const dept = departments.find((d) => d.id === pond.departmentId);
                            return (
                              <Draggable key={pond.id} draggableId={pond.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 md:p-4 border-2 rounded-lg cursor-move transition-all hover:shadow-md ${
                                      snapshot.isDragging ? 'shadow-lg opacity-90' : ''
                                    } ${
                                      status === 'normal'   ? 'border-green-500 bg-green-50'   :
                                      status === 'outdated' ? 'border-orange-500 bg-orange-50' :
                                                              'border-red-500 bg-red-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <GripVertical className="w-4 h-4 text-slate-400" />
                                      <h3 className="font-bold text-base md:text-lg">{pond.number}</h3>
                                    </div>
                                    <div className="text-xs md:text-sm text-slate-700 space-y-1">
                                      <p><strong>Department:</strong> {dept?.name || 'N/A'}</p>
                                      {(() => {
                                        const isBreeding = dept?.name?.toLowerCase().includes('breed');
                                        if (isBreeding) {
                                          return (
                                            <>
                                              {pond.species && <p className="text-teal-700 font-medium">{pond.species}</p>}
                                              {pond.strainOrLine && <p className="text-slate-600 italic">{pond.strainOrLine}</p>}
                                            </>
                                          );
                                        }
                                        const fish = pondFishMap[pond.id];
                                        return fish ? <p className="text-teal-700 font-medium">{fish}</p> : null;
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 min-w-[320px]">
                      {ponds
                        .filter((pond) => {
                          const matchesSearch = pond.number
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase());
                          if (!matchesSearch) return false;
                          if (outdatedFilter) {
                            if (!pond.lastUpdated) return true;
                            const days =
                              (Date.now() - new Date(pond.lastUpdated).getTime()) /
                              (1000 * 60 * 60 * 24);
                            return days > 7;
                          }
                          return true;
                        })
                        .map((pond) => {
                          const status = getPondStatus(pond);
                          const dept   = departments.find((d) => d.id === pond.departmentId);
                          return (
                            <div
                              key={pond.id}
                              onClick={() => setSelectedPond(pond)}
                              className={`p-3 md:p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                status === 'normal'   ? 'border-green-500 bg-green-50'   :
                                status === 'outdated' ? 'border-orange-500 bg-orange-50' :
                                                        'border-red-500 bg-red-50'
                              }`}
                            >
                              {(() => {
                                const isBreeding = dept?.name?.toLowerCase().includes('breed');
                                const isNursery  = dept?.name?.toLowerCase().includes('nursery');
                                const isGrowOut  = !isBreeding && !isNursery;
                                const fish       = pondFishMap[pond.id];

                                if (isNursery) {
                                  const batchInTank = fishBatches.find((b) => b.currentTankId === pond.id);
                                  const stockDate   = batchInTank?.stockingDate || pond.stockingDate;
                                  return (
                                    <>
                                      <div className="text-center mb-1">
                                        <p className="font-bold text-base">{pond.number}</p>
                                        <p className="text-xs text-slate-500">{dept?.name || ''}</p>
                                      </div>
                                      {fish && <p className="text-lg font-bold text-slate-800 mt-2 mb-2">{fish}</p>}
                                      <div className="text-sm text-slate-700 space-y-0.5">
                                        <p><strong>Stock Date:</strong> {stockDate ? new Date(stockDate).toLocaleDateString('en-CA') : '—'}</p>
                                        <p><strong>Density:</strong> {pond.density || '—'}</p>
                                      </div>
                                    </>
                                  );
                                }

                                if (isGrowOut) {
                                  return (
                                    <>
                                      <div className="text-center mb-1">
                                        <p className="font-bold text-base">{pond.number}</p>
                                        <p className="text-xs text-slate-500">{dept?.name || ''}</p>
                                      </div>
                                      {fish && <p className="text-lg font-bold text-slate-800 mt-2 mb-2">{fish}</p>}
                                      <div className="text-sm text-slate-700 space-y-0.5">
                                        <p>
                                          <strong>Stage:</strong>{' '}
                                          {pond.stage
                                            ? `${pond.stage.charAt(0).toUpperCase() + pond.stage.slice(1)}${pond.stage === 'stock' && pond.fishSize ? ` (${pond.fishSize})` : ''}`
                                            : '—'}
                                        </p>
                                        <p><strong>For Sale:</strong> {pond.forSale || '—'}</p>
                                      </div>
                                    </>
                                  );
                                }

                                // Breeding
                                return (
                                  <>
                                    <div className="text-center mb-1">
                                      <p className="font-bold text-base">{pond.number}</p>
                                      <p className="text-xs text-slate-500">{dept?.name || ''}</p>
                                    </div>
                                    {pond.species && (
                                      <p className="text-base font-bold text-slate-800 mt-2">{pond.species}</p>
                                    )}
                                    {pond.strainOrLine && (
                                      <p className="text-sm text-slate-600 italic mb-1">{pond.strainOrLine}</p>
                                    )}
                                    <div className="text-sm text-slate-700 space-y-0.5">
                                      <p><strong>Females:</strong> {pond.femalesCount ?? '—'}</p>
                                      <p><strong>Males:</strong>   {pond.malesCount   ?? '—'}</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          );
                        })}

                      {user?.role === 'admin' && !isEditMode && (
                        <div
                          onClick={() => setShowAddPondModal(true)}
                          className="p-3 md:p-4 border-2 border-dashed border-teal-400 rounded-lg cursor-pointer transition-all hover:shadow-md hover:border-teal-600 hover:bg-teal-50 flex items-center justify-center min-h-[180px]"
                        >
                          <div className="text-center">
                            <Plus className="w-12 h-12 mx-auto text-teal-600 mb-2" />
                            <p className="text-sm font-medium text-teal-700">Create Tank</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {selectedPond && (
        <PondDetailModal
          pond={selectedPond}
          groups={groups}
          departments={departments}
          systems={systems}
          onClose={() => setSelectedPond(null)}
          onUpdate={() => {
            refetchPonds();
            queryClient.invalidateQueries({ queryKey: ['fishBatches'] });
          }}
          getPondStatus={getPondStatus}
          defaultEditing={true}
        />
      )}

      {showMetricsModal && selectedSystem && (
        <SystemMetricsModal
          system={selectedSystem}
          ponds={ponds.filter((p) => p.systemId === selectedSystem.id)}
          onClose={() => setShowMetricsModal(false)}
          onUpdate={() => {
            refetchPonds();
            setShowMetricsModal(false);
          }}
        />
      )}

      {showAddPondModal && (
        <AddPondModal
          defaultSystemId={selectedSystem?.id}
          onClose={() => setShowAddPondModal(false)}
          onSuccess={() => {
            refetchPonds();
            setShowAddPondModal(false);
          }}
        />
      )}
    </div>
  );
}

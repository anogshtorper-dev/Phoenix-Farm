// src/pages/TreatmentCalculator.jsx
// Changes:
//   - Removed base44 import
//   - RASSystem.list() and TreatmentPreset.list() replace entity calls
//   - No auth calls in this page; no other logic changes
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RASSystem, TreatmentPreset } from '@/api';

const BUILT_IN_TREATMENTS = [
  { name: 'Hydrogen Peroxide', concentration: 15,   unit: 'mg/L' },
  { name: 'Formalin Low',      concentration: 15,   unit: 'ml/L' },
  { name: 'Formalin Normal',   concentration: 20,   unit: 'ml/L' },
  { name: 'Formalin High',     concentration: 25,   unit: 'ml/L' },
  { name: 'Praziquantel',      concentration: 2,    unit: 'mg/L' },
  { name: 'Copper Low',        concentration: 0.5,  unit: 'mg/L' },
  { name: 'Copper High',       concentration: 1,    unit: 'mg/L' },
];

export default function TreatmentCalculator() {
  const [selectedSystemId,     setSelectedSystemId]     = useState('');
  const [selectedPreset,       setSelectedPreset]       = useState('');
  const [treatmentName,        setTreatmentName]        = useState('');
  const [targetConcentration,  setTargetConcentration]  = useState('');
  const [unit,                 setUnit]                 = useState('mg/L');
  const [calculatedAmount,     setCalculatedAmount]     = useState(null);

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn:  () => RASSystem.list(),
  });

  const { data: customTreatments = [] } = useQuery({
    queryKey: ['treatment-presets'],
    queryFn:  () => TreatmentPreset.list(),
  });

  const allTreatments = useMemo(() => [
    ...BUILT_IN_TREATMENTS,
    ...customTreatments
      .filter((t) => t.isActive !== false)
      .map((t) => ({ name: t.name, concentration: parseFloat(t.concentration) || 0, unit: t.unit || 'mg/L' })),
  ], [customTreatments]);

  const selectedSystem = systems.find((s) => s.id === selectedSystemId);

  const handlePresetChange = (presetName) => {
    setSelectedPreset(presetName);
    if (presetName === 'custom') {
      setTreatmentName('');
      setTargetConcentration('');
      setUnit('mg/L');
    } else {
      const preset = allTreatments.find((t) => t.name === presetName);
      if (preset) {
        setTreatmentName(preset.name);
        setTargetConcentration(String(preset.concentration));
        setUnit(preset.unit);
      }
    }
    setCalculatedAmount(null);
  };

  const handleCalculate = () => {
    if (!selectedSystem || !targetConcentration) return;
    const volume = selectedSystem.systemVolume || 0;
    const target = parseFloat(targetConcentration);
    setCalculatedAmount(target * volume);
  };

  const handleReset = () => {
    setSelectedSystemId('');
    setSelectedPreset('');
    setTreatmentName('');
    setTargetConcentration('');
    setUnit('mg/L');
    setCalculatedAmount(null);
  };

  return (
    <div
      className="min-h-screen p-6 bg-white relative flex items-center justify-center"
      style={{
        backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939cb8e222f808c3d88aea8/0403c3f43_PhoenixFarmLogo.jpg')`,
        backgroundRepeat:     'no-repeat',
        backgroundPosition:   'center',
        backgroundSize:       'auto',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/95 pointer-events-none" />
      <div className="relative z-10 w-full">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />Back
                </Button>
              </Link>
              <Calculator className="w-7 h-7 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Treatment Calculator</h1>
                <p className="text-sm text-slate-600">Calculate treatment amounts for RAS systems</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculate Treatment Amount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* System selector */}
              <div>
                <Label>Select System *</Label>
                <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a system" />
                  </SelectTrigger>
                  <SelectContent>
                    {systems.filter((s) => s.isActive !== false).map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.systemName} ({system.systemCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* System volume display */}
              {selectedSystem && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-sm font-medium text-teal-900">
                    System Volume:{' '}
                    <span className="text-lg font-bold">
                      {selectedSystem.systemVolume?.toLocaleString() || 0} L
                    </span>
                  </p>
                </div>
              )}

              {/* Treatment preset selector */}
              <div>
                <Label>Select Treatment</Label>
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset treatment or custom" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTreatments.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name} – {t.concentration} {t.unit}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Treatment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Name + concentration inputs */}
              {(selectedPreset === 'custom' || selectedPreset) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Treatment Name</Label>
                    <Input
                      value={treatmentName}
                      onChange={(e) => setTreatmentName(e.target.value)}
                      placeholder="e.g., Salt"
                      readOnly={selectedPreset !== 'custom'}
                      className={selectedPreset !== 'custom' ? 'bg-slate-50' : ''}
                    />
                  </div>
                  <div>
                    <Label>Concentration *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={targetConcentration}
                        onChange={(e) => { setTargetConcentration(e.target.value); setCalculatedAmount(null); }}
                        placeholder="e.g., 15"
                        readOnly={selectedPreset !== 'custom'}
                        className={selectedPreset !== 'custom' ? 'bg-slate-50' : ''}
                      />
                      <Input
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="mg/L"
                        readOnly={selectedPreset !== 'custom'}
                        className={`w-24 ${selectedPreset !== 'custom' ? 'bg-slate-50' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCalculate}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  disabled={!selectedSystemId || !targetConcentration || !selectedPreset}
                >
                  <Calculator className="w-4 h-4 mr-2" />Calculate
                </Button>
                <Button variant="outline" onClick={handleReset}>Reset</Button>
              </div>

              {/* Result */}
              {calculatedAmount !== null && (
                <div className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-lg">
                  <p className="text-sm opacity-90 mb-1">
                    Required Amount for <strong>{selectedSystem?.systemName}</strong>
                  </p>
                  {treatmentName && (
                    <p className="text-sm opacity-90 mb-3">Treatment: {treatmentName}</p>
                  )}
                  <p className="text-4xl font-bold">
                    {calculatedAmount >= 1000
                      ? `${(calculatedAmount / 1000).toFixed(3)} g`
                      : `${calculatedAmount.toFixed(2)} ${unit.includes('ml') ? 'ml' : 'mg'}`}
                  </p>
                  {calculatedAmount >= 1000 && (
                    <p className="text-sm opacity-90 mt-1">
                      = {calculatedAmount.toFixed(0)} {unit.includes('ml') ? 'ml' : 'mg'}
                    </p>
                  )}
                  <p className="text-sm opacity-90 mt-3">
                    {targetConcentration} {unit} × {selectedSystem?.systemVolume?.toLocaleString()} L
                  </p>
                </div>
              )}

              {/* Formula reference */}
              <div className="p-4 bg-slate-50 border rounded-lg text-sm text-slate-600">
                <p className="font-medium mb-2">Formula:</p>
                <p>Amount = Target Concentration × System Volume</p>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

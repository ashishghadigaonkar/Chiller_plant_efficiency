import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Play, Settings } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SimulationPanel({ onSimulationComplete }) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    duration_hours: 24,
    timestep_minutes: 5,
    chw_supply_setpoint: 7.0,
    chw_return_setpoint: 12.0,
    ambient_temp_base: 32.0,
    load_factor: 0.75,
    include_fouling: false,
    fouling_rate: 0.01,
  });

  const [scenarioResults, setScenarioResults] = useState(null);

  const handleSimulation = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/simulation/generate`, config);
      toast.success(`Generated ${response.data.total_records} sensor readings`);
      setScenarioResults(response.data);
      if (onSimulationComplete) {
        onSimulationComplete();
      }
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Failed to generate simulation data');
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioAnalysis = async (scenarioName) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/simulation/scenario`, {
        scenario_name: scenarioName,
        config: config,
      });
      toast.success(`Scenario "${scenarioName}" completed`);
      setScenarioResults(response.data);
      if (onSimulationComplete) {
        onSimulationComplete();
      }
    } catch (error) {
      console.error('Scenario error:', error);
      toast.error('Failed to run scenario');
    } finally {
      setLoading(false);
    }
  };

  const scenarios = [
    { name: 'Baseline', description: 'Current operating conditions' },
    { name: 'High Efficiency', description: 'Optimized setpoints', overrides: { chw_supply_setpoint: 8.0 } },
    { name: 'Peak Load', description: 'Maximum load conditions', overrides: { load_factor: 1.0 } },
    { name: 'Hot Weather', description: 'High ambient temperature', overrides: { ambient_temp_base: 40.0 } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-rajdhani mb-2" data-testid="simulation-title">SIMULATION ENGINE</h2>
        <p className="text-muted-foreground text-sm">Configure parameters and run what-if scenarios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card className="border border-border bg-card" data-testid="config-card">
          <CardHeader>
            <CardTitle className="font-rajdhani flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              SIMULATION PARAMETERS
            </CardTitle>
            <CardDescription>Adjust operating conditions for analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs font-rajdhani uppercase">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={config.duration_hours}
                  onChange={(e) => setConfig({ ...config, duration_hours: parseInt(e.target.value) })}
                  min={1}
                  max={168}
                  className="font-mono"
                  data-testid="input-duration"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timestep" className="text-xs font-rajdhani uppercase">Timestep (min)</Label>
                <Input
                  id="timestep"
                  type="number"
                  value={config.timestep_minutes}
                  onChange={(e) => setConfig({ ...config, timestep_minutes: parseInt(e.target.value) })}
                  min={1}
                  max={60}
                  className="font-mono"
                  data-testid="input-timestep"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chw-supply" className="text-xs font-rajdhani uppercase">CHW Supply (°C)</Label>
                <Input
                  id="chw-supply"
                  type="number"
                  step="0.1"
                  value={config.chw_supply_setpoint}
                  onChange={(e) => setConfig({ ...config, chw_supply_setpoint: parseFloat(e.target.value) })}
                  className="font-mono"
                  data-testid="input-chw-supply"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chw-return" className="text-xs font-rajdhani uppercase">CHW Return (°C)</Label>
                <Input
                  id="chw-return"
                  type="number"
                  step="0.1"
                  value={config.chw_return_setpoint}
                  onChange={(e) => setConfig({ ...config, chw_return_setpoint: parseFloat(e.target.value) })}
                  className="font-mono"
                  data-testid="input-chw-return"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ambient" className="text-xs font-rajdhani uppercase">Ambient Temp (°C)</Label>
                <Input
                  id="ambient"
                  type="number"
                  step="0.1"
                  value={config.ambient_temp_base}
                  onChange={(e) => setConfig({ ...config, ambient_temp_base: parseFloat(e.target.value) })}
                  className="font-mono"
                  data-testid="input-ambient"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="load-factor" className="text-xs font-rajdhani uppercase">Load Factor</Label>
                <Input
                  id="load-factor"
                  type="number"
                  step="0.05"
                  value={config.load_factor}
                  onChange={(e) => setConfig({ ...config, load_factor: parseFloat(e.target.value) })}
                  min={0.3}
                  max={1.0}
                  className="font-mono"
                  data-testid="input-load-factor"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-sm border border-border">
              <div>
                <Label htmlFor="fouling" className="text-sm font-rajdhani">INCLUDE FOULING DEGRADATION</Label>
                <p className="text-xs text-muted-foreground mt-1">Simulate efficiency loss over time</p>
              </div>
              <Switch
                id="fouling"
                checked={config.include_fouling}
                onCheckedChange={(checked) => setConfig({ ...config, include_fouling: checked })}
                data-testid="switch-fouling"
              />
            </div>

            <Button
              onClick={handleSimulation}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-rajdhani uppercase tracking-wider"
              data-testid="btn-run-simulation"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'RUNNING...' : 'RUN SIMULATION'}
            </Button>
          </CardContent>
        </Card>

        {/* Scenarios Panel */}
        <Card className="border border-border bg-card" data-testid="scenarios-card">
          <CardHeader>
            <CardTitle className="font-rajdhani">WHAT-IF SCENARIOS</CardTitle>
            <CardDescription>Pre-configured analysis scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenarios.map((scenario, index) => (
              <div
                key={index}
                className="p-4 bg-secondary/30 rounded-sm border border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => {
                  const scenarioConfig = { ...config, ...scenario.overrides };
                  setConfig(scenarioConfig);
                  handleScenarioAnalysis(scenario.name);
                }}
                data-testid={`scenario-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-rajdhani text-sm uppercase text-foreground">{scenario.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
                  </div>
                  <Play className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Results Summary */}
      {scenarioResults && (
        <Card className="border border-primary/50 bg-card" data-testid="results-card">
          <CardHeader>
            <CardTitle className="font-rajdhani text-primary">SIMULATION RESULTS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div data-testid="result-total-records">
                <p className="text-xs text-muted-foreground uppercase font-rajdhani">Total Records</p>
                <p className="text-2xl font-mono data-value text-foreground">{scenarioResults.total_records || scenarioResults.summary?.duration_hours * 12}</p>
              </div>
              {scenarioResults.summary && (
                <>
                  <div data-testid="result-avg-kw-tr">
                    <p className="text-xs text-muted-foreground uppercase font-rajdhani">Avg kW/TR</p>
                    <p className="text-2xl font-mono data-value text-primary">{scenarioResults.summary.avg_kw_per_tr}</p>
                  </div>
                  <div data-testid="result-avg-cop">
                    <p className="text-xs text-muted-foreground uppercase font-rajdhani">Avg COP</p>
                    <p className="text-2xl font-mono data-value text-foreground">{scenarioResults.summary.avg_cop}</p>
                  </div>
                  <div data-testid="result-total-energy">
                    <p className="text-xs text-muted-foreground uppercase font-rajdhani">Total Energy</p>
                    <p className="text-2xl font-mono data-value text-foreground">{scenarioResults.summary.total_energy_kwh.toFixed(1)} <span className="text-sm text-muted-foreground">kWh</span></p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets, Zap, TrendingUp, Gauge, Wind } from 'lucide-react';

export default function MetricsGrid({ summaryData }) {
  if (!summaryData) {
    return <div className="text-center text-muted-foreground">No data available</div>;
  }

  const { current_metrics, sensor_data } = summaryData;

  const getEfficiencyColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'text-primary';
      case 'average':
        return 'text-yellow-500';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const metrics = [
    {
      title: 'Chiller kW/TR',
      value: current_metrics.kw_per_tr.toFixed(3),
      unit: '',
      icon: Gauge,
      status: current_metrics.efficiency_status,
      description: 'Equipment Efficiency',
      testId: 'metric-kw-per-tr'
    },
    {
      title: 'Plant kW/TR',
      value: current_metrics.plant_kw_per_tr?.toFixed(3) || current_metrics.kw_per_tr.toFixed(3),
      unit: '',
      icon: Zap,
      status: current_metrics.plant_efficiency_status || current_metrics.efficiency_status,
      description: 'Total System Efficiency (Electricity Bill Impact)',
      testId: 'metric-plant-kw-per-tr',
      highlight: true
    },
    {
      title: 'COP',
      value: current_metrics.cop.toFixed(2),
      unit: '',
      icon: TrendingUp,
      status: current_metrics.cop > 5 ? 'excellent' : current_metrics.cop > 4 ? 'average' : 'poor',
      description: 'Coefficient of Performance',
      testId: 'metric-cop'
    },
    {
      title: 'Cooling Load',
      value: current_metrics.cooling_load_kw.toFixed(1),
      unit: 'kW',
      icon: Zap,
      description: 'Current Load',
      testId: 'metric-cooling-load'
    },
    {
      title: 'Cooling Capacity',
      value: current_metrics.cooling_capacity_tr.toFixed(1),
      unit: 'TR',
      icon: Wind,
      description: 'Tons of Refrigeration',
      testId: 'metric-cooling-capacity'
    },
    {
      title: 'CHW ΔT',
      value: current_metrics.delta_t.toFixed(1),
      unit: '°C',
      icon: Thermometer,
      status: current_metrics.delta_t > 4 ? 'excellent' : 'average',
      description: 'Temperature Difference',
      testId: 'metric-delta-t'
    },
  ];

  const powerMetrics = [
    { label: 'Chiller', value: sensor_data.chiller_power?.toFixed(1) || '0', unit: 'kW', testId: 'power-chiller' },
    { label: 'CHW Pump', value: sensor_data.chw_pump_power?.toFixed(1) || 'N/A', unit: 'kW', testId: 'power-chw-pump' },
    { label: 'CW Pump', value: sensor_data.cw_pump_power?.toFixed(1) || 'N/A', unit: 'kW', testId: 'power-cw-pump' },
    { label: 'Tower Fan', value: sensor_data.tower_fan_power?.toFixed(1) || 'N/A', unit: 'kW', testId: 'power-tower-fan' },
    { label: 'Total Plant', value: current_metrics.total_plant_power?.toFixed(1) || sensor_data.chiller_power?.toFixed(1), unit: 'kW', testId: 'power-total', highlight: true },
  ];

  const sensorReadings = [
    { label: 'CHW Supply', value: sensor_data.chw_supply_temp.toFixed(1), unit: '°C', testId: 'sensor-chw-supply' },
    { label: 'CHW Return', value: sensor_data.chw_return_temp.toFixed(1), unit: '°C', testId: 'sensor-chw-return' },
    { label: 'CHW Flow', value: sensor_data.chw_flow_rate.toFixed(1), unit: 'L/s', testId: 'sensor-chw-flow' },
    { label: 'Cond Inlet', value: sensor_data.cond_inlet_temp.toFixed(1), unit: '°C', testId: 'sensor-cond-inlet' },
    { label: 'Cond Outlet', value: sensor_data.cond_outlet_temp.toFixed(1), unit: '°C', testId: 'sensor-cond-outlet' },
    { label: 'Ambient Temp', value: sensor_data.ambient_temp.toFixed(1), unit: '°C', testId: 'sensor-ambient' },
    { label: 'Wet Bulb', value: sensor_data.wet_bulb_temp?.toFixed(1) || 'N/A', unit: '°C', testId: 'sensor-wet-bulb' },
  ];

  const towerMetrics = [
    { label: 'Range', value: current_metrics.tower_range?.toFixed(1) || 'N/A', unit: '°C', testId: 'tower-range' },
    { label: 'Approach', value: current_metrics.tower_approach?.toFixed(1) || 'N/A', unit: '°C', testId: 'tower-approach' },
    { label: 'Heat Rejected', value: current_metrics.heat_rejected_kw?.toFixed(1) || 'N/A', unit: 'kW', testId: 'tower-heat-rejected' },
    { label: 'Fan Speed', value: sensor_data.tower_fan_speed?.toFixed(0) || 'N/A', unit: '%', testId: 'tower-fan-speed' },
  ];

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div>
        <h2 className="text-2xl font-rajdhani mb-4" data-testid="kpi-section-title">KEY PERFORMANCE INDICATORS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card 
                key={index} 
                className={`border border-border bg-card ${metric.highlight ? 'ring-2 ring-primary/50' : 'card-border-glow'}`} 
                data-testid={metric.testId}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm font-rajdhani">
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      {metric.title}
                    </span>
                    {metric.status && (
                      <span className={`text-xs uppercase ${getEfficiencyColor(metric.status)}`}>
                        {metric.status}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-3xl font-mono data-value">
                      {metric.value}
                      <span className="text-lg text-muted-foreground ml-1">{metric.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Power Consumption Breakdown */}
      <div>
        <h2 className="text-2xl font-rajdhani mb-4" data-testid="power-section-title">POWER CONSUMPTION BREAKDOWN</h2>
        <Card className="border border-border bg-card" data-testid="power-breakdown-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {powerMetrics.map((reading, index) => (
                <div key={index} className="space-y-1" data-testid={reading.testId}>
                  <p className={`text-xs uppercase font-rajdhani tracking-wider ${reading.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                    {reading.label}
                  </p>
                  <p className={`text-2xl font-mono data-value ${reading.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {reading.value}
                    <span className="text-sm text-muted-foreground ml-1">{reading.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cooling Tower Performance */}
      {(current_metrics.tower_range || current_metrics.tower_approach) && (
        <div>
          <h2 className="text-2xl font-rajdhani mb-4" data-testid="tower-section-title">COOLING TOWER PERFORMANCE</h2>
          <Card className="border border-border bg-card" data-testid="tower-performance-card">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {towerMetrics.map((reading, index) => (
                  <div key={index} className="space-y-1" data-testid={reading.testId}>
                    <p className="text-xs text-muted-foreground uppercase font-rajdhani tracking-wider">
                      {reading.label}
                    </p>
                    <p className="text-2xl font-mono data-value text-foreground">
                      {reading.value}
                      <span className="text-sm text-muted-foreground ml-1">{reading.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-secondary/30 rounded-sm border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Optimal:</strong> Range 4-8°C, Approach &lt;4°C. 
                  Lower approach indicates better cooling tower efficiency.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Financial Metrics */}
      {current_metrics.energy_cost_per_hour && (
        <div>
          <h2 className="text-2xl font-rajdhani mb-4" data-testid="financial-section-title">FINANCIAL & ENVIRONMENTAL IMPACT</h2>
          <Card className="border border-primary/50 bg-card" data-testid="financial-card">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div data-testid="cost-per-hour">
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani tracking-wider">Energy Cost / Hour</p>
                  <p className="text-3xl font-mono data-value text-primary">
                    ₹{current_metrics.energy_cost_per_hour.toFixed(0)}
                  </p>
                </div>
                <div data-testid="potential-savings">
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani tracking-wider">Potential Savings</p>
                  <p className="text-3xl font-mono data-value text-yellow-500">
                    {current_metrics.potential_savings_percent?.toFixed(1) || '0'}%
                  </p>
                </div>
                <div data-testid="annual-savings">
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani tracking-wider">Annual Savings Potential</p>
                  <p className="text-2xl font-mono data-value text-primary">
                    ₹{(current_metrics.potential_savings_inr_per_year / 100000)?.toFixed(2) || '0'} L
                  </p>
                </div>
                <div data-testid="co2-emissions">
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani tracking-wider">CO₂ Emissions / Hour</p>
                  <p className="text-2xl font-mono data-value text-foreground">
                    {current_metrics.co2_emissions_kg_per_hour?.toFixed(1) || '0'} kg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sensor Readings */}
      <div>
        <h2 className="text-2xl font-rajdhani mb-4" data-testid="sensor-section-title">LIVE SENSOR READINGS</h2>
        <Card className="border border-border bg-card" data-testid="sensor-readings-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {sensorReadings.map((reading, index) => (
                <div key={index} className="space-y-1" data-testid={reading.testId}>
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani tracking-wider">
                    {reading.label}
                  </p>
                  <p className="text-2xl font-mono data-value text-foreground">
                    {reading.value}
                    <span className="text-sm text-muted-foreground ml-1">{reading.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Industry Benchmarks Info */}
      <Card className="border border-border bg-card" data-testid="benchmarks-card">
        <CardHeader>
          <CardTitle className="font-rajdhani">INDUSTRY EFFICIENCY BENCHMARKS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Chiller Benchmarks */}
            <div>
              <h3 className="font-rajdhani text-sm mb-3 text-primary">CHILLER EFFICIENCY (kW/TR)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2" data-testid="chiller-benchmark-excellent">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="font-rajdhani text-sm">EXCELLENT</span>
                  </div>
                  <p className="text-xl font-mono data-value text-primary">&lt; 0.6 kW/TR</p>
                  <p className="text-xs text-muted-foreground">Best-in-class chiller performance</p>
                </div>
                <div className="space-y-2" data-testid="chiller-benchmark-average">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-rajdhani text-sm">EFFICIENT</span>
                  </div>
                  <p className="text-xl font-mono data-value text-yellow-500">0.6 - 0.8 kW/TR</p>
                  <p className="text-xs text-muted-foreground">Standard performance</p>
                </div>
                <div className="space-y-2" data-testid="chiller-benchmark-poor">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <span className="font-rajdhani text-sm">POOR</span>
                  </div>
                  <p className="text-xl font-mono data-value text-red-400">&gt; 0.8 kW/TR</p>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </div>
              </div>
            </div>
            
            {/* Plant Benchmarks */}
            <div>
              <h3 className="font-rajdhani text-sm mb-3 text-primary">PLANT EFFICIENCY (kW/TR) - Includes All Auxiliaries</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2" data-testid="plant-benchmark-excellent">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="font-rajdhani text-sm">EXCELLENT</span>
                  </div>
                  <p className="text-xl font-mono data-value text-primary">&lt; 0.75 kW/TR</p>
                  <p className="text-xs text-muted-foreground">World-class total system efficiency</p>
                </div>
                <div className="space-y-2" data-testid="plant-benchmark-average">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-rajdhani text-sm">GOOD</span>
                  </div>
                  <p className="text-xl font-mono data-value text-yellow-500">0.75 - 0.95 kW/TR</p>
                  <p className="text-xs text-muted-foreground">Acceptable plant performance</p>
                </div>
                <div className="space-y-2" data-testid="plant-benchmark-poor">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <span className="font-rajdhani text-sm">POOR</span>
                  </div>
                  <p className="text-xl font-mono data-value text-red-400">&gt; 0.95 kW/TR</p>
                  <p className="text-xs text-muted-foreground">Optimization needed</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

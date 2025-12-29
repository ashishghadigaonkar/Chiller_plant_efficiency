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
      title: 'kW/TR',
      value: current_metrics.kw_per_tr.toFixed(3),
      unit: '',
      icon: Gauge,
      status: current_metrics.efficiency_status,
      description: 'Efficiency Ratio',
      testId: 'metric-kw-per-tr'
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
    {
      title: 'Chiller Power',
      value: sensor_data.chiller_power.toFixed(1),
      unit: 'kW',
      icon: Zap,
      description: 'Power Consumption',
      testId: 'metric-chiller-power'
    },
  ];

  const sensorReadings = [
    { label: 'CHW Supply', value: sensor_data.chw_supply_temp.toFixed(1), unit: '°C', testId: 'sensor-chw-supply' },
    { label: 'CHW Return', value: sensor_data.chw_return_temp.toFixed(1), unit: '°C', testId: 'sensor-chw-return' },
    { label: 'CHW Flow', value: sensor_data.chw_flow_rate.toFixed(1), unit: 'L/s', testId: 'sensor-chw-flow' },
    { label: 'Cond Inlet', value: sensor_data.cond_inlet_temp.toFixed(1), unit: '°C', testId: 'sensor-cond-inlet' },
    { label: 'Cond Outlet', value: sensor_data.cond_outlet_temp.toFixed(1), unit: '°C', testId: 'sensor-cond-outlet' },
    { label: 'Ambient Temp', value: sensor_data.ambient_temp.toFixed(1), unit: '°C', testId: 'sensor-ambient' },
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
              <Card key={index} className="border border-border bg-card card-border-glow" data-testid={metric.testId}>
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

      {/* Sensor Readings */}
      <div>
        <h2 className="text-2xl font-rajdhani mb-4" data-testid="sensor-section-title">LIVE SENSOR READINGS</h2>
        <Card className="border border-border bg-card" data-testid="sensor-readings-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <CardTitle className="font-rajdhani">INDUSTRY EFFICIENCY BENCHMARKS (kW/TR)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2" data-testid="benchmark-excellent">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="font-rajdhani text-sm">EXCELLENT</span>
              </div>
              <p className="text-xl font-mono data-value text-primary">&lt; 0.6 kW/TR</p>
              <p className="text-xs text-muted-foreground">Best-in-class efficiency. Optimal operating conditions.</p>
            </div>
            <div className="space-y-2" data-testid="benchmark-average">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="font-rajdhani text-sm">AVERAGE</span>
              </div>
              <p className="text-xl font-mono data-value text-yellow-500">0.6 - 0.8 kW/TR</p>
              <p className="text-xs text-muted-foreground">Standard performance. Room for optimization.</p>
            </div>
            <div className="space-y-2" data-testid="benchmark-poor">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="font-rajdhani text-sm">POOR</span>
              </div>
              <p className="text-xl font-mono data-value text-red-400">&gt; 0.8 kW/TR</p>
              <p className="text-xs text-muted-foreground">Below optimal. Requires immediate attention.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

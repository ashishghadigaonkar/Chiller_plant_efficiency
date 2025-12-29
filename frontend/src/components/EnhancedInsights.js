import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ComposedChart, LineChart, BarChart, Bar, Line, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';

export default function EnhancedInsights({ historicalData, summaryData }) {
  if (!historicalData || historicalData.length === 0) {
    return (
      <Card className="border border-border bg-card" data-testid="no-data-card">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No historical data available. Generate simulation data to see insights.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = historicalData.slice().reverse().map((record, index) => ({
    index: index + 1,
    timestamp: new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    // Load vs Power
    cooling_load: parseFloat(record.cooling_load_kw?.toFixed(1) || 0),
    total_power: parseFloat(record.total_plant_power?.toFixed(1) || record.chiller_power?.toFixed(1) || 0),
    chiller_power: parseFloat(record.chiller_power?.toFixed(1) || 0),
    // Efficiency with benchmarks
    plant_kw_per_tr: parseFloat(record.plant_kw_per_tr?.toFixed(3) || record.kw_per_tr?.toFixed(3) || 0),
    // Tower Performance
    tower_approach: parseFloat(record.tower_approach?.toFixed(2) || 0),
    cond_outlet_temp: parseFloat(record.cond_outlet_temp?.toFixed(2) || 0),
    cond_inlet_temp: parseFloat(record.cond_inlet_temp?.toFixed(2) || 0),
    // Delta-T
    delta_t: parseFloat(record.delta_t?.toFixed(2) || 0),
    // ML Predicted (simulated for demo - replace with actual ML predictions)
    predicted_efficiency: parseFloat((record.plant_kw_per_tr * (0.95 + Math.random() * 0.1))?.toFixed(3) || 0),
    actual_efficiency: parseFloat(record.plant_kw_per_tr?.toFixed(3) || 0),
  }));

  // Calculate cost impact data
  const BASELINE_KW_TR = 0.85;
  const TARIFF = 8.0;
  const HOURS_PER_DAY = 16;
  
  const costImpactData = chartData.slice(-10).map(d => {
    const current_cost = d.total_power * TARIFF;
    const baseline_power = BASELINE_KW_TR * (d.cooling_load / 3.517); // Convert to TR
    const optimized_cost = baseline_power * TARIFF;
    const savings = current_cost - optimized_cost;
    
    return {
      timestamp: d.timestamp,
      current_cost: parseFloat(current_cost.toFixed(2)),
      optimized_cost: parseFloat(optimized_cost.toFixed(2)),
      savings: parseFloat(Math.max(0, savings).toFixed(2))
    };
  });

  // Get color for plant kW/TR benchmark
  const getEfficiencyColor = (value) => {
    if (value < 0.6) return '#66FCF1'; // Excellent - Green
    if (value < 0.75) return '#45A29E'; // Good - Yellow-green
    if (value < 0.85) return '#FFA500'; // Warning - Orange
    return '#FF2E63'; // Critical - Red
  };

  // Chiller sequencing logic
  const currentLoad = summaryData?.current_metrics?.cooling_capacity_tr || 0;
  const currentPower = summaryData?.current_metrics?.total_plant_power || 0;
  const loadPercent = currentLoad > 0 ? (currentPower / (currentLoad * 3.517)) * 100 : 0;
  
  const sequencingStatus = loadPercent >= 65 && loadPercent <= 80 ? 'optimal' : 
                          loadPercent < 65 ? 'underloaded' : 'overloaded';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-sm shadow-lg">
          <p className="text-xs text-muted-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" data-testid="enhanced-insights">
      <div>
        <h2 className="text-2xl font-rajdhani mb-2" data-testid="insights-title">ENHANCED DASHBOARD INSIGHTS</h2>
        <p className="text-muted-foreground text-sm">Advanced visualizations for engineering insight and fault diagnosis</p>
      </div>

      {/* 1. Cooling Load vs Total Power (Combo Chart) */}
      <Card className="border border-border bg-card" data-testid="chart-load-vs-power">
        <CardHeader>
          <CardTitle className="font-rajdhani">1. COOLING LOAD vs TOTAL POWER</CardTitle>
          <CardDescription>
            Power rise proportionality check - If power increases faster than load → inefficiency alert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                label={{ value: 'kW', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="cooling_load" 
                fill="rgba(102, 252, 241, 0.3)" 
                stroke="#66FCF1" 
                name="Cooling Load (kW)"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="total_power" 
                stroke="#FF2E63" 
                strokeWidth={3}
                dot={{ fill: '#FF2E63', r: 4 }} 
                name="Total Power (kW)"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="chiller_power" 
                stroke="#FFA500" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Chiller Only (kW)"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-secondary/30 rounded-sm border border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Analysis:</strong> Monitor if total power rises faster than cooling load. 
              Parallel trends = good efficiency. Diverging trends = system degradation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Plant kW/TR Trend with Benchmark Bands */}
      <Card className="border border-border bg-card" data-testid="chart-kwtr-benchmark">
        <CardHeader>
          <CardTitle className="font-rajdhani">2. PLANT kW/TR TREND WITH BENCHMARK BANDS</CardTitle>
          <CardDescription>
            Color-coded efficiency zones: Green (Excellent), Yellow (Acceptable), Orange (Warning), Red (Critical)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                domain={[0.4, 1.2]}
                label={{ value: 'kW/TR', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
              
              {/* Benchmark zones */}
              <ReferenceLine y={0.6} stroke="#66FCF1" strokeDasharray="5 5" label={{ value: 'Excellent (<0.60)', position: 'right', fill: '#66FCF1', fontSize: 10 }} />
              <ReferenceLine y={0.75} stroke="#45A29E" strokeDasharray="5 5" label={{ value: 'Acceptable (0.60-0.75)', position: 'right', fill: '#45A29E', fontSize: 10 }} />
              <ReferenceLine y={0.85} stroke="#FFA500" strokeDasharray="5 5" label={{ value: 'Warning (0.75-0.85)', position: 'right', fill: '#FFA500', fontSize: 10 }} />
              
              <Line 
                type="monotone" 
                dataKey="plant_kw_per_tr" 
                stroke="#66FCF1" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={5} 
                      fill={getEfficiencyColor(payload.plant_kw_per_tr)}
                      stroke="#1A1A2E"
                      strokeWidth={2}
                    />
                  );
                }}
                name="Plant kW/TR"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#66FCF1]"></div>
              <span className="text-xs">Excellent (&lt;0.60)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#45A29E]"></div>
              <span className="text-xs">Good (0.60-0.75)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FFA500]"></div>
              <span className="text-xs">Warning (0.75-0.85)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FF2E63]"></div>
              <span className="text-xs">Critical (&gt;0.85)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Cooling Tower Approach vs Condenser Temperature */}
      <Card className="border border-border bg-card" data-testid="chart-tower-approach">
        <CardHeader>
          <CardTitle className="font-rajdhani">3. COOLING TOWER APPROACH vs CONDENSER TEMPERATURE</CardTitle>
          <CardDescription>
            Approach &gt;4°C → performance deterioration | &gt;6°C → fouling or airflow issue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
              
              <ReferenceLine y={4} stroke="#45A29E" strokeDasharray="5 5" label={{ value: 'Good Approach (4°C)', position: 'right', fill: '#45A29E', fontSize: 10 }} />
              <ReferenceLine y={6} stroke="#FFA500" strokeDasharray="5 5" label={{ value: 'Critical (6°C)', position: 'right', fill: '#FFA500', fontSize: 10 }} />
              
              <Line 
                type="monotone" 
                dataKey="tower_approach" 
                stroke="#FF2E63" 
                strokeWidth={3}
                dot={{ fill: '#FF2E63', r: 4 }} 
                name="Approach (°C)"
              />
              <Line 
                type="monotone" 
                dataKey="cond_outlet_temp" 
                stroke="#66FCF1" 
                strokeWidth={2}
                dot={{ fill: '#66FCF1', r: 3 }} 
                name="Condenser Outlet (°C)"
              />
              <Line 
                type="monotone" 
                dataKey="cond_inlet_temp" 
                stroke="#FFA500" 
                strokeWidth={2}
                strokeDasharray="3 3"
                name="Condenser Inlet (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. ΔT Stability Chart */}
      <Card className="border border-border bg-card" data-testid="chart-delta-t">
        <CardHeader>
          <CardTitle className="font-rajdhani">4. ΔT STABILITY CHART (CHW RETURN - SUPPLY)</CardTitle>
          <CardDescription>
            ΔT &lt;4°C → bypass/over-pumping | 5-7°C → healthy zone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                domain={[0, 10]}
                label={{ value: 'ΔT (°C)', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
              
              <ReferenceLine y={4} stroke="#FFA500" strokeDasharray="5 5" label={{ value: 'Min Healthy (4°C)', position: 'right', fill: '#FFA500', fontSize: 10 }} />
              <ReferenceLine y={7} stroke="#66FCF1" strokeDasharray="5 5" label={{ value: 'Max Healthy (7°C)', position: 'right', fill: '#66FCF1', fontSize: 10 }} />
              
              <Area 
                type="monotone" 
                dataKey="delta_t" 
                stroke="#66FCF1" 
                fill="rgba(102, 252, 241, 0.4)" 
                strokeWidth={3}
                name="ΔT (°C)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-secondary/30 rounded-sm border border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Diagnosis:</strong> Low ΔT indicates over-pumping or bypass flow. 
              Target 5-7°C for optimal heat transfer efficiency.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. Cost Impact & Savings Graph */}
      <Card className="border border-border bg-card" data-testid="chart-cost-savings">
        <CardHeader>
          <CardTitle className="font-rajdhani">5. COST IMPACT & ₹ SAVINGS GRAPH</CardTitle>
          <CardDescription>
            Current vs optimized setpoint cost comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={costImpactData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                label={{ value: '₹/hour', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
              <Bar dataKey="current_cost" fill="#FF2E63" name="Current Cost" />
              <Bar dataKey="optimized_cost" fill="#66FCF1" name="Optimized Cost" />
              <Bar dataKey="savings" fill="#45A29E" name="Potential Savings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 6. ML Predicted vs Actual Efficiency */}
      <Card className="border border-border bg-card" data-testid="chart-ml-prediction">
        <CardHeader>
          <CardTitle className="font-rajdhani">6. ML PREDICTED vs ACTUAL EFFICIENCY</CardTitle>
          <CardDescription>
            Gap between curves highlights hidden degradation or anomalies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              />
              <YAxis 
                stroke="#C5C6C7" 
                style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                label={{ value: 'Plant kW/TR', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
              <Line 
                type="monotone" 
                dataKey="predicted_efficiency" 
                stroke="#66FCF1" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#66FCF1', r: 3 }} 
                name="ML Predicted"
              />
              <Line 
                type="monotone" 
                dataKey="actual_efficiency" 
                stroke="#FF2E63" 
                strokeWidth={3}
                dot={{ fill: '#FF2E63', r: 4 }} 
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-3 bg-secondary/30 rounded-sm border border-border">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> Significant divergence indicates potential equipment degradation or operating condition changes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 7. Chiller Sequencing Status Blocks */}
      <Card className="border border-border bg-card" data-testid="chart-sequencing">
        <CardHeader>
          <CardTitle className="font-rajdhani">7. CHILLER SEQUENCING STATUS</CardTitle>
          <CardDescription>
            Optimal chiller operation band: 65-80% load for maximum efficiency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-6 rounded-lg border-2 text-center ${
                sequencingStatus === 'underloaded' ? 'border-yellow-500 bg-yellow-500/10' : 'border-border bg-secondary/30'
              }`} data-testid="status-underloaded">
                <h3 className="text-sm font-rajdhani mb-2 text-yellow-500">UNDERLOADED</h3>
                <p className="text-3xl font-mono mb-2">&lt;65%</p>
                <p className="text-xs text-muted-foreground">Consider shutting down one chiller</p>
              </div>
              
              <div className={`p-6 rounded-lg border-2 text-center ${
                sequencingStatus === 'optimal' ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'
              }`} data-testid="status-optimal">
                <h3 className="text-sm font-rajdhani mb-2 text-primary">OPTIMAL</h3>
                <p className="text-3xl font-mono mb-2">65-80%</p>
                <p className="text-xs text-muted-foreground">Best efficiency zone</p>
              </div>
              
              <div className={`p-6 rounded-lg border-2 text-center ${
                sequencingStatus === 'overloaded' ? 'border-red-500 bg-red-500/10' : 'border-border bg-secondary/30'
              }`} data-testid="status-overloaded">
                <h3 className="text-sm font-rajdhani mb-2 text-red-400">OVERLOADED</h3>
                <p className="text-3xl font-mono mb-2">&gt;80%</p>
                <p className="text-xs text-muted-foreground">Consider starting additional chiller</p>
              </div>
            </div>

            <div className="p-4 bg-secondary/50 rounded-sm border border-border">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-rajdhani">CURRENT LOAD STATUS</span>
                <Badge variant={sequencingStatus === 'optimal' ? 'default' : 'secondary'} data-testid="current-status-badge">
                  {sequencingStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cooling Capacity:</span>
                  <span className="font-mono">{currentLoad.toFixed(1)} TR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Power:</span>
                  <span className="font-mono">{currentPower.toFixed(1)} kW</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Load Percentage:</span>
                  <span className="font-mono text-primary">{loadPercent.toFixed(1)}%</span>
                </div>
              </div>
              
              {sequencingStatus === 'optimal' && (
                <p className="mt-3 text-xs text-primary">
                  ✓ Chillers operating in optimal efficiency range. Maintain current configuration.
                </p>
              )}
              {sequencingStatus === 'underloaded' && (
                <p className="mt-3 text-xs text-yellow-500">
                  ⚠ Load below optimal range. Consider load redistribution or chiller shutdown.
                </p>
              )}
              {sequencingStatus === 'overloaded' && (
                <p className="mt-3 text-xs text-red-400">
                  ⚠ Load above optimal range. Risk of efficiency loss. Consider staging additional chiller.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

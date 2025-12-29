import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TrendsChart({ historicalData }) {
  if (!historicalData || historicalData.length === 0) {
    return (
      <Card className="border border-border bg-card" data-testid="no-data-card">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No historical data available. Generate simulation data to see trends.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const chartData = historicalData.slice().reverse().map((record, index) => ({
    index: index + 1,
    timestamp: new Date(record.timestamp).toLocaleTimeString(),
    kw_per_tr: parseFloat(record.kw_per_tr?.toFixed(3) || 0),
    cop: parseFloat(record.cop?.toFixed(2) || 0),
    cooling_load: parseFloat(record.cooling_load_kw?.toFixed(1) || 0),
    chiller_power: parseFloat(record.chiller_power?.toFixed(1) || 0),
    ambient_temp: parseFloat(record.ambient_temp?.toFixed(1) || 0),
    delta_t: parseFloat(record.delta_t?.toFixed(1) || 0),
  }));

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-rajdhani mb-2" data-testid="trends-title">HISTORICAL TRENDS ANALYSIS</h2>
        <p className="text-muted-foreground text-sm">Time-series visualization of chiller plant performance metrics</p>
      </div>

      <Tabs defaultValue="efficiency" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-secondary border border-border" data-testid="trends-tabs">
          <TabsTrigger value="efficiency" data-testid="tab-efficiency">Efficiency Trend</TabsTrigger>
          <TabsTrigger value="power" data-testid="tab-power">Load vs Power</TabsTrigger>
          <TabsTrigger value="cop-ambient" data-testid="tab-cop-ambient">COP vs Ambient</TabsTrigger>
          <TabsTrigger value="delta-t" data-testid="tab-delta-t">ΔT Analysis</TabsTrigger>
        </TabsList>

        {/* kW/TR Trend */}
        <TabsContent value="efficiency" data-testid="efficiency-chart">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-rajdhani">kW/TR EFFICIENCY TREND</CardTitle>
              <CardDescription>Lower values indicate better efficiency</CardDescription>
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
                    label={{ value: 'kW/TR', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
                  <Line 
                    type="monotone" 
                    dataKey="kw_per_tr" 
                    stroke="#66FCF1" 
                    strokeWidth={2} 
                    dot={{ fill: '#66FCF1', r: 3 }} 
                    name="kW/TR"
                  />
                  {/* Benchmark lines */}
                  <Line type="monotone" dataKey={() => 0.6} stroke="#45A29E" strokeDasharray="5 5" name="Excellent (<0.6)" />
                  <Line type="monotone" dataKey={() => 0.8} stroke="#FFA500" strokeDasharray="5 5" name="Average (<0.8)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cooling Load vs Power */}
        <TabsContent value="power" data-testid="power-chart">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-rajdhani">COOLING LOAD vs CHILLER POWER</CardTitle>
              <CardDescription>Relationship between load and power consumption</CardDescription>
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
                    label={{ value: 'kW', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
                  <Area 
                    type="monotone" 
                    dataKey="cooling_load" 
                    stackId="1"
                    stroke="#66FCF1" 
                    fill="rgba(102, 252, 241, 0.3)" 
                    name="Cooling Load (kW)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="chiller_power" 
                    stackId="2"
                    stroke="#FF2E63" 
                    fill="rgba(255, 46, 99, 0.3)" 
                    name="Chiller Power (kW)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COP vs Ambient Temperature */}
        <TabsContent value="cop-ambient" data-testid="cop-ambient-chart">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-rajdhani">COP vs AMBIENT TEMPERATURE</CardTitle>
              <CardDescription>Impact of ambient conditions on efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    type="number" 
                    dataKey="ambient_temp" 
                    name="Ambient Temp" 
                    unit="°C"
                    stroke="#C5C6C7" 
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                    label={{ value: 'Ambient Temperature (°C)', position: 'insideBottom', offset: -5, style: { fill: '#C5C6C7' } }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="cop" 
                    name="COP"
                    stroke="#C5C6C7" 
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                    label={{ value: 'COP', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
                  <Scatter 
                    name="COP vs Ambient Temp" 
                    data={chartData} 
                    fill="#66FCF1" 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delta-T Analysis */}
        <TabsContent value="delta-t" data-testid="delta-t-chart">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-rajdhani">ΔT TEMPERATURE DIFFERENCE</CardTitle>
              <CardDescription>CHW Return-Supply temperature differential</CardDescription>
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
                    label={{ value: 'ΔT (°C)', angle: -90, position: 'insideLeft', style: { fill: '#C5C6C7' } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'Rajdhani' }} />
                  <Line 
                    type="monotone" 
                    dataKey="delta_t" 
                    stroke="#FFA500" 
                    strokeWidth={2} 
                    dot={{ fill: '#FFA500', r: 3 }} 
                    name="ΔT"
                  />
                  {/* Optimal line */}
                  <Line type="monotone" dataKey={() => 5} stroke="#45A29E" strokeDasharray="5 5" name="Target (5°C)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-secondary/50 rounded-sm border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Analysis:</strong> Higher ΔT values (4-6°C) indicate efficient heat transfer. 
                  Low ΔT suggests excessive flow or low load conditions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

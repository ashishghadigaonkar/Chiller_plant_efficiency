import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, Gauge, Fan, Droplets, Waves, TrendingUp, 
  AlertTriangle, CheckCircle2, Settings, Info 
} from 'lucide-react';
import axios from 'axios';
import ComponentDetailModal from './ComponentDetailModal';
import './VirtualPlantLayout.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VirtualPlantLayout() {
  const [plantStatus, setPlantStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [hoveredComponent, setHoveredComponent] = useState(null);
  const [mode, setMode] = useState('live'); // 'live' or 'twin'

  useEffect(() => {
    fetchPlantStatus();
    const interval = setInterval(fetchPlantStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlantStatus = async () => {
    try {
      const response = await axios.get(`${API}/plant/status`);
      setPlantStatus(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plant status:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (color) => {
    if (color === 'green') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (color === 'yellow') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    if (color === 'red') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    return <Activity className="w-5 h-5 text-gray-500" />;
  };

  const getComponentIcon = (type) => {
    switch (type) {
      case 'chiller': return <Gauge className="w-8 h-8" />;
      case 'cooling_tower': return <Fan className="w-8 h-8" />;
      case 'pump': return <Waves className="w-8 h-8" />;
      default: return <Activity className="w-8 h-8" />;
    }
  };

  if (loading || !plantStatus) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading plant status...</p>
        </div>
      </div>
    );
  }

  const getComponent = (id) => {
    return plantStatus.components.find(c => c.component_id === id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Virtual Plant Layout</h2>
          <p className="text-muted-foreground">Interactive 2D schematic with live status</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge 
            variant={plantStatus.overall_status === 'normal' ? 'default' : plantStatus.overall_status === 'warning' ? 'secondary' : 'destructive'}
            className="text-sm px-4 py-2"
          >
            {plantStatus.overall_status.toUpperCase()}
          </Badge>
          <Button
            variant={mode === 'live' ? 'default' : 'outline'}
            onClick={() => setMode('live')}
            data-testid="live-mode-btn"
          >
            <Activity className="w-4 h-4 mr-2" />
            LIVE MODE
          </Button>
          <Button
            variant={mode === 'twin' ? 'default' : 'outline'}
            onClick={() => setMode('twin')}
            data-testid="twin-mode-btn"
          >
            <Settings className="w-4 h-4 mr-2" />
            DIGITAL TWIN
          </Button>
        </div>
      </div>

      {/* Plant Schematic */}
      <Card className="overflow-hidden" data-testid="plant-schematic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Plant Schematic
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 bg-slate-950">
          <div className="relative" style={{ minHeight: '600px' }}>
            {/* Cooling Tower */}
            <div
              className="absolute plant-component cursor-pointer"
              style={{ left: '50px', top: '50px' }}
              onMouseEnter={() => setHoveredComponent(getComponent('CT-1'))}
              onMouseLeave={() => setHoveredComponent(null)}
              onClick={() => setSelectedComponent(getComponent('CT-1'))}
              data-testid="cooling-tower-1"
            >
              <div className={`component-box ${getComponent('CT-1')?.status_color || 'green'}-status`}>
                <div className="flex flex-col items-center p-4">
                  <Fan className={`w-12 h-12 mb-2 ${getComponent('CT-1')?.status === 'running' ? 'animate-spin-slow' : ''}`} />
                  <span className="font-bold text-sm">CT-1</span>
                  <span className="text-xs opacity-75">Cooling Tower</span>
                  {getComponent('CT-1')?.vfd_speed_pct && (
                    <span className="text-xs mt-1">{getComponent('CT-1')?.vfd_speed_pct.toFixed(0)}% Speed</span>
                  )}
                </div>
              </div>
              {getStatusIcon(getComponent('CT-1')?.status_color)}
            </div>

            {/* Chiller */}
            <div
              className="absolute plant-component cursor-pointer"
              style={{ left: '450px', top: '250px' }}
              onMouseEnter={() => setHoveredComponent(getComponent('CH-1'))}
              onMouseLeave={() => setHoveredComponent(null)}
              onClick={() => setSelectedComponent(getComponent('CH-1'))}
              data-testid="chiller-1"
            >
              <div className={`component-box ${getComponent('CH-1')?.status_color || 'green'}-status`}>
                <div className="flex flex-col items-center p-4">
                  <Gauge className="w-12 h-12 mb-2" />
                  <span className="font-bold text-sm">CH-1</span>
                  <span className="text-xs opacity-75">Chiller</span>
                  {getComponent('CH-1')?.current_load_pct && (
                    <span className="text-xs mt-1">{getComponent('CH-1')?.current_load_pct.toFixed(0)}% Load</span>
                  )}
                  {getComponent('CH-1')?.efficiency_kw_per_tr && (
                    <span className="text-xs">{getComponent('CH-1')?.efficiency_kw_per_tr.toFixed(2)} kW/TR</span>
                  )}
                </div>
              </div>
              {getStatusIcon(getComponent('CH-1')?.status_color)}
            </div>

            {/* CW Pump */}
            <div
              className="absolute plant-component cursor-pointer"
              style={{ left: '250px', top: '100px' }}
              onMouseEnter={() => setHoveredComponent(getComponent('CWP-2'))}
              onMouseLeave={() => setHoveredComponent(null)}
              onClick={() => setSelectedComponent(getComponent('CWP-2'))}
              data-testid="cw-pump"
            >
              <div className={`component-box ${getComponent('CWP-2')?.status_color || 'green'}-status`}>
                <div className="flex flex-col items-center p-3">
                  <Waves className="w-10 h-10 mb-1" />
                  <span className="font-bold text-xs">CWP-2</span>
                  <span className="text-xs opacity-75">CW Pump</span>
                  {getComponent('CWP-2')?.power_kw && (
                    <span className="text-xs">{getComponent('CWP-2')?.power_kw.toFixed(1)} kW</span>
                  )}
                </div>
              </div>
              {getStatusIcon(getComponent('CWP-2')?.status_color)}
            </div>

            {/* CHW Pump */}
            <div
              className="absolute plant-component cursor-pointer"
              style={{ left: '650px', top: '250px' }}
              onMouseEnter={() => setHoveredComponent(getComponent('CWP-1'))}
              onMouseLeave={() => setHoveredComponent(null)}
              onClick={() => setSelectedComponent(getComponent('CWP-1'))}
              data-testid="chw-pump"
            >
              <div className={`component-box ${getComponent('CWP-1')?.status_color || 'green'}-status`}>
                <div className="flex flex-col items-center p-3">
                  <Droplets className="w-10 h-10 mb-1" />
                  <span className="font-bold text-xs">CWP-1</span>
                  <span className="text-xs opacity-75">CHW Pump</span>
                  {getComponent('CWP-1')?.power_kw && (
                    <span className="text-xs">{getComponent('CWP-1')?.power_kw.toFixed(1)} kW</span>
                  )}
                </div>
              </div>
              {getStatusIcon(getComponent('CWP-1')?.status_color)}
            </div>

            {/* Flow Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {/* CW Loop: Tower to Chiller */}
              <line 
                x1="150" y1="120" x2="250" y2="120" 
                stroke="cyan" strokeWidth="4" className="flow-line"
              />
              <line 
                x1="350" y1="120" x2="450" y2="200" 
                stroke="cyan" strokeWidth="4" className="flow-line"
              />
              
              {/* CW Return */}
              <line 
                x1="500" y1="340" x2="200" y2="340" 
                stroke="orange" strokeWidth="4" className="flow-line"
              />
              <line 
                x1="150" y1="180" x2="150" y2="340" 
                stroke="orange" strokeWidth="4" className="flow-line"
              />

              {/* CHW Loop */}
              <line 
                x1="550" y1="280" x2="650" y2="280" 
                stroke="blue" strokeWidth="4" className="flow-line"
              />
              <line 
                x1="750" y1="280" x2="850" y2="280" 
                stroke="blue" strokeWidth="4" className="flow-line-animated"
              />

              {/* Flow arrows */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="cyan" />
                </marker>
              </defs>
            </svg>

            {/* Load Indicator */}
            <div className="absolute" style={{ left: '850px', top: '250px' }}>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-xs font-bold">COOLING LOAD</div>
                  <div className="text-lg font-bold text-blue-400">{plantStatus.total_cooling_tr?.toFixed(1)} TR</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hover Info Popup */}
          {hoveredComponent && (
            <div className="absolute bg-slate-900 border-2 border-primary rounded-lg shadow-xl p-4 z-50"
                 style={{ bottom: '20px', right: '20px', minWidth: '300px' }}
                 data-testid="hover-popup">
              <div className="flex items-start gap-3">
                {getComponentIcon(hoveredComponent.component_type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg">{hoveredComponent.component_id}</span>
                    <Badge variant={hoveredComponent.status_color === 'green' ? 'default' : 'destructive'}>
                      {hoveredComponent.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{hoveredComponent.message}</p>
                  {hoveredComponent.power_kw && (
                    <div className="text-sm">Power: <span className="font-bold">{hoveredComponent.power_kw.toFixed(1)} kW</span></div>
                  )}
                  {hoveredComponent.efficiency_kw_per_tr && (
                    <div className="text-sm">Efficiency: <span className="font-bold">{hoveredComponent.efficiency_kw_per_tr.toFixed(2)} kW/TR</span></div>
                  )}
                  {hoveredComponent.current_load_pct && (
                    <div className="text-sm">Load: <span className="font-bold">{hoveredComponent.current_load_pct.toFixed(0)}%</span></div>
                  )}
                  <Button size="sm" className="mt-2 w-full" onClick={() => setSelectedComponent(hoveredComponent)}>
                    <Info className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active Chillers</div>
            <div className="text-2xl font-bold">{plantStatus.active_chillers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Cooling</div>
            <div className="text-2xl font-bold">{plantStatus.total_cooling_tr?.toFixed(1)} TR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Power</div>
            <div className="text-2xl font-bold">{plantStatus.total_power_kw?.toFixed(1)} kW</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Plant kW/TR</div>
            <div className="text-2xl font-bold">{plantStatus.plant_kw_per_tr?.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Component Detail Modal */}
      {selectedComponent && (
        <ComponentDetailModal
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}
    </div>
  );
}

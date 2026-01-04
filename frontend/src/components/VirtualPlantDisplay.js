import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ZoomIn, ZoomOut, Maximize2, RotateCcw, Layers, Activity,
  ChevronRight, Home, Eye, EyeOff 
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// LOD Levels
const LOD_LEVELS = {
  PLANT_OVERVIEW: 0,
  SUBSYSTEM: 1,
  EQUIPMENT: 2,
  SENSOR: 3
};

const LOD_NAMES = [
  'Plant Overview',
  'Subsystem View',
  'Equipment View',
  'Sensor & Diagnostics'
];

// Initial equipment positions (data will be fetched from API)
const EQUIPMENT_POSITIONS = {
  chillers: [
    { id: 'CH-1', x: 200, y: 200 },
    { id: 'CH-2', x: 400, y: 200 },
    { id: 'CH-3', x: 600, y: 200 }
  ],
  coolingTowers: [
    { id: 'CT-1', x: 250, y: 500 },
    { id: 'CT-2', x: 550, y: 500 }
  ],
  chwPumps: [
    { id: 'CHWP-1', x: 100, y: 350 },
    { id: 'CHWP-2', x: 700, y: 350 }
  ],
  cwPumps: [
    { id: 'CWP-1', x: 150, y: 500 },
    { id: 'CWP-2', x: 650, y: 500 }
  ]
};

export default function VirtualPlantDisplay() {
  const [lodLevel, setLodLevel] = useState(LOD_LEVELS.SUBSYSTEM);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [digitalTwinMode, setDigitalTwinMode] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [plantConfig, setPlantConfig] = useState(null);
  const [digitalTwinData, setDigitalTwinData] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // Fetch live equipment data
  useEffect(() => {
    fetchEquipmentData();
    const interval = setInterval(fetchEquipmentData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch digital twin data when mode is enabled
  useEffect(() => {
    if (digitalTwinMode) {
      fetchDigitalTwinData();
    }
  }, [digitalTwinMode]);

  const fetchEquipmentData = async () => {
    try {
      const response = await axios.get(`${API}/virtual-plant/equipment`);
      const data = response.data;
      
      // Merge with position data
      const config = {
        chillers: data.chillers.map((chiller, idx) => ({
          ...chiller,
          ...EQUIPMENT_POSITIONS.chillers[idx]
        })),
        coolingTowers: data.coolingTowers.map((tower, idx) => ({
          ...tower,
          ...EQUIPMENT_POSITIONS.coolingTowers[idx]
        })),
        chwPumps: data.chwPumps.map((pump, idx) => ({
          ...pump,
          ...EQUIPMENT_POSITIONS.chwPumps[idx]
        })),
        cwPumps: data.cwPumps.map((pump, idx) => ({
          ...pump,
          ...EQUIPMENT_POSITIONS.cwPumps[idx]
        })),
        plantSummary: data.plantSummary
      };
      
      setPlantConfig(config);
      setLiveData(data);
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    }
  };

  const fetchDigitalTwinData = async () => {
    try {
      const response = await axios.post(`${API}/virtual-plant/digital-twin`);
      setDigitalTwinData(response.data);
    } catch (error) {
      console.error('Error fetching digital twin data:', error);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls
  const handleMouseDown = (e) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setPan({ x: pan.x + dx, y: pan.y + dy });
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // LOD navigation
  const navigateLOD = (level) => {
    setLodLevel(level);
    // Auto-adjust zoom for each level
    if (level === LOD_LEVELS.PLANT_OVERVIEW) setZoom(0.5);
    else if (level === LOD_LEVELS.SUBSYSTEM) setZoom(1);
    else if (level === LOD_LEVELS.EQUIPMENT) setZoom(1.5);
    else if (level === LOD_LEVELS.SENSOR) setZoom(2);
  };

  // Get health status color
  const getHealthColor = (kwPerTr, type = 'chiller') => {
    if (type === 'chiller') {
      if (kwPerTr < 0.60) return '#10b981'; // Green - Excellent
      if (kwPerTr < 0.75) return '#f59e0b'; // Yellow - Good
      return '#ef4444'; // Red - Critical
    }
    return '#10b981'
  };

  const getStatusColor = (status) => {
    if (status === 'running') return '#10b981';
    if (status === 'warning') return '#f59e0b';
    if (status === 'stopped') return '#6b7280';
    return '#ef4444';
  };

  // Get current config based on digital twin mode
  const getCurrentConfig = () => {
    if (digitalTwinMode && digitalTwinData) {
      const optimized = digitalTwinData.optimized;
      return {
        chillers: optimized.chillers.map((chiller, idx) => ({
          ...chiller,
          ...EQUIPMENT_POSITIONS.chillers[idx]
        })),
        coolingTowers: optimized.coolingTowers.map((tower, idx) => ({
          ...tower,
          ...EQUIPMENT_POSITIONS.coolingTowers[idx]
        })),
        chwPumps: optimized.chwPumps.map((pump, idx) => ({
          ...pump,
          ...EQUIPMENT_POSITIONS.chwPumps[idx]
        })),
        cwPumps: optimized.cwPumps.map((pump, idx) => ({
          ...pump,
          ...EQUIPMENT_POSITIONS.cwPumps[idx]
        })),
        plantSummary: optimized.plantSummary
      };
    }
    return plantConfig;
  };

  const displayConfig = getCurrentConfig();

  if (!plantConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading plant data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-rajdhani tracking-wider flex items-center gap-2">
                <Layers className="w-6 h-6 text-primary" />
                VIRTUAL PLANT DISPLAY
              </CardTitle>
              <CardDescription className="font-manrope mt-1">
                Interactive P&ID Schematic • Real-Time Digital Twin
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={digitalTwinMode ? "default" : "secondary"} className="text-xs">
                {digitalTwinMode ? 'DIGITAL TWIN' : 'LIVE PLANT'}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {LOD_NAMES[lodLevel]}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Control Panel */}
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg border border-border">
          <Home className="w-4 h-4 text-muted-foreground" />
          {[0, 1, 2, 3].map((level, idx) => (
            <React.Fragment key={level}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <button
                onClick={() => navigateLOD(level)}
                className={`text-sm font-medium transition-colors ${
                  lodLevel === level
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {LOD_NAMES[level]}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={digitalTwinMode ? "default" : "outline"}
            onClick={() => setDigitalTwinMode(!digitalTwinMode)}
            data-testid="digital-twin-toggle"
          >
            {digitalTwinMode ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            Digital Twin
          </Button>
          <div className="flex items-center gap-1 border border-border rounded-lg p-1">
            <Button size="sm" variant="ghost" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono px-2">{Math.round(zoom * 100)}%</span>
            <Button size="sm" variant="ghost" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleResetView}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main SVG Canvas */}
      <Card className="bg-slate-900 border-border overflow-hidden" style={{ height: '700px' }}>
        <CardContent className="p-0 h-full relative">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 1200 700"
            className="cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ background: '#0f172a' }}
          >
            <defs>
              {/* Flow arrow marker */}
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="5"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
              
              {/* Glow filter for running equipment */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render based on LOD level */}
              {lodLevel === LOD_LEVELS.PLANT_OVERVIEW && (
                <PlantOverview liveData={liveData} digitalTwinMode={digitalTwinMode} displayConfig={displayConfig} />
              )}
              
              {lodLevel === LOD_LEVELS.SUBSYSTEM && (
                <SubsystemView 
                  config={displayConfig}
                  onHover={setHoveredItem}
                  onClick={setSelectedItem}
                  digitalTwinMode={digitalTwinMode}
                />
              )}
              
              {lodLevel === LOD_LEVELS.EQUIPMENT && (
                <EquipmentView
                  config={displayConfig}
                  onHover={setHoveredItem}
                  onClick={setSelectedItem}
                  digitalTwinMode={digitalTwinMode}
                />
              )}
              
              {lodLevel === LOD_LEVELS.SENSOR && (
                <SensorView
                  config={displayConfig}
                  onHover={setHoveredItem}
                  onClick={setSelectedItem}
                  liveData={liveData}
                />
              )}
            </g>
          </svg>

          {/* Hover Card Overlay */}
          {hoveredItem && (
            <HoverCard item={hoveredItem} digitalTwinMode={digitalTwinMode} />
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-300 mb-2">LEGEND</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-slate-400">Chilled Water (CHW)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span className="text-slate-400">Condenser Water (CW)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-slate-400">Normal / Optimal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-slate-400">Warning / Degrading</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-slate-400">Critical / Inefficient</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Equipment Modal */}
      {selectedItem && (
        <EquipmentDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          digitalTwinMode={digitalTwinMode}
        />
      )}
    </div>
  );
}

// LOD Level 0: Plant Overview
function PlantOverview({ liveData, digitalTwinMode, displayConfig }) {
  const summary = displayConfig?.plantSummary || {};
  const plantKwPerTr = summary.plantKwPerTr || 0.78;
  const totalPower = summary.totalPower || 320;
  const totalTR = summary.totalCapacity || 450;
  const costPerHour = summary.costPerHour || 2560;

  // Digital twin optimized values (if available)
  const savingsPercent = summary.savingsPercent || 15;
  const annualSavings = summary.annualSavings || 0;

  return (
    <g>
      {/* Central plant representation */}
      <rect x="400" y="250" width="400" height="200" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="8" />
      
      <text x="600" y="290" textAnchor="middle" fill="#3b82f6" fontSize="24" fontWeight="bold">
        CHILLER PLANT SYSTEM
      </text>

      {/* Aggregate KPIs */}
      <g transform="translate(420, 320)">
        <text fill="#94a3b8" fontSize="14" fontWeight="600">Total Capacity:</text>
        <text x="200" fill="#fff" fontSize="18" fontWeight="bold">{totalTR.toFixed(0)} TR</text>
      </g>

      <g transform="translate(420, 350)">
        <text fill="#94a3b8" fontSize="14" fontWeight="600">Plant kW/TR:</text>
        <text x="200" fill={digitalTwinMode ? "#10b981" : (plantKwPerTr < 0.75 ? "#10b981" : "#f59e0b")} fontSize="18" fontWeight="bold">
          {plantKwPerTr.toFixed(2)}
        </text>
      </g>

      <g transform="translate(420, 380)">
        <text fill="#94a3b8" fontSize="14" fontWeight="600">Total Power:</text>
        <text x="200" fill="#fff" fontSize="18" fontWeight="bold">
          {totalPower.toFixed(0)} kW
        </text>
      </g>

      <g transform="translate(420, 410)">
        <text fill="#94a3b8" fontSize="14" fontWeight="600">Cost/Hour:</text>
        <text x="200" fill="#fbbf24" fontSize="18" fontWeight="bold">
          ₹{costPerHour.toFixed(0)}
        </text>
      </g>

      {digitalTwinMode && annualSavings > 0 && (
        <g transform="translate(420, 440)">
          <text fill="#10b981" fontSize="12" fontWeight="600">💡 Savings: {savingsPercent.toFixed(0)}% • ₹{(annualSavings/100000).toFixed(1)}L/year</text>
        </g>
      )}

      {/* Health indicator */}
      <circle 
        cx="600" 
        cy="230" 
        r="15" 
        fill={plantKwPerTr < 0.75 ? '#10b981' : plantKwPerTr < 0.95 ? '#f59e0b' : '#ef4444'}
        filter="url(#glow)"
      />
    </g>
  );
}

// LOD Level 1: Subsystem View
function SubsystemView({ config, onHover, onClick, digitalTwinMode }) {
  const summary = config?.plantSummary || {};
  const runningChillers = config?.chillers?.filter(c => c.status === 'running').length || 0;
  const totalChillers = config?.chillers?.length || 0;
  const avgApproach = config?.coolingTowers ? 
    (config.coolingTowers.reduce((sum, t) => sum + t.approach, 0) / config.coolingTowers.length).toFixed(1) : 
    '4.0';
  
  return (
    <g>
      {/* Chiller Subsystem */}
      <g
        onMouseEnter={() => onHover({ type: 'subsystem', name: 'Chiller System', chillers: config.chillers })}
        onMouseLeave={() => onHover(null)}
        onClick={() => onClick({ type: 'subsystem', name: 'Chiller System' })}
        style={{ cursor: 'pointer' }}
      >
        <rect x="150" y="150" width="500" height="150" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="4" />
        <text x="400" y="180" textAnchor="middle" fill="#3b82f6" fontSize="16" fontWeight="bold">
          CHILLER SYSTEM
        </text>
        <text x="400" y="210" textAnchor="middle" fill="#94a3b8" fontSize="12">
          {totalChillers} Units • {runningChillers} Running • Total: {summary.totalCapacity?.toFixed(0) || '450'} TR
        </text>
        <text x="400" y="235" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="600">
          Plant kW/TR: {summary.plantKwPerTr?.toFixed(2) || '0.78'}
        </text>
        <circle cx="630" cy="170" r="8" fill={runningChillers > 0 ? "#10b981" : "#6b7280"} />
      </g>

      {/* Cooling Tower Subsystem */}
      <g
        onMouseEnter={() => onHover({ type: 'subsystem', name: 'Cooling Tower System', towers: config.coolingTowers })}
        onMouseLeave={() => onHover(null)}
        onClick={() => onClick({ type: 'subsystem', name: 'Cooling Tower System' })}
        style={{ cursor: 'pointer' }}
      >
        <rect x="150" y="450" width="500" height="120" fill="#1e293b" stroke="#fb923c" strokeWidth="2" rx="4" />
        <text x="400" y="480" textAnchor="middle" fill="#fb923c" fontSize="16" fontWeight="bold">
          COOLING TOWER SYSTEM
        </text>
        <text x="400" y="505" textAnchor="middle" fill="#94a3b8" fontSize="12">
          {config?.coolingTowers?.length || 2} Units • Avg Approach: {avgApproach}°C
        </text>
        <text x="400" y="530" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="600">
          {config?.coolingTowers?.length || 0} Running
        </text>
        <circle cx="630" cy="470" r="8" fill="#10b981" />
      </g>

      {/* CHW Pump Group */}
      <g
        onMouseEnter={() => onHover({ type: 'subsystem', name: 'CHW Pump Group', pumps: config.chwPumps })}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect x="750" y="320" width="180" height="100" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" rx="4" />
        <text x="840" y="350" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold">
          CHW PUMPS
        </text>
        <text x="840" y="375" textAnchor="middle" fill="#94a3b8" fontSize="11">
          {config?.chwPumps?.filter(p => p.status === 'running').length || 2} Running
        </text>
        <text x="840" y="395" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="600">
          {config?.chwPumps?.reduce((sum, p) => sum + p.power, 0).toFixed(0) || '42'} kW Total
        </text>
      </g>

      {/* CW Pump Group */}
      <g
        onMouseEnter={() => onHover({ type: 'subsystem', name: 'CW Pump Group', pumps: config.cwPumps })}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect x="750" y="450" width="180" height="100" fill="#1e293b" stroke="#fb923c" strokeWidth="2" rx="4" />
        <text x="840" y="480" textAnchor="middle" fill="#fb923c" fontSize="14" fontWeight="bold">
          CW PUMPS
        </text>
        <text x="840" y="505" textAnchor="middle" fill="#94a3b8" fontSize="11">
          {config?.cwPumps?.filter(p => p.status === 'running').length || 2} Running
        </text>
        <text x="840" y="525" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="600">
          {config?.cwPumps?.reduce((sum, p) => sum + p.power, 0).toFixed(0) || '58'} kW Total
        </text>
      </g>

      {/* Connecting pipes */}
      <PipeWithFlow x1="400" y1="300" x2="400" y2="450" color="#3b82f6" />
      <PipeWithFlow x1="650" y1="225" x2="750" y2="370" color="#3b82f6" />
      <PipeWithFlow x1="650" y1="510" x2="750" y2="500" color="#fb923c" />
    </g>
  );
}

// LOD Level 2: Equipment View
function EquipmentView({ config, onHover, onClick, digitalTwinMode }) {
  return (
    <g>
      {/* Chillers */}
      {config.chillers.map((chiller) => (
        <ChillerIcon
          key={chiller.id}
          {...chiller}
          onHover={() => onHover({ ...chiller, type: 'chiller' })}
          onLeave={() => onHover(null)}
          onClick={() => onClick({ ...chiller, type: 'chiller' })}
          digitalTwinMode={digitalTwinMode}
        />
      ))}

      {/* Cooling Towers */}
      {config.coolingTowers.map((tower) => (
        <CoolingTowerIcon
          key={tower.id}
          {...tower}
          onHover={() => onHover({ ...tower, type: 'tower' })}
          onLeave={() => onHover(null)}
          onClick={() => onClick({ ...tower, type: 'tower' })}
        />
      ))}

      {/* CHW Pumps */}
      {config.chwPumps.map((pump) => (
        <PumpIcon
          key={pump.id}
          {...pump}
          color="#3b82f6"
          onHover={() => onHover({ ...pump, type: 'pump', pumpType: 'CHW' })}
          onLeave={() => onHover(null)}
          onClick={() => onClick({ ...pump, type: 'pump' })}
        />
      ))}

      {/* CW Pumps */}
      {config.cwPumps.map((pump) => (
        <PumpIcon
          key={pump.id}
          {...pump}
          color="#fb923c"
          onHover={() => onHover({ ...pump, type: 'pump', pumpType: 'CW' })}
          onLeave={() => onHover(null)}
          onClick={() => onClick({ ...pump, type: 'pump' })}
        />
      ))}

      {/* Piping network */}
      <PipeNetwork config={config} />
    </g>
  );
}

// LOD Level 3: Sensor View
function SensorView({ config, onHover, onClick, liveData }) {
  return (
    <g>
      <EquipmentView config={config} onHover={onHover} onClick={onClick} />
      
      {/* Add sensor overlays */}
      {config.chillers.slice(0, 2).map((chiller, idx) => (
        <g key={`sensors-${chiller.id}`} transform={`translate(${chiller.x}, ${chiller.y + 80})`}>
          {/* Temperature sensor */}
          <circle cx="-20" cy="0" r="6" fill="#ef4444" stroke="#fff" strokeWidth="1" />
          <text x="-20" y="15" textAnchor="middle" fontSize="8" fill="#94a3b8">T</text>
          
          {/* Flow sensor */}
          <circle cx="0" cy="0" r="6" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
          <text x="0" y="15" textAnchor="middle" fontSize="8" fill="#94a3b8">F</text>
          
          {/* Power sensor */}
          <circle cx="20" cy="0" r="6" fill="#fbbf24" stroke="#fff" strokeWidth="1" />
          <text x="20" y="15" textAnchor="middle" fontSize="8" fill="#94a3b8">P</text>
        </g>
      ))}
    </g>
  );
}

// Chiller Icon Component
function ChillerIcon({ id, x, y, status, load, power, kwPerTr, cop, onHover, onLeave, onClick, digitalTwinMode }) {
  const healthColor = kwPerTr < 0.60 ? '#10b981' : kwPerTr < 0.75 ? '#f59e0b' : '#ef4444';
  const isRunning = status === 'running';

  // Digital twin optimized values
  const optimizedKwPerTr = 0.58;
  const displayKwPerTr = digitalTwinMode ? optimizedKwPerTr : kwPerTr;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      data-testid={`chiller-${id}`}
    >
      {/* Chiller body - centrifugal style */}
      <rect
        x="-50"
        y="-40"
        width="100"
        height="80"
        fill={isRunning ? '#1e40af' : '#374151'}
        stroke={isRunning ? healthColor : '#6b7280'}
        strokeWidth="2"
        rx="4"
        opacity={isRunning ? 1 : 0.5}
        filter={isRunning ? 'url(#glow)' : ''}
      />
      
      {/* Compressor section */}
      <circle
        cx="0"
        cy="0"
        r="25"
        fill="none"
        stroke={isRunning ? healthColor : '#6b7280'}
        strokeWidth="2"
      >
        {isRunning && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </circle>
      
      {/* Impeller blades */}
      {[0, 120, 240].map((angle) => (
        <line
          key={angle}
          x1="0"
          y1="0"
          x2={Math.cos((angle * Math.PI) / 180) * 20}
          y2={Math.sin((angle * Math.PI) / 180) * 20}
          stroke={isRunning ? healthColor : '#6b7280'}
          strokeWidth="2"
        >
          {isRunning && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="3s"
              repeatCount="indefinite"
            />
          )}
        </line>
      ))}

      {/* Equipment label */}
      <text x="0" y="-50" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
        {id}
      </text>

      {/* Status indicator */}
      <circle
        cx="45"
        cy="-35"
        r="6"
        fill={isRunning ? healthColor : '#6b7280'}
      />

      {/* Load percentage */}
      {isRunning && (
        <>
          <text x="0" y="55" textAnchor="middle" fill="#94a3b8" fontSize="10">
            {load}% Load
          </text>
          <text x="0" y="70" textAnchor="middle" fill={digitalTwinMode ? '#10b981' : '#fff'} fontSize="11" fontWeight="600">
            {displayKwPerTr.toFixed(2)} kW/TR
          </text>
        </>
      )}
    </g>
  );
}

// Cooling Tower Icon Component
function CoolingTowerIcon({ id, x, y, status, fanSpeed, range, approach, onHover, onLeave, onClick }) {
  const isRunning = status === 'running';
  const healthColor = approach < 4 ? '#10b981' : approach < 6 ? '#f59e0b' : '#ef4444';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      data-testid={`tower-${id}`}
    >
      {/* Tower structure */}
      <path
        d="M -40,30 L -30,-20 L 30,-20 L 40,30 Z"
        fill={isRunning ? '#0f766e' : '#374151'}
        stroke={isRunning ? healthColor : '#6b7280'}
        strokeWidth="2"
        opacity={isRunning ? 1 : 0.5}
      />

      {/* Fill pattern */}
      <line x1="-25" y1="0" x2="25" y2="0" stroke="#14b8a6" strokeWidth="1" opacity="0.5" />
      <line x1="-20" y1="10" x2="20" y2="10" stroke="#14b8a6" strokeWidth="1" opacity="0.5" />
      <line x1="-15" y1="20" x2="15" y2="20" stroke="#14b8a6" strokeWidth="1" opacity="0.5" />

      {/* Fan housing at top */}
      <rect x="-20" y="-35" width="40" height="15" fill="#1e293b" stroke="#fb923c" strokeWidth="2" rx="2" />
      
      {/* Fan blades */}
      <g transform="translate(0, -27)">
        {[0, 90, 180, 270].map((angle) => (
          <line
            key={angle}
            x1="0"
            y1="0"
            x2={Math.cos((angle * Math.PI) / 180) * 12}
            y2={Math.sin((angle * Math.PI) / 180) * 12}
            stroke="#94a3b8"
            strokeWidth="2"
          >
            {isRunning && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur={`${4 - (fanSpeed / 50)}s`}
                repeatCount="indefinite"
              />
            )}
          </line>
        ))}
      </g>

      {/* Equipment label */}
      <text x="0" y="-45" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
        {id}
      </text>

      {/* Status */}
      <circle cx="35" cy="-40" r="5" fill={isRunning ? healthColor : '#6b7280'} />

      {/* Metrics */}
      {isRunning && (
        <>
          <text x="0" y="50" textAnchor="middle" fill="#94a3b8" fontSize="9">
            Fan: {fanSpeed}%
          </text>
          <text x="0" y="62" textAnchor="middle" fill={healthColor} fontSize="10" fontWeight="600">
            Appr: {approach.toFixed(1)}°C
          </text>
        </>
      )}
    </g>
  );
}

// Pump Icon Component
function PumpIcon({ id, x, y, status, rpm, power, flow, color, onHover, onLeave, onClick }) {
  const isRunning = status === 'running';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      data-testid={`pump-${id}`}
    >
      {/* Pump casing */}
      <circle
        cx="0"
        cy="0"
        r="25"
        fill={isRunning ? color : '#374151'}
        stroke="#fff"
        strokeWidth="2"
        opacity={isRunning ? 0.8 : 0.4}
        filter={isRunning ? 'url(#glow)' : ''}
      />

      {/* Impeller */}
      <circle cx="0" cy="0" r="15" fill="none" stroke="#fff" strokeWidth="2">
        {isRunning && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur={`${3 - (rpm / 100)}s`}
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Blades */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line
          key={angle}
          x1="0"
          y1="0"
          x2={Math.cos((angle * Math.PI) / 180) * 10}
          y2={Math.sin((angle * Math.PI) / 180) * 10}
          stroke="#fff"
          strokeWidth="1.5"
        >
          {isRunning && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur={`${3 - (rpm / 100)}s`}
              repeatCount="indefinite"
            />
          )}
        </line>
      ))}

      {/* Label */}
      <text x="0" y="-35" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
        {id}
      </text>

      {/* Metrics */}
      {isRunning && (
        <>
          <text x="0" y="45" textAnchor="middle" fill="#94a3b8" fontSize="9">
            {rpm}% RPM
          </text>
          <text x="0" y="57" textAnchor="middle" fill="#fff" fontSize="9">
            {power} kW
          </text>
        </>
      )}
    </g>
  );
}

// Pipe with animated flow
function PipeWithFlow({ x1, y1, x2, y2, color }) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth="4"
        opacity="0.6"
      />
      {/* Animated flow dots */}
      <circle cx={x1} cy={y1} r="3" fill={color}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={`M ${x1} ${y1} L ${x2} ${y2}`}
        />
      </circle>
    </g>
  );
}

// Pipe Network
function PipeNetwork({ config }) {
  return (
    <g>
      {/* CHW Supply lines (blue) */}
      <PipeWithFlow x1="100" y1="200" x2="200" y2="200" color="#3b82f6" />
      <PipeWithFlow x1="200" y1="200" x2="400" y2="200" color="#3b82f6" />
      <PipeWithFlow x1="400" y1="200" x2="600" y2="200" color="#3b82f6" />
      
      {/* CHW Return lines (lighter blue) */}
      <PipeWithFlow x1="200" y1="250" x2="400" y2="250" color="#60a5fa" />
      <PipeWithFlow x1="400" y1="250" x2="600" y2="250" color="#60a5fa" />
      
      {/* CW lines (orange) */}
      <PipeWithFlow x1="250" y1="300" x2="250" y2="500" color="#fb923c" />
      <PipeWithFlow x1="550" y1="300" x2="550" y2="500" color="#fb923c" />
    </g>
  );
}

// Hover Card Component
function HoverCard({ item, digitalTwinMode }) {
  if (!item) return null;

  return (
    <div 
      className="absolute top-20 right-6 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-2xl"
      style={{ maxWidth: '320px', zIndex: 50 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">{item.id || item.name}</h3>
        <Badge variant={item.status === 'running' ? 'default' : 'secondary'} className="text-xs">
          {item.status || 'Active'}
        </Badge>
      </div>

      <div className="space-y-2 text-xs">
        {item.type === 'chiller' && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-400">Load:</span>
              <span className="text-white font-semibold">{item.load}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Power:</span>
              <span className="text-white font-semibold">{item.power} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">kW/TR:</span>
              <span className={`font-semibold ${digitalTwinMode ? 'text-green-400' : 'text-yellow-400'}`}>
                {digitalTwinMode ? '0.58' : item.kwPerTr.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">COP:</span>
              <span className="text-white font-semibold">{item.cop.toFixed(2)}</span>
            </div>
            {digitalTwinMode && (
              <div className="mt-2 pt-2 border-t border-slate-700 text-green-400">
                💡 Optimized: -12% power
              </div>
            )}
          </>
        )}

        {item.type === 'tower' && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-400">Fan Speed:</span>
              <span className="text-white font-semibold">{item.fanSpeed}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Range:</span>
              <span className="text-white font-semibold">{item.range.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Approach:</span>
              <span className={`font-semibold ${item.approach < 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                {item.approach.toFixed(1)}°C
              </span>
            </div>
            <div className="text-slate-400 mt-2">
              {item.approach < 4 ? '✅ Excellent' : item.approach < 6 ? '⚠️ Acceptable' : '❌ Poor'}
            </div>
          </>
        )}

        {item.type === 'pump' && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-400">RPM:</span>
              <span className="text-white font-semibold">{item.rpm}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Power:</span>
              <span className="text-white font-semibold">{item.power} kW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Flow:</span>
              <span className="text-white font-semibold">{item.flow} L/s</span>
            </div>
          </>
        )}

        {item.type === 'subsystem' && (
          <div className="text-slate-300">
            <p className="mb-2">Click for detailed view</p>
            {item.chillers && <p>• {item.chillers.length} chillers</p>}
            {item.towers && <p>• {item.towers.length} cooling towers</p>}
            {item.pumps && <p>• {item.pumps.length} pumps</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// Equipment Detail Modal
function EquipmentDetailModal({ item, onClose, digitalTwinMode }) {
  const [trendData] = useState([
    { time: '00:00', kwPerTr: 0.68, load: 70 },
    { time: '04:00', kwPerTr: 0.65, load: 65 },
    { time: '08:00', kwPerTr: 0.72, load: 80 },
    { time: '12:00', kwPerTr: 0.75, load: 85 },
    { time: '16:00', kwPerTr: 0.70, load: 75 },
    { time: '20:00', kwPerTr: 0.66, load: 68 },
  ]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-900 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-rajdhani">
            {item.id || item.name} - Detailed Analysis
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="metrics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="trends">Trends (24h)</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {item.type === 'chiller' && (
                <>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Efficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {item.kwPerTr.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">kW/TR</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">COP</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        {item.cop.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">Coefficient</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Current Load</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-400">
                        {item.load}%
                      </div>
                      <p className="text-xs text-muted-foreground">Operating Load</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Power Draw</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-400">
                        {item.power}
                      </div>
                      <p className="text-xs text-muted-foreground">kW</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm">Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-400"
                        style={{ width: '85%' }}
                      />
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-400">85%</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Excellent condition - No issues detected</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm">Efficiency Trend (Last 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="kwPerTr" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Operating in Optimal Range</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Current load of {item.load}% is within the efficient 65-80% band.
                      </p>
                    </div>
                  </div>

                  {digitalTwinMode && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-sm">⚡</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Digital Twin Optimization</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Increase CHW supply setpoint by +0.5°C for 8% efficiency gain.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="default" className="text-xs">
                            Apply Change
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            Simulate
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-400 text-sm">!</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Scheduled Maintenance</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Next tube cleaning recommended in 45 days based on approach degradation trends.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
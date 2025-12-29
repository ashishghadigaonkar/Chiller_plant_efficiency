import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Gauge, Activity, Zap, TrendingUp, AlertTriangle, ThermometerSun, Calculator, BarChart3 } from 'lucide-react';
import axios from 'axios';
import MetricsGrid from './MetricsGrid';
import TrendsChart from './TrendsChart';
import SimulationPanel from './SimulationPanel';
import MLInsights from './MLInsights';
import DataManagement from './DataManagement';
import ManualCalculator from './ManualCalculator';
import EnhancedInsights from './EnhancedInsights';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [summaryData, setSummaryData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({ status: 'checking' });

  useEffect(() => {
    fetchDashboardData();
    fetchSystemStatus();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`);
      setSummaryData(response.data);
      
      // Fetch historical data for charts
      const histResponse = await axios.get(`${API}/data/historical?limit=50`);
      setHistoricalData(histResponse.data.data || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get(`${API}/system/status`);
      setSystemStatus(response.data);
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading system data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-rajdhani font-bold tracking-wider text-foreground" data-testid="dashboard-title">
              CHILLER PLANT EFFICIENCY SYSTEM
            </h1>
            <p className="text-muted-foreground mt-1 font-manrope">Real-time Monitoring & AI-Driven Optimization</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" data-testid="live-indicator">
              <span className="status-indicator live"></span>
              <span className="text-sm text-primary font-mono">LIVE</span>
            </div>
            <Badge variant={systemStatus.ml_models_trained ? "default" : "secondary"} data-testid="ml-status-badge">
              {systemStatus.ml_models_trained ? 'ML ACTIVE' : 'ML STANDBY'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-secondary border border-border" data-testid="main-tabs">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-dashboard">
              <Gauge className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="enhanced" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-enhanced">
              <BarChart3 className="w-4 h-4 mr-2" />
              Enhanced
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-calculator">
              <Calculator className="w-4 h-4 mr-2" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="simulation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-simulation">
              <Activity className="w-4 h-4 mr-2" />
              Simulation
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="ml-insights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-ml-insights">
              <Zap className="w-4 h-4 mr-2" />
              ML Insights
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-data">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6" data-testid="dashboard-content">
            <MetricsGrid summaryData={summaryData} />
          </TabsContent>

          <TabsContent value="enhanced" className="mt-6" data-testid="enhanced-content">
            <EnhancedInsights historicalData={historicalData} summaryData={summaryData} />
          </TabsContent>

          <TabsContent value="calculator" className="mt-6" data-testid="calculator-content">
            <ManualCalculator />
          </TabsContent>

          <TabsContent value="simulation" className="mt-6" data-testid="simulation-content">
            <SimulationPanel onSimulationComplete={fetchDashboardData} />
          </TabsContent>

          <TabsContent value="trends" className="mt-6" data-testid="trends-content">
            <TrendsChart historicalData={historicalData} />
          </TabsContent>

          <TabsContent value="ml-insights" className="mt-6" data-testid="ml-insights-content">
            <MLInsights systemStatus={systemStatus} summaryData={summaryData} onRefresh={fetchSystemStatus} />
          </TabsContent>

          <TabsContent value="data" className="mt-6" data-testid="data-content">
            <DataManagement onDataUpdate={fetchDashboardData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

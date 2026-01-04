import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, CheckCircle2, Activity, 
  TrendingDown, Waves, Fan, ThermometerSun 
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Get current dashboard data
      const dashResponse = await axios.get(`${API}/dashboard/summary`);
      const sensorData = {
        ...dashResponse.data.sensor_data,
        ...dashResponse.data.current_metrics
      };

      // Add compressor lift if available
      if (sensorData.chw_supply_temp && sensorData.cond_inlet_temp) {
        const lift = sensorData.cond_inlet_temp - sensorData.chw_supply_temp;
        sensorData.compressor_lift = lift;
      }

      // Run diagnostics
      const response = await axios.post(`${API}/diagnostics/analyze`, sensorData);
      setDiagnostics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Failed to run diagnostics');
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'excellent':
        return <Badge variant="default" className="bg-green-500">EXCELLENT</Badge>;
      case 'acceptable':
        return <Badge variant="default">ACCEPTABLE</Badge>;
      case 'warning':
        return <Badge variant="secondary">WARNING</Badge>;
      case 'critical':
        return <Badge variant="destructive">CRITICAL</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'excellent':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'acceptable':
        return <CheckCircle2 className="w-6 h-6 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  const getParameterIcon = (parameter) => {
    switch (parameter) {
      case 'delta_t':
        return <TrendingDown className="w-5 h-5" />;
      case 'tower_approach':
        return <Fan className="w-5 h-5" />;
      case 'compressor_lift':
        return <ThermometerSun className="w-5 h-5" />;
      case 'flow_pumping':
        return <Waves className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  if (loading || !diagnostics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Running diagnostic analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnostic Rule Engine</h2>
          <p className="text-muted-foreground">Automated plant health analysis</p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading}>
          <Activity className="w-4 h-4 mr-2" />
          Run Diagnostics
        </Button>
      </div>

      {/* Overall Status */}
      <Alert variant={diagnostics.overall_status === 'critical' ? 'destructive' : 'default'}>
        {getSeverityIcon(diagnostics.overall_status)}
        <AlertTitle className="text-lg">
          Overall Plant Status: {diagnostics.overall_status.toUpperCase()}
        </AlertTitle>
        <AlertDescription>
          {diagnostics.issues_count > 0 ? (
            <span>
              Found <strong>{diagnostics.issues_count}</strong> issue{diagnostics.issues_count !== 1 ? 's' : ''} requiring attention.
            </span>
          ) : (
            <span>All parameters are within acceptable ranges. Plant is operating normally.</span>
          )}
        </AlertDescription>
      </Alert>

      {/* Issues Found */}
      {diagnostics.issues_found && diagnostics.issues_found.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Issues Detected
          </h3>
          <div className="grid gap-4">
            {diagnostics.issues_found.map((issue, index) => (
              <Card key={index} className="border-l-4 border-l-red-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getParameterIcon(issue.parameter)}
                      <span className="capitalize">{issue.parameter.replace('_', ' ')}</span>
                    </CardTitle>
                    {getSeverityBadge(issue.severity)}
                  </div>
                  <CardDescription>
                    {issue.value !== undefined && issue.value !== null && (
                      <span className="font-mono">Current Value: {issue.value.toFixed(2)}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Diagnosis */}
                    <div>
                      <div className="font-semibold text-sm mb-1">Diagnosis:</div>
                      <div className="text-sm">{issue.diagnosis}</div>
                    </div>

                    {/* Root Cause */}
                    <div>
                      <div className="font-semibold text-sm mb-1">Root Cause:</div>
                      <div className="text-sm text-muted-foreground">{issue.root_cause}</div>
                    </div>

                    <Separator />

                    {/* Recommendations */}
                    <div>
                      <div className="font-semibold text-sm mb-2">Recommended Actions:</div>
                      <ul className="space-y-1">
                        {issue.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Diagnostics */}
      <div>
        <h3 className="text-xl font-semibold mb-4">All Diagnostic Results</h3>
        <div className="grid gap-4">
          {diagnostics.all_diagnostics.map((diag, index) => (
            <Card key={index} className={diag.severity === 'excellent' ? 'border-green-500/30' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getParameterIcon(diag.parameter)}
                    <span className="capitalize">{diag.parameter.replace('_', ' ')}</span>
                  </CardTitle>
                  {getSeverityBadge(diag.severity)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diag.value !== undefined && diag.value !== null && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Value: </span>
                      <span className="font-mono font-bold">{diag.value.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="font-semibold">Status: </span>
                    <span>{diag.diagnosis}</span>
                  </div>
                  {diag.severity !== 'excellent' && diag.severity !== 'acceptable' && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {diag.recommendations[0]}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

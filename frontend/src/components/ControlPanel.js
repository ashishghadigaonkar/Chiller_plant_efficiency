import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Settings, TrendingUp, AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ControlPanel() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [twinMode, setTwinMode] = useState(false);
  const [twinComparison, setTwinComparison] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Get current dashboard data
      const dashResponse = await axios.get(`${API}/dashboard/summary`);
      const sensorData = {
        ...dashResponse.data.sensor_data,
        ...dashResponse.data.current_metrics,
        plr: 0.75, // Default PLR
        rated_capacity_tr: 300.0
      };

      // Get control recommendations
      const response = await axios.post(`${API}/control/recommend`, sensorData);
      setRecommendations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Failed to fetch control recommendations');
      setLoading(false);
    }
  };

  const handleActionClick = async (action) => {
    if (action.requires_confirmation) {
      setSelectedAction(action);
      
      // If twin mode is enabled, simulate first
      if (twinMode) {
        await simulateAction(action);
      }
      
      setShowConfirmDialog(true);
    } else {
      toast.info(action.message);
    }
  };

  const simulateAction = async (action) => {
    try {
      const dashResponse = await axios.get(`${API}/dashboard/summary`);
      const currentState = {
        ...dashResponse.data.sensor_data,
        ...dashResponse.data.current_metrics
      };

      const response = await axios.post(`${API}/twin/simulate`, {
        current_state: currentState,
        action: action
      });
      
      setTwinComparison(response.data);
    } catch (error) {
      console.error('Error simulating action:', error);
      toast.error('Failed to simulate action in digital twin');
    }
  };

  const confirmAction = async () => {
    if (!selectedAction) return;

    try {
      const response = await axios.post(`${API}/control/apply`, selectedAction, {
        params: { confirmed: true }
      });
      
      toast.success('Control action applied successfully (simulation)');
      toast.info(response.data.note);
      
      setShowConfirmDialog(false);
      setSelectedAction(null);
      setTwinComparison(null);
      
      // Refresh recommendations after 3 seconds
      setTimeout(fetchRecommendations, 3000);
    } catch (error) {
      console.error('Error applying action:', error);
      toast.error('Failed to apply control action');
    }
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'high') {
      return <Badge variant="destructive">HIGH PRIORITY</Badge>;
    } else if (priority === 'medium') {
      return <Badge variant="secondary">MEDIUM</Badge>;
    }
    return <Badge variant="outline">LOW</Badge>;
  };

  const getControlTypeIcon = (type) => {
    return <Settings className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Control Logic System</h2>
          <p className="text-muted-foreground">AI-powered control recommendations with confirmation workflow</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchRecommendations} disabled={loading}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh Recommendations
          </Button>
          <Button
            variant={twinMode ? 'default' : 'outline'}
            onClick={() => setTwinMode(!twinMode)}
            data-testid="twin-mode-toggle"
          >
            <Settings className="w-4 h-4 mr-2" />
            {twinMode ? 'Twin Mode ON' : 'Twin Mode OFF'}
          </Button>
        </div>
      </div>

      {/* Control Philosophy */}
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Control Philosophy</AlertTitle>
        <AlertDescription>
          Observe → Decide → Recommend → <strong>Confirm</strong> → Apply
          <br />
          All control actions require user confirmation before application. This is a simulation system - no actual equipment control is performed.
        </AlertDescription>
      </Alert>

      {/* Recommendations */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Analyzing plant conditions...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {recommendations.map((rec, index) => (
            <Card key={index} className={rec.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getControlTypeIcon(rec.control_type)}
                    <span className="capitalize">{rec.control_type.replace('_', ' ')}</span>
                  </CardTitle>
                  {getPriorityBadge(rec.priority)}
                </div>
                <CardDescription>{rec.message}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Rationale */}
                  <div>
                    <div className="text-sm font-semibold mb-1">Rationale:</div>
                    <div className="text-sm text-muted-foreground">{rec.rationale}</div>
                  </div>

                  {/* Current vs Recommended */}
                  {rec.current_value !== undefined && rec.recommended_value !== undefined && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground">Current Value</div>
                        <div className="text-lg font-bold">{rec.current_value}</div>
                      </div>
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground">Recommended Value</div>
                        <div className="text-lg font-bold text-primary">{rec.recommended_value}</div>
                      </div>
                    </div>
                  )}

                  {/* Estimated Savings */}
                  {rec.estimated_savings_pct && rec.estimated_savings_pct !== 0 && (
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <div className="text-sm font-semibold text-green-500">
                        Estimated Savings: {rec.estimated_savings_pct.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  {rec.estimated_power_savings_pct && rec.estimated_power_savings_pct !== 0 && (
                    <div className={`p-3 rounded-lg ${
                      rec.estimated_power_savings_pct > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      <div className={`text-sm font-semibold ${
                        rec.estimated_power_savings_pct > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        Power Impact: {rec.estimated_power_savings_pct > 0 ? '+' : ''}{rec.estimated_power_savings_pct.toFixed(1)}%
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {rec.requires_confirmation ? (
                    <Button 
                      onClick={() => handleActionClick(rec)} 
                      className="w-full"
                      variant={rec.priority === 'high' ? 'default' : 'outline'}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {twinMode ? 'Simulate & Apply' : 'Apply Action'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Informational - No action required</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {recommendations.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-semibold">No Actions Required</p>
                <p className="text-muted-foreground">Plant is operating optimally. All parameters are within acceptable ranges.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Control Action</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction && selectedAction.message}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Digital Twin Comparison */}
          {twinComparison && (
            <div className="space-y-3 my-4">
              <div className="font-semibold">Digital Twin Simulation Results:</div>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Power Savings:</span>
                  <span className={twinComparison.improvements.power_savings_kw > 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {twinComparison.improvements.power_savings_kw > 0 ? '+' : ''}{twinComparison.improvements.power_savings_kw.toFixed(1)} kW
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Efficiency Change:</span>
                  <span className={twinComparison.improvements.plant_kw_per_tr_change < 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {twinComparison.improvements.plant_kw_per_tr_change.toFixed(3)} kW/TR
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-primary">
                {twinComparison.recommendation}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setSelectedAction(null);
              setTwinComparison(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              Confirm & Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

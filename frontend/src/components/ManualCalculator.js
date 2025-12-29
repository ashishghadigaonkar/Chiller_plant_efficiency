import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calculator, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ManualCalculator() {
  const [formData, setFormData] = useState({
    chw_supply_temp: '7.0',
    chw_return_temp: '12.0',
    chw_flow_rate: '50',
    chiller_power: '200',
    cond_inlet_temp: '32',
    cond_outlet_temp: '28',
    cond_flow_rate: '60',
    ambient_temp: '32',
    wet_bulb_temp: '26',
    chw_pump_power: '15',
    cw_pump_power: '12',
    tower_fan_power: '8',
    electricity_tariff: '8.0',
    operating_hours_per_day: '16',
    operating_days_per_year: '300'
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      // Convert strings to numbers
      const payload = {};
      for (const [key, value] of Object.entries(formData)) {
        payload[key] = parseFloat(value);
      }

      const response = await axios.post(`${API}/audit/calculate`, payload);
      setResult(response.data);
      toast.success('Calculation completed successfully!');
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error(error.response?.data?.detail || 'Calculation failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!result) return;

    try {
      toast.info('Generating PDF report...');
      const response = await axios.post(`${API}/reports/audit-pdf`, result, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chiller_audit_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF report downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'excellent') return <CheckCircle2 className="w-5 h-5 text-primary" />;
    if (status === 'average' || status === 'good') return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <AlertTriangle className="w-5 h-5 text-red-400" />;
  };

  return (
    <div className="space-y-6" data-testid="manual-calculator">
      <div>
        <h2 className="text-2xl font-rajdhani mb-2" data-testid="calculator-title">
          MANUAL EFFICIENCY CALCULATOR / ON-SITE AUDIT TOOL
        </h2>
        <p className="text-muted-foreground text-sm">
          Enter field measurements to calculate efficiency metrics and receive optimization recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="border border-border bg-card" data-testid="input-form-card">
          <CardHeader>
            <CardTitle className="font-rajdhani flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              INPUT PARAMETERS
            </CardTitle>
            <CardDescription>Enter actual field measurements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CHW Parameters */}
            <div className="space-y-3">
              <h3 className="text-sm font-rajdhani text-primary">CHILLED WATER (CHW) PARAMETERS</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="chw_supply_temp" className="text-xs">CHW Supply (°C)</Label>
                  <Input
                    id="chw_supply_temp"
                    name="chw_supply_temp"
                    type="number"
                    step="0.1"
                    value={formData.chw_supply_temp}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-chw-supply"
                  />
                </div>
                <div>
                  <Label htmlFor="chw_return_temp" className="text-xs">CHW Return (°C)</Label>
                  <Input
                    id="chw_return_temp"
                    name="chw_return_temp"
                    type="number"
                    step="0.1"
                    value={formData.chw_return_temp}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-chw-return"
                  />
                </div>
                <div>
                  <Label htmlFor="chw_flow_rate" className="text-xs">CHW Flow Rate (L/s)</Label>
                  <Input
                    id="chw_flow_rate"
                    name="chw_flow_rate"
                    type="number"
                    step="0.1"
                    value={formData.chw_flow_rate}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-chw-flow"
                  />
                </div>
                <div>
                  <Label htmlFor="chiller_power" className="text-xs">Chiller Power (kW)</Label>
                  <Input
                    id="chiller_power"
                    name="chiller_power"
                    type="number"
                    step="0.1"
                    value={formData.chiller_power}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-chiller-power"
                  />
                </div>
              </div>
            </div>

            {/* Condenser Parameters */}
            <div className="space-y-3">
              <h3 className="text-sm font-rajdhani text-primary">CONDENSER WATER PARAMETERS</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cond_inlet_temp" className="text-xs">Cond Inlet (°C)</Label>
                  <Input
                    id="cond_inlet_temp"
                    name="cond_inlet_temp"
                    type="number"
                    step="0.1"
                    value={formData.cond_inlet_temp}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-cond-inlet"
                  />
                </div>
                <div>
                  <Label htmlFor="cond_outlet_temp" className="text-xs">Cond Outlet (°C)</Label>
                  <Input
                    id="cond_outlet_temp"
                    name="cond_outlet_temp"
                    type="number"
                    step="0.1"
                    value={formData.cond_outlet_temp}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-cond-outlet"
                  />
                </div>
                <div>
                  <Label htmlFor="cond_flow_rate" className="text-xs">Cond Flow Rate (L/s)</Label>
                  <Input
                    id="cond_flow_rate"
                    name="cond_flow_rate"
                    type="number"
                    step="0.1"
                    value={formData.cond_flow_rate}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-cond-flow"
                  />
                </div>
              </div>
            </div>

            {/* Ambient & Auxiliary */}
            <div className="space-y-3">
              <h3 className="text-sm font-rajdhani text-primary">AMBIENT & AUXILIARY</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ambient_temp" className="text-xs">Ambient Temp (°C)</Label>
                  <Input
                    id="ambient_temp"
                    name="ambient_temp"
                    type="number"
                    step="0.1"
                    value={formData.ambient_temp}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-ambient"
                  />
                </div>
                <div>
                  <Label htmlFor="wet_bulb_temp" className="text-xs">Wet Bulb (°C)</Label>
                  <Input
                    id="wet_bulb_temp"
                    name="wet_bulb_temp"
                    type="number"
                    step="0.1"
                    value={formData.wet_bulb_temp}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-wet-bulb"
                  />
                </div>
                <div>
                  <Label htmlFor="chw_pump_power" className="text-xs">CHW Pump (kW)</Label>
                  <Input
                    id="chw_pump_power"
                    name="chw_pump_power"
                    type="number"
                    step="0.1"
                    value={formData.chw_pump_power}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-chw-pump"
                  />
                </div>
                <div>
                  <Label htmlFor="cw_pump_power" className="text-xs">CW Pump (kW)</Label>
                  <Input
                    id="cw_pump_power"
                    name="cw_pump_power"
                    type="number"
                    step="0.1"
                    value={formData.cw_pump_power}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-cw-pump"
                  />
                </div>
                <div>
                  <Label htmlFor="tower_fan_power" className="text-xs">Tower Fan (kW)</Label>
                  <Input
                    id="tower_fan_power"
                    name="tower_fan_power"
                    type="number"
                    step="0.1"
                    value={formData.tower_fan_power}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-tower-fan"
                  />
                </div>
              </div>
            </div>

            {/* Financial Parameters */}
            <div className="space-y-3">
              <h3 className="text-sm font-rajdhani text-primary">FINANCIAL PARAMETERS</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="electricity_tariff" className="text-xs">Tariff (₹/kWh)</Label>
                  <Input
                    id="electricity_tariff"
                    name="electricity_tariff"
                    type="number"
                    step="0.1"
                    value={formData.electricity_tariff}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-tariff"
                  />
                </div>
                <div>
                  <Label htmlFor="operating_hours_per_day" className="text-xs">Hours/Day</Label>
                  <Input
                    id="operating_hours_per_day"
                    name="operating_hours_per_day"
                    type="number"
                    step="1"
                    value={formData.operating_hours_per_day}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-hours-day"
                  />
                </div>
                <div>
                  <Label htmlFor="operating_days_per_year" className="text-xs">Days/Year</Label>
                  <Input
                    id="operating_days_per_year"
                    name="operating_days_per_year"
                    type="number"
                    step="1"
                    value={formData.operating_days_per_year}
                    onChange={handleChange}
                    className="font-mono"
                    data-testid="input-days-year"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full"
              data-testid="calculate-button"
            >
              {loading ? 'Calculating...' : 'Calculate Efficiency Metrics'}
            </Button>
          </CardContent>
        </Card>

        {/* Results Display */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Diagnostic Message */}
              <Alert className={`border-2 ${
                result.plant_efficiency_status === 'excellent' ? 'border-primary' :
                result.plant_efficiency_status === 'poor' ? 'border-red-400' : 'border-yellow-500'
              }`} data-testid="diagnostic-alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-mono text-sm">
                  {result.diagnostic_message}
                </AlertDescription>
              </Alert>

              {/* KPI Results */}
              <Card className="border border-border bg-card" data-testid="results-card">
                <CardHeader>
                  <CardTitle className="font-rajdhani">CALCULATED METRICS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1" data-testid="result-cooling-load">
                      <p className="text-xs text-muted-foreground uppercase">Cooling Load</p>
                      <p className="text-2xl font-mono data-value">{result.cooling_load_kw.toFixed(2)} <span className="text-sm">kW</span></p>
                    </div>
                    <div className="space-y-1" data-testid="result-cooling-capacity">
                      <p className="text-xs text-muted-foreground uppercase">Cooling Capacity</p>
                      <p className="text-2xl font-mono data-value">{result.cooling_capacity_tr.toFixed(2)} <span className="text-sm">TR</span></p>
                    </div>
                    <div className="space-y-1" data-testid="result-chiller-kwtr">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground uppercase">Chiller kW/TR</p>
                        {getStatusIcon(result.chiller_efficiency_status)}
                      </div>
                      <p className="text-2xl font-mono data-value">{result.chiller_kw_per_tr.toFixed(3)}</p>
                      <p className="text-xs text-yellow-500 uppercase">{result.chiller_efficiency_status}</p>
                    </div>
                    <div className="space-y-1" data-testid="result-plant-kwtr">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground uppercase">Plant kW/TR</p>
                        {getStatusIcon(result.plant_efficiency_status)}
                      </div>
                      <p className="text-2xl font-mono data-value text-primary">{result.plant_kw_per_tr.toFixed(3)}</p>
                      <p className="text-xs text-primary uppercase">{result.plant_efficiency_status}</p>
                    </div>
                    <div className="space-y-1" data-testid="result-cop">
                      <p className="text-xs text-muted-foreground uppercase">COP</p>
                      <p className="text-2xl font-mono data-value">{result.cop.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1" data-testid="result-plant-cop">
                      <p className="text-xs text-muted-foreground uppercase">Plant COP</p>
                      <p className="text-2xl font-mono data-value">{result.plant_cop.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-rajdhani mb-3">TEMPERATURE ANALYSIS</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1" data-testid="result-delta-t">
                        <p className="text-xs text-muted-foreground">CHW ΔT</p>
                        <p className="text-lg font-mono">{result.delta_t.toFixed(2)}°C</p>
                        <p className="text-xs text-yellow-500">{result.delta_t_status}</p>
                      </div>
                      <div className="space-y-1" data-testid="result-tower-approach">
                        <p className="text-xs text-muted-foreground">Tower Approach</p>
                        <p className="text-lg font-mono">{result.tower_approach?.toFixed(2)}°C</p>
                        <p className="text-xs text-yellow-500">{result.tower_status}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-rajdhani mb-3">FINANCIAL IMPACT</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1" data-testid="result-cost-day">
                        <p className="text-xs text-muted-foreground">Cost/Day</p>
                        <p className="text-xl font-mono text-primary">₹{result.cost_per_day.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1" data-testid="result-cost-month">
                        <p className="text-xs text-muted-foreground">Cost/Month</p>
                        <p className="text-xl font-mono text-primary">₹{result.cost_per_month.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1" data-testid="result-cost-year">
                        <p className="text-xs text-muted-foreground">Cost/Year</p>
                        <p className="text-xl font-mono text-primary">₹{result.cost_per_year.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1" data-testid="result-co2">
                        <p className="text-xs text-muted-foreground">CO₂/Year</p>
                        <p className="text-xl font-mono">{result.co2_kg_per_year.toLocaleString()} kg</p>
                      </div>
                    </div>
                    {result.estimated_savings_inr_per_day && (
                      <div className="mt-3 p-3 bg-primary/10 rounded-sm" data-testid="result-savings">
                        <p className="text-xs text-muted-foreground mb-1">POTENTIAL SAVINGS</p>
                        <p className="text-2xl font-mono text-primary">₹{result.estimated_savings_inr_per_day.toLocaleString()}/day</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          ₹{(result.estimated_savings_inr_per_day * result.inputs.operating_days_per_year).toLocaleString()}/year
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border border-border bg-card" data-testid="recommendations-card">
                <CardHeader>
                  <CardTitle className="font-rajdhani">OPTIMIZATION RECOMMENDATIONS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-secondary/30 rounded-sm" data-testid={`recommendation-${idx}`}>
                        <span className="text-primary font-mono text-sm">{idx + 1}.</span>
                        <span className="text-sm text-foreground">{rec}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Export Button */}
              <Button
                onClick={handleGeneratePDF}
                variant="outline"
                className="w-full"
                data-testid="export-pdf-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate & Download PDF Report
              </Button>
            </>
          ) : (
            <Card className="border border-border bg-card" data-testid="no-results-card">
              <CardContent className="p-12 text-center">
                <Calculator className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter your field measurements and click "Calculate" to see results
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DataManagement({ onDataUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/data/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(response.data);
      toast.success(`Uploaded ${response.data.records_uploaded} records successfully`);
      if (onDataUpdate) onDataUpdate();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await axios.get(`${API}/data/export?hours=24`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chiller_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-rajdhani mb-2" data-testid="data-mgmt-title">DATA MANAGEMENT</h2>
        <p className="text-muted-foreground text-sm">Upload real sensor data or export simulation results</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <Card className="border border-border bg-card" data-testid="upload-card">
          <CardHeader>
            <CardTitle className="font-rajdhani flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              UPLOAD SENSOR DATA
            </CardTitle>
            <CardDescription>Import real chiller plant sensor readings from CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-sm border border-dashed border-border">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading}
                data-testid="file-input"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-rajdhani uppercase text-foreground mb-2">
                    {uploading ? 'UPLOADING...' : 'CLICK TO UPLOAD CSV'}
                  </p>
                  <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
                </div>
              </label>
            </div>

            {uploadResult && (
              <div className="p-4 bg-primary/10 rounded-sm border border-primary" data-testid="upload-result">
                <p className="text-sm font-rajdhani uppercase text-primary mb-2">Upload Successful</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Records Uploaded</p>
                    <p className="text-lg font-mono data-value">{uploadResult.records_uploaded}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valid Records</p>
                    <p className="text-lg font-mono data-value text-primary">{uploadResult.valid_records}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-secondary/30 rounded-sm border border-border">
              <p className="text-xs font-rajdhani uppercase text-muted-foreground mb-2">Required CSV Columns:</p>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                <li>• timestamp (ISO format)</li>
                <li>• chw_supply_temp, chw_return_temp (°C)</li>
                <li>• chw_flow_rate (L/s)</li>
                <li>• cond_inlet_temp, cond_outlet_temp (°C)</li>
                <li>• cond_flow_rate (L/s)</li>
                <li>• chiller_power (kW)</li>
                <li>• ambient_temp (°C)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Export Panel */}
        <Card className="border border-border bg-card" data-testid="export-card">
          <CardHeader>
            <CardTitle className="font-rajdhani flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              EXPORT DATA
            </CardTitle>
            <CardDescription>Download simulation results and calculated metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-secondary/50 rounded-sm border border-border text-center">
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Export includes all sensor readings, calculated metrics (kW/TR, COP, Cooling Load), 
                and timestamps for the last 24 hours.
              </p>
              <Button
                onClick={handleExportData}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-rajdhani uppercase"
                data-testid="btn-export"
              >
                <Download className="w-4 h-4 mr-2" />
                EXPORT TO CSV
              </Button>
            </div>

            <div className="p-3 bg-secondary/30 rounded-sm border border-border">
              <p className="text-xs font-rajdhani uppercase text-muted-foreground mb-2">Export Includes:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• All sensor readings (temperatures, flows, power)</li>
                <li>• Calculated metrics (kW/TR, COP, Cooling Load, TR)</li>
                <li>• Efficiency status and validation flags</li>
                <li>• Timestamps and metadata</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Format Guide */}
      <Card className="border border-border bg-card" data-testid="format-guide-card">
        <CardHeader>
          <CardTitle className="font-rajdhani">DATA FORMAT SPECIFICATION</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-rajdhani text-sm uppercase mb-2 text-primary">Sensor Data Requirements</h4>
              <p className="text-sm text-muted-foreground mb-3">
                The system requires accurate sensor data from the chiller plant. Each data point must include:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/30 rounded-sm border border-border">
                  <p className="text-xs font-rajdhani uppercase text-muted-foreground mb-1">Chilled Water System</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Supply Temperature (4-12°C typical)</li>
                    <li>• Return Temperature (8-16°C typical)</li>
                    <li>• Flow Rate (L/s)</li>
                  </ul>
                </div>
                <div className="p-3 bg-secondary/30 rounded-sm border border-border">
                  <p className="text-xs font-rajdhani uppercase text-muted-foreground mb-1">Condenser System</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Inlet Temperature (°C)</li>
                    <li>• Outlet Temperature (°C)</li>
                    <li>• Flow Rate (L/s)</li>
                  </ul>
                </div>
                <div className="p-3 bg-secondary/30 rounded-sm border border-border">
                  <p className="text-xs font-rajdhani uppercase text-muted-foreground mb-1">Electrical</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Chiller Power Consumption (kW)</li>
                  </ul>
                </div>
                <div className="p-3 bg-secondary/30 rounded-sm border border-border">
                  <p className="text-xs font-rajdhani uppercase text-muted-foreground mb-1">Environmental</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ambient Temperature (°C)</li>
                    <li>• Humidity (% - optional)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-rajdhani text-sm uppercase mb-2 text-primary">Validation Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ΔT (Return - Supply) must be &gt; 2°C for valid calculations</li>
                <li>• Flow rates must be positive values</li>
                <li>• Chiller power must be &gt; 0 kW</li>
                <li>• Invalid records are flagged but not discarded</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

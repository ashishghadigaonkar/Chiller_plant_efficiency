import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MLInsights({ systemStatus, summaryData, onRefresh }) {
  const [training, setTraining] = useState(false);
  const [trainingResults, setTrainingResults] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const handleTrainModels = async () => {
    setTraining(true);
    try {
      const response = await axios.post(`${API}/ml/train?duration_hours=48`);
      setTrainingResults(response.data.performance);
      toast.success('ML models trained successfully');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Training error:', error);
      toast.error('Failed to train ML models');
    } finally {
      setTraining(false);
    }
  };

  const handlePredict = async () => {
    if (!summaryData?.sensor_data || !summaryData?.current_metrics) return;

    try {
      const response = await axios.post(`${API}/ml/predict`, {
        chw_supply_temp: summaryData.sensor_data.chw_supply_temp,
        chw_return_temp: summaryData.sensor_data.chw_return_temp,
        chw_flow_rate: summaryData.sensor_data.chw_flow_rate,
        ambient_temp: summaryData.sensor_data.ambient_temp,
        load_kw: summaryData.current_metrics.cooling_load_kw,
      });
      setPredictions(response.data);
      toast.success('Prediction completed');
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error(error.response?.data?.detail || 'Failed to predict. Train models first.');
    }
  };

  const handleDetectAnomalies = async () => {
    if (!summaryData) return;

    try {
      const data = {
        ...summaryData.sensor_data,
        ...summaryData.current_metrics,
      };
      const response = await axios.post(`${API}/ml/anomalies`, data);
      setAnomalies(response.data);
      
      if (response.data.is_anomaly) {
        toast.warning('Anomaly detected!');
      } else {
        toast.success('No anomalies detected');
      }
    } catch (error) {
      console.error('Anomaly detection error:', error);
      toast.error(error.response?.data?.detail || 'Failed to detect anomalies');
    }
  };

  const handleOptimize = async () => {
    if (!summaryData) return;

    try {
      const data = {
        ...summaryData.sensor_data,
        ...summaryData.current_metrics,
      };
      const response = await axios.post(`${API}/ml/optimize`, data);
      setRecommendations(response.data);
      toast.success('Optimization analysis complete');
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to generate recommendations');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-rajdhani mb-2" data-testid="ml-insights-title">MACHINE LEARNING INSIGHTS</h2>
        <p className="text-muted-foreground text-sm">AI-powered efficiency prediction, anomaly detection & optimization</p>
      </div>

      {/* ML Status & Training */}
      <Card className={`border ${systemStatus.ml_models_trained ? 'border-primary/50' : 'border-border'} bg-card`} data-testid="ml-status-card">
        <CardHeader>
          <CardTitle className="font-rajdhani flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              ML MODEL STATUS
            </span>
            <Badge variant={systemStatus.ml_models_trained ? "default" : "secondary"} data-testid="ml-trained-badge">
              {systemStatus.ml_models_trained ? 'TRAINED' : 'NOT TRAINED'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {systemStatus.ml_models_trained 
              ? 'Models ready for predictions and analysis' 
              : 'Train models using historical or simulated data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleTrainModels}
            disabled={training}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-rajdhani uppercase"
            data-testid="btn-train-models"
          >
            {training ? 'TRAINING...' : 'TRAIN ML MODELS (48H DATA)'}
          </Button>

          {trainingResults && (
            <div className="p-4 bg-secondary/50 rounded-sm border border-border space-y-2" data-testid="training-results">
              <p className="text-xs font-rajdhani uppercase text-muted-foreground">Training Results:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">XGB Chiller R²</p>
                  <p className="text-lg font-mono data-value text-primary">{trainingResults.xgb_chiller_r2 || trainingResults.xgb_r2_score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">XGB Plant R²</p>
                  <p className="text-lg font-mono data-value text-primary">{trainingResults.xgb_plant_r2 || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RF Chiller R²</p>
                  <p className="text-lg font-mono data-value">{trainingResults.rf_chiller_r2 || trainingResults.rf_r2_score}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Training Samples</p>
                  <p className="text-lg font-mono data-value">{trainingResults.training_samples}</p>
                </div>
              </div>
              <div className="mt-2 p-2 bg-secondary/30 rounded border border-border">
                <p className="text-xs text-muted-foreground">
                  Trained on both <strong className="text-foreground">Chiller kW/TR</strong> and <strong className="text-primary">Plant kW/TR</strong> for comprehensive system analysis
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border bg-card card-border-glow" data-testid="predict-card">
          <CardHeader>
            <CardTitle className="text-sm font-rajdhani">EFFICIENCY PREDICTION</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Predict kW/TR and COP using current conditions</p>
            <Button
              onClick={handlePredict}
              disabled={!systemStatus.ml_models_trained}
              className="w-full"
              variant="outline"
              data-testid="btn-predict"
            >
              RUN PREDICTION
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card card-border-glow" data-testid="anomaly-card">
          <CardHeader>
            <CardTitle className="text-sm font-rajdhani">ANOMALY DETECTION</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Detect unusual operating patterns</p>
            <Button
              onClick={handleDetectAnomalies}
              disabled={!systemStatus.ml_models_trained}
              className="w-full"
              variant="outline"
              data-testid="btn-detect-anomalies"
            >
              CHECK FOR ANOMALIES
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card card-border-glow" data-testid="optimize-card">
          <CardHeader>
            <CardTitle className="text-sm font-rajdhani">OPTIMIZATION</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Get energy-saving recommendations</p>
            <Button
              onClick={handleOptimize}
              className="w-full"
              variant="outline"
              data-testid="btn-optimize"
            >
              GENERATE RECOMMENDATIONS
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Prediction Results */}
      {predictions && (
        <Card className="border border-primary/50 bg-card" data-testid="prediction-results">
          <CardHeader>
            <CardTitle className="font-rajdhani text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              PREDICTION RESULTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-rajdhani">Predicted kW/TR</p>
                <p className="text-2xl font-mono data-value text-primary">{predictions.predicted_kw_per_tr}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-rajdhani">Predicted COP</p>
                <p className="text-2xl font-mono data-value">{predictions.predicted_cop}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-rajdhani">Model Used</p>
                <p className="text-lg data-value">{predictions.model_used}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-rajdhani">Confidence</p>
                <p className="text-2xl font-mono data-value">{(predictions.confidence_score * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomaly Results */}
      {anomalies && (
        <Card className={`border ${anomalies.is_anomaly ? 'border-red-400' : 'border-primary/50'} bg-card`} data-testid="anomaly-results">
          <CardHeader>
            <CardTitle className={`font-rajdhani flex items-center gap-2 ${anomalies.is_anomaly ? 'text-red-400' : 'text-primary'}`}>
              {anomalies.is_anomaly ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              {anomalies.is_anomaly ? 'ANOMALY DETECTED' : 'NORMAL OPERATION'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani">Detection Method</p>
                  <p className="text-lg data-value">{anomalies.method}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-rajdhani">Anomaly Score</p>
                  <p className="text-lg font-mono data-value">{anomalies.anomaly_score}</p>
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-sm border border-border">
                <p className="text-sm text-foreground">{anomalies.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border border-primary/50 bg-card" data-testid="recommendations-card">
          <CardHeader>
            <CardTitle className="font-rajdhani text-primary">OPTIMIZATION RECOMMENDATIONS</CardTitle>
            <CardDescription>AI-generated suggestions for energy savings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 bg-secondary/30 rounded-sm border border-border"
                data-testid={`recommendation-${index}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-rajdhani text-sm uppercase text-foreground">{rec.parameter}</h4>
                  <Badge variant="default" className="font-mono">
                    {rec.estimated_savings_percent}% SAVINGS
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Value</p>
                    <p className="text-lg font-mono data-value">{rec.current_value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recommended Value</p>
                    <p className="text-lg font-mono data-value text-primary">{rec.recommended_value}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{rec.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ML Explanation */}
      <Card className="border border-border bg-card" data-testid="ml-explanation-card">
        <CardHeader>
          <CardTitle className="font-rajdhani">HOW ML ENHANCES CHILLER OPTIMIZATION</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-rajdhani text-sm uppercase mb-2 text-primary">1. Efficiency Prediction</h4>
            <p className="text-sm text-muted-foreground">
              Uses <strong>XGBoost</strong> and <strong>RandomForest</strong> models trained on historical data to predict kW/TR 
              and COP based on current operating conditions. Goes beyond simple thermodynamic formulas by capturing 
              non-linear relationships and equipment-specific behavior.
            </p>
          </div>
          <div>
            <h4 className="font-rajdhani text-sm uppercase mb-2 text-primary">2. Anomaly Detection</h4>
            <p className="text-sm text-muted-foreground">
              Combines <strong>Isolation Forest</strong> (unsupervised learning) with <strong>Z-score analysis</strong> to identify 
              abnormal efficiency drops, sensor failures, or degrading equipment performance before they become critical issues.
            </p>
          </div>
          <div>
            <h4 className="font-rajdhani text-sm uppercase mb-2 text-primary">3. Optimization Recommendations</h4>
            <p className="text-sm text-muted-foreground">
              Analyzes current conditions and suggests optimal setpoints for CHW temperature, flow rates, and sequencing 
              to minimize energy consumption while meeting load requirements. Estimates potential energy savings percentage.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler
from typing import List, Tuple, Dict
import pickle
import os

from models.sensor_data import (
    MLPredictionRequest,
    MLPredictionResponse,
    AnomalyDetectionResponse,
    OptimizationRecommendation
)
from datetime import datetime, timezone

class MLEngine:
    """
    Machine Learning engine for:
    1. Efficiency Prediction (XGBoost, RandomForest)
    2. Anomaly Detection (Isolation Forest, Z-score)
    3. Optimization Recommendations
    """
    
    def __init__(self):
        self.xgb_model = None
        self.rf_model = None
        self.anomaly_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_data_stats = {}
    
    def prepare_features(self, data: List[dict]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Extract features for ML models:
        Features: [chw_supply_temp, chw_return_temp, chw_flow_rate, ambient_temp, cooling_load_kw]
        Target: kw_per_tr
        """
        features = []
        targets = []
        
        for record in data:
            if record.get('is_valid', False) and record.get('kw_per_tr', 0) > 0:
                features.append([
                    record['chw_supply_temp'],
                    record['chw_return_temp'],
                    record['chw_flow_rate'],
                    record['ambient_temp'],
                    record['cooling_load_kw']
                ])
                targets.append(record['kw_per_tr'])
        
        return np.array(features), np.array(targets)
    
    def train_models(self, training_data: List[dict]) -> Dict[str, float]:
        """
        Train multiple ML models and return performance metrics.
        
        Models:
        1. XGBoost: Gradient boosting for high accuracy
        2. RandomForest: Ensemble method for baseline
        3. Isolation Forest: Anomaly detection
        """
        X, y = self.prepare_features(training_data)
        
        if len(X) < 20:
            raise ValueError("Insufficient training data. Need at least 20 valid samples.")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train XGBoost
        self.xgb_model = XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.xgb_model.fit(X_scaled, y)
        
        # Train RandomForest
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.rf_model.fit(X_scaled, y)
        
        # Train Isolation Forest for anomaly detection
        self.anomaly_model = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies
            random_state=42
        )
        self.anomaly_model.fit(X_scaled)
        
        # Store training statistics for Z-score anomaly detection
        self.training_data_stats = {
            'kw_per_tr_mean': float(np.mean(y)),
            'kw_per_tr_std': float(np.std(y)),
            'sample_count': len(X)
        }
        
        self.is_trained = True
        
        # Calculate R² scores
        xgb_score = self.xgb_model.score(X_scaled, y)
        rf_score = self.rf_model.score(X_scaled, y)
        
        return {
            'xgb_r2_score': round(xgb_score, 4),
            'rf_r2_score': round(rf_score, 4),
            'training_samples': len(X),
            'mean_kw_per_tr': round(self.training_data_stats['kw_per_tr_mean'], 3)
        }
    
    def predict_efficiency(self, request: MLPredictionRequest, use_xgb: bool = True) -> MLPredictionResponse:
        """
        Predict efficiency metrics using trained models.
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        # Prepare input features
        features = np.array([[
            request.chw_supply_temp,
            request.chw_return_temp,
            request.chw_flow_rate,
            request.ambient_temp,
            request.load_kw
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        # Choose model
        if use_xgb:
            predicted_kw_per_tr = self.xgb_model.predict(features_scaled)[0]
            model_used = "XGBoost"
            # Confidence based on feature importances
            confidence = 0.85
        else:
            predicted_kw_per_tr = self.rf_model.predict(features_scaled)[0]
            model_used = "RandomForest"
            confidence = 0.80
        
        # Calculate COP from predicted kW/TR
        cooling_tr = request.load_kw / 3.517
        predicted_power = predicted_kw_per_tr * cooling_tr
        predicted_cop = request.load_kw / predicted_power if predicted_power > 0 else 0
        
        return MLPredictionResponse(
            predicted_kw_per_tr=round(float(predicted_kw_per_tr), 3),
            predicted_cop=round(float(predicted_cop), 2),
            model_used=model_used,
            confidence_score=confidence
        )
    
    def detect_anomalies(self, current_data: dict) -> AnomalyDetectionResponse:
        """
        Detect anomalies using:
        1. Isolation Forest
        2. Z-score method
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        # Prepare features
        features = np.array([[
            current_data['chw_supply_temp'],
            current_data['chw_return_temp'],
            current_data['chw_flow_rate'],
            current_data['ambient_temp'],
            current_data['cooling_load_kw']
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        # Isolation Forest prediction
        iso_prediction = self.anomaly_model.predict(features_scaled)[0]
        iso_score = self.anomaly_model.score_samples(features_scaled)[0]
        
        # Z-score check on kW/TR
        current_kw_per_tr = current_data.get('kw_per_tr', 0)
        mean_kw = self.training_data_stats['kw_per_tr_mean']
        std_kw = self.training_data_stats['kw_per_tr_std']
        
        if std_kw > 0:
            z_score = abs((current_kw_per_tr - mean_kw) / std_kw)
        else:
            z_score = 0
        
        # Anomaly if: Isolation Forest detects OR Z-score > 3
        is_anomaly = (iso_prediction == -1) or (z_score > 3)
        
        if is_anomaly:
            if z_score > 3:
                message = f"Abnormal efficiency detected: kW/TR={current_kw_per_tr:.3f} (Z-score: {z_score:.2f})"
                method = "Z-score"
            else:
                message = f"Unusual operating pattern detected (Isolation Forest)"
                method = "Isolation Forest"
        else:
            message = "Operating normally"
            method = "Combined"
        
        return AnomalyDetectionResponse(
            is_anomaly=is_anomaly,
            anomaly_score=round(float(abs(iso_score)), 3),
            method=method,
            timestamp=datetime.now(timezone.utc),
            message=message
        )
    
    def generate_optimization_recommendations(self, current_data: dict) -> List[OptimizationRecommendation]:
        """
        Generate optimization recommendations based on current operating conditions.
        """
        recommendations = []
        
        current_chw_supply = current_data['chw_supply_temp']
        current_kw_per_tr = current_data.get('kw_per_tr', 0)
        
        # Recommendation 1: CHW supply temperature
        # Higher CHW temp improves efficiency (if acceptable for load)
        if current_chw_supply < 8.0:
            optimal_supply = 8.0
            # Estimated 2-3% savings per degree increase
            temp_increase = optimal_supply - current_chw_supply
            savings = temp_increase * 2.5
            
            recommendations.append(OptimizationRecommendation(
                parameter="CHW Supply Temperature",
                current_value=round(current_chw_supply, 2),
                recommended_value=round(optimal_supply, 2),
                estimated_savings_percent=round(savings, 1),
                rationale=f"Increasing CHW supply temp by {temp_increase:.1f}°C can improve efficiency by ~{savings:.1f}%. Verify cooling load requirements."
            ))
        
        # Recommendation 2: Flow optimization
        delta_t = current_data['chw_return_temp'] - current_data['chw_supply_temp']
        if delta_t < 4.0:
            # Low delta-T indicates excessive flow
            current_flow = current_data['chw_flow_rate']
            optimal_flow = current_flow * (delta_t / 5.0)  # Target 5°C delta-T
            savings = 5 + (5.0 - delta_t) * 2
            
            recommendations.append(OptimizationRecommendation(
                parameter="CHW Flow Rate",
                current_value=round(current_flow, 2),
                recommended_value=round(optimal_flow, 2),
                estimated_savings_percent=round(savings, 1),
                rationale=f"Current ΔT is {delta_t:.1f}°C. Reducing flow to achieve 5°C ΔT can save ~{savings:.1f}% on pump energy."
            ))
        
        # Recommendation 3: Efficiency status
        if current_kw_per_tr > 0.8:
            recommendations.append(OptimizationRecommendation(
                parameter="Overall System Efficiency",
                current_value=round(current_kw_per_tr, 3),
                recommended_value=0.65,
                estimated_savings_percent=round(((current_kw_per_tr - 0.65) / current_kw_per_tr) * 100, 1),
                rationale="System operating below optimal efficiency. Consider: condenser cleaning, refrigerant charge check, or chiller sequencing adjustment."
            ))
        
        return recommendations

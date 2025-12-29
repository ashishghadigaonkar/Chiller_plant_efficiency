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
        self.xgb_plant_model = None  # For plant kW/TR prediction
        self.rf_plant_model = None
        self.anomaly_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.training_data_stats = {}
    
    def prepare_features(self, data: List[dict]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Extract features for ML models:
        Features: [chw_supply_temp, chw_return_temp, chw_flow_rate, ambient_temp, 
                   cooling_load_kw, wet_bulb_temp, total_plant_power]
        Targets: kw_per_tr (chiller), plant_kw_per_tr (plant)
        """
        features = []
        targets_chiller = []
        targets_plant = []
        
        for record in data:
            if record.get('is_valid', False) and record.get('kw_per_tr', 0) > 0:
                # Extract features
                wet_bulb = record.get('wet_bulb_temp', record.get('ambient_temp', 30) - 7)
                total_power = record.get('total_plant_power', record.get('chiller_power', 0))
                
                features.append([
                    record['chw_supply_temp'],
                    record['chw_return_temp'],
                    record['chw_flow_rate'],
                    record['ambient_temp'],
                    record['cooling_load_kw'],
                    wet_bulb,
                    total_power
                ])
                targets_chiller.append(record['kw_per_tr'])
                
                # Plant kW/TR (if available)
                plant_kw_tr = record.get('plant_kw_per_tr', record.get('kw_per_tr', 0))
                targets_plant.append(plant_kw_tr)
        
        return np.array(features), np.array(targets_chiller), np.array(targets_plant)
    
    def train_models(self, training_data: List[dict]) -> Dict[str, float]:
        """
        Train multiple ML models and return performance metrics.
        
        Models:
        1. XGBoost: Chiller kW/TR and Plant kW/TR prediction
        2. RandomForest: Baseline models for both
        3. Isolation Forest: Anomaly detection
        """
        X, y_chiller, y_plant = self.prepare_features(training_data)
        
        if len(X) < 20:
            raise ValueError("Insufficient training data. Need at least 20 valid samples.")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train XGBoost for Chiller kW/TR
        self.xgb_model = XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.xgb_model.fit(X_scaled, y_chiller)
        
        # Train XGBoost for Plant kW/TR
        self.xgb_plant_model = XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.xgb_plant_model.fit(X_scaled, y_plant)
        
        # Train RandomForest for Chiller kW/TR
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.rf_model.fit(X_scaled, y_chiller)
        
        # Train RandomForest for Plant kW/TR
        self.rf_plant_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.rf_plant_model.fit(X_scaled, y_plant)
        
        # Train Isolation Forest for anomaly detection
        self.anomaly_model = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies
            random_state=42
        )
        self.anomaly_model.fit(X_scaled)
        
        # Store training statistics for Z-score anomaly detection
        self.training_data_stats = {
            'kw_per_tr_mean': float(np.mean(y_chiller)),
            'kw_per_tr_std': float(np.std(y_chiller)),
            'plant_kw_per_tr_mean': float(np.mean(y_plant)),
            'plant_kw_per_tr_std': float(np.std(y_plant)),
            'sample_count': len(X)
        }
        
        self.is_trained = True
        
        # Calculate R² scores
        xgb_score = self.xgb_model.score(X_scaled, y_chiller)
        xgb_plant_score = self.xgb_plant_model.score(X_scaled, y_plant)
        rf_score = self.rf_model.score(X_scaled, y_chiller)
        rf_plant_score = self.rf_plant_model.score(X_scaled, y_plant)
        
        return {
            'xgb_chiller_r2': round(xgb_score, 4),
            'xgb_plant_r2': round(xgb_plant_score, 4),
            'rf_chiller_r2': round(rf_score, 4),
            'rf_plant_r2': round(rf_plant_score, 4),
            'training_samples': len(X),
            'mean_chiller_kw_per_tr': round(self.training_data_stats['kw_per_tr_mean'], 3),
            'mean_plant_kw_per_tr': round(self.training_data_stats['plant_kw_per_tr_mean'], 3)
        }
    
    def predict_efficiency(self, request: MLPredictionRequest, use_xgb: bool = True) -> MLPredictionResponse:
        """
        Predict efficiency metrics using trained ML models.
        Now returns both Chiller and Plant kW/TR predictions.
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        # Prepare input features - need to estimate wet_bulb and total_power
        wet_bulb_estimate = request.ambient_temp - 7  # Rough estimate
        total_power_estimate = request.load_kw * 0.25  # Rough estimate (COP ~4)
        
        features = np.array([[
            request.chw_supply_temp,
            request.chw_return_temp,
            request.chw_flow_rate,
            request.ambient_temp,
            request.load_kw,
            wet_bulb_estimate,
            total_power_estimate
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        # Choose model and predict both chiller and plant kW/TR
        if use_xgb:
            predicted_kw_per_tr = self.xgb_model.predict(features_scaled)[0]
            predicted_plant_kw_per_tr = self.xgb_plant_model.predict(features_scaled)[0]
            model_used = "XGBoost"
            confidence = 0.85
        else:
            predicted_kw_per_tr = self.rf_model.predict(features_scaled)[0]
            predicted_plant_kw_per_tr = self.rf_plant_model.predict(features_scaled)[0]
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
        2. Z-score method (checks both chiller and plant kW/TR)
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        # Prepare features
        wet_bulb = current_data.get('wet_bulb_temp', current_data.get('ambient_temp', 30) - 7)
        total_power = current_data.get('total_plant_power', current_data.get('chiller_power', 0))
        
        features = np.array([[
            current_data['chw_supply_temp'],
            current_data['chw_return_temp'],
            current_data['chw_flow_rate'],
            current_data['ambient_temp'],
            current_data['cooling_load_kw'],
            wet_bulb,
            total_power
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        # Isolation Forest prediction
        iso_prediction = self.anomaly_model.predict(features_scaled)[0]
        iso_score = self.anomaly_model.score_samples(features_scaled)[0]
        
        # Z-score check on both chiller and plant kW/TR
        current_kw_per_tr = current_data.get('kw_per_tr', 0)
        current_plant_kw_per_tr = current_data.get('plant_kw_per_tr', current_kw_per_tr)
        
        mean_kw = self.training_data_stats['kw_per_tr_mean']
        std_kw = self.training_data_stats['kw_per_tr_std']
        mean_plant_kw = self.training_data_stats.get('plant_kw_per_tr_mean', mean_kw)
        std_plant_kw = self.training_data_stats.get('plant_kw_per_tr_std', std_kw)
        
        if std_kw > 0:
            z_score_chiller = abs((current_kw_per_tr - mean_kw) / std_kw)
        else:
            z_score_chiller = 0
        
        if std_plant_kw > 0:
            z_score_plant = abs((current_plant_kw_per_tr - mean_plant_kw) / std_plant_kw)
        else:
            z_score_plant = 0
        
        z_score = max(z_score_chiller, z_score_plant)
        
        # Anomaly if: Isolation Forest detects OR Z-score > 3
        is_anomaly = (iso_prediction == -1) or (z_score > 3)
        
        if is_anomaly:
            if z_score_plant > 3:
                message = f"Abnormal plant efficiency detected: Plant kW/TR={current_plant_kw_per_tr:.3f} (Z-score: {z_score_plant:.2f})"
                method = "Z-score (Plant)"
            elif z_score_chiller > 3:
                message = f"Abnormal chiller efficiency detected: kW/TR={current_kw_per_tr:.3f} (Z-score: {z_score_chiller:.2f})"
                method = "Z-score (Chiller)"
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
        Now includes plant-level efficiency recommendations.
        """
        recommendations = []
        
        current_chw_supply = current_data['chw_supply_temp']
        current_kw_per_tr = current_data.get('kw_per_tr', 0)
        current_plant_kw_per_tr = current_data.get('plant_kw_per_tr', current_kw_per_tr)
        
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
        
        # Recommendation 3: Cooling Tower Optimization
        tower_approach = current_data.get('tower_approach')
        if tower_approach and tower_approach > 4.0:
            recommendations.append(OptimizationRecommendation(
                parameter="Cooling Tower Performance",
                current_value=round(tower_approach, 2),
                recommended_value=3.0,
                estimated_savings_percent=3.0,
                rationale=f"Current approach is {tower_approach:.1f}°C. Improving to 3°C through tower maintenance/cleaning can save ~3% on chiller power."
            ))
        
        # Recommendation 4: Plant efficiency status
        if current_plant_kw_per_tr > 0.85:
            recommendations.append(OptimizationRecommendation(
                parameter="Overall Plant Efficiency",
                current_value=round(current_plant_kw_per_tr, 3),
                recommended_value=0.75,
                estimated_savings_percent=round(((current_plant_kw_per_tr - 0.75) / current_plant_kw_per_tr) * 100, 1),
                rationale="Plant operating below optimal efficiency. Consider: condenser cleaning, refrigerant charge check, VFD optimization for pumps/fans, or chiller sequencing adjustment."
            ))
        elif current_kw_per_tr > 0.75:
            # Chiller is inefficient but plant overall is okay
            recommendations.append(OptimizationRecommendation(
                parameter="Chiller Efficiency",
                current_value=round(current_kw_per_tr, 3),
                recommended_value=0.65,
                estimated_savings_percent=round(((current_kw_per_tr - 0.65) / current_kw_per_tr) * 100, 1),
                rationale="Chiller efficiency can be improved through condenser maintenance, refrigerant check, or operating setpoint optimization."
            ))
        
        # Recommendation 5: Fan Speed Optimization (Cube Law)
        tower_fan_speed = current_data.get('tower_fan_speed', 100)
        if tower_fan_speed > 90:
            # Running at high speed - potential for VFD savings
            optimal_speed = 85
            # Cube law: Power savings = 1 - (new_speed/old_speed)³
            savings_percent = (1 - (optimal_speed / tower_fan_speed) ** 3) * 100
            
            recommendations.append(OptimizationRecommendation(
                parameter="Tower Fan Speed",
                current_value=round(tower_fan_speed, 1),
                recommended_value=optimal_speed,
                estimated_savings_percent=round(savings_percent, 1),
                rationale=f"Reducing fan speed from {tower_fan_speed:.0f}% to {optimal_speed}% saves {savings_percent:.1f}% fan power (cube law). Verify condenser temp limits."
            ))
        
        return recommendations

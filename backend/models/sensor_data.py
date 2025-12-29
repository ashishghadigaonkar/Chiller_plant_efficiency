from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class SensorReading(BaseModel):
    """Real-time sensor data from chiller plant"""
    model_config = ConfigDict(extra="ignore")
    
    timestamp: datetime
    chw_supply_temp: float  # °C
    chw_return_temp: float  # °C
    chw_flow_rate: float  # L/s
    cond_inlet_temp: float  # °C
    cond_outlet_temp: float  # °C
    cond_flow_rate: float  # L/s
    chiller_power: float  # kW
    ambient_temp: float  # °C
    humidity: Optional[float] = None  # %

class CalculatedMetrics(BaseModel):
    """Thermodynamic calculations and efficiency metrics"""
    model_config = ConfigDict(extra="ignore")
    
    timestamp: datetime
    cooling_load_kw: float
    cooling_capacity_tr: float
    kw_per_tr: float
    cop: float
    delta_t: float
    efficiency_status: str  # excellent, average, poor
    
class SimulationConfig(BaseModel):
    """Configuration for simulation engine"""
    duration_hours: int = Field(default=24, ge=1, le=168)
    timestep_minutes: int = Field(default=5, ge=1, le=60)
    chw_supply_setpoint: float = Field(default=7.0, ge=4.0, le=12.0)
    chw_return_setpoint: float = Field(default=12.0, ge=8.0, le=16.0)
    ambient_temp_base: float = Field(default=32.0, ge=20.0, le=45.0)
    load_factor: float = Field(default=0.75, ge=0.3, le=1.0)
    include_fouling: bool = False
    fouling_rate: float = Field(default=0.01, ge=0.0, le=0.1)

class ScenarioRequest(BaseModel):
    """What-if scenario analysis request"""
    scenario_name: str
    config: SimulationConfig

class MLPredictionRequest(BaseModel):
    """Request for ML-based efficiency prediction"""
    chw_supply_temp: float
    chw_return_temp: float
    chw_flow_rate: float
    ambient_temp: float
    load_kw: float

class MLPredictionResponse(BaseModel):
    """ML prediction results"""
    model_config = ConfigDict(extra="ignore")
    
    predicted_kw_per_tr: float
    predicted_cop: float
    model_used: str
    confidence_score: float

class AnomalyDetectionResponse(BaseModel):
    """Anomaly detection results"""
    model_config = ConfigDict(extra="ignore")
    
    is_anomaly: bool
    anomaly_score: float
    method: str
    timestamp: datetime
    message: str

class OptimizationRecommendation(BaseModel):
    """Optimization suggestions"""
    model_config = ConfigDict(extra="ignore")
    
    parameter: str
    current_value: float
    recommended_value: float
    estimated_savings_percent: float
    rationale: str

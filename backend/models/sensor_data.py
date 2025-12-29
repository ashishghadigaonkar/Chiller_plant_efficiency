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
    wet_bulb_temp: Optional[float] = None  # °C - for cooling tower approach
    chw_pump_power: Optional[float] = None  # kW
    cw_pump_power: Optional[float] = None  # kW
    tower_fan_power: Optional[float] = None  # kW
    tower_fan_speed: Optional[float] = 100.0  # % - for cube law

class CalculatedMetrics(BaseModel):
    """Thermodynamic calculations and efficiency metrics"""
    model_config = ConfigDict(extra="ignore")
    
    timestamp: datetime
    cooling_load_kw: float
    cooling_capacity_tr: float
    kw_per_tr: float  # Chiller only
    cop: float
    delta_t: float
    efficiency_status: str  # excellent, average, poor
    
    # Cooling Tower Performance
    tower_range: Optional[float] = None  # °C
    tower_approach: Optional[float] = None  # °C
    heat_rejected_kw: Optional[float] = None  # kW
    
    # Plant-Level Efficiency (CRITICAL for electricity bill)
    total_plant_power: Optional[float] = None  # kW (Chiller + Pumps + Fan)
    plant_kw_per_tr: Optional[float] = None  # Total plant power / TR
    plant_cop: Optional[float] = None  # Cooling Load / Total Plant Power
    plant_efficiency_status: Optional[str] = None  # excellent, average, poor
    
    # Financial Metrics
    energy_cost_per_hour: Optional[float] = None  # ₹/hour
    potential_savings_percent: Optional[float] = None  # %
    potential_savings_inr_per_year: Optional[float] = None  # ₹
    co2_emissions_kg_per_hour: Optional[float] = None  # kg CO₂
    
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

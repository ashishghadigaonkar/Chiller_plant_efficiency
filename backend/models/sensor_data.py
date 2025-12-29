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

class ManualAuditInput(BaseModel):
    """Manual data input for on-site audit calculator"""
    chw_supply_temp: float = Field(..., ge=-10, le=15, description="CHW Supply Temperature (°C)")
    chw_return_temp: float = Field(..., ge=0, le=25, description="CHW Return Temperature (°C)")
    chw_flow_rate: float = Field(..., gt=0, le=1000, description="CHW Flow Rate (L/s)")
    chiller_power: float = Field(..., gt=0, le=10000, description="Chiller Power (kW)")
    cond_inlet_temp: float = Field(..., ge=15, le=50, description="Condenser Inlet Temp (°C)")
    cond_outlet_temp: float = Field(..., ge=15, le=50, description="Condenser Outlet Temp (°C)")
    cond_flow_rate: Optional[float] = Field(None, gt=0, le=1000, description="Condenser Flow Rate (L/s)")
    ambient_temp: float = Field(..., ge=15, le=50, description="Ambient Temperature (°C)")
    wet_bulb_temp: float = Field(..., ge=10, le=40, description="Wet Bulb Temperature (°C)")
    
    # Auxiliary equipment (optional)
    chw_pump_power: Optional[float] = Field(None, ge=0, le=500, description="CHW Pump Power (kW)")
    cw_pump_power: Optional[float] = Field(None, ge=0, le=500, description="CW Pump Power (kW)")
    tower_fan_power: Optional[float] = Field(None, ge=0, le=500, description="Tower Fan Power (kW)")
    
    # Financial parameters
    electricity_tariff: float = Field(8.0, gt=0, le=50, description="Electricity Tariff (₹/kWh)")
    operating_hours_per_day: float = Field(16, gt=0, le=24, description="Operating Hours per Day")
    operating_days_per_year: int = Field(300, gt=0, le=365, description="Operating Days per Year")

class ManualAuditResult(BaseModel):
    """Results from manual audit calculator"""
    model_config = ConfigDict(extra="ignore")
    
    # Inputs echo
    inputs: ManualAuditInput
    
    # Calculated metrics
    cooling_load_kw: float
    cooling_capacity_tr: float
    chiller_kw_per_tr: float
    plant_kw_per_tr: float
    cop: float
    plant_cop: float
    
    # Temperature analysis
    delta_t: float
    delta_t_status: str  # "Healthy", "Low", "Acceptable"
    tower_range: Optional[float] = None
    tower_approach: Optional[float] = None
    tower_status: str = "N/A"
    
    # Efficiency classification
    chiller_efficiency_status: str  # "excellent", "average", "poor"
    plant_efficiency_status: str
    
    # Financial impact
    total_plant_power: float
    energy_kwh_per_day: float
    energy_kwh_per_month: float
    energy_kwh_per_year: float
    cost_per_day: float
    cost_per_month: float
    cost_per_year: float
    
    # Environmental
    co2_kg_per_year: float
    
    # Recommendations
    diagnostic_message: str
    recommendations: list[str]
    estimated_savings_inr_per_day: Optional[float] = None

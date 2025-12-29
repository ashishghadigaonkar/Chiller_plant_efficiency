import numpy as np
from datetime import datetime, timedelta, timezone
from typing import List
import math

from models.sensor_data import SensorReading, SimulationConfig

class SimulationEngine:
    """Generate realistic chiller plant sensor data"""
    
    def __init__(self):
        self.noise_factor = 0.02  # 2% noise
    
    def generate_data(self, config: SimulationConfig) -> List[SensorReading]:
        """
        Generate time-series sensor data with realistic patterns:
        - Diurnal load variations
        - Ambient temperature cycles
        - Part-load and full-load behavior
        - Optional fouling/aging effects
        """
        readings = []
        start_time = datetime.now(timezone.utc)
        
        total_steps = (config.duration_hours * 60) // config.timestep_minutes
        
        for i in range(total_steps):
            timestamp = start_time + timedelta(minutes=i * config.timestep_minutes)
            hour_of_day = (timestamp.hour + timestamp.minute / 60.0) % 24
            
            # Ambient temperature: peaks at 2-3 PM
            ambient_cycle = math.sin((hour_of_day - 6) * math.pi / 12)
            ambient_temp = config.ambient_temp_base + 5 * ambient_cycle
            ambient_temp += np.random.normal(0, 0.5)
            
            # Load varies with time of day: higher during business hours
            if 8 <= hour_of_day < 18:
                load_multiplier = config.load_factor * (0.8 + 0.2 * np.random.random())
            else:
                load_multiplier = config.load_factor * (0.4 + 0.1 * np.random.random())
            
            # Apply fouling degradation over time
            if config.include_fouling:
                fouling_factor = 1.0 + config.fouling_rate * (i / total_steps)
            else:
                fouling_factor = 1.0
            
            # Chilled water temperatures
            chw_supply = config.chw_supply_setpoint + np.random.normal(0, 0.3)
            # Ensure minimum delta_t of 3°C to pass validation
            target_delta_t = (config.chw_return_setpoint - config.chw_supply_setpoint)
            delta_t = max(3.0, target_delta_t * load_multiplier)
            chw_return = chw_supply + delta_t
            
            # Flow rate: typically 40-100 L/s for medium chiller
            base_flow = 70.0
            chw_flow = base_flow * load_multiplier + np.random.normal(0, 2)
            
            # Condenser temperatures
            approach_temp = 3.0  # Cooling tower approach
            cond_inlet = ambient_temp + approach_temp + np.random.normal(0, 0.5)
            cond_outlet = cond_inlet + 5.0 * load_multiplier + np.random.normal(0, 0.3)
            cond_flow = base_flow * 1.2 * load_multiplier + np.random.normal(0, 2)
            
            # Chiller power: based on load and efficiency
            # Ideal kW/TR is around 0.6, but varies with conditions
            cooling_kw = 4.186 * chw_flow * (chw_return - chw_supply)
            cooling_tr = cooling_kw / 3.517
            
            # Efficiency degrades with ambient temp and fouling
            base_kw_per_tr = 0.58
            temp_penalty = 0.01 * (ambient_temp - 25)  # 1% per degree above 25°C
            efficiency_kw_per_tr = (base_kw_per_tr + temp_penalty) * fouling_factor
            
            chiller_power = max(cooling_tr * efficiency_kw_per_tr, 10)  # Min 10 kW
            chiller_power += np.random.normal(0, chiller_power * self.noise_factor)
            
            # Humidity (optional)
            humidity = 60 + 20 * math.sin(hour_of_day * math.pi / 12) + np.random.normal(0, 5)
            humidity = max(30, min(90, humidity))
            
            reading = SensorReading(
                timestamp=timestamp,
                chw_supply_temp=round(chw_supply, 2),
                chw_return_temp=round(chw_return, 2),
                chw_flow_rate=round(max(0, chw_flow), 2),
                cond_inlet_temp=round(cond_inlet, 2),
                cond_outlet_temp=round(cond_outlet, 2),
                cond_flow_rate=round(max(0, cond_flow), 2),
                chiller_power=round(max(0, chiller_power), 2),
                ambient_temp=round(ambient_temp, 2),
                humidity=round(humidity, 1)
            )
            
            readings.append(reading)
        
        return readings
    
    def generate_single_reading(self, ambient_temp: float = 32.0, load_factor: float = 0.75) -> SensorReading:
        """Generate a single realistic sensor reading"""
        config = SimulationConfig(
            duration_hours=1,
            timestep_minutes=60,
            ambient_temp_base=ambient_temp,
            load_factor=load_factor
        )
        return self.generate_data(config)[0]

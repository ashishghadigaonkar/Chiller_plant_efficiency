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
        - Pump power based on flow rates
        - Tower fan power with cube law
        - Wet bulb temperature
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
            
            # Wet bulb temperature (typically 5-8°C below dry bulb in India)
            # Higher humidity = closer to dry bulb
            humidity = 60 + 20 * math.sin(hour_of_day * math.pi / 12) + np.random.normal(0, 5)
            humidity = max(30, min(90, humidity))
            
            humidity_factor = humidity / 100.0
            wet_bulb_depression = 8 - (3 * humidity_factor)  # 5-8°C depression
            wet_bulb_temp = ambient_temp - wet_bulb_depression + np.random.normal(0, 0.3)
            
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
            # Approach temp depends on cooling tower performance (2-5°C typical)
            approach_temp = 3.0 + np.random.normal(0, 0.5)
            cond_outlet = wet_bulb_temp + approach_temp
            
            # Range typically 4-8°C
            tower_range = 5.0 + load_multiplier * 2 + np.random.normal(0, 0.5)
            cond_inlet = cond_outlet + tower_range
            
            cond_flow = base_flow * 1.2 * load_multiplier + np.random.normal(0, 2)
            
            # Chiller power: based on load and efficiency
            cooling_kw = 4.186 * chw_flow * (chw_return - chw_supply)
            cooling_tr = cooling_kw / 3.517
            
            # Efficiency degrades with ambient temp and fouling
            base_kw_per_tr = 0.58
            # Condenser temp penalty: +1°C = +2-3% power
            temp_penalty = 0.02 * (cond_inlet - 30)
            efficiency_kw_per_tr = (base_kw_per_tr + temp_penalty) * fouling_factor
            
            chiller_power = max(cooling_tr * efficiency_kw_per_tr, 10)  # Min 10 kW
            chiller_power += np.random.normal(0, chiller_power * self.noise_factor)
            
            # ===== PUMP POWER CALCULATIONS =====
            # CHW Pump: roughly 0.02-0.03 kW per L/s flow
            chw_pump_base_power = 50.0  # kW at design flow
            chw_pump_power = chw_pump_base_power * (chw_flow / base_flow) ** 1.5  # Affinity laws
            chw_pump_power = max(20, min(80, chw_pump_power + np.random.normal(0, 2)))
            
            # CW Pump: slightly higher than CHW due to higher flow
            cw_pump_base_power = 60.0  # kW at design flow
            cw_pump_power = cw_pump_base_power * (cond_flow / (base_flow * 1.2)) ** 1.5
            cw_pump_power = max(30, min(90, cw_pump_power + np.random.normal(0, 2)))
            
            # ===== COOLING TOWER FAN POWER (CUBE LAW) =====
            # Fan speed adjusts based on ambient temperature and load
            # Higher ambient = need more airflow = higher speed
            base_fan_power = 35.0  # kW at 100% speed
            
            # Fan speed control (50-100%)
            # Speed increases with: higher ambient, higher load
            speed_from_ambient = 50 + (ambient_temp - 25) * 2  # Higher temp = more speed
            speed_from_load = 50 + load_multiplier * 50  # Higher load = more speed
            fan_speed = (speed_from_ambient + speed_from_load) / 2
            fan_speed = max(50, min(100, fan_speed + np.random.normal(0, 5)))
            
            # Cube law: Power ∝ Speed³
            tower_fan_power = base_fan_power * (fan_speed / 100.0) ** 3
            tower_fan_power = max(5, tower_fan_power + np.random.normal(0, 1))
            
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
                humidity=round(humidity, 1),
                wet_bulb_temp=round(wet_bulb_temp, 2),
                chw_pump_power=round(chw_pump_power, 2),
                cw_pump_power=round(cw_pump_power, 2),
                tower_fan_power=round(tower_fan_power, 2),
                tower_fan_speed=round(fan_speed, 1)
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

from typing import Tuple
from models.sensor_data import SensorReading, CalculatedMetrics
from datetime import timezone

class ThermodynamicsCalculator:
    """Industry-standard thermodynamic calculations for chiller plants"""
    
    SPECIFIC_HEAT_WATER = 4.186  # kJ/(kg·°C)
    KW_PER_TR = 3.517  # Standard conversion
    
    # Chiller efficiency benchmarks (kW/TR)
    EXCELLENT_THRESHOLD = 0.6
    AVERAGE_THRESHOLD = 0.8
    
    # Plant efficiency benchmarks (kW/TR) - includes all auxiliaries
    PLANT_EXCELLENT_THRESHOLD = 0.75
    PLANT_AVERAGE_THRESHOLD = 0.95
    
    # Cost parameters
    ELECTRICITY_TARIFF = 8.0  # ₹/kWh
    OPERATING_HOURS_PER_DAY = 16
    OPERATING_DAYS_PER_YEAR = 300
    CO2_FACTOR = 0.82  # kg CO₂/kWh
    
    # Benchmark for savings calculation
    BASELINE_PLANT_KW_PER_TR = 0.85
    
    def calculate_metrics(self, reading: SensorReading) -> Tuple[CalculatedMetrics, bool, str]:
        """
        Calculate all efficiency metrics from sensor data.
        Returns: (metrics, is_valid, error_message)
        
        Formulas:
        - Cooling Load (kW) = 4.186 × Flow(L/s) × ΔT(°C)
        - Cooling Capacity (TR) = Cooling_kW / 3.517
        - Chiller kW/TR = Chiller_Power / Cooling_TR
        - COP = Cooling_kW / Chiller_Power
        - Tower Range = Cond_In - Cond_Out
        - Tower Approach = Cond_Out - Wet_Bulb
        - Heat Rejected = 4.186 × Cond_Flow × Range
        - Plant kW/TR = Total_Plant_Power / Cooling_TR
        """
        
        # Validation checks
        delta_t = reading.chw_return_temp - reading.chw_supply_temp
        
        if delta_t < 2.0:
            return None, False, "Invalid ΔT: Return-Supply temperature difference must be > 2°C"
        
        if reading.chw_flow_rate <= 0:
            return None, False, "Invalid flow rate: Must be > 0 L/s"
        
        if reading.chiller_power <= 0:
            return None, False, "Invalid chiller power: Must be > 0 kW"
        
        # Calculate cooling load
        cooling_load_kw = self.SPECIFIC_HEAT_WATER * reading.chw_flow_rate * delta_t
        
        if cooling_load_kw <= 0:
            return None, False, "Calculated cooling load is invalid"
        
        # Calculate cooling capacity in tons of refrigeration
        cooling_capacity_tr = cooling_load_kw / self.KW_PER_TR
        
        # Calculate chiller efficiency metrics
        kw_per_tr = reading.chiller_power / cooling_capacity_tr if cooling_capacity_tr > 0 else float('inf')
        cop = cooling_load_kw / reading.chiller_power if reading.chiller_power > 0 else 0
        
        # Determine chiller efficiency status
        if kw_per_tr < self.EXCELLENT_THRESHOLD:
            efficiency_status = "excellent"
        elif kw_per_tr < self.AVERAGE_THRESHOLD:
            efficiency_status = "average"
        else:
            efficiency_status = "poor"
        
        # ===== COOLING TOWER CALCULATIONS =====
        tower_range = None
        tower_approach = None
        heat_rejected_kw = None
        
        if reading.cond_inlet_temp and reading.cond_outlet_temp:
            # Range = Inlet - Outlet (condenser water gets cooled)
            tower_range = reading.cond_inlet_temp - reading.cond_outlet_temp
            
            # Heat rejected by condenser
            if reading.cond_flow_rate and tower_range > 0:
                heat_rejected_kw = self.SPECIFIC_HEAT_WATER * reading.cond_flow_rate * tower_range
        
        if reading.cond_outlet_temp and reading.wet_bulb_temp is not None:
            # Approach = Outlet - Wet Bulb (how close tower gets to wet bulb)
            tower_approach = reading.cond_outlet_temp - reading.wet_bulb_temp
        
        # ===== PLANT-LEVEL EFFICIENCY (CRITICAL) =====
        total_plant_power = reading.chiller_power
        
        if reading.chw_pump_power:
            total_plant_power += reading.chw_pump_power
        if reading.cw_pump_power:
            total_plant_power += reading.cw_pump_power
        if reading.tower_fan_power:
            total_plant_power += reading.tower_fan_power
        
        plant_kw_per_tr = total_plant_power / cooling_capacity_tr if cooling_capacity_tr > 0 else float('inf')
        plant_cop = cooling_load_kw / total_plant_power if total_plant_power > 0 else 0
        
        # Determine plant efficiency status
        if plant_kw_per_tr < self.PLANT_EXCELLENT_THRESHOLD:
            plant_efficiency_status = "excellent"
        elif plant_kw_per_tr < self.PLANT_AVERAGE_THRESHOLD:
            plant_efficiency_status = "average"
        else:
            plant_efficiency_status = "poor"
        
        # ===== FINANCIAL CALCULATIONS =====
        # Energy cost per hour
        energy_cost_per_hour = total_plant_power * self.ELECTRICITY_TARIFF
        
        # CO₂ emissions
        co2_emissions_kg_per_hour = total_plant_power * self.CO2_FACTOR
        
        # Potential savings (if we improve to baseline)
        if plant_kw_per_tr > self.BASELINE_PLANT_KW_PER_TR:
            potential_savings_percent = ((plant_kw_per_tr - self.BASELINE_PLANT_KW_PER_TR) / plant_kw_per_tr) * 100
            
            # Calculate yearly savings
            baseline_power = self.BASELINE_PLANT_KW_PER_TR * cooling_capacity_tr
            power_savings = total_plant_power - baseline_power
            
            yearly_hours = self.OPERATING_HOURS_PER_DAY * self.OPERATING_DAYS_PER_YEAR
            energy_saved_kwh = power_savings * yearly_hours
            potential_savings_inr_per_year = energy_saved_kwh * self.ELECTRICITY_TARIFF
        else:
            potential_savings_percent = 0
            potential_savings_inr_per_year = 0
        
        metrics = CalculatedMetrics(
            timestamp=reading.timestamp,
            cooling_load_kw=round(cooling_load_kw, 2),
            cooling_capacity_tr=round(cooling_capacity_tr, 2),
            kw_per_tr=round(kw_per_tr, 3),
            cop=round(cop, 2),
            delta_t=round(delta_t, 2),
            efficiency_status=efficiency_status,
            # Cooling Tower
            tower_range=round(tower_range, 2) if tower_range else None,
            tower_approach=round(tower_approach, 2) if tower_approach else None,
            heat_rejected_kw=round(heat_rejected_kw, 2) if heat_rejected_kw else None,
            # Plant Efficiency
            total_plant_power=round(total_plant_power, 2),
            plant_kw_per_tr=round(plant_kw_per_tr, 3),
            plant_cop=round(plant_cop, 2),
            plant_efficiency_status=plant_efficiency_status,
            # Financial
            energy_cost_per_hour=round(energy_cost_per_hour, 2),
            potential_savings_percent=round(potential_savings_percent, 1),
            potential_savings_inr_per_year=round(potential_savings_inr_per_year, 2),
            co2_emissions_kg_per_hour=round(co2_emissions_kg_per_hour, 2)
        )
        
        return metrics, True, ""
    
    def batch_calculate(self, readings: list[SensorReading]) -> list[dict]:
        """Calculate metrics for multiple readings, filtering out invalid ones"""
        results = []
        
        for reading in readings:
            metrics, is_valid, error = self.calculate_metrics(reading)
            
            if is_valid:
                # Combine sensor data with calculated metrics
                result = {
                    **reading.model_dump(),
                    **metrics.model_dump(),
                    "is_valid": True
                }
                # Convert datetime to ISO string for JSON serialization
                result['timestamp'] = result['timestamp'].isoformat()
                results.append(result)
            else:
                # Log error but continue processing
                result = {
                    **reading.model_dump(),
                    "is_valid": False,
                    "error": error
                }
                result['timestamp'] = result['timestamp'].isoformat()
                results.append(result)
        
        return results

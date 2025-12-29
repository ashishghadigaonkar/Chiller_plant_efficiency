from typing import Tuple
from models.sensor_data import SensorReading, CalculatedMetrics
from datetime import timezone

class ThermodynamicsCalculator:
    """Industry-standard thermodynamic calculations for chiller plants"""
    
    SPECIFIC_HEAT_WATER = 4.186  # kJ/(kg·°C)
    KW_PER_TR = 3.517  # Standard conversion
    
    # Efficiency benchmarks (kW/TR)
    EXCELLENT_THRESHOLD = 0.6
    AVERAGE_THRESHOLD = 0.8
    
    def calculate_metrics(self, reading: SensorReading) -> Tuple[CalculatedMetrics, bool, str]:
        """
        Calculate all efficiency metrics from sensor data.
        Returns: (metrics, is_valid, error_message)
        
        Formulas:
        - Cooling Load (kW) = 4.186 × Flow(L/s) × ΔT(°C)
        - Cooling Capacity (TR) = Cooling_kW / 3.517
        - kW/TR = Chiller_Power / Cooling_TR
        - COP = Cooling_kW / Chiller_Power
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
        
        # Calculate efficiency metrics
        kw_per_tr = reading.chiller_power / cooling_capacity_tr if cooling_capacity_tr > 0 else float('inf')
        cop = cooling_load_kw / reading.chiller_power if reading.chiller_power > 0 else 0
        
        # Determine efficiency status
        if kw_per_tr < self.EXCELLENT_THRESHOLD:
            efficiency_status = "excellent"
        elif kw_per_tr < self.AVERAGE_THRESHOLD:
            efficiency_status = "average"
        else:
            efficiency_status = "poor"
        
        metrics = CalculatedMetrics(
            timestamp=reading.timestamp,
            cooling_load_kw=round(cooling_load_kw, 2),
            cooling_capacity_tr=round(cooling_capacity_tr, 2),
            kw_per_tr=round(kw_per_tr, 3),
            cop=round(cop, 2),
            delta_t=round(delta_t, 2),
            efficiency_status=efficiency_status
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

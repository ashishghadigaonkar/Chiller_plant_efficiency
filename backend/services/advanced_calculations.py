"""Advanced Engineering Calculations Module

Implements:
- Compressor Lift calculations
- Part Load Ratio (PLR) adjustments
- Variable flow cube law
- Tower penalty calculations
"""

import math
from typing import Dict, Tuple

class AdvancedCalculator:
    """Advanced engineering calculations for chiller optimization"""
    
    # Constants
    BASE_KW_TR = 0.58  # Baseline chiller efficiency
    LIFT_PENALTY_PER_DEGREE = 0.03  # 3% power increase per °C lift increase
    
    def calculate_compressor_lift(self, evaporator_temp: float, condenser_temp: float) -> Dict:
        """
        Calculate compressor lift and associated power penalty.
        
        Lift = Condenser_Temp - Evaporator_Temp
        kW_lift_adjusted = Base_kW × (1 + (0.03 × ΔLift))
        
        Args:
            evaporator_temp: Evaporator temperature (°C)
            condenser_temp: Condenser temperature (°C)
            
        Returns:
            Dict with lift, penalty, and recommendations
        """
        lift = condenser_temp - evaporator_temp
        
        # Typical baseline lift (design condition)
        baseline_lift = 9.0  # °C
        
        delta_lift = lift - baseline_lift
        lift_penalty_factor = 1.0 + (self.LIFT_PENALTY_PER_DEGREE * delta_lift) if delta_lift > 0 else 1.0
        
        # Power adjustment percentage
        power_adjustment_pct = (lift_penalty_factor - 1.0) * 100
        
        # Status determination
        if lift < 8.0:
            status = "excellent"
            message = "Low compressor lift - excellent operating condition"
        elif lift < 10.0:
            status = "good"
            message = "Normal compressor lift - acceptable range"
        elif lift < 12.0:
            status = "warning"
            message = "High compressor lift - tower support required"
        else:
            status = "critical"
            message = "Critical compressor lift - immediate tower optimization needed"
        
        return {
            "lift_degrees_c": round(lift, 2),
            "baseline_lift": baseline_lift,
            "delta_lift": round(delta_lift, 2),
            "lift_penalty_factor": round(lift_penalty_factor, 3),
            "power_adjustment_pct": round(power_adjustment_pct, 1),
            "status": status,
            "message": message,
            "recommendation": self._get_lift_recommendation(lift)
        }
    
    def _get_lift_recommendation(self, lift: float) -> str:
        """Generate recommendation based on lift"""
        if lift > 12.0:
            return "URGENT: Increase tower fan speed by 10-15%. Clean tower fill if approach > 6°C."
        elif lift > 10.0:
            return "Increase tower fan speed by 5-10%. Check condenser water flow."
        elif lift > 9.0:
            return "Monitor tower performance. Consider increasing fan speed by 5%."
        else:
            return "Maintain current operating conditions."
    
    def calculate_part_load_ratio(self, actual_load_tr: float, rated_load_tr: float) -> Dict:
        """
        Calculate Part Load Ratio and efficiency adjustment.
        
        PLR = Actual_Load / Rated_Load
        Efficiency_modifier = (0.1×PLR²) + (-0.25×PLR) + 1.15
        
        Args:
            actual_load_tr: Current cooling load (TR)
            rated_load_tr: Rated capacity (TR)
            
        Returns:
            Dict with PLR, efficiency modifier, and recommendations
        """
        if rated_load_tr <= 0:
            return {"error": "Rated load must be > 0"}
        
        plr = actual_load_tr / rated_load_tr
        
        # Efficiency curve (polynomial fit for typical centrifugal chiller)
        # Optimal efficiency typically at 65-80% load
        efficiency_modifier = (0.1 * plr**2) + (-0.25 * plr) + 1.15
        
        # Determine status and recommendations
        if plr < 0.40:
            status = "critical_underload"
            message = "Severe underloading - consider shutting down unit"
            recommendation = "Shutdown this chiller and redistribute load to other units."
        elif plr < 0.55:
            status = "underloaded"
            message = "Underloaded - consider staging down"
            recommendation = "Reduce to fewer chillers if possible. Target 65-80% load per unit."
        elif plr >= 0.65 and plr <= 0.80:
            status = "optimal"
            message = "Optimal efficiency range - maintain current loading"
            recommendation = "Maintain current loading. This is the optimal efficiency band."
        elif plr > 0.90:
            status = "overloaded"
            message = "Overloaded - consider staging up"
            recommendation = "Stage additional chiller to reduce load per unit to 65-80%."
        else:
            status = "acceptable"
            message = "Acceptable loading range"
            recommendation = "Continue monitoring. Adjust if load changes significantly."
        
        return {
            "plr": round(plr, 3),
            "plr_percent": round(plr * 100, 1),
            "actual_load_tr": round(actual_load_tr, 2),
            "rated_load_tr": rated_load_tr,
            "efficiency_modifier": round(efficiency_modifier, 3),
            "status": status,
            "message": message,
            "recommendation": recommendation
        }
    
    def calculate_cube_law_adjustment(self, current_speed_pct: float, 
                                      new_speed_pct: float, 
                                      current_power_kw: float) -> Dict:
        """
        Calculate pump/fan power change using cube law.
        
        P2 = P1 × (N2/N1)³
        
        Args:
            current_speed_pct: Current speed (%)
            new_speed_pct: Proposed new speed (%)
            current_power_kw: Current power (kW)
            
        Returns:
            Dict with new power and savings
        """
        if current_speed_pct <= 0:
            return {"error": "Current speed must be > 0"}
        
        speed_ratio = new_speed_pct / current_speed_pct
        new_power_kw = current_power_kw * (speed_ratio ** 3)
        
        power_savings_kw = current_power_kw - new_power_kw
        power_savings_pct = (power_savings_kw / current_power_kw) * 100 if current_power_kw > 0 else 0
        
        return {
            "current_speed_pct": current_speed_pct,
            "new_speed_pct": new_speed_pct,
            "speed_ratio": round(speed_ratio, 3),
            "current_power_kw": round(current_power_kw, 2),
            "new_power_kw": round(new_power_kw, 2),
            "power_savings_kw": round(power_savings_kw, 2),
            "power_savings_pct": round(power_savings_pct, 1)
        }
    
    def calculate_tower_penalty(self, approach: float) -> Dict:
        """
        Calculate power penalty from poor cooling tower performance.
        
        IF Approach > 5°C → +3% kW penalty
        IF Approach > 7°C → +6-10% kW penalty
        
        Args:
            approach: Tower approach temperature (°C)
            
        Returns:
            Dict with penalty and recommendations
        """
        if approach <= 5.0:
            penalty_pct = 0
            status = "excellent"
            message = "Excellent tower performance"
            recommendation = "Maintain current tower operation."
        elif approach <= 7.0:
            penalty_pct = 3.0
            status = "warning"
            message = "Tower performance degradation detected"
            recommendation = "Increase fan speed by 5-8%. Check for fouling."
        elif approach <= 9.0:
            penalty_pct = 6.0
            status = "poor"
            message = "Poor tower performance - fouling or airflow restriction"
            recommendation = "Increase fan speed by 10%. Schedule tower cleaning and inspection."
        else:
            penalty_pct = 10.0
            status = "critical"
            message = "Critical tower performance - severe fouling"
            recommendation = "URGENT: Maximum fan speed. Schedule immediate tower cleaning and fill inspection."
        
        return {
            "approach_degrees_c": round(approach, 2),
            "penalty_pct": penalty_pct,
            "status": status,
            "message": message,
            "recommendation": recommendation
        }
    
    def calculate_comprehensive_metrics(self, sensor_data: Dict) -> Dict:
        """
        Calculate all advanced metrics from sensor data.
        
        Args:
            sensor_data: Dict containing all sensor readings
            
        Returns:
            Dict with all advanced calculations
        """
        results = {}
        
        # Compressor Lift
        if 'chw_supply_temp' in sensor_data and 'cond_inlet_temp' in sensor_data:
            evaporator_temp = sensor_data['chw_supply_temp']
            condenser_temp = sensor_data['cond_inlet_temp']
            results['compressor_lift'] = self.calculate_compressor_lift(evaporator_temp, condenser_temp)
        
        # Part Load Ratio
        if 'cooling_capacity_tr' in sensor_data and 'rated_capacity_tr' in sensor_data:
            results['part_load_ratio'] = self.calculate_part_load_ratio(
                sensor_data['cooling_capacity_tr'],
                sensor_data['rated_capacity_tr']
            )
        
        # Tower Penalty
        if 'tower_approach' in sensor_data:
            results['tower_penalty'] = self.calculate_tower_penalty(sensor_data['tower_approach'])
        
        return results

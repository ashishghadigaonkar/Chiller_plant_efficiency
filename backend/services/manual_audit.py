from models.sensor_data import ManualAuditInput, ManualAuditResult
from typing import List

class ManualAuditCalculator:
    """Calculator for manual on-site audit inputs"""
    
    SPECIFIC_HEAT_WATER = 4.186  # kJ/(kg·°C)
    KW_PER_TR = 3.517  # Standard conversion
    CO2_FACTOR = 0.82  # kg CO₂/kWh
    
    # Benchmarks
    CHILLER_EXCELLENT = 0.6
    CHILLER_AVERAGE = 0.8
    PLANT_EXCELLENT = 0.75
    PLANT_AVERAGE = 0.95
    BASELINE_PLANT_KW_PER_TR = 0.85
    
    def calculate_audit(self, input_data: ManualAuditInput) -> ManualAuditResult:
        """
        Perform comprehensive audit calculations from manual inputs
        """
        # Temperature difference
        delta_t = input_data.chw_return_temp - input_data.chw_supply_temp
        
        # Cooling load calculation
        cooling_load_kw = self.SPECIFIC_HEAT_WATER * input_data.chw_flow_rate * delta_t
        cooling_capacity_tr = cooling_load_kw / self.KW_PER_TR
        
        # Chiller efficiency
        chiller_kw_per_tr = input_data.chiller_power / cooling_capacity_tr if cooling_capacity_tr > 0 else float('inf')
        cop = cooling_load_kw / input_data.chiller_power if input_data.chiller_power > 0 else 0
        
        # Plant-level efficiency
        total_plant_power = input_data.chiller_power
        if input_data.chw_pump_power:
            total_plant_power += input_data.chw_pump_power
        if input_data.cw_pump_power:
            total_plant_power += input_data.cw_pump_power
        if input_data.tower_fan_power:
            total_plant_power += input_data.tower_fan_power
        
        plant_kw_per_tr = total_plant_power / cooling_capacity_tr if cooling_capacity_tr > 0 else float('inf')
        plant_cop = cooling_load_kw / total_plant_power if total_plant_power > 0 else 0
        
        # Efficiency classification
        if chiller_kw_per_tr < self.CHILLER_EXCELLENT:
            chiller_efficiency_status = "excellent"
        elif chiller_kw_per_tr < self.CHILLER_AVERAGE:
            chiller_efficiency_status = "average"
        else:
            chiller_efficiency_status = "poor"
        
        if plant_kw_per_tr < self.PLANT_EXCELLENT:
            plant_efficiency_status = "excellent"
        elif plant_kw_per_tr < self.PLANT_AVERAGE:
            plant_efficiency_status = "average"
        else:
            plant_efficiency_status = "poor"
        
        # Delta-T status
        if delta_t < 4:
            delta_t_status = "Low - Bypass or Over-pumping Issue"
        elif 4 <= delta_t <= 7:
            delta_t_status = "Healthy"
        else:
            delta_t_status = "Acceptable"
        
        # Cooling tower analysis
        tower_range = input_data.cond_inlet_temp - input_data.cond_outlet_temp
        tower_approach = input_data.cond_outlet_temp - input_data.wet_bulb_temp
        
        if tower_approach > 6:
            tower_status = "Critical - Fouling or Airflow Issue"
        elif tower_approach > 4:
            tower_status = "Warning - Performance Deterioration"
        else:
            tower_status = "Excellent"
        
        # Financial calculations
        energy_kwh_per_day = total_plant_power * input_data.operating_hours_per_day
        energy_kwh_per_month = energy_kwh_per_day * 30
        energy_kwh_per_year = energy_kwh_per_day * input_data.operating_days_per_year
        
        cost_per_day = energy_kwh_per_day * input_data.electricity_tariff
        cost_per_month = cost_per_day * 30
        cost_per_year = energy_kwh_per_year * input_data.electricity_tariff
        
        # Environmental
        co2_kg_per_year = energy_kwh_per_year * self.CO2_FACTOR
        
        # Generate recommendations
        recommendations = []
        estimated_savings_inr_per_day = None
        
        # Diagnostic message
        diagnostic_parts = []
        
        if plant_kw_per_tr > self.PLANT_AVERAGE:
            diagnostic_parts.append(f"⚠️ Warning: Current Plant kW/TR = {plant_kw_per_tr:.3f} (High)")
            
            if delta_t < 4:
                recommendations.append("Reduce CHW pump flow rate - Low ΔT indicates over-pumping")
            
            if input_data.chw_supply_temp < 6:
                temp_increase = 7 - input_data.chw_supply_temp
                recommendations.append(f"Increase CHW supply setpoint by +{temp_increase:.1f}°C to 7°C")
            
            if tower_approach > 4:
                recommendations.append("Clean cooling tower fill - High approach indicates fouling")
                recommendations.append("Check tower fan operation and airflow")
            
            # Calculate potential savings
            if plant_kw_per_tr > self.BASELINE_PLANT_KW_PER_TR:
                baseline_power = self.BASELINE_PLANT_KW_PER_TR * cooling_capacity_tr
                power_savings = total_plant_power - baseline_power
                estimated_savings_inr_per_day = power_savings * input_data.operating_hours_per_day * input_data.electricity_tariff
                diagnostic_parts.append(f"Expected savings: ₹{estimated_savings_inr_per_day:,.0f}/day")
        
        elif plant_kw_per_tr < self.PLANT_EXCELLENT:
            diagnostic_parts.append(f"✅ Excellent: Current Plant kW/TR = {plant_kw_per_tr:.3f} (World-class)")
            recommendations.append("Maintain current operating conditions")
            recommendations.append("Continue monitoring for any performance degradation")
        
        else:
            diagnostic_parts.append(f"✓ Good: Current Plant kW/TR = {plant_kw_per_tr:.3f} (Acceptable)")
            recommendations.append("Monitor performance trends for optimization opportunities")
        
        # Additional specific recommendations
        if chiller_kw_per_tr > 0.8:
            recommendations.append("Schedule chiller tube cleaning - High kW/TR indicates fouling")
        
        if cop < 4.0:
            recommendations.append("Investigate chiller refrigerant charge and compressor health")
        
        if tower_range < 4 or tower_range > 8:
            recommendations.append(f"Cooling tower range {tower_range:.1f}°C is outside optimal 4-8°C - Check condenser flow")
        
        diagnostic_message = " | ".join(diagnostic_parts) if diagnostic_parts else "System operating normally"
        
        return ManualAuditResult(
            inputs=input_data,
            cooling_load_kw=round(cooling_load_kw, 2),
            cooling_capacity_tr=round(cooling_capacity_tr, 2),
            chiller_kw_per_tr=round(chiller_kw_per_tr, 3),
            plant_kw_per_tr=round(plant_kw_per_tr, 3),
            cop=round(cop, 2),
            plant_cop=round(plant_cop, 2),
            delta_t=round(delta_t, 2),
            delta_t_status=delta_t_status,
            tower_range=round(tower_range, 2),
            tower_approach=round(tower_approach, 2),
            tower_status=tower_status,
            chiller_efficiency_status=chiller_efficiency_status,
            plant_efficiency_status=plant_efficiency_status,
            total_plant_power=round(total_plant_power, 2),
            energy_kwh_per_day=round(energy_kwh_per_day, 2),
            energy_kwh_per_month=round(energy_kwh_per_month, 2),
            energy_kwh_per_year=round(energy_kwh_per_year, 2),
            cost_per_day=round(cost_per_day, 2),
            cost_per_month=round(cost_per_month, 2),
            cost_per_year=round(cost_per_year, 2),
            co2_kg_per_year=round(co2_kg_per_year, 2),
            diagnostic_message=diagnostic_message,
            recommendations=recommendations,
            estimated_savings_inr_per_day=round(estimated_savings_inr_per_day, 2) if estimated_savings_inr_per_day else None
        )

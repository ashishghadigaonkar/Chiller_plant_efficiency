"""Diagnostic Rule Engine Module

Implements rule-based diagnostics:
- Low Delta-T Syndrome
- Cooling Tower diagnostics
- Compressor Lift diagnostics
- Flow/Pumping diagnostics
"""

from typing import Dict, List
from datetime import datetime, timezone

class DiagnosticEngine:
    """Rule-based diagnostic system for chiller plant issues"""
    
    def diagnose_delta_t(self, delta_t: float) -> Dict:
        """
        Diagnose Low Delta-T Syndrome.
        
        Rules:
        - ΔT < 4°C → "Bypass / Over-pumping"
        - ΔT 4-6°C → "Acceptable"
        - ΔT > 6°C → "Efficient"
        
        Args:
            delta_t: Temperature difference (°C)
            
        Returns:
            Diagnostic result
        """
        if delta_t < 4.0:
            severity = "critical"
            diagnosis = "Low Delta-T Syndrome Detected"
            root_cause = "Bypass flow or over-pumping issue"
            recommendations = [
                "Check for 3-way valve bypass (should be 2-way)",
                "Reduce CHW pump speed by 5-10%",
                "Verify no coil bypass at AHUs",
                "Check control valve positions - may be stuck open"
            ]
        elif delta_t >= 4.0 and delta_t <= 6.0:
            severity = "acceptable"
            diagnosis = "Delta-T in acceptable range"
            root_cause = "Normal operation"
            recommendations = [
                "Continue monitoring",
                "Maintain current pump settings"
            ]
        else:  # delta_t > 6.0
            severity = "excellent"
            diagnosis = "Efficient Delta-T achieved"
            root_cause = "Optimal flow control"
            recommendations = [
                "Maintain current operating conditions",
                "Document these settings as best practice"
            ]
        
        return {
            "parameter": "delta_t",
            "value": round(delta_t, 2),
            "severity": severity,
            "diagnosis": diagnosis,
            "root_cause": root_cause,
            "recommendations": recommendations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def diagnose_cooling_tower(self, approach: float, tower_range: float = None) -> Dict:
        """
        Diagnose cooling tower performance issues.
        
        Rules:
        - Approach 5-7°C → "Performance degradation"
        - Approach > 7°C → "Fouling / airflow restriction"
        
        Args:
            approach: Tower approach (°C)
            tower_range: Tower range (°C), optional
            
        Returns:
            Diagnostic result
        """
        if approach < 4.0:
            severity = "excellent"
            diagnosis = "Excellent tower performance"
            root_cause = "Clean tower, optimal airflow"
            recommendations = [
                "Maintain current tower operation",
                "Continue regular maintenance schedule"
            ]
        elif approach >= 5.0 and approach <= 7.0:
            severity = "warning"
            diagnosis = "Tower performance degradation"
            root_cause = "Possible fouling or reduced airflow"
            recommendations = [
                "Inspect tower fill for fouling",
                "Check fan operation and airflow",
                "Increase fan speed by 5-10%",
                "Schedule tower cleaning"
            ]
        elif approach > 7.0:
            severity = "critical"
            diagnosis = "Severe tower fouling or airflow restriction"
            root_cause = "Heavy fouling, fan malfunction, or inadequate capacity"
            recommendations = [
                "URGENT: Immediate tower inspection required",
                "Check fan motor and VFD operation",
                "Inspect tower fill - likely requires cleaning/replacement",
                "Verify adequate condenser water flow",
                "Consider temporary load reduction"
            ]
        else:  # approach 4-5°C
            severity = "acceptable"
            diagnosis = "Tower performance acceptable"
            root_cause = "Normal operation"
            recommendations = [
                "Continue monitoring",
                "Maintain preventive maintenance schedule"
            ]
        
        result = {
            "parameter": "tower_approach",
            "approach_value": round(approach, 2),
            "severity": severity,
            "diagnosis": diagnosis,
            "root_cause": root_cause,
            "recommendations": recommendations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Add range-based diagnostics if available
        if tower_range is not None:
            if tower_range < 4.0:
                result['range_diagnosis'] = "Low range - possible low load or high flow"
            elif tower_range > 8.0:
                result['range_diagnosis'] = "High range - possible high load or low flow"
            else:
                result['range_diagnosis'] = "Normal range (4-8°C)"
            result['range_value'] = round(tower_range, 2)
        
        return result
    
    def diagnose_compressor_lift(self, lift: float) -> Dict:
        """
        Diagnose compressor lift issues.
        
        Rules:
        - Lift > 9°C → "High lift - tower support required"
        
        Args:
            lift: Compressor lift (°C)
            
        Returns:
            Diagnostic result
        """
        if lift < 8.0:
            severity = "excellent"
            diagnosis = "Low compressor lift - optimal efficiency"
            root_cause = "Good tower performance, favorable ambient conditions"
            recommendations = [
                "Maintain current operating conditions",
                "Document for best practice reference"
            ]
        elif lift <= 10.0:
            severity = "acceptable"
            diagnosis = "Normal compressor lift"
            root_cause = "Typical operating conditions"
            recommendations = [
                "Continue monitoring",
                "No immediate action required"
            ]
        elif lift <= 12.0:
            severity = "warning"
            diagnosis = "High compressor lift detected"
            root_cause = "Poor tower performance or high ambient temperature"
            recommendations = [
                "Increase cooling tower fan speed by 5-10%",
                "Check tower approach temperature",
                "Verify condenser water flow",
                "Expect 2-3% power increase per °C above baseline"
            ]
        else:  # lift > 12.0
            severity = "critical"
            diagnosis = "Critical compressor lift - immediate action required"
            root_cause = "Severe tower issues or extreme ambient conditions"
            recommendations = [
                "URGENT: Maximize tower fan speed",
                "Inspect tower for severe fouling",
                "Check condenser tube cleanliness",
                "Consider temporary load reduction",
                "Expect 6-9% power penalty"
            ]
        
        return {
            "parameter": "compressor_lift",
            "value": round(lift, 2),
            "severity": severity,
            "diagnosis": diagnosis,
            "root_cause": root_cause,
            "recommendations": recommendations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def diagnose_flow_pumping(self, delta_t: float, chw_pump_power: float) -> Dict:
        """
        Diagnose flow and pumping issues.
        
        Rules:
        - ΔT < 4°C → "Reduce pump speed by 5%"
        
        Args:
            delta_t: CHW delta-T (°C)
            chw_pump_power: CHW pump power (kW)
            
        Returns:
            Diagnostic result with pump adjustment recommendations
        """
        if delta_t < 4.0:
            severity = "warning"
            diagnosis = "Over-pumping detected"
            root_cause = "Excessive flow rate causing low delta-T"
            # Calculate potential savings from cube law
            suggested_speed_reduction = 5.0  # %
            power_savings_pct = 3 * suggested_speed_reduction  # Cube law approximation
            estimated_savings_kw = chw_pump_power * (power_savings_pct / 100)
            
            recommendations = [
                f"Reduce CHW pump speed by {suggested_speed_reduction}%",
                f"Expected power savings: {round(estimated_savings_kw, 1)} kW ({round(power_savings_pct, 1)}%)",
                "Re-measure delta-T after 15 minutes",
                "Continue reducing speed in 5% increments until delta-T > 4.5°C"
            ]
        elif delta_t > 7.0:
            severity = "warning"
            diagnosis = "Possible under-flow condition"
            root_cause = "Flow rate may be insufficient for current load"
            recommendations = [
                "Verify CHW pump operation",
                "Check for flow restrictions or valve issues",
                "Consider increasing pump speed by 5% if delta-T > 8°C",
                "Inspect coil performance at critical loads"
            ]
        else:
            severity = "excellent"
            diagnosis = "Optimal flow rate"
            root_cause = "Well-balanced system"
            recommendations = [
                "Maintain current pump settings",
                "System is operating at optimal efficiency"
            ]
        
        return {
            "parameter": "flow_pumping",
            "delta_t_value": round(delta_t, 2),
            "pump_power_kw": round(chw_pump_power, 2),
            "severity": severity,
            "diagnosis": diagnosis,
            "root_cause": root_cause,
            "recommendations": recommendations,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def run_comprehensive_diagnostics(self, sensor_data: Dict) -> Dict:
        """
        Run all diagnostic rules on current sensor data.
        
        Args:
            sensor_data: Dict containing all sensor readings and calculated metrics
            
        Returns:
            Complete diagnostic report
        """
        diagnostics = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_status": "excellent",
            "issues_found": [],
            "all_diagnostics": []
        }
        
        # Delta-T Diagnostic
        if 'delta_t' in sensor_data:
            delta_t_diag = self.diagnose_delta_t(sensor_data['delta_t'])
            diagnostics['all_diagnostics'].append(delta_t_diag)
            if delta_t_diag['severity'] in ['warning', 'critical']:
                diagnostics['issues_found'].append(delta_t_diag)
        
        # Cooling Tower Diagnostic
        if 'tower_approach' in sensor_data:
            tower_range = sensor_data.get('tower_range')
            tower_diag = self.diagnose_cooling_tower(sensor_data['tower_approach'], tower_range)
            diagnostics['all_diagnostics'].append(tower_diag)
            if tower_diag['severity'] in ['warning', 'critical']:
                diagnostics['issues_found'].append(tower_diag)
        
        # Compressor Lift Diagnostic
        if 'compressor_lift' in sensor_data:
            lift = sensor_data['compressor_lift']
            if isinstance(lift, dict):
                lift = lift.get('lift_degrees_c', 0)
            lift_diag = self.diagnose_compressor_lift(lift)
            diagnostics['all_diagnostics'].append(lift_diag)
            if lift_diag['severity'] in ['warning', 'critical']:
                diagnostics['issues_found'].append(lift_diag)
        
        # Flow/Pumping Diagnostic
        if 'delta_t' in sensor_data and 'chw_pump_power' in sensor_data:
            flow_diag = self.diagnose_flow_pumping(
                sensor_data['delta_t'],
                sensor_data['chw_pump_power']
            )
            diagnostics['all_diagnostics'].append(flow_diag)
            if flow_diag['severity'] in ['warning', 'critical']:
                diagnostics['issues_found'].append(flow_diag)
        
        # Determine overall status
        if any(d['severity'] == 'critical' for d in diagnostics['all_diagnostics']):
            diagnostics['overall_status'] = 'critical'
        elif any(d['severity'] == 'warning' for d in diagnostics['all_diagnostics']):
            diagnostics['overall_status'] = 'warning'
        elif any(d['severity'] == 'acceptable' for d in diagnostics['all_diagnostics']):
            diagnostics['overall_status'] = 'acceptable'
        
        diagnostics['issues_count'] = len(diagnostics['issues_found'])
        
        return diagnostics

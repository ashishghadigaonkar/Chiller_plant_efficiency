"""Control Logic Module

Implements:
- Observe → Decide → Recommend → Confirm → Apply workflow
- Chiller sequencing logic
- CHW supply reset
- Pump VFD control
- Cooling tower fan control
- Safety confirmation before actions
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import copy

class ControlLogic:
    """Control recommendation and execution system"""
    
    # Thresholds for control decisions
    PLR_LOW = 0.55
    PLR_OPTIMAL_MIN = 0.65
    PLR_OPTIMAL_MAX = 0.80
    PLR_HIGH = 0.90
    
    DELTA_T_LOW = 4.0
    DELTA_T_HIGH = 7.0
    
    APPROACH_GOOD = 4.0
    APPROACH_WARNING = 5.0
    APPROACH_CRITICAL = 7.0
    
    def __init__(self):
        self.previous_state = None
        self.applied_actions = []
    
    def observe(self, sensor_data: Dict) -> Dict:
        """
        Observe current plant state.
        
        Args:
            sensor_data: Current sensor readings and metrics
            
        Returns:
            Observed state summary
        """
        observation = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cooling_load_tr": sensor_data.get('cooling_capacity_tr', 0),
            "plant_kw_per_tr": sensor_data.get('plant_kw_per_tr', 0),
            "delta_t": sensor_data.get('delta_t', 0),
            "tower_approach": sensor_data.get('tower_approach', 0),
            "chw_supply_temp": sensor_data.get('chw_supply_temp', 0),
            "plr": sensor_data.get('plr', 0.75),  # Default if not provided
            "issues_detected": []
        }
        
        # Detect issues
        if observation['delta_t'] < self.DELTA_T_LOW:
            observation['issues_detected'].append("Low Delta-T")
        if observation['tower_approach'] > self.APPROACH_WARNING:
            observation['issues_detected'].append("Poor Tower Performance")
        if observation['plr'] < self.PLR_LOW:
            observation['issues_detected'].append("Underloaded Chiller")
        elif observation['plr'] > self.PLR_HIGH:
            observation['issues_detected'].append("Overloaded Chiller")
        
        return observation
    
    def decide_chiller_sequencing(self, plr: float, num_chillers_running: int = 1) -> Dict:
        """
        Chiller sequencing decision.
        
        Rules:
        - PLR < 55% → Suggest shutting down 1 unit
        - PLR 65-80% → Keep current loading (optimal)
        - PLR > 90% → Suggest starting next chiller
        
        Args:
            plr: Part Load Ratio (0-1)
            num_chillers_running: Current number of chillers online
            
        Returns:
            Sequencing recommendation
        """
        if plr < self.PLR_LOW:
            action = "shutdown_unit"
            message = f"Chiller underloaded at {plr*100:.1f}% PLR. Consider shutting down 1 unit."
            expected_plr_after = plr * num_chillers_running / max(1, num_chillers_running - 1)
            rationale = f"Shutting down 1 chiller will increase PLR to ~{expected_plr_after*100:.1f}%, closer to optimal range."
        elif plr >= self.PLR_OPTIMAL_MIN and plr <= self.PLR_OPTIMAL_MAX:
            action = "maintain"
            message = f"Chiller loading optimal at {plr*100:.1f}% PLR. Maintain current sequencing."
            rationale = "Current loading is within optimal efficiency band (65-80%)."
            expected_plr_after = plr
        elif plr > self.PLR_HIGH:
            action = "startup_unit"
            message = f"Chiller overloaded at {plr*100:.1f}% PLR. Consider starting additional chiller."
            expected_plr_after = plr * num_chillers_running / (num_chillers_running + 1)
            rationale = f"Starting 1 more chiller will reduce PLR to ~{expected_plr_after*100:.1f}%, improving efficiency."
        else:
            action = "monitor"
            message = f"Chiller loading acceptable at {plr*100:.1f}% PLR. Continue monitoring."
            rationale = "Loading is acceptable but not optimal. Monitor for load changes."
            expected_plr_after = plr
        
        return {
            "action": action,
            "current_plr": round(plr, 3),
            "expected_plr_after": round(expected_plr_after, 3),
            "num_chillers_running": num_chillers_running,
            "message": message,
            "rationale": rationale,
            "requires_confirmation": action in ['shutdown_unit', 'startup_unit']
        }
    
    def decide_chw_supply_reset(self, current_temp: float, load_pct: float, delta_t: float) -> Dict:
        """
        CHW supply temperature reset decision.
        
        Rules:
        - If Load < 60% AND ΔT stable → Increase setpoint +0.5°C
        
        Args:
            current_temp: Current CHW supply temperature (°C)
            load_pct: Load as percentage of design
            delta_t: Current delta-T (°C)
            
        Returns:
            CHW supply reset recommendation
        """
        if load_pct < 60 and delta_t >= self.DELTA_T_LOW and delta_t <= self.DELTA_T_HIGH:
            action = "increase_setpoint"
            new_setpoint = current_temp + 0.5
            message = f"Low load ({load_pct:.1f}%) with stable ΔT. Increase CHW supply to {new_setpoint:.1f}°C."
            rationale = "Raising supply temperature at part load reduces compressor lift and saves energy."
            estimated_savings_pct = 2.0  # ~2% per 0.5°C
        elif delta_t < self.DELTA_T_LOW:
            action = "maintain"
            new_setpoint = current_temp
            message = f"Low ΔT ({delta_t:.1f}°C). Do not change setpoint until flow is optimized."
            rationale = "Fix low delta-T issue first before adjusting temperature setpoint."
            estimated_savings_pct = 0
        else:
            action = "maintain"
            new_setpoint = current_temp
            message = f"Current setpoint {current_temp:.1f}°C is appropriate for load."
            rationale = "Load and delta-T are within acceptable ranges."
            estimated_savings_pct = 0
        
        return {
            "action": action,
            "current_setpoint": round(current_temp, 1),
            "recommended_setpoint": round(new_setpoint, 1),
            "message": message,
            "rationale": rationale,
            "estimated_savings_pct": estimated_savings_pct,
            "requires_confirmation": action == "increase_setpoint"
        }
    
    def decide_pump_vfd_adjustment(self, delta_t: float, current_speed_pct: float) -> Dict:
        """
        Pump VFD speed adjustment decision.
        
        Rules:
        - ΔT < 4°C → Reduce RPM by 5%
        - ΔT > 7°C → Increase RPM by 5%
        
        Args:
            delta_t: Current delta-T (°C)
            current_speed_pct: Current pump speed (%)
            
        Returns:
            Pump VFD recommendation
        """
        if delta_t < self.DELTA_T_LOW:
            action = "reduce_speed"
            speed_adjustment = -5.0
            new_speed = max(50, current_speed_pct + speed_adjustment)
            message = f"Low ΔT ({delta_t:.1f}°C). Reduce pump speed to {new_speed:.0f}%."
            rationale = "Over-pumping detected. Reducing flow will improve delta-T and save pump power."
            # Cube law: 5% speed reduction = ~14% power savings
            power_savings_pct = abs(speed_adjustment) * 3
        elif delta_t > self.DELTA_T_HIGH:
            action = "increase_speed"
            speed_adjustment = 5.0
            new_speed = min(100, current_speed_pct + speed_adjustment)
            message = f"High ΔT ({delta_t:.1f}°C). Increase pump speed to {new_speed:.0f}%."
            rationale = "Under-flow condition. Increasing flow will reduce delta-T for better distribution."
            power_savings_pct = -abs(speed_adjustment) * 3  # Negative = increased power
        else:
            action = "maintain"
            speed_adjustment = 0
            new_speed = current_speed_pct
            message = f"ΔT optimal ({delta_t:.1f}°C). Maintain pump speed at {current_speed_pct:.0f}%."
            rationale = "Flow rate is well-balanced for current load."
            power_savings_pct = 0
        
        return {
            "action": action,
            "current_speed_pct": round(current_speed_pct, 0),
            "recommended_speed_pct": round(new_speed, 0),
            "speed_adjustment": round(speed_adjustment, 1),
            "message": message,
            "rationale": rationale,
            "estimated_power_savings_pct": round(power_savings_pct, 1),
            "requires_confirmation": action in ['reduce_speed', 'increase_speed']
        }
    
    def decide_tower_fan_adjustment(self, approach: float, current_fan_speed_pct: float) -> Dict:
        """
        Cooling tower fan speed adjustment decision.
        
        Rules:
        - Approach > 5°C → Increase fan speed 5-10%
        - Approach < 3°C → Reduce speed 5%
        
        Args:
            approach: Tower approach (°C)
            current_fan_speed_pct: Current fan speed (%)
            
        Returns:
            Tower fan recommendation
        """
        if approach > self.APPROACH_CRITICAL:
            action = "increase_speed"
            speed_adjustment = 10.0
            new_speed = min(100, current_fan_speed_pct + speed_adjustment)
            message = f"Critical approach ({approach:.1f}°C). Increase tower fan to {new_speed:.0f}%."
            rationale = "Poor tower performance. Maximize airflow to improve approach and reduce lift."
            impact = "Will reduce compressor lift by ~1-2°C, saving 3-6% compressor power."
        elif approach > self.APPROACH_WARNING:
            action = "increase_speed"
            speed_adjustment = 5.0
            new_speed = min(100, current_fan_speed_pct + speed_adjustment)
            message = f"High approach ({approach:.1f}°C). Increase tower fan to {new_speed:.0f}%."
            rationale = "Tower performance degrading. Increase airflow to maintain efficiency."
            impact = "Will improve approach and prevent compressor power penalty."
        elif approach < 3.0:
            action = "reduce_speed"
            speed_adjustment = -5.0
            new_speed = max(50, current_fan_speed_pct + speed_adjustment)
            message = f"Excellent approach ({approach:.1f}°C). Reduce tower fan to {new_speed:.0f}%."
            rationale = "Tower over-performing. Reduce fan speed to save power without impacting efficiency."
            # Cube law: 5% speed reduction = ~14% fan power savings
            impact = f"Will save ~{abs(speed_adjustment)*3:.0f}% tower fan power."
        else:
            action = "maintain"
            speed_adjustment = 0
            new_speed = current_fan_speed_pct
            message = f"Approach optimal ({approach:.1f}°C). Maintain tower fan at {current_fan_speed_pct:.0f}%."
            rationale = "Tower performance is within optimal range."
            impact = "No adjustment needed."
        
        return {
            "action": action,
            "current_speed_pct": round(current_fan_speed_pct, 0),
            "recommended_speed_pct": round(new_speed, 0),
            "speed_adjustment": round(speed_adjustment, 1),
            "message": message,
            "rationale": rationale,
            "impact": impact,
            "requires_confirmation": action in ['reduce_speed', 'increase_speed']
        }
    
    def generate_comprehensive_recommendations(self, sensor_data: Dict) -> List[Dict]:
        """
        Generate all control recommendations.
        
        Args:
            sensor_data: Current plant state
            
        Returns:
            List of all recommendations
        """
        recommendations = []
        
        # Store previous state for potential revert
        self.previous_state = copy.deepcopy(sensor_data)
        
        # Chiller Sequencing
        if 'plr' in sensor_data or 'cooling_capacity_tr' in sensor_data:
            plr = sensor_data.get('plr', 0.75)
            seq_rec = self.decide_chiller_sequencing(plr)
            seq_rec['control_type'] = 'chiller_sequencing'
            seq_rec['priority'] = 'high' if seq_rec['action'] in ['shutdown_unit', 'startup_unit'] else 'low'
            recommendations.append(seq_rec)
        
        # CHW Supply Reset
        if 'chw_supply_temp' in sensor_data and 'delta_t' in sensor_data:
            load_pct = sensor_data.get('plr', 0.75) * 100
            reset_rec = self.decide_chw_supply_reset(
                sensor_data['chw_supply_temp'],
                load_pct,
                sensor_data['delta_t']
            )
            reset_rec['control_type'] = 'chw_supply_reset'
            reset_rec['priority'] = 'medium'
            recommendations.append(reset_rec)
        
        # Pump VFD
        if 'delta_t' in sensor_data:
            pump_speed = sensor_data.get('chw_pump_speed_pct', 75.0)
            pump_rec = self.decide_pump_vfd_adjustment(sensor_data['delta_t'], pump_speed)
            pump_rec['control_type'] = 'pump_vfd'
            pump_rec['priority'] = 'high' if pump_rec['action'] != 'maintain' else 'low'
            recommendations.append(pump_rec)
        
        # Tower Fan
        if 'tower_approach' in sensor_data:
            fan_speed = sensor_data.get('tower_fan_speed', 75.0)
            tower_rec = self.decide_tower_fan_adjustment(sensor_data['tower_approach'], fan_speed)
            tower_rec['control_type'] = 'tower_fan'
            tower_rec['priority'] = 'high' if tower_rec['action'] != 'maintain' else 'low'
            recommendations.append(tower_rec)
        
        # Add timestamp to all
        timestamp = datetime.now(timezone.utc).isoformat()
        for rec in recommendations:
            rec['timestamp'] = timestamp
            rec['status'] = 'pending_confirmation' if rec['requires_confirmation'] else 'informational'
        
        return recommendations
    
    def validate_action_safety(self, action: Dict) -> Dict:
        """
        Validate action before application.
        
        Args:
            action: Proposed control action
            
        Returns:
            Validation result
        """
        safety_checks = {
            "is_safe": True,
            "warnings": [],
            "can_proceed": True
        }
        
        control_type = action.get('control_type')
        
        # Check for extreme adjustments
        if control_type == 'pump_vfd':
            new_speed = action.get('recommended_speed_pct', 0)
            if new_speed < 50:
                safety_checks['warnings'].append("Pump speed below 50% may cause flow issues")
            elif new_speed > 95:
                safety_checks['warnings'].append("Pump speed above 95% indicates possible undersizing")
        
        if control_type == 'tower_fan':
            new_speed = action.get('recommended_speed_pct', 0)
            if new_speed > 95:
                safety_checks['warnings'].append("Tower fan at maximum - consider mechanical inspection")
        
        if control_type == 'chw_supply_reset':
            new_temp = action.get('recommended_setpoint', 0)
            if new_temp > 10:
                safety_checks['warnings'].append("CHW supply > 10°C may not meet cooling demand")
                safety_checks['is_safe'] = False
                safety_checks['can_proceed'] = False
        
        return safety_checks
    
    def apply_action(self, action: Dict, confirmed: bool = False) -> Dict:
        """
        Apply control action (simulation only - no actual equipment control).
        
        Args:
            action: Control action to apply
            confirmed: User confirmation received
            
        Returns:
            Application result
        """
        if not confirmed and action.get('requires_confirmation', False):
            return {
                "status": "error",
                "message": "This action requires user confirmation",
                "action": action
            }
        
        # Validate safety
        safety = self.validate_action_safety(action)
        if not safety['can_proceed']:
            return {
                "status": "error",
                "message": "Action failed safety validation",
                "safety_checks": safety,
                "action": action
            }
        
        # In a real system, this would send commands to BMS/PLC
        # For this implementation, we simulate the action
        result = {
            "status": "applied",
            "message": f"Action applied: {action.get('message', 'Unknown action')}",
            "action": action,
            "applied_at": datetime.now(timezone.utc).isoformat(),
            "safety_checks": safety,
            "note": "SIMULATION ONLY - No actual equipment control performed"
        }
        
        # Store for potential revert
        self.applied_actions.append(result)
        
        return result
    
    def should_revert(self, new_state: Dict) -> Dict:
        """
        Determine if recent action should be reverted.
        
        Args:
            new_state: State after action was applied
            
        Returns:
            Revert decision
        """
        if not self.previous_state or not self.applied_actions:
            return {"should_revert": False, "reason": "No previous action to revert"}
        
        # Compare key metrics
        metrics_worse = []
        
        # Check if delta-T got worse
        if 'delta_t' in new_state and 'delta_t' in self.previous_state:
            if new_state['delta_t'] < self.previous_state['delta_t'] - 0.5:
                metrics_worse.append("Delta-T decreased")
        
        # Check if lift increased
        if 'compressor_lift' in new_state and 'compressor_lift' in self.previous_state:
            new_lift = new_state['compressor_lift'].get('lift_degrees_c', 0) if isinstance(new_state['compressor_lift'], dict) else new_state['compressor_lift']
            old_lift = self.previous_state['compressor_lift'].get('lift_degrees_c', 0) if isinstance(self.previous_state['compressor_lift'], dict) else self.previous_state['compressor_lift']
            if new_lift > old_lift + 0.5:
                metrics_worse.append("Compressor lift increased")
        
        # Check if approach got worse
        if 'tower_approach' in new_state and 'tower_approach' in self.previous_state:
            if new_state['tower_approach'] > self.previous_state['tower_approach'] + 0.5:
                metrics_worse.append("Tower approach increased")
        
        # Check if kW/TR got worse
        if 'plant_kw_per_tr' in new_state and 'plant_kw_per_tr' in self.previous_state:
            if new_state['plant_kw_per_tr'] > self.previous_state['plant_kw_per_tr'] * 1.02:  # 2% worse
                metrics_worse.append("Plant kW/TR increased by >2%")
        
        should_revert = len(metrics_worse) >= 2  # Revert if 2+ metrics worsened
        
        return {
            "should_revert": should_revert,
            "metrics_worse": metrics_worse,
            "reason": "; ".join(metrics_worse) if metrics_worse else "Performance acceptable",
            "previous_state": self.previous_state,
            "recommendation": "Revert to previous setpoint" if should_revert else "Continue monitoring"
        }

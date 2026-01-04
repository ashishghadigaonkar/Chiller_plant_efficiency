"""Digital Twin Simulation Module

Implements:
- Live mode vs Digital Twin mode
- Simulate control actions before real application
- Predict outcomes
"""

from typing import Dict, List
import copy
from datetime import datetime, timezone
from services.simulation_engine import SimulationEngine
from services.thermodynamics import ThermodynamicsCalculator
from services.advanced_calculations import AdvancedCalculator
from models.sensor_data import SimulationConfig

class DigitalTwin:
    """Digital Twin simulation for testing control actions"""
    
    def __init__(self):
        self.simulation_engine = SimulationEngine()
        self.thermo_calculator = ThermodynamicsCalculator()
        self.advanced_calculator = AdvancedCalculator()
        self.mode = "live"  # "live" or "twin"
    
    def set_mode(self, mode: str):
        """Set operating mode: 'live' or 'twin'"""
        if mode not in ['live', 'twin']:
            raise ValueError("Mode must be 'live' or 'twin'")
        self.mode = mode
    
    def simulate_control_action(self, current_state: Dict, action: Dict) -> Dict:
        """
        Simulate the effect of a control action without applying it.
        
        Args:
            current_state: Current plant state
            action: Proposed control action
            
        Returns:
            Predicted state after action
        """
        # Create a copy of current state
        predicted_state = copy.deepcopy(current_state)
        
        control_type = action.get('control_type')
        
        # Apply action effects to prediction
        if control_type == 'chiller_sequencing':
            predicted_state = self._simulate_sequencing(predicted_state, action)
        elif control_type == 'chw_supply_reset':
            predicted_state = self._simulate_supply_reset(predicted_state, action)
        elif control_type == 'pump_vfd':
            predicted_state = self._simulate_pump_adjustment(predicted_state, action)
        elif control_type == 'tower_fan':
            predicted_state = self._simulate_fan_adjustment(predicted_state, action)
        
        # Recalculate all metrics
        predicted_state = self._recalculate_metrics(predicted_state)
        
        return predicted_state
    
    def _simulate_sequencing(self, state: Dict, action: Dict) -> Dict:
        """Simulate chiller sequencing change"""
        action_type = action.get('action')
        current_plr = action.get('current_plr', 0.75)
        
        if action_type == 'shutdown_unit':
            # Simulate load redistribution
            # If shutting down 1 of N chillers, remaining chillers take higher load
            new_plr = current_plr * 1.5  # Approximate redistribution
            state['plr'] = min(1.0, new_plr)
            state['num_chillers_running'] = state.get('num_chillers_running', 1) - 1
        elif action_type == 'startup_unit':
            # Starting additional chiller reduces load per unit
            new_plr = current_plr * 0.7  # Approximate load sharing
            state['plr'] = new_plr
            state['num_chillers_running'] = state.get('num_chillers_running', 1) + 1
        
        return state
    
    def _simulate_supply_reset(self, state: Dict, action: Dict) -> Dict:
        """Simulate CHW supply temperature reset"""
        new_setpoint = action.get('recommended_setpoint')
        current_setpoint = action.get('current_setpoint')
        
        if new_setpoint and current_setpoint:
            delta_setpoint = new_setpoint - current_setpoint
            
            # Update supply temperature
            state['chw_supply_temp'] = new_setpoint
            
            # Effect on lift: Higher supply temp = lower evaporator load = slightly reduced lift
            if 'compressor_lift' in state:
                lift_value = state['compressor_lift']
                if isinstance(lift_value, dict):
                    current_lift = lift_value.get('lift_degrees_c', 9.0)
                else:
                    current_lift = lift_value
                # Approximate: +0.5°C supply = -0.3°C lift reduction
                new_lift = current_lift - (delta_setpoint * 0.6)
                state['compressor_lift'] = {'lift_degrees_c': new_lift}
            
            # Effect on power: Reduced lift = reduced power
            # Approximate: Each 1°C lift reduction = 3% power savings
            if 'chiller_power' in state:
                lift_reduction = delta_setpoint * 0.6
                power_reduction_pct = lift_reduction * 0.03
                state['chiller_power'] = state['chiller_power'] * (1 - power_reduction_pct)
        
        return state
    
    def _simulate_pump_adjustment(self, state: Dict, action: Dict) -> Dict:
        """Simulate pump VFD speed adjustment"""
        current_speed = action.get('current_speed_pct', 75)
        new_speed = action.get('recommended_speed_pct', 75)
        speed_ratio = new_speed / current_speed if current_speed > 0 else 1.0
        
        # Cube law for power
        if 'chw_pump_power' in state:
            state['chw_pump_power'] = state['chw_pump_power'] * (speed_ratio ** 3)
        
        # Effect on flow and delta-T
        # Flow changes linearly with speed
        if 'chw_flow_rate' in state:
            state['chw_flow_rate'] = state['chw_flow_rate'] * speed_ratio
        
        # Delta-T inversely related to flow (Q = m * cp * deltaT)
        # If flow decreases, delta-T increases
        if 'delta_t' in state and speed_ratio != 1.0:
            state['delta_t'] = state['delta_t'] / speed_ratio
        
        return state
    
    def _simulate_fan_adjustment(self, state: Dict, action: Dict) -> Dict:
        """Simulate tower fan speed adjustment"""
        current_speed = action.get('current_speed_pct', 75)
        new_speed = action.get('recommended_speed_pct', 75)
        speed_ratio = new_speed / current_speed if current_speed > 0 else 1.0
        
        # Cube law for power
        if 'tower_fan_power' in state:
            state['tower_fan_power'] = state['tower_fan_power'] * (speed_ratio ** 3)
        
        # Update fan speed
        state['tower_fan_speed'] = new_speed
        
        # Effect on approach: More airflow = better approach
        if 'tower_approach' in state:
            # Approximate: 10% speed increase = ~0.3°C approach improvement
            speed_change_pct = ((new_speed - current_speed) / current_speed) * 100
            approach_change = -speed_change_pct * 0.03  # Negative = improvement
            state['tower_approach'] = max(2.0, state['tower_approach'] + approach_change)
        
        # Better approach = lower condenser temp = lower lift
        if 'tower_approach' in state and 'wet_bulb_temp' in state:
            new_cond_out = state['wet_bulb_temp'] + state['tower_approach']
            if 'cond_outlet_temp' in state:
                state['cond_outlet_temp'] = new_cond_out
            
            # Update inlet based on range
            if 'tower_range' in state:
                state['cond_inlet_temp'] = new_cond_out + state['tower_range']
        
        return state
    
    def _recalculate_metrics(self, state: Dict) -> Dict:
        """Recalculate all derived metrics after simulation"""
        # Recalculate cooling load if flow and temps changed
        if all(k in state for k in ['chw_flow_rate', 'chw_supply_temp', 'chw_return_temp']):
            delta_t = state['chw_return_temp'] - state['chw_supply_temp']
            cooling_load_kw = 4.186 * state['chw_flow_rate'] * delta_t
            state['cooling_load_kw'] = cooling_load_kw
            state['cooling_capacity_tr'] = cooling_load_kw / 3.517
        
        # Recalculate plant efficiency
        total_plant_power = state.get('chiller_power', 0)
        total_plant_power += state.get('chw_pump_power', 0)
        total_plant_power += state.get('cw_pump_power', 0)
        total_plant_power += state.get('tower_fan_power', 0)
        
        state['total_plant_power'] = total_plant_power
        
        if state.get('cooling_capacity_tr', 0) > 0:
            state['plant_kw_per_tr'] = total_plant_power / state['cooling_capacity_tr']
            state['chiller_kw_per_tr'] = state.get('chiller_power', 0) / state['cooling_capacity_tr']
        
        # Recalculate COP
        if state.get('cooling_load_kw', 0) > 0 and state.get('chiller_power', 0) > 0:
            state['cop'] = state['cooling_load_kw'] / state['chiller_power']
            state['plant_cop'] = state['cooling_load_kw'] / total_plant_power if total_plant_power > 0 else 0
        
        # Recalculate lift if condenser temp changed
        if 'chw_supply_temp' in state and 'cond_inlet_temp' in state:
            lift_result = self.advanced_calculator.calculate_compressor_lift(
                state['chw_supply_temp'],
                state['cond_inlet_temp']
            )
            state['compressor_lift'] = lift_result
        
        return state
    
    def compare_live_vs_twin(self, live_state: Dict, action: Dict) -> Dict:
        """
        Compare current live state with predicted twin state after action.
        
        Args:
            live_state: Current plant state
            action: Proposed control action
            
        Returns:
            Comparison results
        """
        # Simulate the action
        twin_state = self.simulate_control_action(live_state, action)
        
        # Compare key metrics
        comparison = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "live_state": {
                "plant_kw_per_tr": live_state.get('plant_kw_per_tr', 0),
                "chiller_kw_per_tr": live_state.get('chiller_kw_per_tr', 0),
                "delta_t": live_state.get('delta_t', 0),
                "tower_approach": live_state.get('tower_approach', 0),
                "total_plant_power": live_state.get('total_plant_power', 0),
                "cop": live_state.get('cop', 0)
            },
            "twin_state": {
                "plant_kw_per_tr": twin_state.get('plant_kw_per_tr', 0),
                "chiller_kw_per_tr": twin_state.get('chiller_kw_per_tr', 0),
                "delta_t": twin_state.get('delta_t', 0),
                "tower_approach": twin_state.get('tower_approach', 0),
                "total_plant_power": twin_state.get('total_plant_power', 0),
                "cop": twin_state.get('cop', 0)
            },
            "improvements": {},
            "recommendation": ""
        }
        
        # Calculate improvements
        live = comparison['live_state']
        twin = comparison['twin_state']
        
        comparison['improvements'] = {
            "plant_kw_per_tr_change": round(twin['plant_kw_per_tr'] - live['plant_kw_per_tr'], 3),
            "plant_kw_per_tr_pct": round(((twin['plant_kw_per_tr'] - live['plant_kw_per_tr']) / live['plant_kw_per_tr'] * 100) if live['plant_kw_per_tr'] > 0 else 0, 1),
            "power_savings_kw": round(live['total_plant_power'] - twin['total_plant_power'], 2),
            "power_savings_pct": round(((live['total_plant_power'] - twin['total_plant_power']) / live['total_plant_power'] * 100) if live['total_plant_power'] > 0 else 0, 1),
            "cop_improvement": round(twin['cop'] - live['cop'], 2),
            "delta_t_change": round(twin['delta_t'] - live['delta_t'], 2),
            "approach_improvement": round(live['tower_approach'] - twin['tower_approach'], 2)
        }
        
        # Generate recommendation
        improvements = comparison['improvements']
        if improvements['power_savings_kw'] > 0 and improvements['plant_kw_per_tr_change'] < 0:
            comparison['recommendation'] = f"RECOMMENDED: This action will save {improvements['power_savings_kw']:.1f} kW ({improvements['power_savings_pct']:.1f}%) and improve plant efficiency by {abs(improvements['plant_kw_per_tr_pct']):.1f}%."
        elif improvements['power_savings_kw'] < -5:  # Significant power increase
            comparison['recommendation'] = f"NOT RECOMMENDED: This action will increase power by {abs(improvements['power_savings_kw']):.1f} kW ({abs(improvements['power_savings_pct']):.1f}%)."
        else:
            comparison['recommendation'] = "NEUTRAL: Minor impact expected. Monitor closely if applied."
        
        return comparison
    
    def generate_scenario_matrix(self, current_state: Dict, actions: List[Dict]) -> Dict:
        """
        Test multiple control actions and rank them.
        
        Args:
            current_state: Current plant state
            actions: List of possible control actions
            
        Returns:
            Ranked scenarios
        """
        scenarios = []
        
        for action in actions:
            comparison = self.compare_live_vs_twin(current_state, action)
            
            # Calculate overall score
            score = 0
            imp = comparison['improvements']
            
            # Weight different improvements
            score += imp['power_savings_kw'] * 10  # High weight for power savings
            score += imp['plant_kw_per_tr_change'] * -100  # Negative change is good
            score += imp['cop_improvement'] * 20
            score += imp['approach_improvement'] * 5
            
            scenarios.append({
                "action": action,
                "comparison": comparison,
                "score": round(score, 2),
                "rank": 0  # Will be filled after sorting
            })
        
        # Sort by score (highest first)
        scenarios.sort(key=lambda x: x['score'], reverse=True)
        
        # Assign ranks
        for i, scenario in enumerate(scenarios):
            scenario['rank'] = i + 1
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "scenarios_tested": len(scenarios),
            "best_action": scenarios[0]['action'] if scenarios else None,
            "all_scenarios": scenarios
        }

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List
import csv
import io
from datetime import datetime, timezone

from models.sensor_data import (
    SensorReading,
    CalculatedMetrics,
    SimulationConfig,
    ScenarioRequest,
    MLPredictionRequest,
    MLPredictionResponse,
    AnomalyDetectionResponse,
    OptimizationRecommendation,
    ManualAuditInput,
    ManualAuditResult,
    ControlAction,
    DiagnosticResult,
    PlantComponentStatus,
    DigitalTwinComparison,
    PlantStatusSummary
)
from services.simulation_engine import SimulationEngine
from services.thermodynamics import ThermodynamicsCalculator
from services.ml_engine import MLEngine
from services.manual_audit import ManualAuditCalculator
from services.report_generator import ReportGenerator
from services.advanced_calculations import AdvancedCalculator
from services.diagnostic_engine import DiagnosticEngine
from services.control_logic import ControlLogic
from services.digital_twin import DigitalTwin

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
simulation_engine = SimulationEngine()
thermo_calculator = ThermodynamicsCalculator()
ml_engine = MLEngine()
manual_audit_calculator = ManualAuditCalculator()
report_generator = ReportGenerator()
advanced_calculator = AdvancedCalculator()
diagnostic_engine = DiagnosticEngine()
control_logic = ControlLogic()
digital_twin = DigitalTwin()

# Create the main app
app = FastAPI(title="Chiller Plant Efficiency System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# SIMULATION ENDPOINTS
# ============================================

@api_router.post("/simulation/generate")
async def generate_simulation_data(config: SimulationConfig):
    """
    Generate realistic chiller plant simulation data.
    Returns sensor readings with calculated metrics.
    """
    try:
        # Generate sensor readings
        readings = simulation_engine.generate_data(config)
        
        # Calculate metrics for each reading
        results = thermo_calculator.batch_calculate(readings)
        
        # Store in MongoDB
        if results:
            await db.sensor_data.insert_many([{**r, 'simulation_id': 'sim_' + datetime.now(timezone.utc).isoformat()} for r in results])
        
        return {
            "success": True,
            "total_records": len(results),
            "valid_records": len([r for r in results if r.get('is_valid', False)]),
            "data": results
        }
    except Exception as e:
        logger.error(f"Simulation generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/simulation/scenario")
async def run_scenario(request: ScenarioRequest):
    """
    Run what-if scenario analysis with custom parameters.
    """
    try:
        readings = simulation_engine.generate_data(request.config)
        results = thermo_calculator.batch_calculate(readings)
        
        # Calculate summary statistics
        valid_results = [r for r in results if r.get('is_valid', False)]
        
        if valid_results:
            avg_kw_per_tr = sum(r['kw_per_tr'] for r in valid_results) / len(valid_results)
            avg_cop = sum(r['cop'] for r in valid_results) / len(valid_results)
            total_energy = sum(r['chiller_power'] * (request.config.timestep_minutes / 60) for r in valid_results)
        else:
            avg_kw_per_tr = 0
            avg_cop = 0
            total_energy = 0
        
        return {
            "scenario_name": request.scenario_name,
            "summary": {
                "avg_kw_per_tr": round(avg_kw_per_tr, 3),
                "avg_cop": round(avg_cop, 2),
                "total_energy_kwh": round(total_energy, 2),
                "duration_hours": request.config.duration_hours
            },
            "data": results
        }
    except Exception as e:
        logger.error(f"Scenario analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# REAL-TIME CALCULATIONS
# ============================================

@api_router.post("/calculations/metrics")
async def calculate_metrics(reading: SensorReading):
    """
    Calculate thermodynamic metrics from sensor reading.
    """
    try:
        metrics, is_valid, error = thermo_calculator.calculate_metrics(reading)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        return {
            "sensor_data": reading.model_dump(),
            "metrics": metrics.model_dump(),
            "is_valid": is_valid
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# MACHINE LEARNING ENDPOINTS
# ============================================

@api_router.post("/ml/train")
async def train_ml_models(duration_hours: int = 48):
    """
    Train ML models using simulated or historical data.
    """
    try:
        # Generate training data
        config = SimulationConfig(
            duration_hours=duration_hours,
            timestep_minutes=5,
            include_fouling=True
        )
        readings = simulation_engine.generate_data(config)
        training_data = thermo_calculator.batch_calculate(readings)
        
        # Train models
        performance = ml_engine.train_models(training_data)
        
        return {
            "success": True,
            "message": "ML models trained successfully",
            "performance": performance
        }
    except Exception as e:
        logger.error(f"ML training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ml/predict", response_model=MLPredictionResponse)
async def predict_efficiency(request: MLPredictionRequest):
    """
    Predict efficiency metrics using trained ML models.
    """
    try:
        prediction = ml_engine.predict_efficiency(request, use_xgb=True)
        return prediction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"ML prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ml/anomalies", response_model=AnomalyDetectionResponse)
async def detect_anomalies(data: dict):
    """
    Detect anomalies in current operating conditions.
    """
    try:
        result = ml_engine.detect_anomalies(data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ml/optimize", response_model=List[OptimizationRecommendation])
async def get_optimization_recommendations(data: dict):
    """
    Generate optimization recommendations based on current conditions.
    """
    try:
        recommendations = ml_engine.generate_optimization_recommendations(data)
        return recommendations
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DATA MANAGEMENT ENDPOINTS
# ============================================

@api_router.post("/data/upload")
async def upload_sensor_data(file: UploadFile = File(...)):
    """
    Upload real sensor data from CSV file.
    Expected columns: timestamp, chw_supply_temp, chw_return_temp, chw_flow_rate,
                     cond_inlet_temp, cond_outlet_temp, cond_flow_rate,
                     chiller_power, ambient_temp
    """
    try:
        contents = await file.read()
        csv_data = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        
        readings = []
        for row in csv_reader:
            reading = SensorReading(
                timestamp=datetime.fromisoformat(row['timestamp']),
                chw_supply_temp=float(row['chw_supply_temp']),
                chw_return_temp=float(row['chw_return_temp']),
                chw_flow_rate=float(row['chw_flow_rate']),
                cond_inlet_temp=float(row['cond_inlet_temp']),
                cond_outlet_temp=float(row['cond_outlet_temp']),
                cond_flow_rate=float(row['cond_flow_rate']),
                chiller_power=float(row['chiller_power']),
                ambient_temp=float(row['ambient_temp']),
                humidity=float(row.get('humidity', 60))
            )
            readings.append(reading)
        
        # Calculate metrics and store
        results = thermo_calculator.batch_calculate(readings)
        if results:
            await db.sensor_data.insert_many([{**r, 'source': 'upload'} for r in results])
        
        return {
            "success": True,
            "records_uploaded": len(results),
            "valid_records": len([r for r in results if r.get('is_valid', False)])
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

@api_router.get("/data/export")
async def export_data(hours: int = 24):
    """
    Export sensor data as CSV.
    """
    try:
        # Retrieve data from MongoDB
        cursor = db.sensor_data.find({}, {"_id": 0}).sort("timestamp", -1).limit(hours * 12)
        data = await cursor.to_list(length=hours * 12)
        
        if not data:
            raise HTTPException(status_code=404, detail="No data available")
        
        # Create CSV
        output = io.StringIO()
        if data:
            fieldnames = list(data[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        
        # Return as downloadable file
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=chiller_data_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/data/historical")
async def get_historical_data(hours: int = 24, limit: int = 100):
    """
    Retrieve historical sensor data with calculated metrics.
    """
    try:
        cursor = db.sensor_data.find(
            {"is_valid": True},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        data = await cursor.to_list(length=limit)
        
        return {
            "success": True,
            "records": len(data),
            "data": data
        }
    except Exception as e:
        logger.error(f"Historical data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DASHBOARD SUMMARY
# ============================================

@api_router.get("/dashboard/summary")
async def get_dashboard_summary():
    """
    Get real-time dashboard summary with latest metrics.
    """
    try:
        # Generate current reading
        current_reading = simulation_engine.generate_single_reading()
        metrics, is_valid, error = thermo_calculator.calculate_metrics(current_reading)
        
        if not is_valid:
            return {"error": error}
        
        # Get recent historical data for trends
        cursor = db.sensor_data.find(
            {"is_valid": True},
            {"_id": 0}
        ).sort("timestamp", -1).limit(20)
        historical = await cursor.to_list(length=20)
        
        # Calculate trends
        if historical:
            avg_kw_per_tr = sum(h.get('kw_per_tr', 0) for h in historical) / len(historical)
            avg_cop = sum(h.get('cop', 0) for h in historical) / len(historical)
        else:
            avg_kw_per_tr = metrics.kw_per_tr
            avg_cop = metrics.cop
        
        return {
            "current_metrics": metrics.model_dump(),
            "sensor_data": current_reading.model_dump(),
            "trends": {
                "avg_kw_per_tr_24h": round(avg_kw_per_tr, 3),
                "avg_cop_24h": round(avg_cop, 2)
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Dashboard summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# SYSTEM STATUS
# ============================================

@api_router.get("/system/status")
async def system_status():
    """Check system health and ML model status"""
    return {
        "status": "operational",
        "ml_models_trained": ml_engine.is_trained,
        "database_connected": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ============================================
# MANUAL AUDIT CALCULATOR
# ============================================

@api_router.post("/audit/calculate", response_model=ManualAuditResult)
async def calculate_manual_audit(input_data: ManualAuditInput):
    """
    Manual on-site audit calculator.
    Calculates all efficiency metrics from manually entered field data.
    """
    try:
        result = manual_audit_calculator.calculate_audit(input_data)
        return result
    except Exception as e:
        logger.error(f"Manual audit calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# REPORT GENERATION
# ============================================

@api_router.post("/reports/audit-pdf")
async def generate_audit_pdf_report(audit_result: ManualAuditResult):
    """
    Generate professional PDF report from audit results.
    Returns downloadable PDF file.
    """
    try:
        pdf_buffer = report_generator.generate_manual_audit_report(audit_result)
        
        return StreamingResponse(
            io.BytesIO(pdf_buffer.getvalue()),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=chiller_audit_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"PDF report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reports/dashboard-summary")
async def generate_dashboard_summary_report():
    """
    Generate CSV summary report of current dashboard data.
    """
    try:
        # Get latest data
        cursor = db.sensor_data.find(
            {"is_valid": True},
            {"_id": 0}
        ).sort("timestamp", -1).limit(100)
        
        data = await cursor.to_list(length=100)
        
        if not data:
            raise HTTPException(status_code=404, detail="No data available for report")
        
        # Create CSV
        output = io.StringIO()
        if data:
            fieldnames = list(data[0].keys())
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=dashboard_summary_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# ADVANCED CALCULATIONS ENDPOINTS
# ============================================

@api_router.post("/advanced/calculate")
async def calculate_advanced_metrics(sensor_data: dict):
    """
    Calculate advanced engineering metrics:
    - Compressor lift
    - Part load ratio (PLR)
    - Tower penalty
    """
    try:
        # Add rated capacity if not provided (default 300 TR)
        if 'rated_capacity_tr' not in sensor_data:
            sensor_data['rated_capacity_tr'] = 300.0
        
        results = advanced_calculator.calculate_comprehensive_metrics(sensor_data)
        return {
            "success": True,
            "advanced_metrics": results,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Advanced calculations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DIAGNOSTIC ENDPOINTS
# ============================================

@api_router.post("/diagnostics/analyze")
async def analyze_diagnostics(sensor_data: dict):
    """
    Run comprehensive diagnostic analysis on plant data.
    Detects issues like low delta-T, tower problems, high lift, etc.
    """
    try:
        diagnostics = diagnostic_engine.run_comprehensive_diagnostics(sensor_data)
        return diagnostics
    except Exception as e:
        logger.error(f"Diagnostics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# CONTROL LOGIC ENDPOINTS
# ============================================

@api_router.post("/control/recommend", response_model=List[ControlAction])
async def generate_control_recommendations(sensor_data: dict):
    """
    Generate control recommendations based on current plant state.
    Includes chiller sequencing, CHW reset, pump VFD, and tower fan adjustments.
    """
    try:
        # First observe the state
        observation = control_logic.observe(sensor_data)
        
        # Generate all recommendations
        recommendations = control_logic.generate_comprehensive_recommendations(sensor_data)
        
        return recommendations
    except Exception as e:
        logger.error(f"Control recommendations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/control/apply")
async def apply_control_action(action: dict, confirmed: bool = False):
    """
    Apply a control action (simulation only).
    Requires user confirmation for actions that modify setpoints.
    """
    try:
        result = control_logic.apply_action(action, confirmed)
        return result
    except Exception as e:
        logger.error(f"Control action error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/control/validate-revert")
async def validate_and_check_revert(new_state: dict):
    """
    Check if recent control action should be reverted.
    Compares new state with previous state.
    """
    try:
        revert_decision = control_logic.should_revert(new_state)
        return revert_decision
    except Exception as e:
        logger.error(f"Revert validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# DIGITAL TWIN ENDPOINTS
# ============================================

@api_router.post("/twin/simulate")
async def simulate_with_digital_twin(current_state: dict, action: dict):
    """
    Simulate a control action in digital twin before applying to real plant.
    Returns predicted outcome.
    """
    try:
        comparison = digital_twin.compare_live_vs_twin(current_state, action)
        return comparison
    except Exception as e:
        logger.error(f"Digital twin simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/twin/scenario-matrix")
async def generate_scenario_matrix(current_state: dict, actions: List[dict]):
    """
    Test multiple control actions and rank them by expected benefit.
    """
    try:
        matrix = digital_twin.generate_scenario_matrix(current_state, actions)
        return matrix
    except Exception as e:
        logger.error(f"Scenario matrix error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/twin/mode")
async def get_twin_mode():
    """Get current operating mode (live or twin)"""
    return {"mode": digital_twin.mode}

@api_router.post("/twin/mode")
async def set_twin_mode(mode: str):
    """Set operating mode: 'live' or 'twin'"""
    try:
        digital_twin.set_mode(mode)
        return {"mode": mode, "message": f"Mode set to {mode}"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================
# PLANT STATUS & COMPONENT VISUALIZATION
# ============================================

@api_router.get("/plant/status")
async def get_plant_status():
    """
    Get comprehensive plant component status for virtual layout visualization.
    Returns status of all chillers, towers, pumps, etc.
    """
    try:
        # Get current reading
        current_reading = simulation_engine.generate_single_reading()
        metrics, is_valid, error = thermo_calculator.calculate_metrics(current_reading)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        # Calculate advanced metrics
        sensor_data = {
            **current_reading.model_dump(),
            **metrics.model_dump(),
            'rated_capacity_tr': 300.0,  # Default rated capacity
            'plr': 0.75  # Default PLR
        }
        
        advanced_metrics = advanced_calculator.calculate_comprehensive_metrics(sensor_data)
        
        # Determine component statuses
        components = []
        
        # Chiller 1 Status
        plr = advanced_metrics.get('part_load_ratio', {}).get('plr', 0.75) if 'part_load_ratio' in advanced_metrics else 0.75
        plr_status = advanced_metrics.get('part_load_ratio', {}).get('status', 'optimal') if 'part_load_ratio' in advanced_metrics else 'optimal'
        
        if plr < 0.55:
            chiller_color = "yellow"
            chiller_status = "underloaded"
            chiller_msg = "Underloaded - consider staging down"
        elif plr >= 0.65 and plr <= 0.80:
            chiller_color = "green"
            chiller_status = "optimal"
            chiller_msg = "Optimal efficiency range"
        elif plr > 0.90:
            chiller_color = "yellow"
            chiller_status = "overloaded"
            chiller_msg = "Overloaded - consider staging up"
        else:
            chiller_color = "green"
            chiller_status = "running"
            chiller_msg = "Running normally"
        
        components.append(PlantComponentStatus(
            component_id="CH-1",
            component_type="chiller",
            status=chiller_status,
            status_color=chiller_color,
            current_load_pct=plr * 100,
            power_kw=current_reading.chiller_power,
            efficiency_kw_per_tr=metrics.kw_per_tr,
            message=chiller_msg,
            recommendations=[]
        ))
        
        # Cooling Tower 1 Status
        approach = metrics.tower_approach if metrics.tower_approach else 4.0
        if approach < 4.0:
            tower_color = "green"
            tower_status = "excellent"
            tower_msg = "Excellent performance"
        elif approach < 6.0:
            tower_color = "green"
            tower_status = "normal"
            tower_msg = "Normal operation"
        elif approach < 8.0:
            tower_color = "yellow"
            tower_status = "warning"
            tower_msg = "Performance degradation"
        else:
            tower_color = "red"
            tower_status = "critical"
            tower_msg = "Fouling or airflow issue"
        
        components.append(PlantComponentStatus(
            component_id="CT-1",
            component_type="cooling_tower",
            status=tower_status,
            status_color=tower_color,
            power_kw=current_reading.tower_fan_power,
            vfd_speed_pct=current_reading.tower_fan_speed,
            message=f"Approach: {approach:.1f}°C - {tower_msg}",
            recommendations=[]
        ))
        
        # CHW Pump Status
        delta_t = metrics.delta_t
        if delta_t < 4.0:
            pump_color = "yellow"
            pump_status = "warning"
            pump_msg = "Over-pumping detected"
        elif delta_t > 7.0:
            pump_color = "yellow"
            pump_status = "warning"
            pump_msg = "Possible under-flow"
        else:
            pump_color = "green"
            pump_status = "optimal"
            pump_msg = "Optimal flow rate"
        
        components.append(PlantComponentStatus(
            component_id="CWP-1",
            component_type="pump",
            status=pump_status,
            status_color=pump_color,
            power_kw=current_reading.chw_pump_power,
            vfd_speed_pct=75.0,  # Default
            message=f"ΔT: {delta_t:.1f}°C - {pump_msg}",
            recommendations=[]
        ))
        
        # CW Pump Status
        components.append(PlantComponentStatus(
            component_id="CWP-2",
            component_type="pump",
            status="running",
            status_color="green",
            power_kw=current_reading.cw_pump_power,
            vfd_speed_pct=75.0,
            message="Running normally",
            recommendations=[]
        ))
        
        # Overall plant status
        if any(c.status_color == "red" for c in components):
            overall_status = "critical"
        elif any(c.status_color == "yellow" for c in components):
            overall_status = "warning"
        else:
            overall_status = "normal"
        
        return PlantStatusSummary(
            timestamp=datetime.now(timezone.utc).isoformat(),
            overall_status=overall_status,
            components=components,
            active_chillers=1,
            active_towers=1,
            total_cooling_tr=metrics.cooling_capacity_tr,
            total_power_kw=metrics.total_plant_power,
            plant_kw_per_tr=metrics.plant_kw_per_tr
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Plant status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

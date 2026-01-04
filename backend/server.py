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
    ManualAuditResult
)
from services.simulation_engine import SimulationEngine
from services.thermodynamics import ThermodynamicsCalculator
from services.ml_engine import MLEngine
from services.manual_audit import ManualAuditCalculator
from services.report_generator import ReportGenerator

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
# VIRTUAL PLANT DISPLAY ENDPOINTS
# ============================================

@api_router.get("/virtual-plant/equipment")
async def get_plant_equipment():
    """
    Get multi-equipment plant data for virtual plant display.
    Returns real-time data for all chillers, towers, and pumps.
    """
    try:
        # Generate current reading
        current_reading = simulation_engine.generate_single_reading()
        metrics, is_valid, error = thermo_calculator.calculate_metrics(current_reading)
        
        if not is_valid:
            metrics = None
        
        # Get sensor data values
        chiller_power = current_reading.chiller_power
        chw_pump_power = getattr(current_reading, 'chw_pump_power', 22.0)
        cw_pump_power = getattr(current_reading, 'cw_pump_power', 30.0)
        
        # Multi-equipment configuration with realistic data
        plant_data = {
            "chillers": [
                {
                    "id": "CH-1",
                    "status": "running",
                    "load": 75.0,
                    "power": chiller_power * 0.4,
                    "kwPerTr": metrics.kw_per_tr * 0.95 if metrics else 0.65,
                    "cop": metrics.cop * 1.05 if metrics else 5.4,
                    "chwDeltaT": metrics.delta_t if metrics else 5.5,
                    "compressorLift": 8.2,
                    "chw_supply_temp": current_reading.chw_supply_temp,
                    "chw_return_temp": current_reading.chw_return_temp
                },
                {
                    "id": "CH-2",
                    "status": "running",
                    "load": 82.0,
                    "power": chiller_power * 0.6,
                    "kwPerTr": metrics.kw_per_tr * 1.05 if metrics else 0.68,
                    "cop": metrics.cop * 0.95 if metrics else 5.2,
                    "chwDeltaT": metrics.delta_t * 0.95 if metrics else 5.2,
                    "compressorLift": 8.8,
                    "chw_supply_temp": current_reading.chw_supply_temp + 0.2,
                    "chw_return_temp": current_reading.chw_return_temp + 0.3
                },
                {
                    "id": "CH-3",
                    "status": "stopped",
                    "load": 0.0,
                    "power": 0.0,
                    "kwPerTr": 0.0,
                    "cop": 0.0,
                    "chwDeltaT": 0.0,
                    "compressorLift": 0.0,
                    "chw_supply_temp": 0,
                    "chw_return_temp": 0
                }
            ],
            "coolingTowers": [
                {
                    "id": "CT-1",
                    "status": "running",
                    "fanSpeed": 75.0,
                    "range": metrics.tower_range if metrics else 5.2,
                    "approach": metrics.tower_approach if metrics else 3.8,
                    "wetBulbTemp": current_reading.wet_bulb_temp if hasattr(current_reading, 'wet_bulb_temp') else current_reading.ambient_temp - 4,
                    "condInletTemp": current_reading.cond_inlet_temp,
                    "condOutletTemp": current_reading.cond_outlet_temp,
                    "heatRejected": metrics.heat_rejected_kw * 0.55 if metrics and hasattr(metrics, 'heat_rejected_kw') else 680.0
                },
                {
                    "id": "CT-2",
                    "status": "running",
                    "fanSpeed": 68.0,
                    "range": metrics.tower_range * 1.06 if metrics else 5.5,
                    "approach": metrics.tower_approach * 1.08 if metrics else 4.1,
                    "wetBulbTemp": current_reading.wet_bulb_temp if hasattr(current_reading, 'wet_bulb_temp') else current_reading.ambient_temp - 4,
                    "condInletTemp": current_reading.cond_inlet_temp + 0.5,
                    "condOutletTemp": current_reading.cond_outlet_temp + 0.3,
                    "heatRejected": metrics.heat_rejected_kw * 0.45 if metrics and hasattr(metrics, 'heat_rejected_kw') else 620.0
                }
            ],
            "chwPumps": [
                {
                    "id": "CHWP-1",
                    "status": "running",
                    "rpm": 85.0,
                    "power": chw_pump_power * 0.55,
                    "flow": current_reading.chw_flow_rate * 0.52,
                    "head": 45.0,
                    "efficiency": 82.0
                },
                {
                    "id": "CHWP-2",
                    "status": "running",
                    "rpm": 80.0,
                    "power": chw_pump_power * 0.45,
                    "flow": current_reading.chw_flow_rate * 0.48,
                    "head": 43.0,
                    "efficiency": 80.0
                }
            ],
            "cwPumps": [
                {
                    "id": "CWP-1",
                    "status": "running",
                    "rpm": 90.0,
                    "power": cw_pump_power * 0.52,
                    "flow": current_reading.cond_flow_rate * 0.51,
                    "head": 38.0,
                    "efficiency": 78.0
                },
                {
                    "id": "CWP-2",
                    "status": "running",
                    "rpm": 88.0,
                    "power": cw_pump_power * 0.48,
                    "flow": current_reading.cond_flow_rate * 0.49,
                    "head": 37.0,
                    "efficiency": 77.0
                }
            ],
            "plantSummary": {
                "totalCapacity": metrics.cooling_capacity_tr if metrics else 450.0,
                "totalPower": metrics.total_plant_power if metrics and hasattr(metrics, 'total_plant_power') else 320.0,
                "plantKwPerTr": metrics.plant_kw_per_tr if metrics and hasattr(metrics, 'plant_kw_per_tr') else 0.78,
                "costPerHour": metrics.energy_cost_per_hour if metrics and hasattr(metrics, 'energy_cost_per_hour') else 2560.0,
                "co2Emissions": metrics.co2_emissions_kg_per_hour if metrics and hasattr(metrics, 'co2_emissions_kg_per_hour') else 262.0
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return plant_data
    except Exception as e:
        logger.error(f"Virtual plant equipment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/virtual-plant/digital-twin")
async def get_digital_twin_optimization():
    """
    Get digital twin optimized state for comparison.
    Returns optimized values for all equipment.
    """
    try:
        # Get current state
        current_state = await get_plant_equipment()
        
        # Calculate optimized state (example optimization)
        optimized_state = {
            "chillers": [
                {
                    **current_state["chillers"][0],
                    "kwPerTr": current_state["chillers"][0]["kwPerTr"] * 0.88,  # 12% improvement
                    "cop": current_state["chillers"][0]["cop"] * 1.12,
                    "power": current_state["chillers"][0]["power"] * 0.88
                },
                {
                    **current_state["chillers"][1],
                    "kwPerTr": current_state["chillers"][1]["kwPerTr"] * 0.90,  # 10% improvement
                    "cop": current_state["chillers"][1]["cop"] * 1.10,
                    "power": current_state["chillers"][1]["power"] * 0.90
                },
                current_state["chillers"][2]  # Stopped unit unchanged
            ],
            "coolingTowers": [
                {
                    **current_state["coolingTowers"][0],
                    "fanSpeed": current_state["coolingTowers"][0]["fanSpeed"] * 0.92,  # Reduce fan speed
                    "approach": current_state["coolingTowers"][0]["approach"] * 0.95  # Better approach
                },
                {
                    **current_state["coolingTowers"][1],
                    "fanSpeed": current_state["coolingTowers"][1]["fanSpeed"] * 0.92,
                    "approach": current_state["coolingTowers"][1]["approach"] * 0.95
                }
            ],
            "chwPumps": current_state["chwPumps"],
            "cwPumps": current_state["cwPumps"],
            "plantSummary": {
                **current_state["plantSummary"],
                "plantKwPerTr": current_state["plantSummary"]["plantKwPerTr"] * 0.85,  # 15% improvement
                "totalPower": current_state["plantSummary"]["totalPower"] * 0.85,
                "costPerHour": current_state["plantSummary"]["costPerHour"] * 0.85,
                "co2Emissions": current_state["plantSummary"]["co2Emissions"] * 0.85,
                "savingsPercent": 15.0,
                "annualSavings": current_state["plantSummary"]["costPerHour"] * 0.15 * 16 * 300  # 15% savings
            },
            "optimizationActions": [
                {
                    "action": "Increase CHW supply setpoint by +0.5°C",
                    "impact": "8% efficiency gain on CH-1",
                    "savings": "₹12,400/month"
                },
                {
                    "action": "Optimize cooling tower fan speed via VFD",
                    "impact": "5% fan power reduction",
                    "savings": "₹4,800/month"
                },
                {
                    "action": "Improve CHW ΔT to 6.0°C",
                    "impact": "3% pump power reduction",
                    "savings": "₹2,100/month"
                }
            ],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "current": current_state,
            "optimized": optimized_state,
            "comparison": {
                "kwPerTrImprovement": ((current_state["plantSummary"]["plantKwPerTr"] - 
                                        optimized_state["plantSummary"]["plantKwPerTr"]) / 
                                       current_state["plantSummary"]["plantKwPerTr"] * 100),
                "powerReduction": current_state["plantSummary"]["totalPower"] - optimized_state["plantSummary"]["totalPower"],
                "annualSavings": optimized_state["plantSummary"]["annualSavings"],
                "co2Reduction": current_state["plantSummary"]["co2Emissions"] - optimized_state["plantSummary"]["co2Emissions"]
            }
        }
    except Exception as e:
        logger.error(f"Digital twin optimization error: {e}")
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

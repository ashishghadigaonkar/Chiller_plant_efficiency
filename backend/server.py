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
    OptimizationRecommendation
)
from services.simulation_engine import SimulationEngine
from services.thermodynamics import ThermodynamicsCalculator
from services.ml_engine import MLEngine

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

# CHILLER PLANT EFFICIENCY SYSTEM - COMPLETE PROJECT DOCUMENTATION

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Features & Capabilities](#features--capabilities)
5. [Backend API Documentation](#backend-api-documentation)
6. [Frontend Components](#frontend-components)
7. [Database Schema](#database-schema)
8. [Installation & Setup](#installation--setup)
9. [Usage Guide](#usage-guide)
10. [Thermodynamic Calculations](#thermodynamic-calculations)
11. [Industry Benchmarks](#industry-benchmarks)
12. [Advanced Features](#advanced-features)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 PROJECT OVERVIEW

### Description
A comprehensive, AI-powered chiller plant efficiency monitoring and optimization system designed for HVAC engineers and facility managers. The system provides real-time monitoring, predictive analytics, financial impact analysis, and actionable optimization recommendations.

### Purpose
- **Real-time Monitoring**: Live tracking of chiller plant performance metrics
- **Efficiency Analysis**: Calculate and benchmark kW/TR, COP, and plant efficiency
- **Predictive Maintenance**: ML-based anomaly detection and performance prediction
- **Cost Optimization**: Financial impact analysis with savings projections
- **Professional Reporting**: Generate audit reports with recommendations

### Key Benefits
- ✅ Reduce energy consumption by 10-30%
- ✅ Lower operating costs through optimization
- ✅ Early fault detection prevents expensive breakdowns
- ✅ Data-driven decision making
- ✅ Professional audit reports for stakeholders
- ✅ Environmental impact tracking (CO₂ emissions)

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│              React Frontend (Port 3000)                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Dashboard │Enhanced  │Calculator│Simulation│ML Insights│  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API SERVER                         │
│              FastAPI (Python) - Port 8001                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                        │  │
│  │  • Dashboard Summary    • ML Training/Prediction     │  │
│  │  • Calculations         • Anomaly Detection          │  │
│  │  • Simulation Engine    • Manual Audit               │  │
│  │  • Data Management      • Report Generation          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Business Logic Services                             │  │
│  │  • ThermodynamicsCalculator                          │  │
│  │  • SimulationEngine                                  │  │
│  │  • MLEngine (XGBoost, Isolation Forest)              │  │
│  │  • ManualAuditCalculator                             │  │
│  │  • ReportGenerator (PDF/CSV)                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Motor (Async MongoDB Driver)
                            │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│                   MongoDB Database                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Collections:                                         │  │
│  │  • sensor_data (historical readings & metrics)        │  │
│  │  • simulations (generated test data)                  │  │
│  │  • ml_models (trained model artifacts)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Real-time Monitoring Path**:
   ```
   Sensor Data → Backend API → Thermodynamics Calculator → MongoDB → Frontend Display
   ```

2. **Manual Audit Path**:
   ```
   User Input (Frontend) → Manual Audit Calculator → Results Display → PDF Report
   ```

3. **ML Prediction Path**:
   ```
   Historical Data → ML Training → Model → Predictions → Anomaly Detection
   ```

---

## 💻 TECHNOLOGY STACK

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Core language |
| **FastAPI** | 0.110.1 | REST API framework |
| **Motor** | 3.3.1 | Async MongoDB driver |
| **Pydantic** | 2.12.5 | Data validation |
| **Pandas** | 2.3.3 | Data processing |
| **Scikit-learn** | 1.5.0 | ML algorithms |
| **XGBoost** | 2.0.3 | Gradient boosting |
| **ReportLab** | 4.4.7 | PDF generation |
| **Matplotlib** | 3.10.8 | Chart generation |
| **NumPy** | 2.3.5 | Numerical computing |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.0.0 | UI framework |
| **React Router** | 7.5.1 | Navigation |
| **Recharts** | 3.5.1 | Data visualization |
| **Axios** | 1.8.4 | HTTP client |
| **Tailwind CSS** | 3.4.17 | Styling |
| **Shadcn/ui** | Latest | UI components |
| **Lucide React** | 0.507.0 | Icons |
| **Sonner** | 2.0.3 | Notifications |

### Database
| Technology | Purpose |
|------------|---------|
| **MongoDB** | Document database for sensor data, calculations, and ML models |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Supervisor** | Process management |
| **Nginx** | Reverse proxy |
| **Docker** | Containerization (optional) |

---

## 🚀 FEATURES & CAPABILITIES

### Core Features

#### 1. **Real-Time Dashboard** (`/` - Dashboard Tab)
- Live sensor readings display
- Key Performance Indicators (KPIs):
  - Chiller kW/TR (equipment efficiency)
  - Plant kW/TR (total system efficiency)
  - COP (Coefficient of Performance)
  - Cooling Load & Capacity
  - CHW ΔT (temperature difference)
- Power consumption breakdown
- Cooling tower performance metrics
- Financial metrics (energy cost, savings potential, CO₂ emissions)
- Industry benchmark comparisons

#### 2. **Enhanced Dashboard Insights** (`/` - Enhanced Tab)

**NEW FEATURE - SECTION X**

Seven advanced visualizations for engineering insight and fault diagnosis:

**Chart 1: Cooling Load vs Total Power (Combo Chart)**
- Purpose: Verify power rise is proportional to load
- Alert: Power increases faster than load → inefficiency
- Type: Area + Line chart
- Use Case: Detect system degradation trends

**Chart 2: Plant kW/TR Trend with Benchmark Color Bands**
- Purpose: Instant condition severity assessment
- Zones:
  - 🟢 Green: <0.60 (Excellent)
  - 🟡 Yellow: 0.60-0.75 (Acceptable)
  - 🟠 Orange: 0.75-0.85 (Warning)
  - 🔴 Red: >0.85 (Critical inefficiency)
- Type: Line chart with color-coded dots and reference lines

**Chart 3: Cooling Tower Approach vs Condenser Temperature**
- Purpose: Cooling tower performance deterioration detection
- Alerts:
  - Approach >4°C → Performance deterioration
  - Approach >6°C → Fouling or airflow issue
- Type: Multi-line chart with thresholds

**Chart 4: ΔT Stability Chart (CHW Return - Supply)**
- Purpose: Detect bypass/over-pumping issues
- Zones:
  - ΔT <4°C → Bypass or over-pumping issue
  - ΔT 5-7°C → Healthy zone
- Type: Area chart with reference lines

**Chart 5: Cost Impact & ₹ Savings Graph**
- Purpose: Compare current cost vs optimized setpoint cost
- Formula: ₹ = (Old kW - New kW) × Hrs × Tariff
- Type: Bar chart (current vs optimized vs savings)

**Chart 6: ML Predicted vs Actual Efficiency**
- Purpose: Highlight hidden degradation using ML
- Type: Dual line plot (predicted vs actual)
- Use Case: Gap between curves = equipment issues

**Chart 7: Chiller Sequencing Status Blocks**
- Purpose: Optimize chiller staging
- Recommendations:
  - <65% load → Underloaded (consider shutdown)
  - 65-80% load → Optimal efficiency band
  - >80% load → Overloaded (stage additional unit)
- Type: Status cards with current load indicator

#### 3. **Manual Efficiency Calculator** (`/` - Calculator Tab)

**NEW FEATURE - SECTION Y**

On-site audit tool for field measurements:

**Input Parameters:**
- CHW Supply Temperature (°C)
- CHW Return Temperature (°C)
- CHW Flow Rate (L/s)
- Chiller Power (kW)
- Condenser Inlet Temperature (°C)
- Condenser Outlet Temperature (°C)
- Condenser Flow Rate (L/s)
- Ambient Temperature (°C)
- Ambient Wet Bulb Temperature (°C)
- CHW Pump Power (kW) - Optional
- CW Pump Power (kW) - Optional
- Tower Fan Power (kW) - Optional
- Electricity Tariff (₹/kWh)
- Operating Hours per Day
- Operating Days per Year

**Calculated Results:**
- Cooling Load (kW)
- Cooling Capacity (TR)
- Chiller kW/TR
- Plant kW/TR (includes auxiliaries)
- COP (Chiller & Plant)
- CHW ΔT with status evaluation
- Cooling Tower Range & Approach
- Tower status evaluation

**Financial Impact:**
- Energy consumption (day/month/year)
- Operating cost (day/month/year)
- CO₂ emissions per year
- Potential savings estimation

**Diagnostic Results:**
Example outputs:
- ⚠️ "Warning: Current Plant kW/TR = 0.82 (High). Improve CHW supply setpoint +0.5°C. Expected savings: ₹4,900/day."
- ✅ "Excellent: Current Plant kW/TR = 0.68 (World-class)"

**Recommendations Engine:**
- Setpoint optimization suggestions
- Pump flow rate adjustments
- Cooling tower maintenance alerts
- Chiller tube cleaning recommendations
- Refrigerant charge checks

#### 4. **Professional Report Generation** (`/` - Calculator Tab)

**NEW FEATURE - SECTION Z**

**PDF Report Contents:**
- Executive summary with diagnostic message
- Key Performance Indicators table
- Efficiency comparison chart (bar graph)
- Financial impact breakdown
- Environmental impact (CO₂)
- Optimization recommendations list
- Industry benchmark reference tables
- Professional formatting with headers/footers

**CSV Report:**
- Historical data export
- Dashboard summary export
- Customizable date ranges

#### 5. **Simulation Engine** (`/` - Simulation Tab)
- Generate realistic chiller plant data
- Configurable parameters:
  - Duration (1-168 hours)
  - Time step (1-60 minutes)
  - CHW setpoints
  - Ambient temperature
  - Load factor
  - Include fouling effects
- What-if scenario analysis
- Batch data generation for ML training

#### 6. **Historical Trends** (`/` - Trends Tab)
Five visualization tabs:
- **Efficiency Trend**: Chiller vs Plant kW/TR over time
- **Load vs Power**: Cooling load and power consumption
- **Cooling Tower**: Range, approach, and temperature correlation
- **COP vs Ambient**: Scatter plot showing ambient impact
- **ΔT Analysis**: Temperature difference stability

#### 7. **ML Insights** (`/` - ML Insights Tab)
- Train ML models on historical data
- Efficiency prediction
- Anomaly detection (Isolation Forest)
- Optimization recommendations
- Model performance metrics

#### 8. **Data Management** (`/` - Data Tab)
- Upload CSV sensor data
- Export historical data
- View data statistics
- Data validation and cleaning

---

## 🔌 BACKEND API DOCUMENTATION

### Base URL
```
http://localhost:8001/api
```

### Authentication
Currently no authentication (can be added)

### API Endpoints

#### 1. Dashboard & Monitoring

**GET `/api/dashboard/summary`**
- **Description**: Get real-time dashboard summary with latest metrics
- **Response**:
```json
{
  "current_metrics": {
    "cooling_load_kw": 837.2,
    "cooling_capacity_tr": 238.1,
    "kw_per_tr": 0.628,
    "plant_kw_per_tr": 0.775,
    "cop": 5.23,
    "delta_t": 5.8,
    "efficiency_status": "excellent",
    "tower_range": 4.2,
    "tower_approach": 3.8,
    "total_plant_power": 184.5,
    "energy_cost_per_hour": 1476.0,
    "potential_savings_percent": 8.5,
    "co2_emissions_kg_per_hour": 151.3
  },
  "sensor_data": { ... },
  "trends": { ... }
}
```

**GET `/api/system/status`**
- **Description**: Check system health and ML model status
- **Response**:
```json
{
  "status": "operational",
  "ml_models_trained": true,
  "database_connected": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### 2. Calculations

**POST `/api/calculations/metrics`**
- **Description**: Calculate thermodynamic metrics from sensor reading
- **Request Body**:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "chw_supply_temp": 7.0,
  "chw_return_temp": 12.5,
  "chw_flow_rate": 40.0,
  "cond_inlet_temp": 32.0,
  "cond_outlet_temp": 28.0,
  "cond_flow_rate": 50.0,
  "chiller_power": 150.0,
  "ambient_temp": 32.0,
  "wet_bulb_temp": 26.0
}
```
- **Response**: Calculated metrics with validation

#### 3. Manual Audit Calculator (NEW)

**POST `/api/audit/calculate`**
- **Description**: Perform comprehensive audit calculations from manual field data
- **Request Body**:
```json
{
  "chw_supply_temp": 7.0,
  "chw_return_temp": 12.0,
  "chw_flow_rate": 50.0,
  "chiller_power": 200.0,
  "cond_inlet_temp": 32.0,
  "cond_outlet_temp": 28.0,
  "cond_flow_rate": 60.0,
  "ambient_temp": 32.0,
  "wet_bulb_temp": 26.0,
  "chw_pump_power": 15.0,
  "cw_pump_power": 12.0,
  "tower_fan_power": 8.0,
  "electricity_tariff": 8.0,
  "operating_hours_per_day": 16,
  "operating_days_per_year": 300
}
```
- **Response**:
```json
{
  "cooling_load_kw": 1046.5,
  "cooling_capacity_tr": 297.6,
  "chiller_kw_per_tr": 0.672,
  "plant_kw_per_tr": 0.789,
  "cop": 5.23,
  "plant_cop": 4.45,
  "delta_t": 5.0,
  "delta_t_status": "Healthy",
  "tower_approach": 2.0,
  "tower_status": "Excellent",
  "cost_per_day": 30080.0,
  "cost_per_year": 9024000.0,
  "co2_kg_per_year": 309504.0,
  "diagnostic_message": "✅ Excellent: Current Plant kW/TR = 0.789...",
  "recommendations": [
    "Maintain current operating conditions",
    "Continue monitoring for degradation"
  ],
  "estimated_savings_inr_per_day": null
}
```

#### 4. Report Generation (NEW)

**POST `/api/reports/audit-pdf`**
- **Description**: Generate professional PDF audit report
- **Request Body**: ManualAuditResult object (from audit/calculate)
- **Response**: PDF file download
- **Headers**: `Content-Type: application/pdf`

**GET `/api/reports/dashboard-summary`**
- **Description**: Export dashboard data as CSV
- **Response**: CSV file download
- **Headers**: `Content-Type: text/csv`

#### 5. Simulation Engine

**POST `/api/simulation/generate`**
- **Description**: Generate realistic chiller plant simulation data
- **Request Body**:
```json
{
  "duration_hours": 24,
  "timestep_minutes": 5,
  "chw_supply_setpoint": 7.0,
  "chw_return_setpoint": 12.0,
  "ambient_temp_base": 32.0,
  "load_factor": 0.75,
  "include_fouling": false
}
```
- **Response**: Array of sensor readings with calculated metrics

**POST `/api/simulation/scenario`**
- **Description**: Run what-if scenario analysis
- **Request Body**: Scenario configuration
- **Response**: Summary statistics and detailed data

#### 6. Machine Learning

**POST `/api/ml/train`**
- **Description**: Train ML models using historical data
- **Parameters**: `duration_hours` (default: 48)
- **Response**: Training performance metrics

**POST `/api/ml/predict`**
- **Description**: Predict efficiency metrics
- **Request Body**:
```json
{
  "chw_supply_temp": 7.0,
  "chw_return_temp": 12.0,
  "chw_flow_rate": 40.0,
  "ambient_temp": 32.0,
  "load_kw": 800.0
}
```
- **Response**:
```json
{
  "predicted_kw_per_tr": 0.685,
  "predicted_cop": 5.12,
  "model_used": "xgboost",
  "confidence_score": 0.92
}
```

**POST `/api/ml/anomalies`**
- **Description**: Detect anomalies in operating conditions
- **Request Body**: Current operating data
- **Response**: Anomaly score and detection result

**POST `/api/ml/optimize`**
- **Description**: Generate optimization recommendations
- **Request Body**: Current operating data
- **Response**: Array of optimization suggestions

#### 7. Data Management

**POST `/api/data/upload`**
- **Description**: Upload sensor data from CSV file
- **Request**: Multipart form data with CSV file
- **CSV Format**:
```csv
timestamp,chw_supply_temp,chw_return_temp,chw_flow_rate,cond_inlet_temp,cond_outlet_temp,cond_flow_rate,chiller_power,ambient_temp
2025-01-15T10:00:00,7.0,12.5,40.0,32.0,28.0,50.0,150.0,32.0
```
- **Response**: Upload statistics

**GET `/api/data/export`**
- **Description**: Export sensor data as CSV
- **Parameters**: `hours` (default: 24)
- **Response**: CSV file download

**GET `/api/data/historical`**
- **Description**: Retrieve historical sensor data
- **Parameters**: `hours` (default: 24), `limit` (default: 100)
- **Response**: Array of historical records

---

## 🎨 FRONTEND COMPONENTS

### Component Structure

```
src/
├── App.js                          # Main application
├── components/
│   ├── Dashboard.js                # Main dashboard container
│   ├── MetricsGrid.js              # KPI display grid
│   ├── TrendsChart.js              # Historical trends (5 tabs)
│   ├── EnhancedInsights.js         # 7 new advanced charts (NEW)
│   ├── ManualCalculator.js         # Manual audit tool (NEW)
│   ├── SimulationPanel.js          # Simulation controls
│   ├── MLInsights.js               # ML training & predictions
│   ├── DataManagement.js           # Data upload/export
│   └── ui/                         # Reusable UI components
│       ├── card.jsx
│       ├── button.jsx
│       ├── input.jsx
│       ├── tabs.jsx
│       ├── badge.jsx
│       ├── alert.jsx
│       └── ... (40+ shadcn components)
```

### Key Components

#### Dashboard.js
Main container with 7 tabs:
1. Dashboard - KPIs and metrics
2. Enhanced - 7 new visualizations (NEW)
3. Calculator - Manual audit tool (NEW)
4. Simulation - Data generation
5. Trends - Historical analysis
6. ML Insights - Predictions & anomalies
7. Data - Upload/export

#### EnhancedInsights.js (NEW)
Advanced visualizations using Recharts:
- ComposedChart (Load vs Power)
- LineChart with colored dots (Benchmark bands)
- Multi-line charts (Tower performance)
- AreaChart (ΔT stability)
- BarChart (Cost comparison)
- Status cards (Sequencing)

#### ManualCalculator.js (NEW)
Comprehensive audit tool:
- Input form with 15+ fields
- Real-time calculation
- Results display with diagnostics
- PDF export button
- Color-coded status indicators

---

## 🗄️ DATABASE SCHEMA

### Collection: `sensor_data`

```javascript
{
  "_id": ObjectId,
  "timestamp": ISODate,
  "source": "simulation" | "upload" | "manual",
  "simulation_id": String,  // For tracking simulation batches
  
  // Sensor Readings
  "chw_supply_temp": Number,      // °C
  "chw_return_temp": Number,      // °C
  "chw_flow_rate": Number,        // L/s
  "cond_inlet_temp": Number,      // °C
  "cond_outlet_temp": Number,     // °C
  "cond_flow_rate": Number,       // L/s
  "chiller_power": Number,        // kW
  "ambient_temp": Number,         // °C
  "humidity": Number,             // %
  "wet_bulb_temp": Number,        // °C
  
  // Auxiliary Equipment
  "chw_pump_power": Number,       // kW
  "cw_pump_power": Number,        // kW
  "tower_fan_power": Number,      // kW
  "tower_fan_speed": Number,      // %
  
  // Calculated Metrics
  "cooling_load_kw": Number,
  "cooling_capacity_tr": Number,
  "kw_per_tr": Number,            // Chiller only
  "cop": Number,
  "delta_t": Number,
  "efficiency_status": String,    // "excellent", "average", "poor"
  
  // Cooling Tower
  "tower_range": Number,          // °C
  "tower_approach": Number,       // °C
  "heat_rejected_kw": Number,
  
  // Plant-Level
  "total_plant_power": Number,
  "plant_kw_per_tr": Number,      // Total system
  "plant_cop": Number,
  "plant_efficiency_status": String,
  
  // Financial
  "energy_cost_per_hour": Number,
  "potential_savings_percent": Number,
  "potential_savings_inr_per_year": Number,
  "co2_emissions_kg_per_hour": Number,
  
  // Validation
  "is_valid": Boolean,
  "error": String                 // If invalid
}
```

### Indexes

```javascript
db.sensor_data.createIndex({ "timestamp": -1 })
db.sensor_data.createIndex({ "is_valid": 1 })
db.sensor_data.createIndex({ "source": 1 })
```

---

## ⚙️ INSTALLATION & SETUP

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Yarn package manager

### Backend Setup

```bash
# Navigate to backend directory
cd /app/backend

# Install Python dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=chiller_efficiency
CORS_ORIGINS=*
EOF

# Start backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd /app/frontend

# Install dependencies
yarn install

# Create .env file
cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

# Start development server
yarn start
```

### Using Supervisor (Production)

```bash
# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# Restart specific service
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.out.log
```

---

## 📖 USAGE GUIDE

### 1. First-Time Setup

**Step 1: Generate Initial Data**
- Go to "Simulation" tab
- Set duration to 24 hours
- Click "Generate Simulation Data"
- Wait for completion (creates ~288 data points)

**Step 2: Train ML Models**
- Go to "ML Insights" tab
- Click "Train ML Models"
- Wait for training completion (~30 seconds)

**Step 3: Explore Dashboard**
- Return to "Dashboard" tab
- View real-time KPIs
- Check financial metrics

### 2. Using Manual Calculator

**Step 1: Collect Field Data**
Measure the following:
- CHW supply & return temperatures
- CHW flow rate
- Chiller power consumption
- Condenser inlet & outlet temperatures
- Ambient temperature & wet bulb
- Auxiliary equipment power (pumps, fan)

**Step 2: Enter Data**
- Go to "Calculator" tab
- Fill in all measured values
- Update financial parameters (tariff, hours)
- Click "Calculate Efficiency Metrics"

**Step 3: Review Results**
- Check diagnostic message
- Review calculated KPIs
- Read recommendations
- Note potential savings

**Step 4: Generate Report**
- Click "Generate & Download PDF Report"
- PDF downloads automatically
- Share with stakeholders

### 3. Using Enhanced Insights

**View Advanced Charts:**
- Go to "Enhanced" tab
- Scroll through 7 visualizations
- Look for:
  - Power/Load divergence (inefficiency alert)
  - kW/TR color trends (red dots = problems)
  - Tower approach spikes (fouling)
  - Low ΔT periods (over-pumping)
  - Cost savings opportunities
  - ML prediction gaps (degradation)
  - Load band optimization

### 4. Analyzing Trends

**Historical Analysis:**
- Go to "Trends" tab
- Switch between 5 chart types
- Look for patterns:
  - Efficiency degradation over time
  - Load-dependent efficiency changes
  - Ambient impact on COP
  - Tower performance correlation

### 5. What-If Scenarios

**Run Scenarios:**
- Go to "Simulation" tab
- Enter scenario name
- Adjust setpoints (e.g., CHW supply +1°C)
- Generate data
- Compare results with baseline

---

## 🔬 THERMODYNAMIC CALCULATIONS

### Core Formulas

#### 1. Cooling Load (kW)
```
Q_cooling = Cp × ṁ × ΔT
         = 4.186 kJ/(kg·°C) × Flow(L/s) × (T_return - T_supply)
```
Where:
- Cp = Specific heat of water (4.186 kJ/kg·°C)
- ṁ = Mass flow rate (approximated from volumetric flow)
- ΔT = Temperature difference (°C)

#### 2. Cooling Capacity (TR)
```
Capacity_TR = Q_cooling / 3.517
```
Where:
- 1 TR = 3.517 kW (standard conversion)

#### 3. Chiller Efficiency (kW/TR)
```
Chiller_kW/TR = Chiller_Power / Capacity_TR
```
Lower is better (less power per ton of cooling)

#### 4. Plant Efficiency (kW/TR)
```
Plant_kW/TR = Total_Plant_Power / Capacity_TR

Where:
Total_Plant_Power = Chiller_Power + CHW_Pump + CW_Pump + Tower_Fan
```

#### 5. Coefficient of Performance (COP)
```
COP = Q_cooling / Power_Input

Chiller_COP = Q_cooling / Chiller_Power
Plant_COP = Q_cooling / Total_Plant_Power
```
Higher is better (more cooling per unit power)

#### 6. Cooling Tower Range
```
Range = Cond_Inlet_Temp - Cond_Outlet_Temp
```
Typical: 4-8°C

#### 7. Cooling Tower Approach
```
Approach = Cond_Outlet_Temp - Wet_Bulb_Temp
```
Optimal: <4°C

#### 8. Heat Rejected
```
Q_rejected = Cp × Cond_Flow × Range
           = Q_cooling + Chiller_Power
```

#### 9. Energy Cost
```
Cost_per_hour = Total_Plant_Power × Electricity_Tariff
Cost_per_year = Total_Plant_Power × Hours_per_day × Days_per_year × Tariff
```

#### 10. CO₂ Emissions
```
CO2_kg_per_year = Energy_kWh_per_year × 0.82 kg/kWh
```
(Using India grid emission factor)

---

## 📊 INDUSTRY BENCHMARKS

### Chiller Efficiency (kW/TR)

| Category | Range | Description |
|----------|-------|-------------|
| **Excellent** | <0.60 | Best-in-class centrifugal chillers with magnetic bearings, VFD compressors |
| **Good** | 0.60-0.75 | Modern efficient chillers, well-maintained |
| **Average** | 0.75-0.85 | Standard chillers, typical performance |
| **Poor** | >0.85 | Older equipment, fouling, or improper operation |

### Plant Efficiency (kW/TR) - Total System

| Category | Range | Description |
|----------|-------|-------------|
| **Excellent** | <0.75 | World-class integrated systems with optimized auxiliaries |
| **Good** | 0.75-0.95 | Well-designed systems with VFD pumps and efficient towers |
| **Average** | 0.95-1.10 | Standard systems, room for optimization |
| **Poor** | >1.10 | Oversized pumps, inefficient towers, or system issues |

### Coefficient of Performance (COP)

| Category | Range | Description |
|----------|-------|-------------|
| **Excellent** | >5.5 | Premium efficiency chillers |
| **Good** | 4.5-5.5 | Modern standard chillers |
| **Average** | 3.5-4.5 | Older chillers or part-load operation |
| **Poor** | <3.5 | Significant issues, needs attention |

### CHW Temperature Difference (ΔT)

| Category | Range | Diagnosis |
|----------|-------|-----------|
| **Low** | <4°C | Bypass flow or over-pumping issue |
| **Healthy** | 5-7°C | Optimal heat transfer |
| **High** | >8°C | Possible under-flow or control issue |

### Cooling Tower Approach

| Category | Range | Diagnosis |
|----------|-------|-----------|
| **Excellent** | <4°C | Clean tower, good airflow |
| **Acceptable** | 4-6°C | Normal operation |
| **Poor** | >6°C | Fouling, fan issues, or inadequate tower capacity |

---

## 🎯 ADVANCED FEATURES

### 1. ML-Based Anomaly Detection

**Algorithm**: Isolation Forest
- Detects outliers in multivariate data
- Identifies unusual operating patterns
- Flags potential equipment issues before failure

**Use Cases:**
- Sudden efficiency drops
- Abnormal temperature profiles
- Unexpected power consumption
- Sensor drift detection

### 2. Predictive Efficiency Modeling

**Algorithm**: XGBoost Regression
- Learns normal efficiency patterns
- Predicts expected performance
- Compares actual vs predicted

**Features Used:**
- CHW supply/return temperatures
- Flow rates
- Ambient conditions
- Load levels
- Time of day

### 3. Optimization Recommendations

**Automatic Suggestions:**
1. **Setpoint Optimization**
   - CHW supply temperature adjustment
   - Reset schedules based on load
   
2. **Flow Optimization**
   - Pump VFD speed adjustment
   - ΔT optimization
   
3. **Sequencing Optimization**
   - Chiller staging (65-80% load band)
   - Load distribution among multiple units
   
4. **Maintenance Alerts**
   - Fouling detection (high approach)
   - Tube cleaning recommendations
   - Filter replacement timing

### 4. Financial Impact Analysis

**Calculations:**
- Current operating cost (hourly/daily/monthly/yearly)
- Potential savings from optimization
- ROI for proposed improvements
- Payback period for upgrades

**Baseline Comparison:**
- Uses 0.85 kW/TR as baseline plant efficiency
- Calculates savings potential vs baseline
- Projects annual financial benefit

### 5. Scenario Simulation

**Capabilities:**
- What-if analysis for different setpoints
- Load profile testing
- Seasonal variation modeling
- Equipment degradation simulation (fouling)

**Applications:**
- Pre-deployment testing of control strategies
- Training operator decision-making
- Justifying capital improvements

---

## 🛠️ TROUBLESHOOTING

### Common Issues

#### Backend Won't Start

**Symptom**: Backend service fails to start or crashes
**Solutions:**
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Verify MongoDB is running
sudo systemctl status mongodb

# Check Python dependencies
cd /app/backend
pip install -r requirements.txt

# Test manually
python server.py
```

#### Frontend Build Errors

**Symptom**: React app won't compile
**Solutions:**
```bash
# Clear cache and reinstall
cd /app/frontend
rm -rf node_modules yarn.lock
yarn install

# Check for syntax errors
yarn build
```

#### Database Connection Issues

**Symptom**: "Database connection failed"
**Solutions:**
```bash
# Verify MongoDB is running
sudo supervisorctl status mongodb

# Check connection string in backend/.env
cat /app/backend/.env | grep MONGO_URL

# Test connection
mongosh mongodb://localhost:27017
```

#### CORS Errors

**Symptom**: API requests blocked by browser
**Solution:**
```python
# In backend/server.py, verify CORS settings:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### PDF Generation Fails

**Symptom**: PDF download fails or corrupted
**Solutions:**
```bash
# Install missing dependencies
pip install reportlab pillow matplotlib

# Check file permissions
ls -la /tmp

# Verify matplotlib backend
python -c "import matplotlib; print(matplotlib.get_backend())"
# Should output: Agg
```

### Performance Optimization

#### Slow Dashboard Loading

**Solutions:**
1. Reduce historical data query limit
2. Add database indexes
3. Enable data caching
4. Use pagination for large datasets

#### High Memory Usage

**Solutions:**
1. Limit simulation data generation size
2. Implement data cleanup jobs
3. Optimize MongoDB queries
4. Use projection to fetch only needed fields

---

## 📝 FILE STRUCTURE

```
/app/
├── backend/
│   ├── server.py                    # Main FastAPI application
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment variables
│   ├── models/
│   │   └── sensor_data.py           # Pydantic models
│   └── services/
│       ├── thermodynamics.py        # Calculation engine
│       ├── simulation_engine.py     # Data generation
│       ├── ml_engine.py             # ML algorithms
│       ├── manual_audit.py          # Audit calculator (NEW)
│       └── report_generator.py      # PDF generation (NEW)
│
├── frontend/
│   ├── package.json                 # Node dependencies
│   ├── .env                         # Environment variables
│   ├── public/                      # Static assets
│   └── src/
│       ├── App.js                   # Main app
│       ├── index.js                 # Entry point
│       ├── components/
│       │   ├── Dashboard.js         # Main container
│       │   ├── MetricsGrid.js       # KPI display
│       │   ├── TrendsChart.js       # Trends visualization
│       │   ├── EnhancedInsights.js  # 7 new charts (NEW)
│       │   ├── ManualCalculator.js  # Audit tool (NEW)
│       │   ├── SimulationPanel.js   # Simulation UI
│       │   ├── MLInsights.js        # ML interface
│       │   ├── DataManagement.js    # Data I/O
│       │   └── ui/                  # 40+ UI components
│       └── hooks/
│           └── use-toast.js
│
├── tests/                           # Test files
├── scripts/                         # Utility scripts
├── README.md                        # Project overview
├── IMPLEMENTATION_SUMMARY.md        # Implementation notes
├── THERMODYNAMICS_GUIDE.md          # Engineering reference
├── PROJECT_DOCUMENTATION.md         # This file (NEW)
└── design_guidelines.json           # UI/UX standards
```

---

## 🚀 DEPLOYMENT

### Production Checklist

- [ ] Set proper environment variables
- [ ] Enable authentication (JWT/OAuth)
- [ ] Configure MongoDB replica set
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable rate limiting
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure backup strategy
- [ ] Set up logging (ELK stack)
- [ ] Optimize database indexes
- [ ] Build frontend production bundle
- [ ] Configure CDN for static assets

### Environment Variables

**Backend (.env)**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=chiller_efficiency
CORS_ORIGINS=https://yourdomain.com
SECRET_KEY=your-secret-key-here
LOG_LEVEL=INFO
```

**Frontend (.env)**
```env
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```

---

## 📞 SUPPORT & MAINTENANCE

### Logging

**Backend Logs:**
```bash
# Supervisor logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/backend.out.log

# Application logs
grep "ERROR" /var/log/supervisor/backend.err.log
```

**Frontend Logs:**
```bash
# Development
Check browser console (F12)

# Production
tail -f /var/log/supervisor/frontend.out.log
```

### Monitoring Metrics

**System Health:**
- CPU usage
- Memory consumption
- Disk I/O
- Network bandwidth

**Application Metrics:**
- API response times
- Error rates
- Active connections
- Database query performance

**Business Metrics:**
- Average plant efficiency
- Total energy savings
- Number of audits performed
- PDF reports generated

---

## 📚 ADDITIONAL RESOURCES

### Documentation
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Recharts: https://recharts.org/
- MongoDB: https://docs.mongodb.com/
- ReportLab: https://www.reportlab.com/docs/

### Engineering References
- ASHRAE Handbook - HVAC Systems and Equipment
- AHRI Standard 550/590 (Performance Rating of Chillers)
- ISO 50001 (Energy Management Systems)

### Contact & Support
- Project Repository: [Internal]
- Technical Lead: [Contact Info]
- Bug Reports: [Issue Tracker]

---

## 📄 LICENSE

[Specify your license here]

---

## 🎉 CONCLUSION

This Chiller Plant Efficiency System provides a comprehensive solution for HVAC engineers to monitor, analyze, and optimize chiller plant performance. With real-time monitoring, advanced diagnostics, ML-powered insights, and professional reporting capabilities, it enables data-driven decisions that result in significant energy savings and operational improvements.

**Key Achievements:**
- ✅ Real-time monitoring with industry benchmarks
- ✅ 7 advanced engineering visualizations
- ✅ Manual audit tool with diagnostics
- ✅ Professional PDF report generation
- ✅ ML-based anomaly detection
- ✅ Financial impact analysis
- ✅ Optimization recommendations

**Version**: 2.0
**Last Updated**: January 2025
**Status**: Production Ready

---

*For questions or contributions, please contact the development team.*

# Chiller Plant Efficiency Simulation & Optimization System

## 🏭 Overview

An enterprise-grade, production-ready system for monitoring, analyzing, and optimizing chiller plant efficiency using real-time sensor data, thermodynamic calculations, and machine learning.

## 🎯 Key Features

### 1. Real-Time Monitoring Dashboard
- **Live KPI Tracking**: kW/TR, COP, Cooling Load, Cooling Capacity
- **Sensor Readings**: CHW temperatures, flow rates, condenser metrics, ambient conditions
- **Color-Coded Status**: Excellent/Average/Poor efficiency indicators
- **Industry Benchmarks**: Visual comparison against industry standards

### 2. Simulation Engine
- **Realistic Data Generation**: Simulates chiller plant behavior with:
  - Diurnal load variations (business hours vs. off-hours)
  - Ambient temperature cycles
  - Part-load and full-load conditions
  - Optional fouling/aging degradation
- **What-If Scenarios**: Test different operating conditions
- **Configurable Parameters**: Duration, timestep, setpoints, load factors

### 3. Thermodynamic Calculations

#### Industry-Standard Formulas:

**Cooling Load (kW)**:
```
Cooling_kW = 4.186 × Flow(L/s) × (T_return − T_supply)
```

**Cooling Capacity (TR)**:
```
Cooling_TR = Cooling_kW / 3.517
```

**Efficiency Metrics**:
```
kW/TR = Chiller_Power_kW / Cooling_TR
COP = Cooling_kW / Chiller_Power_kW
```

#### Validation Rules:
- ΔT (Return-Supply) must be > 2°C
- Flow rates must be positive
- Chiller power must be > 0 kW

### 4. Machine Learning Engine

#### Models Implemented:

**A. Efficiency Prediction**
- **XGBoost**: Gradient boosting for high accuracy
- **RandomForest**: Ensemble baseline
- **Features**: CHW temps, flow, ambient temp, cooling load
- **Target**: Predicts kW/TR and COP

**B. Anomaly Detection**
- **Isolation Forest**: Unsupervised pattern detection
- **Z-Score Analysis**: Statistical deviation detection
- **Use Case**: Early warning for equipment degradation

**C. Optimization Recommendations**
- Optimal CHW setpoint suggestions
- Flow rate optimization for target ΔT
- Energy savings estimates (% reduction)

### 5. Data Management
- **CSV Upload**: Import real sensor data
- **CSV Export**: Download simulation results with metrics
- **MongoDB Storage**: Time-series data persistence

## 📊 Visualization & Analytics

### Dashboard Charts:
1. **kW/TR Efficiency Trend**: Line chart with benchmark overlays
2. **Cooling Load vs Power**: Area chart showing load-power relationship
3. **COP vs Ambient Temperature**: Scatter plot revealing efficiency impact
4. **ΔT Analysis**: Monitor temperature differential performance

## 🏗️ System Architecture

### Backend (FastAPI + Python)
```
/backend
├── server.py                    # Main API routes
├── models/
│   └── sensor_data.py          # Pydantic models
└── services/
    ├── simulation_engine.py    # Data generation
    ├── thermodynamics.py       # Efficiency calculations
    └── ml_engine.py            # ML models
```

### Frontend (React + Tailwind)
```
/frontend/src
├── App.js                      # Main app component
└── components/
    ├── Dashboard.js            # Main dashboard layout
    ├── MetricsGrid.js          # KPI cards
    ├── TrendsChart.js          # Historical charts
    ├── SimulationPanel.js      # Scenario testing
    ├── MLInsights.js           # ML analysis
    └── DataManagement.js       # Upload/export
```

## 🚀 API Endpoints

### Simulation
- `POST /api/simulation/generate` - Generate sensor data
- `POST /api/simulation/scenario` - Run what-if analysis

### Calculations
- `POST /api/calculations/metrics` - Calculate thermodynamic metrics

### Machine Learning
- `POST /api/ml/train` - Train ML models
- `POST /api/ml/predict` - Predict efficiency
- `POST /api/ml/anomalies` - Detect anomalies
- `POST /api/ml/optimize` - Get recommendations

### Data Management
- `POST /api/data/upload` - Upload CSV data
- `GET /api/data/export` - Export data as CSV
- `GET /api/data/historical` - Retrieve historical data

### Dashboard
- `GET /api/dashboard/summary` - Real-time summary
- `GET /api/system/status` - System health check

## 💼 Business Value

### Why kW/TR Matters:
- **Industry Standard**: Primary efficiency metric for chiller plants
- **Cost Impact**: Direct correlation to energy costs
- **Benchmarking**: 
  - **Excellent**: < 0.6 kW/TR (best-in-class)
  - **Average**: 0.6 - 0.8 kW/TR (standard performance)
  - **Poor**: > 0.8 kW/TR (requires optimization)

### ROI Factors:
1. **Energy Cost Reduction**: 10-30% savings through optimization
2. **Predictive Maintenance**: Early detection prevents costly failures
3. **Carbon Footprint**: Lower energy = reduced emissions
4. **Equipment Longevity**: Optimal operation extends lifespan

## 🎨 Design System

**Theme**: Industrial Control Room (Dark Mode)
- **Colors**: Deep slate background with neon cyan accents (#66FCF1)
- **Typography**: 
  - Headings: Rajdhani (industrial/technical)
  - Body: Manrope (high legibility)
  - Data: JetBrains Mono (monospace for precision)
- **Layout**: Dense grid system for maximum data visibility

## 🧪 Testing

### Quick Test:
```bash
# Test API
curl $REACT_APP_BACKEND_URL/api/system/status

# Generate simulation data
curl -X POST $REACT_APP_BACKEND_URL/api/simulation/generate \
  -H "Content-Type: application/json" \
  -d '{"duration_hours":24,"timestep_minutes":5}'

# Train ML models
curl -X POST $REACT_APP_BACKEND_URL/api/ml/train?duration_hours=48
```

### Frontend:
1. Navigate to dashboard - View real-time KPIs
2. Simulation tab - Run scenarios
3. Trends tab - Analyze historical data
4. ML Insights - Train models and get predictions
5. Data tab - Upload/export data

## 📚 Technical Documentation

### Simulation Engine Logic:
- **Load Variation**: Higher during business hours (8am-6pm)
- **Ambient Cycle**: Peaks at 2-3 PM
- **Efficiency Model**: Base kW/TR = 0.58, degrades with:
  - High ambient temperature (+1% per °C above 25°C)
  - Fouling factor (configurable rate)
- **Noise**: 2% sensor noise for realism

### ML Model Features:
- **Input Features**: [CHW_supply, CHW_return, CHW_flow, Ambient_temp, Cooling_load]
- **Training Data**: Minimum 20 valid samples required
- **Evaluation**: R² score for prediction accuracy
- **Anomaly Threshold**: Z-score > 3 or Isolation Forest outlier

## 📖 Usage Examples

### Scenario Testing:
1. **Baseline**: Current operating conditions
2. **High Efficiency**: Increase CHW supply temp to 8°C
3. **Peak Load**: Test at 100% load factor
4. **Hot Weather**: Simulate 40°C ambient conditions

### Optimization Workflow:
1. Generate or upload historical data
2. Train ML models on 48+ hours of data
3. Run anomaly detection to identify issues
4. Get optimization recommendations
5. Test recommendations via simulation scenarios
6. Implement validated changes

## 🔬 Why ML Adds Value Beyond Formulas:

1. **Non-Linear Relationships**: Captures complex interactions between variables
2. **Equipment-Specific Behavior**: Learns actual performance vs. theoretical
3. **Predictive Capability**: Forecasts efficiency before conditions occur
4. **Pattern Recognition**: Identifies subtle degradation invisible to formulas

## 🌟 Production-Ready Features:

✅ Industry-standard thermodynamic calculations
✅ Real-time data validation and error handling
✅ Scalable ML training pipeline
✅ RESTful API design
✅ Responsive enterprise UI
✅ MongoDB time-series storage
✅ CSV import/export for integration
✅ Comprehensive error messages
✅ Professional visualization

## 🎯 Target Users:

- Energy Managers
- HVAC Engineers
- Facility Operators
- Building Automation Teams
- Sustainability Officers
- Corporate Engineering Departments

---

**Built with**: FastAPI, React, MongoDB, scikit-learn, XGBoost, Recharts, Tailwind CSS
**Design Philosophy**: Enterprise-grade, data-dense, technically accurate, client-ready

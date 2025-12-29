# Thermodynamics & Efficiency Calculations Guide

## Overview

This document explains the thermodynamic principles and industry-standard calculations used in the Chiller Plant Efficiency System.

## Core Concepts

### 1. Chiller Plant Operation

A chiller plant removes heat from building spaces through a refrigeration cycle:

1. **Evaporator Side** (Chilled Water Loop):
   - Chiller removes heat from chilled water (CHW)
   - CHW supply temp: typically 4-8°C
   - CHW return temp: typically 12-16°C
   - Heat removed = Cooling Load

2. **Condenser Side**:
   - Heat is rejected to cooling tower water
   - Condenser water inlet: ambient + approach temp
   - Efficiency decreases as condenser temp increases

3. **Compressor**:
   - Electrical power input
   - Drives the refrigeration cycle

## Industry-Standard Formulas

### Cooling Load (kW)

**Formula**:
```
Cooling Load (kW) = Specific Heat × Flow Rate × Temperature Difference
Cooling Load = 4.186 × Q × ΔT
```

Where:
- 4.186 = Specific heat of water (kJ/kg·°C)
- Q = Chilled water flow rate (L/s)
- ΔT = T_return - T_supply (°C)

**Why it matters**: This is the actual cooling capacity being delivered to the building.

### Cooling Capacity (TR)

**Formula**:
```
Cooling Capacity (TR) = Cooling Load (kW) / 3.517
```

Where:
- TR = Tons of Refrigeration
- 3.517 = Conversion factor (1 TR = 3.517 kW)

**Background**: 1 ton of refrigeration = heat required to melt 1 ton of ice in 24 hours = 12,000 BTU/hr = 3.517 kW

### Efficiency Metric: kW/TR

**Formula**:
```
kW/TR = Chiller Power (kW) / Cooling Capacity (TR)
```

**Interpretation**:
- Lower values = better efficiency
- Represents electrical power required per ton of cooling

**Industry Benchmarks**:
- **Excellent**: < 0.6 kW/TR
  - Modern high-efficiency chillers
  - Optimal operating conditions
  - Magnetic bearing compressors
  
- **Average**: 0.6 - 0.8 kW/TR
  - Standard commercial chillers
  - Normal operating conditions
  - Room for optimization
  
- **Poor**: > 0.8 kW/TR
  - Aging equipment
  - Fouled heat exchangers
  - Off-optimal conditions
  - High ambient temperature

### Coefficient of Performance (COP)

**Formula**:
```
COP = Cooling Output (kW) / Electrical Input (kW)
COP = Cooling Load / Chiller Power
```

**Interpretation**:
- Higher values = better efficiency
- Dimensionless ratio
- Typical range: 3.0 - 7.0

**Relationship to kW/TR**:
```
COP ≈ 3.517 / (kW/TR)
```

Example: 0.6 kW/TR → COP ≈ 5.86

## Validation Rules

### 1. Temperature Difference (ΔT)

**Rule**: ΔT must be > 2°C

**Rationale**:
- Below 2°C indicates low load or sensor error
- Typical design: 5-6°C
- Low ΔT = high flow rates = high pumping energy

**Optimal Range**: 4-6°C

### 2. Flow Rate

**Rule**: Flow rate must be > 0 L/s

**Typical Values**:
- Small chiller (100 TR): 30-50 L/s
- Medium chiller (300 TR): 70-100 L/s
- Large chiller (500 TR): 120-160 L/s

### 3. Chiller Power

**Rule**: Power must be > 0 kW

**Typical Values** (at design conditions):
- 100 TR chiller: 50-70 kW
- 300 TR chiller: 170-220 kW
- 500 TR chiller: 280-360 kW

## Factors Affecting Efficiency

### 1. Ambient Temperature

**Impact**: +1% increase in kW/TR per °C above design point

**Mechanism**:
- Higher ambient → higher condenser temperature
- Higher lift (pressure difference)
- More compressor work required

**Typical Impact**:
- 25°C ambient: 0.58 kW/TR (optimal)
- 35°C ambient: 0.64 kW/TR (+10%)
- 40°C ambient: 0.70 kW/TR (+20%)

### 2. Part-Load Operation

**Impact**: Efficiency varies with load

**Typical Curve**:
- 25% load: 0.70 kW/TR (less efficient)
- 50% load: 0.60 kW/TR (good)
- 75% load: 0.55 kW/TR (optimal)
- 100% load: 0.60 kW/TR (design point)

### 3. Fouling & Aging

**Impact**: Gradual efficiency degradation

**Causes**:
- Scale buildup on heat exchanger tubes
- Refrigerant charge loss
- Compressor wear
- Oil contamination

**Rate**: Typically 1-3% per year without maintenance

### 4. Chilled Water Temperature

**Impact**: Lower CHW temp = lower efficiency

**Rule of Thumb**: 2-3% savings per 1°C increase in supply temp

**Example**:
- 6°C supply: 0.64 kW/TR
- 7°C supply: 0.62 kW/TR (-3%)
- 8°C supply: 0.60 kW/TR (-6%)

**Constraint**: Must meet cooling load requirements

## Cost Impact

### Energy Cost Calculation

```
Annual Cost = Operating Hours × Average Load (TR) × kW/TR × Electricity Rate
```

**Example**:
- 500 TR chiller
- 6,000 hours/year operation
- 70% average load = 350 TR
- Current: 0.75 kW/TR
- Optimized: 0.60 kW/TR
- Electricity: $0.12/kWh

**Current Cost**:
```
6,000 × 350 × 0.75 × $0.12 = $189,000/year
```

**Optimized Cost**:
```
6,000 × 350 × 0.60 × $0.12 = $151,200/year
```

**Annual Savings**: $37,800 (20% reduction)

## Optimization Strategies

### 1. Chilled Water Temperature Reset

**Strategy**: Increase CHW supply temp when possible

**Implementation**:
- Monitor building loads
- Raise supply temp during low-load periods
- Maintain 4-5°C ΔT

**Savings**: 2-10%

### 2. Condenser Water Optimization

**Strategy**: Lower condenser water temperature

**Implementation**:
- Optimize cooling tower fan speed
- Improve approach temperature
- Clean heat exchangers

**Savings**: 5-15%

### 3. Flow Optimization

**Strategy**: Achieve optimal ΔT (5-6°C)

**Implementation**:
- Variable speed pumps
- Reduce excessive flow
- Balance system hydraulics

**Savings**: 10-20% on pump energy

### 4. Chiller Sequencing

**Strategy**: Operate chillers at peak efficiency points

**Implementation**:
- Use most efficient chiller first
- Stage additional chillers at 70-80% load
- Avoid very low part-load operation

**Savings**: 5-15%

## Measurement & Verification

### Required Sensors

1. **Temperature Sensors** (±0.2°C accuracy):
   - CHW supply
   - CHW return
   - Condenser inlet
   - Condenser outlet
   - Ambient

2. **Flow Meters** (±2% accuracy):
   - CHW flow
   - Condenser water flow

3. **Power Meter** (±1% accuracy):
   - Chiller electrical consumption

### Data Logging

**Frequency**: 1-5 minute intervals

**Storage**: Time-series database

**Retention**: 
- Raw data: 1 year
- Hourly averages: 5 years
- Daily summaries: 10 years

## Common Issues & Diagnosis

### Issue: High kW/TR

**Possible Causes**:
1. Fouled condenser tubes
2. Low refrigerant charge
3. High condenser water temp
4. Compressor wear
5. Very low part-load operation

**Diagnosis**:
- Check approach temperature
- Inspect water quality
- Analyze efficiency curve vs. load

### Issue: Low ΔT

**Possible Causes**:
1. Excessive flow rate
2. Low building load
3. Bypassing valves
4. Control valve issues

**Diagnosis**:
- Measure actual flow
- Check valve positions
- Compare to design ΔT

### Issue: Anomalous Power Consumption

**Possible Causes**:
1. Electrical issues
2. Phase imbalance
3. Motor problems
4. Control system faults

**Diagnosis**:
- Compare to baseline
- Check electrical measurements
- Review control logs

---

**References**:
- ASHRAE Handbook - HVAC Applications
- AHRI Standard 550/590 (Performance Rating)
- DOE Federal Energy Management Program

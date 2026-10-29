# VeloAnalytics Methodology & Scientific Foundation

## Overview

VeloAnalytics is built on the principle of **algorithmic transparency**. Unlike many proprietary cycling platforms that treat performance metrics as "black boxes," VeloAnalytics utilizes open-source, peer-reviewed models. This ensures that your data is analyzed using consistent, scientifically validated methods that you can inspect and verify.

---

## Core Metrics

### 1. Critical Power (CP)

- **Concept**: The highest power output an athlete can maintain in a quasi-steady state without progressive continuous fatigue (the boundary between heavy and severe exercise domains).
- **Formula**: `Work (Joules) = (CP × t) + W'`
- **Calculation**: Computed via linear regression on maximal efforts across multiple durations (typically 1m, 3m, 5m, 10m, and 20m) using the Monod and Scherrer 2-Parameter Linear Model, where CP is the slope of the Work-vs-Time line and W' is the y-intercept.
- **Interpretation**: Represents the athlete's true physiological threshold. Efforts above Critical Power draw on a finite anaerobic work battery (W').

### 2. xPower (IsoPower)

- **Concept**: An estimate of the constant mechanical power that would elicit an equivalent physiological cost as the actual variable power output.
- **Formula**: `xPower = (Average of (25s EWMA Power⁴))^(1/4)`
- **Calculation**:
  1. Apply a 25-second Exponentially Weighted Moving Average (EWMA) to raw power data (reflecting the half-life of oxygen kinetics).
  2. Raise each smoothed power value to the 4th power to account for the non-linear metabolic cost of high-intensity efforts.
  3. Calculate the average of these 4th-power values across the moving duration.
  4. Take the 4th root of that average.
- **Interpretation**: Reflects the physiological strain of stochastic, surge-heavy efforts better than a simple arithmetic average.

### 3. Relative Intensity (RI)

- **Concept**: A dimensionless number that quantifies the intensity of a ride relative to the athlete's current fitness level (CP).
- **Formula**: `RI = xPower / CP`
- **Calculation**: Ratio of normalized power (xPower) to steady-state threshold (Critical Power).
- **Interpretation**:
  - `RI < 0.70`: Active recovery or basic endurance.
  - `0.75 - 0.85`: Steady-state tempo or long-distance racing.
  - `0.85 - 0.95`: Sweet-spot and threshold intervals.
  - `1.00+`: Maximal effort (typically sustainable for up to ~60 minutes).

### 4. BikeScore™

- **Concept**: A quantification of the total training dose of a session, accounting for both duration and intensity.
- **Formula**: `BikeScore = ((t × xPower × RI) / (CP × 3600)) × 100`
- **Calculation**: Since `RI = xPower / CP`, the formula can also be expressed as: `BikeScore = ((t × RI²) / 3600) × 100` (where `t` is elapsed duration in seconds).
- **Interpretation**: Because RI is squared in the underlying math, BikeScore rewards intensity exponentially. Doubling intensity results in 4x the stress score for the same duration. Exactly 100 points represents 1 hour of maximal steady-state threshold effort.

### 5. Efficiency Factor (EF)

- **Concept**: A measure of aerobic efficiency, representing the mechanical output produced per heartbeat.
- **Formula**: `EF = xPower ÷ Average Heart Rate`
- **Calculation**: Ratio of normalized mechanical output (xPower in Watts) to physiological cost (Average Heart Rate in bpm).
- **Interpretation**: An upward trend in EF over time during standardized steady-state efforts signifies expanding cardiovascular efficiency and aerobic conditioning.

### 6. Performance Management (LTS, STS, SB)

- **Concept**: Based on the Banister Impulse-Response Model, these metrics track the accumulation of training load and its cumulative effect on fitness, fatigue, and form.
- **Formula**:
  - `Fitness (LTS)`: `LTS(today) = LTS(yesterday) + (BikeScore(today) - LTS(yesterday)) / 42`
  - `Fatigue (STS)`: `STS(today) = STS(yesterday) + (BikeScore(today) - STS(yesterday)) / 7`
  - `Form (SB)`: `SB(today) = LTS(yesterday) - STS(yesterday)`
- **Calculation**: Rolling exponentially weighted moving averages of daily training dose using standard time constants (42 days for LTS, 7 days for STS).
- **Interpretation**:
  - `LTS (Long Term Stress / Fitness)`: Multi-week chronic training base.
  - `STS (Short Term Stress / Fatigue)`: Acute training strain from recent days.
  - `SB (Stress Balance / Form)`: Freshness indicator. Positive numbers indicate freshness and race readiness; negative numbers indicate productive overload.

### 7. Fatigue-Adjusted W' Balance (W'bal)

- **Concept**: A real-time dynamic model tracking remaining anaerobic work capacity battery above Critical Power.
- **Formula**:
  - Depletion (`Power > CP`): `W'bal(t) = W'bal(t-1) - (Power - CP) × dt`
  - Recovery (`Power ≤ CP`): `W'bal(t) = W'bal(t-1) + (W'ceiling - W'bal(t-1)) × (1 - exp(-dt / τ_adjusted))`
- **Calculation**: Implements the Skiba Differential Model with fatigue non-stationarity adjustments:
  1. Recovery time constant (τ) slows by approx. 15% per 1000 kJ of cumulative mechanical work.
  2. Maximum anaerobic capacity ceiling (W'ceiling) decays by approx. 5% per 1000 kJ of cumulative mechanical work.
- **Interpretation**: Quantifies matches burned and dynamic recharge during surges, accounting for long-ride fatigue.

### 8. Aerobic Decoupling (Pw:HR)

- **Concept**: Measures the physiological drift between mechanical power output and cardiovascular strain during a steady-state effort.
- **Formula**: `Decoupling % = ((Ratio_Half1 - Ratio_Half2) / Ratio_Half1) × 100%`
- **Calculation**: The ratio of Average Power to Average Heart Rate in the first half of a ride compared to the second half (`Ratio = Power / HR`).
- **Interpretation**: A decoupling rate greater than 5% signals cardiovascular drift, aerobic fatigue, or dehydration.

---

## Health, Wellness & Biomechanics

### 9. Wellness & Physiological Recovery

- **Concept**: Integrating life-stress, sleep telemetry, and autonomic recovery data into performance analysis.
- **Metrics Tracked**:
  - `Initial Readiness`: Standard readiness metric provided by source sensors (Garmin/Oura).
  - `Sleep Quality`: A multi-parametric index (0-100) combining duration, quality, and sleep stages.
  - `Overnight HRV`: Root Mean Square of Successive Differences (RMSSD) between heartbeats, evaluated against a rolling 7-day baseline.

#### Garmin Connect Ingestion Architecture & Supported Formats

VeloAnalytics implements an automated multi-range ingestion pipeline that accepts official Sleep and HRV Status CSV exports from Garmin Connect:

1. **1-Day Vertical Key-Value Exports**: Contains granular single-night telemetry including overall Sleep Score, sleep stages (deep, light, REM, awake), resting heart rate, pulse oximetry (SpO₂ average and minimum), awake respiration rate, and overnight HRV status.
2. **7-Day & 4-Week Tabular Exports**: Chronological daily rows recording continuous metrics (sleep scores, total sleep time, deep sleep percentages, awake times, and daily overnight HRV readings).
3. **1-Year Macro Aggregates (Weekly Averages)**: Multi-month reporting where each entry represents a 7-day rolling period. The engine parses the date bounds and anchors the weekly aggregate values to the interval end-date, enabling long-term baseline history.
4. **Non-Destructive Metric Merging**: Importing overlapping files merges data safely by date. Uploading a 1-year macro file establishes baseline continuity, while subsequent uploads enrich existing dates without overwriting them with blank values.
5. **Robust Date Normalization**: Standardizes all timestamps to ISO `YYYY-MM-DD` with defensive parsing guards preventing runtime exceptions across locale variations.

### 10. Experimental Velo Readiness (Opt-in)

- **Concept**: A hypothesized weighted algorithm designed to approximate aggregate physiological readiness by combining sleep quality, autonomic status, and chronic training load using Non-Linear Multiplicative Inhibitors.
- **Component Scoring**:
  - `Weighted Base`: `(Sleep × 0.35) + (Recovery × 0.25) + (HRV × 0.20) + (Load × 0.20)`
  - `Pillar Suppression`: The Weighted Base is modified by your weakest metric using a 30/70 mix: `Final = (Base × 0.30) + (Base × 0.70 × (WorstPillar / 100))`. This reflects "Veto Logic" where one failure point suppresses but does not erase success points.
- **Multiplicative Inhibitors & Suppressors**:
  - `HRV Status Warning`: If overnight HRV is below your 7-day baseline minimum, it acts as a primary suppression pillar.
  - `Sleep Debt Deduction`: If last night's sleep was less than 6 hours, a flat 15-point deduction is applied.
  - `Recovery Hard Caps`: Estimated Recovery > 48h compresses score toward a floor of 25; > 24h caps score at 55.
  - `ACWR Interpretation`: If Acute:Chronic Workload Ratio > 1.4, score is capped at 40 to reflect heightened overtraining risk.
  - `Relative Intensity Spike Suppression`: If a single session's BikeScore exceeds 5.0x your current CTL (LTS), the Load Pillar drops to 0 to prevent excessive load from presenting as positive readiness.

*Note: This feature is experimental and must be enabled in Settings > Experimental.*

### 11. Health & Systemic Metrics (PulseOX & Respiration)

- **Concept**: Tracking fundamental physiological indicators to detect early signs of illness, high-altitude adaptation, or systemic stress.
- **Metrics Tracked**:
  - `PulseOX (Oxygen Saturation)`: Percentage of oxygen-saturated hemoglobin in the blood. Significant deviations from personal baselines (typically 94-99% at sea level) indicate respiratory strain or poor recovery.
  - `Respiration Rate`: Measured in breaths per minute (bpm). Elevated resting respiration rate is an early indicator of sympathetic nervous system dominance, often preceding HRV drops during onset of illness or overtraining.

### 12. Cycling Dynamics & Biomechanical Modeling

- **Concept**: Comprehensive per-stroke biomechanical analysis, bilateral kinetic asymmetry, and pedal cleat pressure distribution derived from dual-sided pedal telemetry (Garmin Rally/Vector, Favero Assioma DUO/PRO).

#### 12.1 Three-Tier Synchronized Architecture

1. **Tier 1 (Metric Analysis Timeline)**: Continuous physiological and environmental time-series (Power, Cadence, Heart Rate, Speed, Elevation, Temperature) with unified cross-hair scrubbing.
2. **Tier 2 (Cycling Dynamics Timeline)**: High-resolution continuous scatter streams organized by canonical biomechanical hierarchy:
   - Left/Right Balance (0–100% with a central 50/50 reference line).
   - Platform Center Offset (Cartesian scatter channels centered at 0 mm with whole-ride averages).
   - Power Phase Start & End (angular stroke sectors relative to Top Dead Center 0°).
   - Rider Position (seated vs. standing transitions).
   - Torque Effectiveness & Pedal Smoothness percentages.
   - Dual-mode controls: Time vs. Distance modes, Metric vs. 6-Zone Intensity mapping, and 30-Second Rolling Trend Baseline.
3. **Tier 3 (Cycling Dynamics Biomechanical Overview)**: Structural polar vector dials and anatomical pedal models:
   - 360° Circular Crank Dials with cardinal clock references (TDC 0°, 90°, BDC 180°, 270°), drive start/end badges, and peak torque range badges.
   - Anatomical Pedal PCO diagrams with bilateral lateral force translation.
   - Position & Power Breakdown (seated vs. standing durations, percentages, and mean power).
   - Peak sliding window dynamics (5s, 1m, 5m, 20m).
4. **Global Scrubber Synchronization & State Locking**: A centralized root state cross-wires all three tiers with the GPS Route Map. Freezing the scrubber pins the athlete's exact geographic coordinate and renders single-stroke polar dials.

#### 12.2 30-Second Rolling Trend Baseline Model

- **Concept**: Low-pass filtered baseline trend analysis that filters out stochastic pedaling noise from road micro-variations and gear shifts.
- **Formula**: `Trend_30s(t) = Mean of metric values within [t - 15s, t + 15s] (Window = 30 seconds)`
- **Biomechanical Significance**: Superimposes smoothed trendlines across L/R Balance, PCO, and Power Phase to identify progressive balance decay or outward cleat drift during sustained threshold intervals.

#### 12.3 Instantaneous Live Stroke vs. Habitual Baseline Overlay

- **Live Stroke Mode**: Renders the exact propulsive Power Phase and Peak Power Phase sectors executed during that specific crank revolution along with instantaneous power, cadence, and rider position.
- **Habitual Baseline Overlay**: Simultaneously projects the whole-ride mean propulsive arc (mean θ_start to mean θ_end) as a dashed circular baseline along the dial track, enabling immediate visual comparison between transient bursts and habitual baseline pedaling.

#### 12.4 Platform Center Offset (PCO) & Anatomical Coordinate System

- **Concept**: Measures the lateral deviation of applied force relative to the geometric center of the pedal spindle (in millimeters, mm).
- **Directional Standard**:
  - `Positive (+ mm)`: Force biased Outboard (laterally away from bicycle frame center line).
  - `Negative (- mm)`: Force biased Inboard (medially toward bicycle frame and crank arm).
- **Anatomical Geometry**:
  - Left Pedal: Outboard (+) translates laterally outward; Inboard (-) translates medially inward.
  - Right Pedal: Outboard (+) translates laterally outward; Inboard (-) translates medially inward.
- **Safety Clamping**: `PCO_visual = max(-15, min(15, PCO_raw))` restricts indicator translation to ±15 mm to prevent visual distortion while preserving 100% numerical fidelity in readouts. Neutral target is 0 ± 2 mm.

#### 12.5 Angular Power Phase (PP) & Peak Power Phase (PPP)

- **Power Phase (PP)**: The angular arc of the crank revolution (0°–360° clockwise from Top Dead Center at 0°) where positive propulsive drive torque is produced (typically 10°–25° to 200°–220°).
- **Peak Power Phase (PPP)**: The angular sector where the concentrated top 50% of propulsive drive torque is produced (typically 65°–115°).

#### 12.6 Torque Effectiveness (TE) & Pedal Smoothness (PS)

- **Torque Effectiveness (TE)**: `TE = ((Torque_positive + Torque_negative) / Torque_positive) × 100%`. Quantifies the ratio of propulsive torque to gross torque generated per revolution (100% indicates zero resistive backstroke drag).
- **Pedal Smoothness (PS)**: `PS = (Power_average / Power_peak) × 100%`. Quantifies mechanical uniformity of power production throughout the 360° rotation (typical road cyclists: 15–25%).

#### 12.7 Conditional Visibility & Graceful Fallback

- Cycling Dynamics requires dual-sided pedal telemetry. When a ride is recorded using single-sided meters or indoor smart trainers, the parser sets `hasDynamics = false`, preserving an uncluttered interface by leaving dynamics charts and lanes unrendered.

#### 12.8 Cycling Dynamics Data Export Architecture

VeloAnalytics provides a native export engine that extracts raw biomechanical data into standard RFC 4180 CSV files and high-resolution PNG imagery:

1. **Dynamics Time-Series Data (`CyclingDynamicsCharts.tsx`)**:
   - `Purpose`: Second-by-second continuous stroke telemetry for Python, R, or GoldenCheetah analysis.
   - `Filename`: `veloanalytics_dynamics_timeseries_[activity_name]_[timestamp].csv`
   - `Schema`: Timestamp, Elapsed Seconds, Distance, Power, Cadence, L/R Balance, Left/Right PCO, Left/Right Power Phase Start/End/Arc, Left/Right Peak Power Phase Start/End/Arc, Rider Position.
2. **Dynamics Rolling Trends (`CyclingDynamicsCharts.tsx`)**:
   - `Purpose`: Low-pass filtered 30s trend analysis isolating macro biomechanical drift.
   - `Filename`: `veloanalytics_dynamics_trends_[activity_name]_[timestamp].csv`
   - `Schema`: Timestamp, Elapsed Seconds, Distance, Power, Cadence, L/R Balance 30s Trend, Left/Right PCO 30s Trend, Left/Right PP Start/End 30s Trend.
3. **Dynamics Summary & Position Breakdown (`CyclingDynamicsSection.tsx`)**:
   - `Purpose`: Macroscopic whole-ride summary paired with seated vs. standing posture partitioning.
   - `Filename`: `veloanalytics_dynamics_summary_[activity_name]_[timestamp].csv`
   - `Schema`: Global baselines (duration, distance, mean power, cadence, balance, PCO) and seated vs. standing comparative breakdowns.
4. **Peak Power Window Dynamics (`CyclingDynamicsSection.tsx`)**:
   - `Purpose`: Biomechanical execution under maximal anaerobic, glycolytic, and aerobic strain across Mean Maximal Power duration windows (5s, 1m, 5m, 20m, 60m).
   - `Filename`: `veloanalytics_peak_power_dynamics_[window]_[activity_name]_[timestamp].csv`
   - `Schema`: Window duration, timestamps, mean power, windowed balance, PCO, and angular power phase metrics.
5. **High-Resolution Visual PNG Export Pipeline**:
   - High pixel ratio vector rasterization for coaching dossiers, bike fitting reports, and clinical analysis.

---

## Attributions & Legal Notes

### Scientific Credit

- **Dr. Philip Friere Skiba (PhysFarm)**: Developer of the BikeScore™, xPower, and W' Balance algorithms. His work provided the foundation for transparent, power-based training stress analysis.
- **Dr. Eric Banister**: Developed the original TRIMP (Training Impulse) model in the 1970s, which is the mathematical ancestor of all modern training load metrics.
- **Monod and Scherrer**: Proposed the original Critical Power model in 1960.
- **Dr. Andrew Coggan**: Developed the original TSS®, NP®, and IF® metrics. While VeloAnalytics uses open-source alternatives (BikeScore/xPower), Dr. Coggan's work was instrumental in popularizing power-based training analysis.

### Open Source Heritage

VeloAnalytics acknowledges the **GoldenCheetah** project for its leadership in implementing these metrics in the open-source domain and providing a standard for terminology and calculation logic.

---

## Technical Implementation

The source code for these calculations can be found in `src/services/metrics.ts`. All calculations are performed locally in your browser; your raw power data is never uploaded to a server.

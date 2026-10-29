# Performance Insights & Methodology

*VeloAnalytics is built on the principle of **algorithmic transparency**. We utilize peer-reviewed, open-source models so you can inspect and verify the math that defines your fitness.*

> **Reference Notice:** This in-app guide summarizes core concepts and calculation logic for practical athletic review. For complete mathematical proofs, algorithm specifications, and extended developer documentation, refer to `docs/METHODOLOGY.md` in the project repository.

---

## 1. Core Training & Performance Metrics

### Critical Power (CP)
- **Concept**: The highest power output an athlete can sustain in a quasi-steady state without progressive continuous fatigue (typically 45–60 minutes).
- **Formula**: `Work (Joules) = (CP × t) + W'`
- **Calculation**: Solved via linear regression across your best efforts (1m, 3m, 5m, 10m, and 20m) using the Monod & Scherrer 2-Parameter Linear Model, where CP is the slope of the Work-vs-Time line and W' is the y-intercept.

### xPower (IsoPower)
- **Concept**: An estimate of the constant mechanical power that would elicit an equivalent physiological cost as the actual variable power output.
- **Formula**: `xPower = (Average of (25s EWMA Power⁴))^(1/4)`
- **Calculation**: Applies a 25-second Exponentially Weighted Moving Average (EWMA) to raw power (matching oxygen kinetics half-life), raises smoothed values to the 4th power to weight metabolic intensity, averages them across moving duration, and extracts the 4th root.

### Relative Intensity (RI)
- **Concept**: A dimensionless scalar quantifying effort intensity relative to Critical Power.
- **Formula**: `RI = xPower / CP`
- **Interpretation**:
  - `RI < 0.70`: Active recovery or basic endurance.
  - `0.75 - 0.85`: Steady-state tempo or long-distance racing.
  - `0.85 - 0.95`: Sweet-spot and threshold intervals.
  - `1.00+`: Maximal effort (typically sustainable for up to ~60 minutes).

### BikeScore™ & Training Dose
- **Concept**: Quantifies total physiological training stress accounting for both duration and intensity.
- **Formula**: `BikeScore = ((t × xPower × RI) / (CP × 3600)) × 100`
- **Substituted Formula**: `BikeScore = ((t × RI²) / 3600) × 100` (where `t` is elapsed duration in seconds).
- **Insight**: Because RI is squared, high-intensity efforts are weighted exponentially over steady cruising. Exactly 100 points represents 1 hour at steady-state Critical Power.

### Efficiency Factor (EF)
- **Concept**: Aerobic engine output produced per heartbeat.
- **Formula**: `EF = xPower ÷ Average Heart Rate`
- **Insight**: Upward longitudinal trends during standardized steady-state efforts indicate expanding cardiovascular stroke volume and aerobic conditioning.

### Performance Management (LTS, STS, SB)
Based on the **Banister Impulse-Response Model**:
- **Fitness (LTS)**: `LTS(today) = LTS(yesterday) + (BikeScore(today) - LTS(yesterday)) / 42` (42-day rolling exponential base).
- **Fatigue (STS)**: `STS(today) = STS(yesterday) + (BikeScore(today) - STS(yesterday)) / 7` (7-day rolling acute workload).
- **Form (SB)**: `SB(today) = LTS(yesterday) - STS(yesterday)`. Positive values denote freshness and tapering; negative values denote productive training overload.
- **Daily Impulse Tracking**: Discrete daily sessions are quantified by **BikeScore** (volume) and **Relative Intensity** (density). Scaling these daily inputs independently from multi-week rolling curves prevents scale distortion while preserving form resolution.

### Fatigue-Adjusted W' Balance (W'bal)
Real-time tracking of remaining anaerobic work capacity battery expendable above Critical Power:
- **Depletion** (`Power > CP`): `W'bal(t) = W'bal(t-1) - (Power - CP) × dt`
- **Recovery** (`Power ≤ CP`): `W'bal(t) = W'bal(t-1) + (W'ceiling - W'bal(t-1)) × (1 - exp(-dt / τ_adjusted))`
- **Fatigue Adjustments**:
  1. Recovery time constant (τ) slows by approx. 15% per 1000 kJ of cumulative work.
  2. Maximum capacity ceiling (W'ceiling) decays by approx. 5% per 1000 kJ of cumulative work.

### Aerobic Decoupling (Pw:HR)
- **Concept**: Measures power-to-heart-rate drift between the first and second halves of steady efforts.
- **Formula**: `Decoupling % = ((Ratio_Half1 - Ratio_Half2) / Ratio_Half1) × 100%` (where `Ratio = Power / HR`).
- **Insight**: A drift greater than 5% signals aerobic fatigue, thermal stress, or dehydration.

---

## 2. Wellness & Autonomic Recovery

### Sleep, HRV, and Garmin Connect Integration
- **Direct Garmin Connect Personal API Sync**: Direct 1-click sync imports recent cycling workouts in native `.FIT` format alongside granular sleep architecture (Deep, Light, REM, Awake) and overnight HRV data directly into local browser storage.
- **Overnight HRV (RMSSD)**: Evaluated continuously against your personal rolling **7-day baseline** to identify autonomic balance and systemic readiness.
- **Automated Ingestion & Merging**: Ingests 1-day, 7-day, 4-week, and 1-year Garmin Connect CSV exports. Overlapping files merge non-destructively using activity ID and date deduplication, preserving long-term baselines while enriching single days with sleep stages, SpO₂, and respiration rates.

### Experimental Velo Readiness (Opt-in)
Approximates physiological readiness using a multi-pillar foundation modified by **Non-Linear Multiplicative Inhibitors**:
- **Weighted Base**: `(Sleep × 0.35) + (Recovery × 0.25) + (HRV × 0.20) + (Load × 0.20)`
- **Pillar Suppression**: `Final = (Base × 0.30) + (Base × 0.70 × (WorstPillar / 100))`
- **Non-Linear Suppressors**:
  - `HRV Warning`: Overnight HRV below 7-day baseline minimum suppresses overall readiness.
  - `Sleep Debt`: Sleep under 6 hours incurs a flat 15-point deduction.
  - `Recovery Caps`: Estimated recovery > 48h compresses score toward 25; > 24h caps score at 55.
  - `ACWR Guard`: Acute:Chronic Workload Ratio > 1.4 caps score at 40 to protect against overtraining.
  - `Load Spike Guard`: Single-session BikeScore > 5.0x CTL drops load pillar to 0 to prevent illness flare-ups during recovery.

### Health & Systemic Metrics (PulseOX & Respiration)
- **PulseOX (Oxygen Saturation)**: Percentage of oxygen-saturated hemoglobin in the blood. Sustained drops below personal baselines (typically 94–99% at sea level) signal respiratory strain or altitude adaptation.
- **Resting Respiration Rate**: Measured in breaths per minute (bpm). Elevated resting respiration indicates sympathetic nervous system dominance, often preceding HRV drops during early illness or overtraining.

---

## 3. Cycling Dynamics & Biomechanics

VeloAnalytics presents dual-sided pedal telemetry (Garmin Rally/Vector, Favero Assioma DUO) across a **Three-Tier Synchronized System**:

### Three-Tier Layout
1. **Tier 1 (Metric Analysis Timeline)**: Standard continuous engine telemetry (Power, Cadence, HR, Speed, Elevation) with synchronized time-series scrubbing.
2. **Tier 2 (Cycling Dynamics Timeline)**: High-resolution scatter channels for L/R Balance (0–100% with 50/50 baseline), Left & Right PCO (centered at 0 mm with whole-ride averages), Power Phase Start & End (with Drive vs. Peak toggles), Rider Position (seated vs. standing transitions), Torque Effectiveness, and Pedal Smoothness. Features Time vs. Distance modes, Metric vs. 6-Zone Intensity mapping, and 30-Second Rolling Trend baseline.
3. **Tier 3 (Cycling Dynamics Biomechanical Overview)**: Structural 360° polar crank dials, anatomical pedal diagrams, seated vs. standing power distribution, and peak 5s, 1m, 5m, and 20m Max Avg Power sliding window analysis.

### Global Scrubber Locking & Synchronized Inspection
Clicking any data point on any timeline (or pressing the **Lock Scrubber** button) pins the cursor at that exact second across all tiers:
- **Live Stroke Mode**: Circular dials switch to single-stroke resolution, reporting instantaneous power, cadence, and seated/standing telemetry.
- **Habitual Baseline Comparison**: Simultaneously overlays your whole-ride mean propulsive arc (mean θ_start to mean θ_end) as a dashed circular baseline along the dial track for immediate visual comparison.
- **GPS Route Tracking**: The Activity Map jumps to the exact geographic coordinate on the road where the pedal stroke occurred.

### Platform Center Offset (PCO)
Measures lateral distribution of pressure relative to pedal spindle center (target zone: 0 ± 2 mm):
- **Positive (+ mm)**: Force biased **Outboard** (laterally away from the bicycle frame).
- **Negative (- mm)**: Force biased **Inboard** (medially toward the crank arm).
- **Safety Clamping**: `PCO_visual = max(-15, min(15, PCO_raw))` restricts indicator translation to ±15 mm to prevent visual distortion while preserving 100% numerical accuracy in digital readouts.

### Torque Effectiveness (TE) & Pedal Smoothness (PS)
- **Torque Effectiveness (TE)**: `TE = ((Torque_positive + Torque_negative) / Torque_positive) × 100%`. Quantifies the ratio of propulsive torque to gross torque generated per revolution (100% indicates zero resistive backstroke drag).
- **Pedal Smoothness (PS)**: `PS = (Power_average / Power_peak) × 100%`. Quantifies mechanical uniformity of power production throughout the 360° rotation (typical road cyclists: 15–25%).

### 30-Second Rolling Trend Baseline Model
- **Formula**: `Trend_30s(t) = Mean of metric values within [t - 15s, t + 15s] (Window = 30 seconds)`
- **Biomechanical Utility**: Filters out stochastic pedaling noise from road micro-variations to reveal true macro trends in unilateral balance decay or outward cleat drift during sustained threshold intervals.

### CSV & Telemetry Data Exports
- **Dynamics Time-Series Data (CSV)**: Second-by-second FIT dynamics telemetry (L/R Balance, Left/Right PCO, angular start/end/arc for Drive & Peak phases, Rider Position, Watts, Cadence).
- **Dynamics Rolling Trends (CSV)**: Centered 30-second moving averages revealing macro biomechanical drift and unilateral fatigue.
- **Dynamics Summary & Position Breakdown (CSV)**: Ride-level baselines and seated vs. standing posture comparisons (duration, average power, phase arcs, and balance).
- **Peak Power Window Dynamics (CSV)**: Biomechanical metrics isolated strictly to the selected Max Avg Power interval (5s, 1m, 5m, 20m, 60m).
- **High-Resolution PNG Exports**: High pixel ratio vector rasterization for coaching reports, fitting dossiers, and clinical analysis.

---

## Scientific Attribution

- **Dr. Philip Friere Skiba (PhysFarm)**: Developer of the **BikeScore™**, **xPower**, and **W' Balance** algorithms. His work provided the foundation for transparent, power-based training stress analysis.
- **Dr. Eric Banister**: Developer of the original **TRIMP** (Training Impulse) model, the mathematical ancestor of all modern training load metrics.
- **Monod & Scherrer**: Developers of the foundational **Critical Power** two-parameter work-time relationship.
- **Dr. Andrew Coggan**: Developer of the original TSS®, NP®, and IF® metrics that popularized power-based training analysis.
- **GoldenCheetah Project**: Pioneer in open-source performance modeling and transparent algorithm verification.

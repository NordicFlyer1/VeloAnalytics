# Performance Insights & Methodology

*VeloAnalytics is built on the principle of **algorithmic transparency**. We utilize peer-reviewed, open-source models so you can inspect and verify the math that defines your fitness.*

> **Reference Notice:** This in-app guide summarizes core concepts for practical athletic review. For complete mathematical proofs, LaTeX equations, and raw developer specifications, refer to `docs/METHODOLOGY.md` in the project repository.

---

## 1. Core Training & Performance Metrics

### Critical Power (CP)
* **Concept**: The highest power output you can sustain in a quasi-steady state without progressive fatigue (typically 45–60 minutes).
* **Model**: Calculated via the **Monod & Scherrer 2-Parameter Linear Model** ($Work = CP \times t + W'$) through multi-point linear regression across your personal best efforts (1m, 3m, 5m, 10m, and 20m).

### xPower & Relative Intensity (RI)
* **xPower**: Reflects the physiological cost of variable efforts using a 25-second exponentially weighted moving average raised to the 4th power.
* **Relative Intensity (RI)**: The ratio of normalized output to your fitness limit ($RI = xPower / CP$). An RI of 1.00 represents a 100% threshold effort.

### BikeScore™ & Training Dose
* **Concept**: Quantifies total physiological stress accounting for both duration and intensity.
* **Formula**: $BikeScore = \frac{t \times RI^2}{3600} \times 100$ (where $t$ is duration in seconds). Because intensity is squared, hard efforts are weighted exponentially over coasting.

### Efficiency Factor (EF) & Aerobic Decoupling
* **Efficiency Factor (EF)**: Aerobic engine output per heartbeat ($xPower \div \text{Average Heart Rate}$). Upward trends over time signify expanding cardiovascular efficiency.
* **Aerobic Decoupling (Pw:HR)**: Measures power-to-heart-rate drift between the first and second halves of steady efforts. A drift greater than 5% signals aerobic fatigue.

### Performance Management (LTS, STS, SB)
Based on the **Banister Impulse-Response Model**:
* **Fitness (LTS)**: 42-day rolling exponential average of daily training load.
* **Fatigue (STS)**: 7-day rolling exponential average of recent training load.
* **Form (SB)**: Difference between yesterday's fitness and fatigue ($SB = LTS - STS$). Positive numbers indicate race freshness; negative numbers indicate productive overload.

### Fatigue-Adjusted W' Balance (W'bal)
Real-time tracking of your remaining anaerobic work capacity battery above Critical Power. Uses the **Skiba Differential Model** augmented with fatigue non-stationarity adjustments: dynamic recovery slowing ($\tau$ increases with accumulated work) and capacity ceiling decay.

---

## 2. Wellness & Autonomic Recovery

### Sleep, HRV, and Garmin Connect Integration
* **Overnight HRV (RMSSD)**: Evaluated continuously against your personal rolling **7-day baseline** to identify autonomic balance and systemic readiness.
* **Automated Garmin Connect Ingestion**: The engine automatically detects and ingests 1-day, 7-day, 4-week, and 1-year Garmin Connect CSV exports without manual formatting.
* **Continuous History Merging**: Overlapping daily files and weekly macro-aggregates merge non-destructively, safely preserving long-term baseline history while enriching single days with sleep stages, SpO₂, and respiration rates.

### Experimental Velo Readiness (Opt-in)
Approximates physiological recovery using a weighted base $(Sleep \times 0.35 + Recovery \times 0.25 + HRV \times 0.20 + Load \times 0.20)$ combined with **Non-Linear Multiplicative Inhibitors**. Deficits in critical pillars (e.g., severe sleep debt, acute HRV depression, or high ACWR injury risk) automatically suppress the overall score to prevent high fitness from masking acute fatigue.

---

## 3. Cycling Dynamics & Biomechanics

VeloAnalytics presents dual-sided pedal telemetry (Garmin Rally/Vector, Favero Assioma DUO) across a **Three-Tier Synchronized System**:

### Three-Tier Layout
1. **Tier 1 (Metric Analysis)**: Standard continuous engine telemetry (Power, Cadence, HR, Speed, Elevation) with time-series scrubbing.
2. **Tier 2 (Cycling Dynamics Timeline)**: High-resolution scatter channels for **L/R Balance** (0–100% with 50/50 baseline), **Left & Right PCO** (centered at 0 mm with whole-ride averages), **Power Phase Start & End** (with Drive vs. Peak toggles), **Rider Position** (Seated vs. Standing), **Torque Effectiveness**, and **Pedal Smoothness**. Includes Time vs. Distance modes and 6-Zone Power Intensity Heatmap coloring.
3. **Tier 3 (Cycling Dynamics Biomechanics Panel)**: Unobstructed 360° polar crank dials, anatomical pedal cleat graphics, seated vs. standing power distribution, and peak 5s, 1m, 5m, and 20m **Max Avg Power** sliding window analysis.

### Global Scrubber Locking & Synchronized Inspection
Clicking any data point on any timeline (or pressing the **Lock Scrubber** button) pins the vertical scrubber needle at that exact second across all panels:
* **Live Stroke Mode**: The circular dials switch to single-stroke resolution, displaying instantaneous power, cadence, and seated/standing telemetry.
* **Habitual Baseline Comparison**: The dial overlays your whole-ride **Habitual Ride Avg** as a faint dashed gray arc right beneath your live stroke arc, allowing you to instantly assess whether you started driving earlier or swept through a wider angle during that effort.
* **GPS Route Tracking**: The Activity Map jumps to the exact geographic coordinate on the road where the pedal stroke occurred.

### Platform Center Offset (PCO)
Measures the lateral distribution of pressure relative to the pedal spindle center (target zone: $0 \pm 2\text{ mm}$):
* **Positive ($+$ mm)**: Force biased **Outboard** (away from the bicycle frame).
* **Negative ($-$ mm)**: Force biased **Inboard** (toward the crank arm).
* **Anatomical Alignment**: Left pedal spindle connects on the right; Right pedal spindle connects on the left. Visual needle translation is safely clamped to $\pm 15\text{ mm}$ to preserve clean visual boundaries while reporting exact numerical values.

### CSV & Visual Telemetry Exports
* **Dynamics Time-Series Data (CSV)**: Second-by-second FIT dynamics telemetry (L/R Balance, Left/Right PCO, angular start/end/arc for Drive & Peak phases, Rider Position, Watts, Cadence).
* **Dynamics Rolling Trends (CSV)**: Centered 30-second moving averages revealing macro biomechanical drift and unilateral fatigue.
* **Dynamics Summary & Position Breakdown (CSV)**: Ride-level aggregates and seated vs. standing posture comparisons (duration, average power, phase arcs, and balance).
* **Peak Power Window Dynamics (CSV)**: Biomechanical metrics isolated strictly to the selected Max Avg Power interval (5s, 1m, 5m, 20m, 60m).
* **High-Resolution PNG Exports**: Day and Dark Mode vector-rasterized graphics with true dark theme styling matching on-screen presentation.

---

## Scientific Attribution

* **Dr. Philip Friere Skiba (PhysFarm)**: Developer of the **BikeScore™**, **xPower**, and **W' Balance** algorithms.
* **Dr. Eric Banister**: Developer of the **TRIMP** impulse-response model for chronic and acute training load.
* **Monod & Scherrer**: Developers of the foundational **Critical Power** two-parameter relationship.
* **GoldenCheetah Project**: Pioneer in open-source performance modeling and transparent algorithm verification.

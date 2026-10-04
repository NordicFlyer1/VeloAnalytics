# VeloAnalytics Methodology & Scientific Foundation

## Overview
VeloAnalytics is built on the principle of **algorithmic transparency**. Unlike many proprietary cycling platforms that treat performance metrics as "black boxes," VeloAnalytics utilizes open-source, peer-reviewed models. This ensures that your data is analyzed using consistent, scientifically validated methods that you can inspect and verify.

---

## Core Metrics

### 1. Critical Power (CP)
**Concept**: The highest power output an athlete can maintain in a quasi-steady state without fatiguing for a long duration.
**Calculation**: VeloAnalytics uses the **Monod and Scherrer 2-Parameter Linear Model**.
*   **Formula**: $Work (Joules) = (CP \times t) + W'$
*   **Implementation**: We perform a linear regression on your best efforts across multiple durations (typically 1m, 3m, 5m, 10m, and 20m) to find the slope of the Work-vs-Time line.

### 2. xPower (IsoPower)
**Concept**: An estimate of the power an athlete could have maintained for the same physiological cost if power had been perfectly constant.
**Calculation**:
1.  Apply a **25-second Exponentially Weighted Moving Average (EWMA)** to the raw power data. This reflects the ~25-30s half-life of physiological processes like oxygen kinetics.
2.  Raise each smoothed value to the **4th power** (reflecting the non-linear metabolic cost of intensity).
3.  Calculate the average of these 4th-power values.
4.  Take the **4th root** of that average.

### 3. Relative Intensity (RI)
**Concept**: A dimensionless number that quantifies the intensity of a ride relative to the athlete's current fitness level (CP). It tells you how "hard" the effort was on a scale of 0 to 1.0+.
*   **Formula**: $RI = xPower / CP$
*   **Interpretation**:
    *   **< 0.70**: Recovery or basic endurance.
    *   **0.75 - 0.85**: Steady state, tempo, or long-distance racing.
    *   **0.85 - 0.95**: High-intensity interval sessions or threshold efforts.
    *   **1.00+**: Maximum effort (typically only possible for durations up to ~60 minutes).
*   **Significance**: RI allows you to compare the intensity of different rides regardless of their duration or your changing fitness levels.

### 4. BikeScore™
**Concept**: A quantification of the total training dose of a session, accounting for both duration and intensity.
**Calculation**:
*   **Formula**: $BikeScore = \frac{t \times xPower \times RI}{CP \times 3600} \times 100$
*   **Substitution**: Since $RI = xPower / CP$, the formula can also be expressed as: $BikeScore = \frac{t \times RI^2}{3600} \times 100$ (where $t$ is duration in seconds).
*   **Insight**: Because RI is squared in the underlying math, BikeScore rewards intensity exponentially. Doubling your intensity (RI) results in 4x the stress score for the same duration.

### 5. Efficiency Factor (EF)
**Concept**: A measure of aerobic efficiency, representing the "output per beat" of the cardiovascular engine.
**Calculation**: $EF = xPower \div Average Heart Rate$
**Insight**: EF quantifies how much work (normalized as xPower) is produced for a given physiological cost (Heart Rate). An upward trend in EF over time on standardized steady-state efforts indicates improved aerobic conditioning and cardiovascular efficiency.

### 6. Performance Management (LTS, STS, SB)
**Concept**: Based on the **Banister Impulse-Response Model**, these metrics track the accumulation of training load and its effect on fitness and fatigue.
*   **LTS (Long Term Stress / Fitness)**: A 42-day exponentially weighted moving average of daily BikeScore.
*   **STS (Short Term Stress / Fatigue)**: A 7-day exponentially weighted moving average of daily BikeScore.
*   **SB (Stress Balance / Form)**: The difference between yesterday's LTS and yesterday's STS ($SB = LTS_{yest} - STS_{yest}$).

### 7. Fatigue-Adjusted W' Balance (W'bal)
**Concept**: A real-time model of your remaining anaerobic work capacity.
**Implementation**: VeloAnalytics uses a **Fatigue-Adjusted Skiba Model**. While the standard model uses a static recovery constant, VeloAnalytics accounts for parameter non-stationarity during long-duration activities:
1.  **Recovery Slowing**: The recovery time constant ($\tau$) is scaled by accumulated work ($kJ$). As you fatigue, $\tau$ increases (e.g., ~15% slower per 1000kJ), reflecting the physiological "sluggishness" of a fatigued system.
2.  **Capacity Decay**: The maximum anaerobic capacity ($W'$) is not treated as a static tank. The ceiling of the tank decays gradually based on cumulative work (e.g., ~5% per 1000kJ), acknowledging that you cannot reach 100% of your fresh $W'$ after several hours of riding.
3.  **Standard Model**: For shorter efforts, these adjustments are negligible, and the model behaves as the standard differential equation proposed by **Dr. Philip Skiba**.

### 8. Aerobic Decoupling (Pw:HR)
**Concept**: Measures the "drift" between Power and Heart Rate during a steady-state effort.
**Calculation**: The ratio of Average Power to Average Heart Rate in the first half of a ride compared to the second half. A drift > 5% may indicate aerobic fatigue or lack of cardiovascular conditioning.

### 9. Wellness & Physiological Recovery
**Concept**: Integrating life-stress and sleep data into performance analysis.
*   **Initial Readiness**: The standard readiness metric provided by source sensors (Garmin/Oura).
*   **Sleep Quality**: A multi-parametric index (0-100) combining duration, quality, and sleep architecture.
*   **Overnight HRV**: Measurement of the Root Mean Square of Successive Differences (RMSSD) between heartbeats. VeloAnalytics compares your nightly values against a rolling **7-day baseline**.

#### Garmin Connect Ingestion Architecture & Supported Formats
VeloAnalytics implements an automated multi-range ingestion pipeline that accepts official Sleep and HRV Status CSV exports from Garmin Connect. The engine dynamically identifies file format variations without requiring manual user configuration:
1.  **1-Day Vertical Key-Value Exports**: Contains granular single-night telemetry including overall Sleep Score, deep/light/REM sleep stages, resting heart rate, pulse oximetry (SpO₂ average and minimum), awake respiration rate, and overnight HRV status.
2.  **7-Day & 4-Week Tabular Exports**: Chronological daily rows recording continuous daily metrics (sleep scores, total sleep time, deep sleep percentages, awake times, and daily overnight HRV readings).
3.  **1-Year Macro Aggregates (Weekly Averages)**: Multi-month reporting where each entry represents a 7-day rolling period (e.g., `Aug 29 - Sep 4` or year-spanning periods like `Dec 27, 2025 - Jan 2, 2026`). The engine parses the date bounds and anchors the weekly aggregate values to the interval end-date, enabling long-term baseline history.
4.  **Non-Destructive Metric Merging**: Importing overlapping files merges data safely by date. Uploading a 1-year macro file establishes baseline continuity, while subsequent 1-day or 7-day uploads enrich existing dates with detailed factor data (e.g., SpO₂, respiration rate, bedtime/wake times) without overwriting them with blank values.
5.  **Robust Date Normalization**: All timestamps and date strings are standardized to ISO `YYYY-MM-DD`. Defensive parsing guards (`safeFormatDate`) prevent runtime exceptions in charts across legacy or cross-locale date strings.

### 10. Experimental Velo Readiness (Opt-in)
**Concept**: A hypothesized weighted algorithm designed to approximate aggregate physiological readiness by combining sleep quality, autonomic status, and chronic training load. Unlike standard linear averages, it uses **Non-Linear Multiplicative Inhibitors** to model fatigue correctly—preventing high scores in one area from masking critical deficits in another.

**Component Scoring**:
*   **Weighted Base**: $(Sleep \times 0.35) + (Recovery \times 0.25) + (HRV \times 0.20) + (Load \times 0.20)$
*   **Pillar Suppression**: The Weighted Base is modified by your weakest metric using a 30/70 mix: $Final = (Base \times 0.30) + (Base \times 0.70 \times \frac{WorstPillar}{100})$. This reflects "Veto Logic" where one failure point suppresses but doesn't completely erase success points.

**Multiplicative Inhibitors & Suppressors**:
To align with the "pessimistic" nature of human recovery (where one failure point often vetoes multiple successes), the algorithm applies:
*   **HRV Status Warning**: If overnight HRV is below your 7-day baseline minimum, it will likely act as the primary suppression pillar for the entire score.
*   **Sleep Debt Deduction**: If last night's sleep was less than 6 hours, a **flat 15-point deduction** is applied.
*   **Recovery Hard Caps**: 
    *   Estimated Recovery > 48h (Critical): Score compressed towards a floor of **25**.
    *   Estimated Recovery > 24h (Moderate): Score capped at **55**.
*   **ACWR Interpretation (Load Interpretation)**: If ACWR > 1.4, the score is capped at **40** to reflect heightened injury and overtraining risk.
*   **Relative Intensity Spike Suppression (Recovery Guard)**: Specifically adjusted for athletes in recovery (e.g., from illness), this rule monitors for acute inflammatory triggers. If a single session's BikeScore exceeds **5.0x your current CTL (lts)**, the Load Pillar is force-dropped to a "Red" status (0). This prevents high-load sessions from presentation as positive "readiness" markers during a vulnerable state.

*Note: This feature is experimental and must be enabled in Settings > Experimental.*

### 11. Health & Systemic Metrics (PulseOX & Respiration)
**Concept**: Tracking fundamental physiological indicators to detect early signs of illness, high-altitude adaptation, or systemic stress.
*   **PulseOX (Oxygen Saturation)**: Measures the percentage of oxygen-saturated hemoglobin in the blood. For athletes, significant deviations from personal baselines (typically 94-99% at sea level) can indicate respiratory issues, poor air quality, or overreaching.
*   **Respiration Rate**: Measured in breaths per minute (bpm). An elevated resting respiration rate is a reliable early indicator of sympathetic nervous system dominance, often preceding HRV drops during the onset of illness or overtraining.

### 12. Cycling Dynamics & Biomechanical Modeling
**Concept**: Comprehensive per-stroke biomechanical analysis, bilateral kinetic asymmetry, and pedal cleat pressure distribution derived from dual-sided pedal telemetry (Garmin Rally/Vector, Favero Assioma DUO/PRO).

#### 12.1 Three-Tier Synchronized Architecture
Following advanced biomechanical research and Garmin Connect's telemetry hierarchy, VeloAnalytics presents Cycling Dynamics across a coordinated, three-tier synchronized system:
1.  **Tier 1: Metric Analysis Timeline**: Continuous physiological and environmental time-series (Power, Cadence, Heart Rate, Speed, Elevation, Temperature) with unified cross-hair scrubbing.
2.  **Tier 2: Cycling Dynamics Timeline (`CyclingDynamicsCharts`)**: High-resolution continuous scatter streams strictly organized by canonical biomechanical hierarchy:
    *   *Left/Right Balance*: 0–100% distribution with a central 50/50 reference line.
    *   *Platform Center Offset (Left & Right)*: Cartesian scatter channels centered at 0 mm with whole-ride average benchmarks.
    *   *Power Phase Start & End*: Angular stroke sectors mapped against Top Dead Center (TDC 0°) and Bottom Dead Center (BDC 180°), with interactive toggles between Propulsive Drive angles and Peak Torque angles.
    *   *Rider Position*: Two-tier discrete telemetry tracking instantaneous seated versus standing transitions.
    *   *Torque Effectiveness & Pedal Smoothness*: Dual-sided pedaling efficiency percentages.
    *   *Controls & Formatting*: Features dynamic X-axis modes (**Time** vs. **Distance**), scatter dot color mapping (**Metric Colors** vs. **6-Zone Power Intensity Heatmap**), and the **30-Second Rolling Trend Baseline**.
3.  **Tier 3: Cycling Dynamics Biomechanical Overview (`CyclingDynamicsSection`)**: Structural polar vector dials and anatomical pedal models:
    *   *360° Circular Crank Dials*: Open-interior polar dials with cardinal clock references (TDC 0°, 90°, BDC 180°, 270°), Drive Start and Drive End degree badges, Peak Torque Range badges, and total propulsive Arc Span badges.
    *   *Anatomical Pedal PCO Graphics*: Spindle-oriented pedal diagrams with bilateral lateral force translation.
    *   *Position & Power Breakdown*: Aggregated seated vs. standing durations, percentages, and mean power output.
    *   *Max Avg Power Sliding Windows*: Dynamic filters isolating biomechanical execution during peak 5-second, 1-minute, 5-minute, and 20-minute mean maximal power intervals.
4.  **Global Scrubber Synchronization & State Locking**: A centralized root state (`activePoint` and `isPointLocked`) cross-wires all three tiers with the **GPS Activity Map**. Activating the **Lock Scrubber** control (or clicking any data point on any chart) freezes the timeline cursor at that exact second, switches the polar dials to single-stroke resolution, and pins the athlete's exact geographic coordinate on the route map.

#### 12.2 30-Second Rolling Trend Baseline Model
Individual pedal strokes exhibit natural stochastic variance due to road vibrations, micro-adjustments, and gear shifts. To isolate meaningful physiological and biomechanical trends from high-frequency scatter, VeloAnalytics provides an opt-in **30-Second Rolling Trend Baseline**:
$$\bar{X}_i = \frac{1}{W} \sum_{j = \max(0, i - \lfloor W/2 \rfloor)}^{\min(N-1, i + \lfloor W/2 \rfloor)} X_j \quad (W = 30\text{ seconds})$$
*   **Biomechanical Significance**: Superimposes smoothed, dashed trendlines across L/R Balance, Left/Right PCO, and Power Phase Start/End. This enables coaches and bike fitters to immediately detect progressive unilateral balance decay, gradual outward cleat drift, or delayed power phase engagement caused by neuromuscular fatigue during sustained threshold intervals.

#### 12.3 Instantaneous Live Stroke vs. Habitual Baseline Overlay
When scrubbing or locking onto any timestamp ($t$), the circular crank dials switch from whole-ride aggregates to **Live Stroke Mode**:
*   **Telemetry Banner**: A dedicated status capsule reports instantaneous telemetry: timestamp, mechanical power (W), pedaling cadence (RPM), and rider position (Seated/Standing).
*   **Polar Drive Arcs**: The solid bright arcs render the exact propulsive Power Phase and Peak Power Phase sectors executed during that specific crank revolution.
*   **Habitual Ride Baseline Overlay**: Simultaneously projects the athlete's entire-ride mean propulsive arc ($\bar{\theta}_{start}$ to $\bar{\theta}_{end}$) as a faint dashed circular baseline ($strokeDasharray="4\ 4"$) along the identical dial track. This allows immediate visual comparison between an intense transient effort (e.g., an 800W sprint) and the rider's habitual baseline pedaling signature.

#### 12.4 Platform Center Offset (PCO) & Anatomical Coordinate System
Platform Center Offset measures the lateral deviation of applied force relative to the geometric center of the pedal spindle (measured in millimeters, $mm$):
*   **Garmin Specification Compliance**:
    *   **Positive ($+$ mm)**: Force biased **Outboard** (laterally away from the bicycle frame center line).
    *   **Negative ($-$ mm)**: Force biased **Inboard** (medially toward the bicycle frame and crank arm).
*   **Anatomical Spindle Geometry**:
    *   *Left Pedal*: The pedal spindle connects to the left crank arm on the **right** side of the pedal body. Outboard ($+$) translates to the left ($-X$ in Cartesian space), while Inboard ($-$) translates to the right ($+X$).
    *   *Right Pedal*: The pedal spindle connects to the right crank arm on the **left** side of the pedal body. Inboard ($-$) translates to the left ($-X$ in Cartesian space), while Outboard ($+$) translates to the right ($+X$).
*   **Visual Safety Clamping**:
    $$PCO_{visual} = \max(-15, \min(15, PCO_{raw}))$$
    Restricts visual indicator translation to $\pm 15\text{ mm}$ to prevent rendering artifacts outside the physical SVG pedal body boundary during extreme force excursions, while preserving 100% numerical fidelity in the digital readout and timeline scatter plots. The neutral clinical target is $0 \pm 2\text{ mm}$.

#### 12.5 Angular Power Phase (PP) & Peak Power Phase (PPP)
*   **Power Phase (PP)**: The angular arc of the crank revolution (measured clockwise in degrees, $0^\circ-360^\circ$ relative to Top Dead Center at $0^\circ$) where positive propulsive drive torque is produced (typically $10^\circ-25^\circ$ to $200^\circ-220^\circ$).
*   **Peak Power Phase (PPP)**: The angular sector where the concentrated top 50% of propulsive drive torque is produced (typically $65^\circ-115^\circ$).

#### 12.6 Torque Effectiveness (TE) & Pedal Smoothness (PS)
*   **Torque Effectiveness (TE)**: Quantifies the ratio of propulsive torque to gross torque generated per revolution:
    $$TE = \frac{Torque_{positive} + Torque_{negative}}{Torque_{positive}} \times 100\%$$
    A value of 100% represents zero negative resistive drag from the unweighting leg on the backstroke.
*   **Pedal Smoothness (PS)**: Quantifies the mechanical uniformity of torque generation throughout the 360° circular rotation:
    $$PS = \frac{Power_{average}}{Power_{peak}} \times 100\%$$
    Typical road cyclists exhibit values between 15% and 25%.

#### 12.7 Conditional Visibility & Graceful Fallback
Cycling Dynamics requires dual-sided pedal telemetry. When a ride is recorded using single-sided meters or indoor smart trainers, the parser sets `hasDynamics = false`, preserving an uncluttered interface by leaving dynamics charts and lanes unrendered.

---

## Attributions & Legal Notes

### Scientific Credit
*   **Dr. Philip Friere Skiba (PhysFarm)**: Developer of the **BikeScore™**, **xPower**, and **W' Balance** algorithms. His work provided the foundation for transparent, power-based training stress analysis.
*   **Dr. Eric Banister**: Developed the original **TRIMP** (Training Impulse) model in the 1970s, which is the mathematical ancestor of all modern training load metrics.
*   **Monod and Scherrer**: Proposed the original **Critical Power** model in 1960.
*   **Dr. Andrew Coggan**: Developed the original TSS®, NP®, and IF® metrics. While VeloAnalytics uses open-source alternatives (BikeScore/xPower), Dr. Coggan's work was instrumental in popularizing power-based training analysis.

### Open Source Heritage
VeloAnalytics acknowledges the **GoldenCheetah** project for its leadership in implementing these metrics in the open-source domain and providing a standard for terminology and calculation logic.

---

## Technical Implementation
The source code for these calculations can be found in `src/services/metrics.ts`. All calculations are performed locally in your browser; your raw power data is never uploaded to a server.

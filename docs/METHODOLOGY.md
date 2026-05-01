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

### 3. BikeScore™
**Concept**: A quantification of the total training dose of a session, accounting for both duration and intensity.
**Calculation**:
*   **Formula**: $BikeScore = \frac{t \times xPower \times RI}{CP \times 3600} \times 100$
*   **Relative Intensity (RI)**: The ratio of xPower to Critical Power ($RI = xPower / CP$).

### 4. Performance Management (LTS, STS, SB)
**Concept**: Based on the **Banister Impulse-Response Model**, these metrics track the accumulation of training load and its effect on fitness and fatigue.
*   **LTS (Long Term Stress / Fitness)**: A 42-day exponentially weighted moving average of daily BikeScore.
*   **STS (Short Term Stress / Fatigue)**: A 7-day exponentially weighted moving average of daily BikeScore.
*   **SB (Stress Balance / Form)**: The difference between yesterday's LTS and yesterday's STS ($SB = LTS_{yest} - STS_{yest}$).

### 5. Fatigue-Adjusted W' Balance (W'bal)
**Concept**: A real-time model of your remaining anaerobic work capacity.
**Implementation**: VeloAnalytics uses a **Fatigue-Adjusted Skiba Model**. While the standard model uses a static recovery constant, VeloAnalytics accounts for parameter non-stationarity during long-duration activities:
1.  **Recovery Slowing**: The recovery time constant ($\tau$) is scaled by accumulated work ($kJ$). As you fatigue, $\tau$ increases (e.g., ~15% slower per 1000kJ), reflecting the physiological "sluggishness" of a fatigued system.
2.  **Capacity Decay**: The maximum anaerobic capacity ($W'$) is not treated as a static tank. The ceiling of the tank decays gradually based on cumulative work (e.g., ~5% per 1000kJ), acknowledging that you cannot reach 100% of your fresh $W'$ after several hours of riding.
3.  **Standard Model**: For shorter efforts, these adjustments are negligible, and the model behaves as the standard differential equation proposed by **Dr. Philip Skiba**.

### 6. Aerobic Decoupling (Pw:HR)
**Concept**: Measures the "drift" between Power and Heart Rate during a steady-state effort.
**Calculation**: The ratio of Average Power to Average Heart Rate in the first half of a ride compared to the second half. A drift > 5% may indicate aerobic fatigue or lack of cardiovascular conditioning.

### 7. Wellness & Physiological Recovery
**Concept**: Integrating life-stress and sleep data into performance analysis.
*   **Sleep Quality**: A multi-parametric index (0-100) combining duration, quality, and sleep architecture. VeloAnalytics uses this to weight the "readiness" insights from the Velo Coach.
*   **Overnight HRV**: Measurement of the Root Mean Square of Successive Differences (RMSSD) between heartbeats. VeloAnalytics compares your nightly values against a rolling **7-day baseline**. Persistent values below the 25th percentile of the baseline indicate a state of high physiological strain.

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

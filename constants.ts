
export const CARNIVORE_HOUSE_MANUAL = `
Carnivore House USDA FSIS Regulatory Framework and Compliance Reference Manual Version 1.0
I. Introduction
Primary Regulatory Authorities: 9 CFR Part 417 (HACCP), 9 CFR Part 416 (Sanitation), FSIS Directives 5000.1, 5000.6.

II. 9 CFR Part 417 – HACCP Systems
A. Authority: Establishments must conduct hazard analysis, monitor CCPs, and maintain records.
B. 417.1 – Hazard Analysis: Determine hazards likely to occur (Biological, Chemical, Physical).
C. 417.2 – HACCP Plan Requirements: Must include CCPs, Critical Limits (e.g., Raw Intact Product Temp ≤ 45°F), monitoring, and verification.
D. 417.3 – Corrective Actions: When deviation occurs: 
   417.3(a): Corrective actions must describe: 1) Cause identified and eliminated; 2) CCP under control; 3) Recurrence prevented; 4) No adulterated product enters commerce.
   417.3(b): For unforeseen deviations, reassess the HACCP plan.
E. 417.4 – Verification: Validation, ongoing verification (Direct Observation, Records Review), annual reassessment.
F. 417.5 – Records: Must include date, time, signature/initials, product identity, and lot code.

IV. FSIS Directives
A. Directive 5000.1: Enforcement and Noncompliance Records (NRs). Establishing compliance through 417.3 is mandatory for NR responses.
`;

export const SYSTEM_INSTRUCTION = `
You are the Carnivore House USDA Compliance Specialist. You are professional, strict, and regulatory-focused.

CORE RULES:
1. ONLY reference the "Carnivore House Manual V1.0".
2. EVERY regulatory statement or requirement MUST include a citation: [Document Name, Section Number].
3. For NR RESPONSE MODE:
   - Extract structured data from NR text.
   - Show numeric deviation calculation explicitly (e.g., "Actual 5h17m - Limit 5h = 17m deviation").
   - Draft a compliant response using 9 CFR 417.3 logic.
   - Be formal, technical, and audit-defensible.
   - Do not speculate or provide loose summaries.
4. MANDATE CCP IB Limit: Product temperature must be ≤ 45°F. 
5. DEVIATION FLOW: If temp > 45.0°F, you MUST cite [Carnivore House Manual, Section II-D] and 417.3.
`;

export const APP_MODELS = {
  CHAT: 'gemini-3-flash-preview',
  ANALYSIS: 'gemini-3-pro-preview',
  NR_TOOL: 'gemini-3-pro-preview'
};

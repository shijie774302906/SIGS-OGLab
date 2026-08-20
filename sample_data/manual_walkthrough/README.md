# Manual CPTU Walkthrough Sample

Use these files when manually testing the app from a fresh project.

Recommended manual flow:

1. Create a new project in the app.
2. Import `manual_cptu_alpha.csv`.
3. Run data check.
4. Run first-pass interpretation.
5. Save parameter interpretation.
6. Open output/export page and check export readiness.
7. Optionally import `manual_cptu_beta.csv` into the same project to test a second point.

Notes:

- Each CSV is one CPTU point with strictly increasing depth.
- The files include `Qc`, `Qt`, `Fs`, `U2`, `Fr`, `WaterDepthM`, and `FinalDepthM`.
- Do not merge the two files into one CSV for this manual test; import them one by one.

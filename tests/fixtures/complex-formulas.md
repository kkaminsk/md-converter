---
format: xlsx
title: "Complex Formulas Test"
---

# Complex Formulas

## Financial Data

| Description | Q1 | Q2 | Q3 | Q4 | Annual |
|-------------|-----|-----|-----|-----|--------|
| Revenue | 10000 | 12000 | 15000 | 18000 | {=SUM(B2:E2)} |
| Costs | 7000 | 8000 | 9000 | 10000 | {=SUM(B3:E3)} |
| Profit | {=B2-B3} | {=C2-C3} | {=D2-D3} | {=E2-E3} | {=SUM(B4:E4)} |
| Margin | {=B4/B2*100} | {=C4/C2*100} | {=D4/D2*100} | {=E4/E2*100} | {=AVERAGE(B5:E5)} |

## Nested Functions

| Value | Rounded | Absolute | Conditional |
|-------|---------|----------|-------------|
| -123.456 | {=ROUND(B2,2)} | {=ABS(B2)} | {=IF(B2<0,"Negative","Positive")} |
| 987.654 | {=ROUND(B3,2)} | {=ABS(B3)} | {=IF(B3<0,"Negative","Positive")} |

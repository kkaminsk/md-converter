---
format: xlsx
title: "Test Spreadsheet"
author: "Test Author"
date: "2025-01-28"
---

# Test Spreadsheet

## Sales Data

| Item | Quantity | Price | Total |
|------|----------|-------|-------|
| Widget | 10 | 25.00 | {=B2*C2} |
| Gadget | 5 | 50.00 | {=B3*C3} |
| **Total** | {=SUM(B2:B3)} | | {=SUM(D2:D3)} |

## Inventory

| Product | Stock | Reorder Level | Status |
|---------|-------|---------------|--------|
| Widget | 100 | 20 | OK |
| Gadget | 15 | 25 | Low |

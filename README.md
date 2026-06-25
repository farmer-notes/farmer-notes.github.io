# Farmer Notes

Personal airdrop farming journal for my own tracking, review, and weekly decision-making.

The first notebook follows my AFX Season 1 farming process. It keeps notes about assumptions, costs, estimated points, model changes, and lessons learned while I am actually farming.

This is a personal log, not an official AFX calculator, investment research product, or financial advice. Notes are meant for review and transparency around my own process.

## What This Site Is

- A place to record my farming assumptions before and after weekly settlement.
- A lightweight calculator for checking possible points, costs, and scenario returns.
- A running changelog of model updates, mistakes, and lessons.
- A public notebook I can revisit later when comparing farming campaigns.

## Current Notebook

```text
Project: AFX Season 1
Status: Live farming
Notebook scope: Weekly assumptions, estimated points, costs, model changes, and notes
```

## Model Notes

The planner estimates weekly points from:

```text
trading activity
ALP deposit and hold days
guild / team participation
referral activity
```

Current coefficient assumptions:

```text
trading points coefficient = 2.3 estimated points per $1k weekly trading volume
ALP points coefficient = 0.013 estimated points per $1 ALP deposit for a full-week hold
weekly team / guild pool points ~= 114,286
```

These are planning assumptions based on observed settlement data and public campaign information. They are not official conversion rates.

## Scenario Assumptions

AFX tokenomics and farmer allocation have not been announced. For now, the model uses Hyperliquid's public genesis farmer allocation as a proxy:

```text
farmer allocation proxy = 31%
estimated total points across three seasons = 10,000,000
```

This proxy will be replaced if AFX publishes official tokenomics or allocation details.

## Local Development

```bash
npm install
npm test
npm run dev
```

## Build

```bash
npm run build
```

This is a Vite static site intended for the GitHub Pages user site repo `farmer-notes.github.io`.

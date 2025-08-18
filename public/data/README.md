# Data Directory

This directory contains pre-processed static data from Google Sheets that is updated daily via GitHub Actions.

## Files

- `index.json` - Metadata about available datasets and last update time
- `*.json` - Individual dataset files for each endpoint

## Data Sources

The data is fetched from the following endpoints:
- `campWinStats` - Camp win statistics
- `harvestStats` - Harvest statistics
- `gameDurationAnalysis` - Game duration analysis
- `playerStats` - General player statistics  
- `playerPairingStats` - Player pairing statistics
- `playerCampPerformance` - Player performance by camp

## Usage

These files are served directly by the frontend application as static JSON files, reducing API calls and improving performance.

## Update Schedule

Data is automatically updated daily at 6 AM UTC via GitHub Actions workflow.

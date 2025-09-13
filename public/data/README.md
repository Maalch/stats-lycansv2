# Data Directory

This directory contains pre-processed static data from Google Sheets that is updated daily via GitHub Actions.

## Files

- `index.json` - Metadata about available datasets and last update time
- `*.json` - Individual dataset files for each endpoint

## Data Sources

The data is fetched from the following endpoints:
- `gameLog` - Game raw data in the new format (mapping the mod automatic log for Legacy data)
- `rawGameData` - Game raw data
- `rawPonceData` - Specific data sheet about Ponce actions
- `rawRoleData` - Role raw data
- `rawBRData` - Battle Royal raw data

## Usage

These files are served directly by the frontend application as static JSON files, reducing API calls and improving performance.

## Update Schedule

Data is automatically updated daily at 6 AM UTC via GitHub Actions workflow.

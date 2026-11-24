# Data Directory

This directory contains pre-processed static data from Google Sheets that is updated daily via GitHub Actions.

## Files

- `index.json` - Metadata about available datasets and last update time
- `*.json` - Individual dataset files for each endpoint

## Data Sources

The data is fetched from the following endpoints:
- `gameLog` - Game raw data in the new format (mapping the mod automatic log for Legacy data)
- `rawBRData` - Battle Royal raw data

## Usage

These files are served directly by the frontend application as static JSON files, reducing API calls and improving performance.

### Game reference

`gameReference.json` is the manually maintained source for the in-app game reference.
Game rules are rendered from `gameRules` in both the hierarchical and list views;
rules with `campSpecific` appear under their camp in the hierarchical view.
Gadget gas types can include a `description`, which is displayed and searchable.

After editing the reference, run `npm run copy-data-dev` to refresh an already-running
development server's data. `npm run dev` also refreshes it at startup.
`npm run build` refreshes the production data in `docs/data`.

## Update Schedule

Data is automatically updated via GitHub Actions workflow.

# Stats Lycans

Stats Lycans is a web application built with React and TypeScript (using Vite) designed to visualize key performance indicators (KPIs) and statistics sourced from a Google Sheet maintained by SoldatFlippy and AmberAerin. The application is optimized for deployment via GitHub Pages, with all production assets output to the `docs` directory.

## Table of Contents

- [Purpose](#purpose)
- [Features](#features)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Development](#development)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## Purpose

The primary goal of Stats Lycans is to provide a clear and interactive view of statistics and KPIs sourced from a collaborative Google Sheet. It is intended for communities or teams that need to monitor and visualize data efficiently.

## Features

- **KPI Dashboard:** Dynamic display of key statistics.
- **Google Sheets Integration:** Fetches live data from Google Sheets using the Google Sheets API or Google Apps Script.
- **Interactive Charts & Tables:** Visualization of data with modern JavaScript charting libraries.
- **Fast & Lightweight:** Built with Vite for rapid development and optimized builds.
- **GitHub Pages Ready:** Seamless deployment to GitHub Pages.

## Architecture

- **Frontend:** React + TypeScript (Vite)
- **Data Source:** Google Sheets (via Google Sheets API or Apps Script as backend)
- **Deployment:** Static site hosted on GitHub Pages (`docs` directory)

## Setup & Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Maalch/stats-lycansv2.git
   cd stats-lycansv2
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure Google Sheets API:**
   - Set up credentials and permissions in the Google Cloud Console.
   - Update the environment variables or configuration files as required to enable API access.

## Development

- `npm run dev` — Start the local development server.
- `npm run build` — Build the app for production (outputs to `docs`).
- `npm run preview` — Preview the production build locally.

## Deployment

- Production builds are output to the `docs` folder.
- In your GitHub repository settings, configure GitHub Pages to serve from the `/docs` directory on the `main` branch.

## Configuration

You can further enhance code quality by using recommended ESLint plugins:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues) or open a pull request.

## Acknowledgements

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## License

Distributed under the MIT License. See `LICENSE` for more information.

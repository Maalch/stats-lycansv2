# Stats Lycans

This project is a React + TypeScript app created with Vite, configured for deployment to GitHub Pages (output in the `docs` folder).

## Purpose

The goal of this project is to display KPIs and visual statistics from a Google Sheet from SoldatFlippy (located in Google Drive), using the Google Sheets API or Google Apps Script as the data source.

## Deployment

- The app is configured to output the production build to the `docs` folder for GitHub Pages compatibility.
- Update your GitHub repository settings to serve the site from the `docs` folder.

## Development

- `npm run dev` — Start the development server
- `npm run build` — Build the app for production (output to `docs`)
- `npm run preview` — Preview the production build

## Next Steps

1. Set up access to your Google Sheet using the Google Sheets API or Google Apps Script.
2. Implement components to fetch and display KPIs and statistics from the sheet.
3. Add visualizations (charts, tables, etc.) as needed.

---

This project was bootstrapped with [Vite](https://vitejs.dev/) and uses [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/).

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

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

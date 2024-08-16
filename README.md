# WebRTC front-end with react + ts

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

## How to create app?
### Initialize React app with ts + tailwind css
- Initialize app using the following CLI
```sh
npm create vite@latest my-react-app -- --template react-ts
```
- Add tailwind css using the following CLI
```sh
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
- Add tailwind config: [Reference](https://tailwindcss.com/docs/installation)

### Install dependancies
  |name|version|description|
  |---|---|-|
  |node|20 |dependencies are based on this version of node|
  |Sass|1.77||
  |||


## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

export default [
  {
    files: ["src/**/*.jsx", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly", document: "readonly", navigator: "readonly",
        localStorage: "readonly", console: "readonly", fetch: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly",
        clearInterval: "readonly", Intl: "readonly", URLSearchParams: "readonly",
        alert: "readonly", location: "readonly", history: "readonly",
        createImageBitmap: "readonly", FileReader: "readonly", Blob: "readonly",
      },
    },
    rules: { "no-undef": "error" },
  },
];
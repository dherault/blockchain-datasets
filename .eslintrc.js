module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
  },
  extends: [
    'dherault',
  ],
  parser: 'babel-eslint',
  rules: {
    'import/no-extraneous-dependencies': 'off',
  },
}

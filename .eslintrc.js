module.exports = {
  env: {
    browser: false,
    node: true,
  },
  extends: [
    'dherault',
  ],
  rules: {
    'import/no-extraneous-dependencies': 'off',
  },
}

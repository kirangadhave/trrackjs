module.exports = {
  '*.{js,jsx,ts,tsx,json,html,css}': [
    'biome check --write --no-errors-on-unmatched',
  ],
};

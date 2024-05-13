module.exports = {
  'packages/**/*.{js,jsx,ts,tsx,json,html,css,scss}': [
    'nx affected -t lint --uncommitted --fix=true',
    // 'nx affected:test --uncommitted',
    'nx format:write --uncommitted',
  ],
};

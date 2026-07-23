const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  "registerType: 'autoUpdate',",
  "registerType: 'autoUpdate',\n        devOptions: {\n          enabled: true\n        },"
);

fs.writeFileSync('vite.config.ts', code);
console.log('patched vite config for dev PWA');

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<div className="px-6 py-8 md:px-10 flex-1 overflow-y-auto">/,
  '<div className="px-4 py-6 sm:px-6 sm:py-8 md:px-10 flex-1 overflow-y-auto">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched history list');

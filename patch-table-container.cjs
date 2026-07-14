const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<section className="flex-1 px-6 pb-10 md:px-10 flex flex-col min-h-0">/,
  '<section className="flex-1 px-4 pb-6 sm:px-6 sm:pb-10 md:px-10 flex flex-col min-h-0">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched table container');

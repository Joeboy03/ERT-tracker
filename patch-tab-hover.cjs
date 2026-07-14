const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /'text-slate-500 hover:text-slate-700'/g,
  "'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched tab hover');

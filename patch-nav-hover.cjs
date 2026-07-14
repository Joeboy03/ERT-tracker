const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /hover:text-slate-800 dark:text-slate-100/g,
  'hover:text-slate-800 dark:hover:text-slate-100'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched nav hover');

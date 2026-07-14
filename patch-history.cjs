const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<div className="px-6 py-8 md:px-10">/,
  '<div className="px-4 py-6 sm:px-6 sm:py-8 md:px-10">'
);

code = code.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">/,
  '<div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">'
);

code = code.replace(
  /<div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">/g,
  '<div className="bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched history');

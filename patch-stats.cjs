const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Section grid
code = code.replace(
  /<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6 py-8 md:px-10">/,
  '<section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-4 py-4 sm:px-6 sm:py-8 md:px-10">'
);

// 2. Adjust paddings and fonts in stat cards
// card 1
code = code.replace(
  /<div className="stat-card bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">/,
  '<div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">'
);
// card 2
code = code.replace(
  /<div className="stat-card bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">/,
  '<div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">'
);
// card 3
code = code.replace(
  /<div className="stat-card bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">/g,
  '<div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">'
);
// card 4
code = code.replace(
  /<div className="stat-card bg-slate-50 dark:bg-slate-800\/50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-\[\#f5f3ff\] relative group">/,
  '<div className="stat-card bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-[#f5f3ff] relative group">'
);

// Replace 3xl with 2xl sm:text-3xl
code = code.replace(/text-3xl font-bold/g, 'text-2xl sm:text-3xl font-bold');

fs.writeFileSync('src/App.tsx', code);
console.log('patched stats');

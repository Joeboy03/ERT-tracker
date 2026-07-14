const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-6 md:px-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">/g,
  '<header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6 sm:py-6 md:px-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">'
);

code = code.replace(
  /<div className="flex flex-col lg:flex-row gap-6 px-6 pb-12 md:px-10">/g,
  '<div className="flex flex-col lg:flex-row gap-4 sm:gap-6 px-4 sm:px-6 pb-12 md:px-10">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched padding');

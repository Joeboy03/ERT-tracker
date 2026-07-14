const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="text-xs font-semibold bg-slate-50 dark:bg-slate-800\/50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-\[\#6366f1\]"/g,
  'className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:border-[#6366f1]"'
);

code = code.replace(
  /className="text-xs font-semibold bg-slate-50 dark:bg-slate-800\/50 border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-\[\#6366f1\] text-slate-600 dark:text-slate-400"/g,
  'className="text-xs font-semibold bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none focus:border-[#6366f1] text-slate-600 dark:text-slate-300"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched date and select');

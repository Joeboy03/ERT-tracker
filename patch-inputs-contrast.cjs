const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix numbers
code = code.replace(
  /className="w-full bg-slate-50 dark:bg-slate-800\/50 border-2 border-slate-200 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 focus:outline-none focus:border-\[\#6366f1\] transition-all"/g,
  'className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all"'
);
code = code.replace(
  /className="w-full bg-slate-50 dark:bg-slate-800\/50 border-2 border-slate-200 rounded-xl px-4 py-2 text-md font-bold text-slate-900 focus:outline-none focus:border-\[\#6366f1\] transition-all"/g,
  'className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-md font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all"'
);

// Fix text input
code = code.replace(
  /className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-\[\#6366f1\]"/g,
  'className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1]"'
);

// Fix textarea
code = code.replace(
  /className="w-full h-80 bg-slate-50 dark:bg-slate-800\/50 border-2 border-slate-200 rounded-xl px-5 py-4 text-sm font-mono text-slate-900 focus:outline-none focus:border-\[\#6366f1\] transition-all resize-none"/g,
  'className="w-full h-80 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#6366f1] transition-all resize-none"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched input contrasts');

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="flex-1 bg-white dark:bg-slate-900\/10 border-2 border-white\/20 rounded-xl px-5 py-4 text-white placeholder:text-white\/40 focus:outline-none focus:border-white transition-all text-sm font-medium"/g,
  'className="flex-1 bg-white dark:bg-slate-900/10 border-2 border-white/20 rounded-xl px-4 py-3 md:px-5 md:py-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-all text-sm font-medium"'
);

code = code.replace(
  /className="flex-\[2\] bg-white dark:bg-slate-900 border-2 border-white rounded-xl px-5 py-4 text-2xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:border-\[\#4f46e5\] transition-all"/g,
  'className="flex-[2] bg-white dark:bg-slate-900 border-2 border-white rounded-xl px-4 py-3 md:px-5 md:py-4 text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:border-[#4f46e5] transition-all"'
);

code = code.replace(
  /className="bg-white dark:bg-slate-900 text-\[\#6366f1\] font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-\[1.02\] active:scale-\[0.98\] transition-all flex items-center justify-center md:justify-start gap-2"/g,
  'className="bg-white dark:bg-slate-900 text-[#6366f1] font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center md:justify-start gap-2"'
);

// Ah, wait, the button class doesn't have justify-center md:justify-start in my grep
code = code.replace(
  /className="bg-white dark:bg-slate-900 text-\[\#6366f1\] font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-\[1.02\] active:scale-\[0.98\] transition-all flex items-center gap-2"/g,
  'className="bg-white dark:bg-slate-900 text-[#6366f1] font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center md:justify-start gap-2"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched inputs');

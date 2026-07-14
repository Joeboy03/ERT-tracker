const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="text-xs text-\[\#10b981\] hover:underline/g,
  'className="text-xs text-[#10b981] dark:text-[#34d399] hover:underline'
);
code = code.replace(
  /className="stat-value text-2xl sm:text-3xl font-bold text-\[\#10b981\]"/g,
  'className="stat-value text-2xl sm:text-3xl font-bold text-[#10b981] dark:text-[#34d399]"'
);
code = code.replace(
  /'bg-white dark:bg-slate-900 shadow-sm text-\[\#10b981\]'/g,
  "'bg-white dark:bg-slate-900 shadow-sm text-[#10b981] dark:text-[#34d399]'"
);
code = code.replace(
  /className="text-\[\#10b981\] text-xs font-bold uppercase tracking-wider mb-1"/g,
  'className="text-[#10b981] dark:text-[#34d399] text-xs font-bold uppercase tracking-wider mb-1"'
);
code = code.replace(
  /hover:text-\[\#10b981\] hover:border-\[\#10b981\]/g,
  'hover:text-[#10b981] dark:hover:text-[#34d399] hover:border-[#10b981] dark:hover:border-[#34d399]'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched emerald text');

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-\[\#fef2f2\] border border-\[\#fee2e2\] rounded-lg text-sm font-semibold text-\[\#dc2626\] hover:bg-\[\#fee2e2\] transition-all"/g,
  'className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fef2f2] dark:bg-red-500/10 border border-[#fee2e2] dark:border-red-500/20 rounded-lg text-sm font-semibold text-[#dc2626] dark:text-red-400 hover:bg-[#fee2e2] dark:hover:bg-red-500/20 transition-all"'
);

code = code.replace(
  /className="p-2.5 bg-red-50 text-\[\#dc2626\] rounded-lg hover:bg-red-100 transition-all"/g,
  'className="p-2.5 bg-red-50 dark:bg-red-500/10 text-[#dc2626] dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"'
);

code = code.replace(
  /className="flex items-center gap-2 px-4 py-2 bg-red-50 text-\[\#dc2626\] hover:bg-\[\#dc2626\] hover:text-white rounded-lg text-xs font-bold transition-all border border-\[\#fee2e2\]"/g,
  'className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 text-[#dc2626] dark:text-red-400 hover:bg-[#dc2626] dark:hover:bg-red-500 hover:text-white dark:hover:text-white rounded-lg text-xs font-bold transition-all border border-[#fee2e2] dark:border-red-500/20"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched red buttons');

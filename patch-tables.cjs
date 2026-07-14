const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/className="px-8 py-4 w-24"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-12 sm:w-24"');
code = code.replace(/className="px-8 py-4 w-32"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-20 sm:w-32"');
code = code.replace(/className="px-8 py-4 w-20 text-right"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 w-16 sm:w-20 text-right"');
code = code.replace(/className="px-8 py-4"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4"');
code = code.replace(/className="px-8 py-4 text-slate-500 dark:text-slate-400 font-medium"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-500 dark:text-slate-400 font-medium"');
code = code.replace(/className="px-8 py-4 text-slate-800 dark:text-slate-100 font-semibold"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-800 dark:text-slate-100 font-semibold"');
code = code.replace(/className="px-8 py-4 text-slate-800 dark:text-slate-100 font-medium opacity-70"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-slate-800 dark:text-slate-100 font-medium opacity-70"');
code = code.replace(/className="px-8 py-4 text-right"/g, 'className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 text-right"');

fs.writeFileSync('src/App.tsx', code);
console.log('patched tables');

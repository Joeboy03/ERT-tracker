const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">\s*<div className="stat-label text-\[10px\] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">In Hours<\/div>\s*<div className="stat-value text-2xl sm:text-3xl font-bold text-\[\#6366f1\] dark:text-\[\#818cf8\]">\s*\{hours\}h \{mins\}m\s*<\/div>\s*<div className="stat-sub text-xs text-slate-400 dark:text-slate-500 mt-1 italic">Equivalent Time<\/div>\s*<\/div>/,
  `<div className="stat-card bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
    <div className="stat-label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Period Total Hours</div>
    <div className="stat-value text-2xl sm:text-3xl font-bold text-[#6366f1] dark:text-[#818cf8]">
      {Math.floor(paymentStats.hoursTotal)}h {Math.round((paymentStats.hoursTotal % 1) * 60)}m
    </div>
    <div className="flex justify-between items-center mt-2">
      <span className="stat-sub text-xs text-slate-400 dark:text-slate-500 italic">Target: 40h</span>
      <span className="text-[10px] font-bold text-[#6366f1]">{Math.round(Math.min((paymentStats.hoursTotal / 40) * 100, 100))}%</span>
    </div>
  </div>`
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched stats widget');

const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace arbitrary colors with slate classes and dark mode equivalents
const replacements = [
  { from: /bg-\[\#f8fafc\]/g, to: 'bg-slate-50 dark:bg-slate-950' },
  { from: /bg-white/g, to: 'bg-white dark:bg-slate-900' },
  { from: /border-\[\#e2e8f0\]/g, to: 'border-slate-200 dark:border-slate-800' },
  { from: /border-\[\#cbd5e1\]/g, to: 'border-slate-300 dark:border-slate-700' },
  { from: /text-\[\#0f172a\]/g, to: 'text-slate-900 dark:text-slate-50' },
  { from: /text-\[\#1e293b\]/g, to: 'text-slate-800 dark:text-slate-100' },
  { from: /text-\[\#334155\]/g, to: 'text-slate-700 dark:text-slate-300' },
  { from: /text-\[\#475569\]/g, to: 'text-slate-600 dark:text-slate-400' },
  { from: /text-\[\#64748b\]/g, to: 'text-slate-500 dark:text-slate-400' },
  { from: /text-\[\#94a3b8\]/g, to: 'text-slate-400 dark:text-slate-500' },
  { from: /text-\[\#cbd5e1\]/g, to: 'text-slate-300 dark:text-slate-600' },
  { from: /bg-\[\#f1f5f9\]/g, to: 'bg-slate-100 dark:bg-slate-800' },
  { from: /hover:bg-\[\#f1f5f9\]/g, to: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
  { from: /bg-slate-50/g, to: 'bg-slate-50 dark:bg-slate-800/50' },
  { from: /hover:bg-slate-50/g, to: 'hover:bg-slate-50 dark:hover:bg-slate-800/50' },
  { from: /bg-gray-50/g, to: 'bg-gray-50 dark:bg-slate-800/50' },
  { from: /hover:bg-gray-50/g, to: 'hover:bg-gray-50 dark:hover:bg-slate-800/50' },
  { from: /bg-gray-100/g, to: 'bg-gray-100 dark:bg-slate-800' },
  { from: /border-gray-200/g, to: 'border-gray-200 dark:border-slate-800' },
  { from: /text-gray-900/g, to: 'text-gray-900 dark:text-slate-50' },
  { from: /text-gray-800/g, to: 'text-gray-800 dark:text-slate-100' },
  { from: /text-gray-700/g, to: 'text-gray-700 dark:text-slate-300' },
  { from: /text-gray-600/g, to: 'text-gray-600 dark:text-slate-400' },
  { from: /text-gray-500/g, to: 'text-gray-500 dark:text-slate-400' },
  { from: /text-black/g, to: 'text-black dark:text-white' },
];

for (const { from, to } of replacements) {
  content = content.replace(from, to);
}

fs.writeFileSync('src/App.tsx', content);
console.log('Replacements done.');

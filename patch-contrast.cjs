const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix input card
code = code.replace(
  /'bg-white dark:bg-slate-900 text-\[\#6366f1\]' : 'bg-white dark:bg-slate-900\/10 text-white\/60 hover:bg-white dark:bg-slate-900\/20'/g,
  "'bg-white text-[#6366f1]' : 'bg-white/10 text-white/60 hover:bg-white/20'"
);
code = code.replace(
  /bg-white dark:bg-slate-900\/20 text-white\/90 hover:bg-white dark:bg-slate-900\/40/g,
  "bg-white/20 text-white/90 hover:bg-white/30"
);
code = code.replace(
  /bg-white dark:bg-slate-900\/10 border-2 border-white\/20/g,
  "bg-white/10 border-2 border-white/20"
);
code = code.replace(
  /bg-white dark:bg-slate-900 text-\[\#6366f1\] font-bold px-6 py-3 md:px-8 md:py-4/g,
  "bg-white text-[#6366f1] font-bold px-6 py-3 md:px-8 md:py-4"
);

// We need to fix the ERT input.
// <input ref={inputRef} ... className="flex-[2] bg-white dark:bg-slate-900 border-2 border-white ... text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500
code = code.replace(
  /className="flex-\[2\] bg-white dark:bg-slate-900 border-2 border-white rounded-xl px-4 py-3 md:px-5 md:py-4 text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:border-\[\#4f46e5\] transition-all"/g,
  'className="flex-[2] bg-white border-2 border-white rounded-xl px-4 py-3 md:px-5 md:py-4 text-xl md:text-2xl font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-white transition-all"'
);

// Fix headers that are missing dark variants
code = code.replace(
  /<h3 className="text-xl font-bold text-slate-800">Authentication Error<\/h3>/g,
  '<h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Authentication Error</h3>'
);
code = code.replace(
  /<h3 className="text-xl font-bold text-slate-900">Account Settings<\/h3>/g,
  '<h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Account Settings</h3>'
);
code = code.replace(
  /<h3 className="text-sm font-bold text-slate-800">\{monthName\}<\/h3>/g,
  '<h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{monthName}</h3>'
);

// Fix Close buttons in green/indigo headers
code = code.replace(
  /className="p-2 hover:bg-white dark:bg-slate-900\/10 rounded-full transition-colors"/g,
  'className="p-2 hover:bg-black/10 rounded-full transition-colors"'
);

// Fix the category list inside the manage modal:
// <div className="flex-1 bg-white dark:bg-slate-900 border border-[#6366f1] rounded-lg px-3 py-1 text-sm outline-none"
code = code.replace(
  /className="flex-1 bg-white dark:bg-slate-900 border border-\[\#6366f1\] rounded-lg px-3 py-1 text-sm outline-none"/g,
  'className="flex-1 bg-white dark:bg-slate-950 border border-[#6366f1] rounded-lg px-3 py-1 text-sm outline-none text-slate-900 dark:text-slate-100"'
);
code = code.replace(
  /className="p-1.5 text-slate-400 hover:text-\[\#6366f1\] hover:bg-white dark:bg-slate-900 rounded-lg"/g,
  'className="p-1.5 text-slate-400 hover:text-[#6366f1] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"'
);
code = code.replace(
  /className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white dark:bg-slate-900 rounded-lg"/g,
  'className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"'
);
code = code.replace(
  /<span className="text-sm font-semibold text-slate-700">\{cat\}<\/span>/g,
  '<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat}</span>'
);

// Fix buttons inside modal
code = code.replace(
  /className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"/g,
  'className="w-full py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"'
);
code = code.replace(
  /className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"/g,
  'className="flex-1 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm"'
);

// Fix text inside auth modal
code = code.replace(
  /<p className="text-sm text-slate-600 mb-6 leading-relaxed">/g,
  '<p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched contrast');

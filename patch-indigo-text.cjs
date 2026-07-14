const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// For spans and divs with text-[#6366f1] that don't have a dark variant
// Careful not to replace it where we want it to stay indigo.
// The badges:
code = code.replace(
  /className="text-\[10px\] font-bold uppercase tracking-wider text-\[\#6366f1\] bg-\[\#6366f1\]\/10 px-2 py-1 rounded-md"/g,
  'className="text-[10px] font-bold uppercase tracking-wider text-[#6366f1] dark:text-[#818cf8] bg-[#6366f1]/10 px-2 py-1 rounded-md"'
);
code = code.replace(
  /className="text-\[10px\] bg-\[\#6366f1\]\/10 text-\[\#6366f1\] px-2 py-0\.5 rounded-full font-bold uppercase tracking-wider"/g,
  'className="text-[10px] bg-[#6366f1]/10 text-[#6366f1] dark:text-[#818cf8] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"'
);
code = code.replace(
  /className="w-10 h-10 bg-\[\#6366f1\]\/10 rounded-xl flex items-center justify-center text-\[\#6366f1\]"/g,
  'className="w-10 h-10 bg-[#6366f1]/10 rounded-xl flex items-center justify-center text-[#6366f1] dark:text-[#818cf8]"'
);

// We also have text-[#6366f1] in stats!
code = code.replace(
  /className="stat-value text-2xl sm:text-3xl font-bold text-\[\#6366f1\]"/g,
  'className="stat-value text-2xl sm:text-3xl font-bold text-[#6366f1] dark:text-[#818cf8]"'
);
code = code.replace(
  /className="text-\[10px\] font-bold text-\[\#6366f1\]"/g,
  'className="text-[10px] font-bold text-[#6366f1] dark:text-[#818cf8]"'
);

// Other text-[#6366f1] that need fixing?
// <div className="text-2xl font-bold text-[#6366f1]">
code = code.replace(
  /className="text-2xl font-bold text-\[\#6366f1\]"/g,
  'className="text-2xl font-bold text-[#6366f1] dark:text-[#818cf8]"'
);
// <div className="text-sm font-semibold text-[#6366f1]/60">
code = code.replace(
  /className="text-sm font-semibold text-\[\#6366f1\]\/60"/g,
  'className="text-sm font-semibold text-[#6366f1]/60 dark:text-[#818cf8]/80"'
);

// Also the "Reset" button text and other links
code = code.replace(
  /className="text-\[10px\] font-bold text-\[\#6366f1\] hover:underline"/g,
  'className="text-[10px] font-bold text-[#6366f1] dark:text-[#818cf8] hover:underline"'
);
code = code.replace(
  /className="mt-4 text-\[\#6366f1\] font-bold text-sm hover:underline"/g,
  'className="mt-4 text-[#6366f1] dark:text-[#818cf8] font-bold text-sm hover:underline"'
);
code = code.replace(
  /className="text-\[10px\] font-bold uppercase tracking-widest text-\[\#6366f1\] mb-1"/g,
  'className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1] dark:text-[#818cf8] mb-1"'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched indigo text');

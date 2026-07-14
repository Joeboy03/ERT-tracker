const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="text-2xl font-bold text-\[\#065f46\]"/g,
  'className="text-2xl font-bold text-[#065f46] dark:text-[#34d399]"'
);

code = code.replace(
  /className="text-2xl font-bold text-\[\#3730a3\]"/g,
  'className="text-2xl font-bold text-[#3730a3] dark:text-[#818cf8]"'
);

// Also look at the background colors for those blocks:
// bg-[#10b981]/10 border border-[#10b981]/20
// bg-[#6366f1]/10 border border-[#6366f1]/20
// These are fine in dark mode because the background will be dark, and the text will now be light green/indigo.

fs.writeFileSync('src/App.tsx', code);
console.log('patched stats contrast');

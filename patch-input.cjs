const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<section className="px-6 pb-8 md:px-10">/,
  '<section className="px-4 pb-6 sm:px-6 sm:pb-8 md:px-10">'
);

code = code.replace(
  /<div className="input-card bg-\[\#6366f1\] p-8 md:p-10 rounded-\[1.5rem\] shadow-\[0_10px_15px_-3px_rgba\(99,102,241,0.3\)\] flex flex-col md:flex-row items-center gap-6 md:gap-8">/,
  '<div className="input-card bg-[#6366f1] p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-[1.5rem] shadow-[0_10px_15px_-3px_rgba(99,102,241,0.3)] flex flex-col md:flex-row items-center gap-4 md:gap-8">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('patched input');

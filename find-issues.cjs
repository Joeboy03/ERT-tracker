const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find lines with bg-white without dark:bg-
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('bg-white') && !line.includes('dark:bg-')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('text-white') && !line.includes('dark:text-')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('text-slate-900') && !line.includes('dark:text-')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('text-slate-800') && !line.includes('dark:text-')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('bg-slate-900') && !line.includes('dark:bg-')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});

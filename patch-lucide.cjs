const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('Download,')) {
  code = code.replace(/Cloud,/g, 'Cloud, Download,');
  fs.writeFileSync('src/App.tsx', code);
  console.log('patched lucide');
}

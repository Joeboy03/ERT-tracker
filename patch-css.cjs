const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');
code = code.replace('@import "tailwindcss";', '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));');
fs.writeFileSync('src/index.css', code);

const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<(input|textarea|select)[\s\S]*?>/g;
let m;
while ((m = regex.exec(code)) !== null) {
  console.log(m[0]);
  console.log("----");
}

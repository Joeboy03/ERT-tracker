const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<input[^>]+>/g;
let m;
while ((m = regex.exec(code)) !== null) {
  console.log(m[0]);
  console.log("----");
}
const txtAreaRegex = /<textarea[^>]+>/g;
while ((m = txtAreaRegex.exec(code)) !== null) {
  console.log(m[0]);
  console.log("----");
}
const selectRegex = /<select[^>]+>/g;
while ((m = selectRegex.exec(code)) !== null) {
  console.log(m[0]);
  console.log("----");
}

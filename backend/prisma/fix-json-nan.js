const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'base44_export_json');

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

for (const file of files) {
  const fullPath = path.join(dir, file);
  const original = fs.readFileSync(fullPath, 'utf8');

  // מחליף רק NaN לא מצוטט ל-null
  const fixed = original.replace(/\bNaN\b/g, 'null');

  if (fixed !== original) {
    fs.writeFileSync(fullPath, fixed, 'utf8');
    console.log(`Fixed NaN values in ${file}`);
  } else {
    console.log(`No NaN found in ${file}`);
  }
}

console.log('Done.');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');

console.log('📊 Pirhei Aharon - Database Status Check\n');
console.log('='.repeat(50));

// Check if data directory exists
if (!fs.existsSync(DATA_DIR)) {
  console.log('❌ Data directory not found!');
  console.log('   Run "npm start" to initialize the database.');
  process.exit(1);
}

console.log('✅ Data directory exists');
console.log(`   Location: ${DATA_DIR}\n`);

// Check each JSON file
const collections = ['users', 'classes', 'announcements', 'assignments', 'events', 'media'];

collections.forEach(collection => {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${collection}.json - NOT FOUND`);
    return;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const size = fs.statSync(filePath).size;
    const sizeKB = (size / 1024).toFixed(2);
    
    console.log(`✅ ${collection}.json`);
    console.log(`   Records: ${data.length}`);
    console.log(`   Size: ${sizeKB} KB`);
    
    if (collection === 'users' && data.length > 0) {
      const roles = data.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      console.log(`   Roles: ${JSON.stringify(roles)}`);
    }
    
    console.log('');
  } catch (error) {
    console.log(`❌ ${collection}.json - CORRUPTED`);
    console.log(`   Error: ${error.message}\n`);
  }
});

// Calculate total size
let totalSize = 0;
collections.forEach(collection => {
  const filePath = path.join(DATA_DIR, `${collection}.json`);
  if (fs.existsSync(filePath)) {
    totalSize += fs.statSync(filePath).size;
  }
});

console.log('='.repeat(50));
console.log(`📦 Total database size: ${(totalSize / 1024).toFixed(2)} KB`);
console.log('='.repeat(50));

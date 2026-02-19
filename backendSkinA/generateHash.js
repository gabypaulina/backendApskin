const bcrypt = require('bcrypt');

async function generateHash() {
  const hash = await bcrypt.hash('admin1@skinA', 10);
  console.log('Hash untuk admin:', hash);
}

generateHash();
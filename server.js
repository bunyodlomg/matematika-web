require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 O'quvchilar uchun:  http://localhost:${PORT}`);
  console.log(`👩‍🏫 O'qituvchi paneli: http://localhost:${PORT}/admin`);
});

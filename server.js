require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
// HOST=127.0.0.1 bo'lsa, server faqat ichkaridan (nginx orqali) ochiladi
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🌐 O'quvchilar uchun:  http://localhost:${PORT}`);
  console.log(`👩‍🏫 O'qituvchi paneli: http://localhost:${PORT}/admin`);
});

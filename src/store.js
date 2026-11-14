// Ma'lumotlar ombori.
// MONGODB_URI berilgan bo'lsa — MongoDB, aks holda — data/db.json fayli (o'z serveringizda).
// Har bir test (urinish) bitta hujjat: o'quvchi ma'lumotlari, savollar, javoblar, vaqtlar.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

// ---------- Fayl ombori ----------
function fileStore() {
  const dir = path.join(__dirname, '..', 'data');
  const file = path.join(dir, 'db.json');
  let tests = {};
  if (fs.existsSync(file)) {
    try {
      tests = JSON.parse(fs.readFileSync(file, 'utf8')).tests || {};
    } catch (e) {
      console.error("db.json o'qilmadi:", e.message);
    }
  }
  let timer = null;
  function persist() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ tests }, null, 1));
      fs.renameSync(tmp, file);
    }, 200);
  }
  return {
    kind: 'fayl (data/db.json)',
    async createTest(t) {
      t._id = newId();
      tests[t._id] = t;
      persist();
      return t;
    },
    async getTest(id) {
      return tests[id] || null;
    },
    async saveTest(t) {
      tests[t._id] = t;
      persist();
    },
    async listTests() {
      return Object.values(tests).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    },
    async deleteTest(id) {
      delete tests[id];
      persist();
    },
  };
}

// ---------- MongoDB ombori ----------
async function mongoStore(uri) {
  const mongoose = require('mongoose');
  await mongoose.connect(uri);
  const schema = new mongoose.Schema(
    { _id: String },
    { strict: false, versionKey: false, minimize: false }
  );
  const Test = mongoose.models.Test || mongoose.model('Test', schema, 'tests');
  return {
    kind: 'MongoDB',
    async createTest(t) {
      t._id = newId();
      await Test.create(t);
      return t;
    },
    async getTest(id) {
      return Test.findById(String(id)).lean();
    },
    async saveTest(t) {
      await Test.replaceOne({ _id: t._id }, t);
    },
    async listTests() {
      return Test.find().sort({ startedAt: -1 }).lean();
    },
    async deleteTest(id) {
      await Test.deleteOne({ _id: String(id) });
    },
  };
}

async function createStore() {
  const uri = process.env.MONGODB_URI;
  if (uri) return mongoStore(uri);
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Serverless muhitda fayl saqlanmaydi — MongoDB shart
    throw new Error("MONGODB_URI o'rnatilmagan. Netlify'da natijalarni saqlash uchun MongoDB kerak.");
  }
  return fileStore();
}

module.exports = { createStore };

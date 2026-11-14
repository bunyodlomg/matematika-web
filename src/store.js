// Ma'lumotlar ombori.
// MONGODB_URI berilgan bo'lsa — MongoDB, aks holda — data/db.json fayli.
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
  const Test = mongoose.model('Test', schema, 'tests');
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

// ---------- Netlify Blobs ombori (Netlify'da tashqi bazasiz ishlaydi) ----------
function blobStore() {
  const { getStore } = require('@netlify/blobs');
  const db = getStore({ name: 'tests', consistency: 'strong' });
  return {
    kind: 'Netlify Blobs',
    async createTest(t) {
      t._id = newId();
      await db.setJSON(t._id, t);
      return t;
    },
    async getTest(id) {
      if (!/^[a-f0-9]{24}$/.test(String(id))) return null;
      return db.get(String(id), { type: 'json' });
    },
    async saveTest(t) {
      await db.setJSON(t._id, t);
    },
    async listTests() {
      const { blobs } = await db.list();
      const out = [];
      for (let i = 0; i < blobs.length; i += 25) {
        const part = await Promise.all(blobs.slice(i, i + 25).map((b) => db.get(b.key, { type: 'json' })));
        out.push(...part.filter(Boolean));
      }
      return out.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    },
    async deleteTest(id) {
      await db.delete(String(id));
    },
  };
}

async function createStore() {
  const uri = process.env.MONGODB_URI;
  if (uri) return mongoStore(uri);
  if (process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) return blobStore();
  return fileStore();
}

module.exports = { createStore };

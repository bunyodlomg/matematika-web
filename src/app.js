// Express ilovasi: ham lokal serverda (server.js), ham Netlify Functions'da ishlaydi.
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { createStore } = require('./store');
const { LEVELS, generateTest } = require('./questions');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.ADMIN_PASSWORD) {
  console.warn("⚠️  ADMIN_PASSWORD o'rnatilmagan — vaqtinchalik parol: admin123. Uni albatta o'rnating!");
}
const ADMIN_TOKEN = crypto.createHash('sha256').update('mw:' + ADMIN_PASSWORD).digest('hex');

const app = express();
// Netlify funksiyasi ichida yo'l /.netlify/functions/api/... bo'lib kelishi mumkin
app.use((req, res, next) => {
  req.url = req.url.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

let storePromise = null;
let store;
app.use('/api', (req, res, next) => {
  if (!storePromise) storePromise = createStore();
  storePromise
    .then((s) => { store = s; next(); })
    .catch((e) => {
      storePromise = null;
      console.error("Omborga ulanib bo'lmadi:", e);
      res.status(503).json({ error: "Ma'lumotlar bazasiga ulanib bo'lmadi. Birozdan keyin qayta urinib ko'ring." });
    });
});

const clean = (s, max = 80) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  });

// O'quvchiga savolni javobisiz yuboramiz
function publicQuestion(test) {
  const i = test.answers.length;
  if (i >= test.questions.length) return null;
  return { index: i, text: test.questions[i].text };
}

function summary(test) {
  const correct = test.answers.filter((a) => a.correct).length;
  const total = test.questions.length;
  return {
    id: test._id,
    firstName: test.firstName,
    lastName: test.lastName,
    school: test.school,
    grade: test.grade,
    level: test.level,
    levelName: LEVELS[test.level].name,
    total,
    answered: test.answers.length,
    correct,
    wrong: test.answers.length - correct,
    percent: Math.round((correct / total) * 100),
    startedAt: test.startedAt,
    finishedAt: test.finishedAt || null,
    durationSec: test.finishedAt
      ? Math.round((new Date(test.finishedAt) - new Date(test.startedAt)) / 1000)
      : null,
  };
}

// ---------- O'quvchi API ----------

// Yangi test boshlash (ro'yxatdan o'tish ma'lumotlari bilan)
app.post('/api/tests', wrap(async (req, res) => {
  const firstName = clean(req.body.firstName, 40);
  const lastName = clean(req.body.lastName, 40);
  const school = clean(req.body.school, 80);
  const grade = Number(req.body.grade);
  const level = String(req.body.level);
  if (!firstName || !lastName || !school) return res.status(400).json({ error: "Ism, familiya va maktabni kiriting" });
  if (![1, 2, 3, 4].includes(grade)) return res.status(400).json({ error: 'Sinf 1–4 bo‘lishi kerak' });
  if (!LEVELS[level]) return res.status(400).json({ error: "Daraja noto'g'ri" });

  const test = await store.createTest({
    firstName, lastName, school, grade, level,
    questions: generateTest(grade, level),
    answers: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  });
  res.json({ id: test._id, total: test.questions.length, levelName: LEVELS[level].name, question: publicQuestion(test) });
}));

// Javob yuborish
app.post('/api/tests/:id/answer', wrap(async (req, res) => {
  const test = await store.getTest(req.params.id);
  if (!test) return res.status(404).json({ error: 'Test topilmadi' });
  if (test.finishedAt) return res.status(409).json({ error: 'Test allaqachon tugagan' });

  const index = Number(req.body.index);
  if (index !== test.answers.length) {
    // Takroriy so'rov (masalan, ikki marta bosilgan) — joriy holatni qaytaramiz
    return res.status(409).json({ error: 'Savol tartibi buzildi', question: publicQuestion(test) });
  }
  const raw = clean(req.body.answer, 12);
  const given = raw === '' || !/^-?\d+$/.test(raw) ? null : Number(raw);
  const q = test.questions[index];
  const now = new Date();
  const prev = index === 0 ? new Date(test.startedAt) : new Date(test.answers[index - 1].answeredAt);
  const correct = given === q.answer;

  test.answers.push({
    given,
    correct,
    answeredAt: now.toISOString(),
    timeSec: Math.round((now - prev) / 1000),
  });
  if (test.answers.length === test.questions.length) test.finishedAt = now.toISOString();
  await store.saveTest(test);

  res.json({
    correct,
    correctAnswer: q.answer,
    next: publicQuestion(test),
    result: test.finishedAt ? summary(test) : null,
  });
}));

// Natija (sertifikat uchun)
app.get('/api/tests/:id', wrap(async (req, res) => {
  const test = await store.getTest(req.params.id);
  if (!test) return res.status(404).json({ error: 'Test topilmadi' });
  res.json(summary(test));
}));

// ---------- O'qituvchi API ----------

app.post('/api/admin/login', (req, res) => {
  if (String(req.body.password || '') !== ADMIN_PASSWORD) return res.status(401).json({ error: "Parol noto'g'ri" });
  res.json({ token: ADMIN_TOKEN });
});

function requireAdmin(req, res, next) {
  const t = req.get('x-admin-token') || req.query.token;
  if (t !== ADMIN_TOKEN) return res.status(401).json({ error: 'Kirish taqiqlangan' });
  next();
}

app.get('/api/admin/results', requireAdmin, wrap(async (req, res) => {
  const tests = await store.listTests();
  res.json(tests.map((t) => ({
    ...summary(t),
    details: t.questions.map((q, i) => {
      const a = t.answers[i];
      return {
        text: q.text,
        op: q.op,
        correctAnswer: q.answer,
        given: a ? a.given : undefined,
        correct: a ? a.correct : undefined,
        timeSec: a ? a.timeSec : undefined,
      };
    }),
  })));
}));

app.get('/api/admin/results.csv', requireAdmin, wrap(async (req, res) => {
  const tests = await store.listTests();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const fmt = (s) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  const rows = [[
    'Familiya', 'Ism', 'Maktab', 'Sinf', 'Daraja', "To'g'ri", 'Xato', 'Jami', 'Foiz', 'Baho',
    'Vaqt (daq:son)', 'Sana', 'Holat', 'Xato qilingan misollar',
  ]];
  for (const t of tests) {
    const s = summary(t);
    const mistakes = t.questions
      .map((q, i) => ({ q, a: t.answers[i] }))
      .filter((x) => x.a && !x.a.correct)
      .map((x) => `${x.q.text} = ${x.a.given ?? '—'} (to'g'ri: ${x.q.answer})`)
      .join('; ');
    rows.push([
      s.lastName, s.firstName, s.school, s.grade, s.levelName, s.correct, s.wrong, s.total,
      s.percent + '%', s.finishedAt ? (s.percent >= 90 ? 5 : s.percent >= 70 ? 4 : s.percent >= 50 ? 3 : 2) : '', fmt(s.durationSec), new Date(s.startedAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
      s.finishedAt ? 'Tugallangan' : `Tugallanmagan (${s.answered}/${s.total})`, mistakes,
    ]);
  }
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="natijalar.csv"');
  res.send(csv);
}));

app.delete('/api/admin/tests/:id', requireAdmin, wrap(async (req, res) => {
  await store.deleteTest(req.params.id);
  res.json({ ok: true });
}));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

module.exports = app;

// Misollar generatori: sinf (1-4) va daraja (oson / orta / qiyin) bo'yicha.
// Har bir testda to'rtta amal (+, −, ×, ÷) teng miqdorda aralashtirib beriladi.

const LEVELS = {
  oson: { name: 'Oson' },
  orta: { name: "O'rta" },
  qiyin: { name: 'Qiyin' },
};

const QUESTIONS_PER_TEST = 12; // har amaldan 3 tadan

// Qo'shish/ayirish uchun eng katta son: [sinf][daraja]
const ADD_MAX = {
  1: { oson: 10, orta: 20, qiyin: 50 },
  2: { oson: 20, orta: 50, qiyin: 100 },
  3: { oson: 50, orta: 100, qiyin: 1000 },
  4: { oson: 100, orta: 1000, qiyin: 10000 },
};

// Ko'paytirish/bo'lish uchun: [birinchi ko'paytuvchi max, ikkinchi ko'paytuvchi max]
const MUL_MAX = {
  1: { oson: [5, 2], orta: [5, 5], qiyin: [10, 5] },
  2: { oson: [5, 5], orta: [10, 5], qiyin: [10, 10] },
  3: { oson: [10, 5], orta: [10, 10], qiyin: [20, 10] },
  4: { oson: [10, 10], orta: [99, 9], qiyin: [999, 9] },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeQuestion(op, grade, level) {
  let a, b, answer;
  if (op === '+') {
    const max = ADD_MAX[grade][level];
    const min = Math.max(1, Math.floor(max / 10));
    a = rand(min, max - min);
    b = rand(1, max - a); // yig'indi max dan oshmaydi
    answer = a + b;
  } else if (op === '-') {
    const max = ADD_MAX[grade][level];
    a = rand(Math.max(2, Math.floor(max / 5)), max);
    b = rand(1, a - 1); // natija musbat
    answer = a - b;
  } else if (op === '×') {
    const [ma, mb] = MUL_MAX[grade][level];
    a = rand(2, ma);
    b = rand(2, mb);
    if (Math.random() < 0.5 && ma === mb) [a, b] = [b, a];
    answer = a * b;
  } else {
    // ÷ : qoldiqsiz bo'lish. Avval javob va bo'luvchini tanlaymiz.
    const [ma, mb] = MUL_MAX[grade][level];
    answer = rand(2, ma);
    b = rand(2, mb);
    a = answer * b;
  }
  return { text: `${a} ${op} ${b}`, op, answer };
}

function generateTest(grade, level) {
  const ops = [];
  for (const op of ['+', '-', '×', '÷']) {
    for (let i = 0; i < QUESTIONS_PER_TEST / 4; i++) ops.push(op);
  }
  shuffle(ops);
  const seen = new Set();
  return ops.map((op) => {
    let q;
    let tries = 0;
    do {
      q = makeQuestion(op, grade, level);
    } while (seen.has(q.text) && ++tries < 20);
    seen.add(q.text);
    return q;
  });
}

module.exports = { LEVELS, QUESTIONS_PER_TEST, generateTest };

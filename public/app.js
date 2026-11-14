(() => {
  const $ = (id) => document.getElementById(id);
  const PROFILE_KEY = 'matematika_profile';
  const screens = ['s-register', 's-levels', 's-quiz', 's-result'];
  const SAMPLES = {
    1: { oson: '5 + 3', orta: '14 − 6', qiyin: '36 + 12' },
    2: { oson: '12 + 7', orta: '45 − 18', qiyin: '9 × 8' },
    3: { oson: '34 + 15', orta: '72 ÷ 8', qiyin: '16 × 10' },
    4: { oson: '67 + 30', orta: '94 × 6', qiyin: '703 × 6' },
  };
  const pretty = (t) => t.replace(/ - /g, ' − ');

  // Telegram Web App (bot orqali ochilganda): to'liq ekran va foydalanuvchi ismi
  const tg = window.Telegram && window.Telegram.WebApp;
  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (tg && tg.initData) {
    try { tg.ready(); tg.expand(); } catch {}
  }

  function show(id) {
    screens.forEach((s) => $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
  }
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
  }
  async function api(url, body) {
    const res = await fetch(url, body ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    } : undefined);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(data.error || 'Xatolik'); e.data = data; throw e; }
    return data;
  }
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // 5 ballik baho (maktabdagidek)
  function baho(p) {
    if (p >= 90) return { n: 5, label: "A'LO", color: '#c28a00', title: "Ajoyib! A'lo natija!" };
    if (p >= 70) return { n: 4, label: 'YAXSHI', color: '#2348c4', title: 'Barakalla! Yaxshi natija!' };
    if (p >= 50) return { n: 3, label: 'QONIQARLI', color: '#16834f', title: 'Yomon emas! Yana mashq qilamiz.' };
    return { n: null, label: 'ISHTIROKCHI', color: '#5d6885', title: 'Harakat qildingiz! Yana bir bor urinib ko‘ring.' };
  }

  // ---------- Ro'yxatdan o'tish ----------
  let profile = loadProfile();
  let grade = profile ? profile.grade : null;

  $('grades').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    grade = Number(b.dataset.g);
    [...$('grades').children].forEach((x) => x.classList.toggle('on', x === b));
  });

  $('f-register').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = {
      firstName: $('firstName').value.trim(),
      lastName: $('lastName').value.trim(),
      school: $('school').value.trim(),
      grade,
    };
    const missing = [!p.firstName && 'ism', !p.lastName && 'familiya', !p.school && 'maktab'].filter(Boolean);
    if (missing.length) return ($('reg-err').textContent = `Iltimos, ${missing.join(', ')}ni yozing.`);
    if (!p.grade) return ($('reg-err').textContent = 'Sinfingizni tanlang.');
    $('reg-err').textContent = '';
    profile = p; saveProfile(p);
    openLevels();
  });

  function openRegister() {
    if (profile) {
      $('firstName').value = profile.firstName; $('lastName').value = profile.lastName; $('school').value = profile.school;
      [...$('grades').children].forEach((x) => x.classList.toggle('on', Number(x.dataset.g) === profile.grade));
    } else if (tgUser) {
      // Telegram Web App ichida ochilganda ism-familiyani oldindan to'ldiramiz
      if (!$('firstName').value) $('firstName').value = tgUser.first_name || '';
      if (!$('lastName').value) $('lastName').value = tgUser.last_name || '';
    }
    show('s-register');
  }

  function openLevels() {
    $('who-avatar').textContent = (profile.firstName[0] || '') + (profile.lastName[0] || '');
    $('who-name').textContent = `${profile.firstName} ${profile.lastName}`;
    $('who-info').textContent = `${profile.school} · ${profile.grade}-sinf`;
    document.querySelectorAll('[data-sample]').forEach((el) => (el.textContent = SAMPLES[profile.grade][el.dataset.sample]));
    $('lvl-err').textContent = '';
    show('s-levels');
  }
  $('b-change').addEventListener('click', openRegister);

  // ---------- Test ----------
  let test = null;
  let timer = null;

  document.querySelectorAll('.level').forEach((b) => b.addEventListener('click', async () => {
    document.querySelectorAll('.level').forEach((x) => (x.disabled = true));
    try {
      const r = await api('/api/tests', { ...profile, level: b.dataset.level });
      test = { id: r.id, total: r.total, level: b.dataset.level, levelName: r.levelName, question: r.question,
        answer: '', startedAt: Date.now(), busy: false, marks: [], mistakes: [] };
      $('q-level').textContent = r.levelName;
      $('q-level').className = 'chip ' + test.level;
      $('q-total').textContent = r.total;
      renderQuestion();
      clearInterval(timer);
      $('q-time').textContent = '0:00';
      timer = setInterval(() => ($('q-time').textContent = fmtTime(Math.floor((Date.now() - test.startedAt) / 1000))), 500);
      show('s-quiz');
    } catch (e) {
      $('lvl-err').textContent = e.message;
    } finally {
      document.querySelectorAll('.level').forEach((x) => (x.disabled = false));
    }
  }));

  function renderTrack() {
    const cur = test.marks.length;
    $('track').innerHTML = Array.from({ length: test.total }, (_, i) =>
      `<i class="${i < cur ? (test.marks[i] ? 'ok' : 'bad') : i === cur ? 'now' : ''}"></i>`).join('');
  }

  function renderQuestion() {
    const q = test.question;
    $('q-num').textContent = q.index + 1;
    const chars = [...pretty(q.text).replace(/ /g, ''), '=', '?'];
    $('q-text').innerHTML = chars.map((c) =>
      `<span class="${/[+−×÷=]/.test(c) ? 'op' : c === '?' ? 'q' : ''}">${c}</span>`).join('');
    test.answer = '';
    $('q-answer').className = 'answer';
    $('q-mark').className = 'mark';
    $('q-mark').textContent = '';
    renderAnswer();
    renderTrack();
  }

  function renderAnswer() {
    const digits = [...test.answer];
    const slots = digits.map((d) => `<span class="slot">${d}</span>`);
    if (!test.busy && digits.length < 6) slots.push(`<span class="slot empty${digits.length ? '' : ' caret'}"></span>`);
    $('q-answer').innerHTML = slots.join('');
  }

  function press(k) {
    if (!test || test.busy) return;
    if (k === 'del') test.answer = test.answer.slice(0, -1);
    else if (k === 'ok') return submit();
    else if (test.answer.length < 6) test.answer = (test.answer === '0' ? '' : test.answer) + k;
    if ($('q-mark').classList.contains('warn')) { $('q-mark').className = 'mark'; $('q-mark').textContent = ''; }
    renderAnswer();
  }

  $('keypad').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (b) press(b.dataset.k);
  });
  document.addEventListener('keydown', (e) => {
    if ($('s-quiz').classList.contains('hidden')) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') { e.preventDefault(); press('ok'); }
  });

  async function submit() {
    if (test.answer === '') {
      $('q-mark').className = 'mark warn';
      $('q-mark').textContent = 'Avval javobni yozing';
      return;
    }
    test.busy = true;
    renderAnswer();
    try {
      const r = await api(`/api/tests/${test.id}/answer`, { index: test.question.index, answer: test.answer });
      test.marks.push(r.correct);
      if (!r.correct) test.mistakes.push({ text: pretty(test.question.text), given: test.answer, right: r.correctAnswer });
      $('q-answer').classList.add(r.correct ? 'ok' : 'bad');
      $('q-mark').className = 'mark pop ' + (r.correct ? 'ok' : '');
      $('q-mark').textContent = r.correct ? "✓ To'g'ri!" : `To'g'ri javob: ${r.correctAnswer}`;
      renderTrack();
      setTimeout(() => {
        test.busy = false;
        if (r.result) finish(r.result);
        else { test.question = r.next; renderQuestion(); }
      }, r.correct ? 750 : 1700);
    } catch (e) {
      test.busy = false;
      if (e.data && e.data.question) { test.question = e.data.question; renderQuestion(); }
      else {
        renderAnswer();
        $('q-mark').className = 'mark warn';
        $('q-mark').textContent = "Javob yuborilmadi. Internetni tekshirib, ✓ ni qayta bosing.";
      }
    }
  }

  // ---------- Natija va sertifikat ----------
  let lastResult = null;

  async function finish(result) {
    clearInterval(timer);
    lastResult = result;
    const b = baho(result.percent);
    $('r-mark').textContent = b.n ?? '★';
    $('r-mark').classList.toggle('none', !b.n);
    $('r-title').textContent = b.title;
    $('r-correct').textContent = `${result.correct}/${result.total}`;
    $('r-wrong').textContent = result.wrong;
    $('r-time').textContent = fmtTime(result.durationSec);
    $('r-review-wrap').classList.toggle('hidden', !test.mistakes.length);
    $('r-review').innerHTML = test.mistakes.map((m) =>
      `<span>${m.text} = <s>${m.given}</s> <b>${m.right}</b></span>`).join('');
    show('s-result');
    try { await document.fonts.ready; } catch {}
    drawCertificate(result);
  }

  function drawCertificate(r) {
    const c = $('cert'); const x = c.getContext('2d');
    const W = c.width, H = c.height;
    const D = '"Baloo 2", Nunito, sans-serif', B = 'Nunito, sans-serif', HND = 'Caveat, cursive';
    const b = baho(r.percent);
    const INK = '#1b2440', SOFT = '#5d6885', PEN = '#2348c4', RED = '#d22f2f', GOLD = '#c9a227';

    // daftar varag'i: kataklar va hoshiya
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e3ebf7'; x.lineWidth = 1.5;
    for (let gx = 0; gx <= W; gx += 40) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
    for (let gy = 0; gy <= H; gy += 40) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.82)'; x.fillRect(90, 90, W - 180, H - 180);
    x.strokeStyle = PEN; x.lineWidth = 10; x.strokeRect(50, 50, W - 100, H - 100);
    x.strokeStyle = GOLD; x.lineWidth = 3; x.strokeRect(74, 74, W - 148, H - 148);

    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = SOFT; x.font = `800 26px ${B}`;
    spaced(x, 'MATEMATIKA DAFTARI  ·  1–4 SINFLAR', W / 2, 190, 4);
    x.fillStyle = PEN; x.font = `800 120px ${D}`; x.fillText('SERTIFIKAT', W / 2, 310);

    x.fillStyle = SOFT; x.font = `600 32px ${B}`; x.fillText('Ushbu sertifikat', W / 2, 390);
    x.fillStyle = INK; fitText(x, `${r.lastName} ${r.firstName}`, W / 2, 480, W - 420, 80, `800 {s}px ${D}`);
    x.strokeStyle = GOLD; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - 360, 505); x.lineTo(W / 2 + 360, 505); x.stroke();
    x.fillStyle = INK; fitText(x, `${r.school}, ${r.grade}-sinf o'quvchisiga`, W / 2, 565, W - 420, 34, `600 {s}px ${B}`);
    x.font = `600 34px ${B}`;
    x.fillText(`matematikadan «${r.levelName}» darajadagi testni`, W / 2, 615);
    x.fillText('muvaffaqiyatli topshirgani uchun berildi.', W / 2, 662);

    // natijalar
    const cols = [[`${r.correct}/${r.total}`, "TO'G'RI JAVOB"], [`${r.percent}%`, 'NATIJA'], [fmtTime(r.durationSec), 'VAQT']];
    cols.forEach(([v, l], i) => {
      const cx = 380 + i * 280;
      x.fillStyle = INK; x.font = `800 62px ${D}`; x.fillText(v, cx, 800);
      x.fillStyle = SOFT; x.font = `800 22px ${B}`; spaced(x, l, cx, 838, 2);
    });

    // o'qituvchi bahosi — qizil ruchka
    const mx = 1230, my = 775;
    x.save(); x.translate(mx, my); x.rotate(-0.1);
    x.strokeStyle = RED; x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.ellipse(0, 0, 105, 92, 0, -0.3, Math.PI * 1.75); x.stroke();
    x.fillStyle = RED; x.textBaseline = 'middle';
    if (b.n) { x.font = `700 170px ${HND}`; x.fillText(String(b.n), 0, 8); }
    else { x.font = `700 46px ${HND}`; x.fillText('Barakalla!', 0, 0); }
    x.restore();
    x.textBaseline = 'alphabetic';
    x.fillStyle = b.color; x.font = `800 26px ${B}`; spaced(x, b.label, mx, 905, 3);

    const d = new Date(r.finishedAt || Date.now());
    const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    x.fillStyle = SOFT; x.font = `700 26px ${B}`;
    x.textAlign = 'left'; x.fillText(`Sana: ${date}`, 140, 1000);
    x.textAlign = 'right'; x.fillText(`№ ${r.id.slice(-8).toUpperCase()}`, W - 140, 1000);
  }

  function spaced(x, text, cx, y, sp) {
    if ('letterSpacing' in x) { x.letterSpacing = sp + 'px'; x.fillText(text, cx, y); x.letterSpacing = '0px'; }
    else x.fillText(text, cx, y);
  }
  function fitText(x, text, cx, y, maxW, size, fontTpl) {
    let s = size;
    x.font = fontTpl.replace('{s}', s);
    while (x.measureText(text).width > maxW && s > 20) { s -= 2; x.font = fontTpl.replace('{s}', s); }
    x.fillText(text, cx, y);
  }

  $('b-download').addEventListener('click', () => {
    const link = document.createElement('a');
    const safe = `${lastResult.lastName}_${lastResult.firstName}`.replace(/[^\p{L}\p{N}_-]+/gu, '_');
    link.download = `sertifikat_${safe}.png`;
    link.href = $('cert').toDataURL('image/png');
    link.click();
  });
  $('b-print').addEventListener('click', () => window.print());
  $('b-again').addEventListener('click', openLevels);

  if (profile) openLevels(); else openRegister();
})();

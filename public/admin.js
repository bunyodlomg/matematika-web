(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'matematika_admin_token';
  let token = null;
  try { token = sessionStorage.getItem(KEY); } catch {}
  let all = [];
  const open = new Set();
  let pendingDelete = null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pretty = (t) => esc(t).replace(/ - /g, ' − ');
  const fmtTime = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (iso) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const baho = (p) => (p >= 90 ? 5 : p >= 70 ? 4 : p >= 50 ? 3 : 2);

  $('f-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('pw').value }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return ($('login-err').textContent = "Parol noto'g'ri. Qaytadan kiriting.");
    token = d.token;
    try { sessionStorage.setItem(KEY, token); } catch {}
    start();
  });

  $('b-logout').addEventListener('click', () => {
    try { sessionStorage.removeItem(KEY); } catch {}
    location.reload();
  });

  async function load() {
    const r = await fetch('/api/admin/results', { headers: { 'x-admin-token': token } });
    if (r.status === 401) { try { sessionStorage.removeItem(KEY); } catch {} return location.reload(); }
    all = await r.json();
    const schools = [...new Set(all.map((t) => t.school))].sort((a, b) => a.localeCompare(b));
    const sel = $('f-school'); const cur = sel.value;
    sel.innerHTML = '<option value="">Barcha maktablar</option>' + schools.map((s) => `<option>${esc(s)}</option>`).join('');
    sel.value = schools.includes(cur) ? cur : '';
    const n = new Date();
    $('updated').textContent = `Yangilandi: ${pad(n.getHours())}:${pad(n.getMinutes())} · har 30 soniyada o'zi yangilanadi`;
    render();
  }

  function filtered() {
    const q = $('f-q').value.trim().toLowerCase();
    const school = $('f-school').value, grade = $('f-grade').value, level = $('f-level').value, status = $('f-status').value;
    return all.filter((t) =>
      (!q || `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) || `${t.lastName} ${t.firstName}`.toLowerCase().includes(q)) &&
      (!school || t.school === school) &&
      (!grade || String(t.grade) === grade) &&
      (!level || t.level === level) &&
      (!status || (status === 'done' ? !!t.finishedAt : !t.finishedAt)));
  }

  function render() {
    const list = filtered();
    const done = list.filter((t) => t.finishedAt);
    $('k-tests').textContent = list.length;
    $('k-students').textContent = new Set(list.map((t) => `${t.lastName}|${t.firstName}|${t.school}|${t.grade}`.toLowerCase())).size;
    $('k-avg').textContent = done.length ? Math.round(done.reduce((s, t) => s + t.percent, 0) / done.length) + '%' : '—';
    $('k-time').textContent = done.length ? fmtTime(Math.round(done.reduce((s, t) => s + t.durationSec, 0) / done.length)) : '—';
    const dist = [5, 4, 3, 2].map((b) => [b, done.filter((t) => baho(t.percent) === b).length]);
    $('k-dist').innerHTML = dist.map(([b, c]) => `<span><em>${b}</em><small>${c}</small></span>`).join('');

    if (!list.length) {
      $('rows').innerHTML = `<tr><td colspan="8" class="empty">${all.length
        ? '<b>Mos natija topilmadi</b>Filtrlarni o\'zgartirib ko\'ring.'
        : "<b>Hali hech kim test ishlamagan</b>O'quvchilar test ishlashi bilan natijalar shu yerda paydo bo'ladi."}</td></tr>`;
      return;
    }
    $('rows').innerHTML = list.map((t) => {
      const mistakes = t.details.filter((d) => d.correct === false);
      const mist = mistakes.length
        ? mistakes.map((d) => `<span>${pretty(d.text)} = ${d.given ?? '—'}</span>`).join('')
        : (t.answered ? '<span class="clean">Xatosiz</span>' : '');
      const result = t.finishedAt
        ? `<div class="score">${t.correct}/${t.total}<small>${t.percent}%</small></div><div class="meter"><i style="width:${t.percent}%"></i></div>`
        : `<span class="open-tag">Tugallanmagan · ${t.answered}/${t.total}</span>`;
      const bh = t.finishedAt ? `<span class="bh">${baho(t.percent)}</span>` : '<span class="bh na">—</span>';
      const isOpen = open.has(t.id);
      const row = `<tr class="main${isOpen ? ' open' : ''}" data-id="${t.id}" tabindex="0" aria-expanded="${isOpen}">
        <td class="name"><b>${esc(t.lastName)} ${esc(t.firstName)}</b><span>${esc(t.school)}</span></td>
        <td class="num">${t.grade}-sinf</td>
        <td><span class="chip ${t.level}">${esc(t.levelName)}</span></td>
        <td class="num">${result}</td>
        <td>${bh}</td>
        <td class="num">${fmtTime(t.durationSec)}</td>
        <td><div class="mist">${mist}</div></td>
        <td class="num muted">${fmtDate(t.startedAt)}</td>
      </tr>`;
      if (!isOpen) return row;
      const cards = t.details.map((d, i) => {
        const res = d.correct === undefined ? '<span class="muted">javob berilmagan</span>'
          : d.correct ? `<span class="ok">✓ ${d.given}</span>`
          : `<s>${d.given ?? '—'}</s> <span class="bad">to'g'risi ${d.correctAnswer}</span>`;
        return `<div class="q ${d.correct === false ? 'bad' : ''}"><div class="n"><span>${i + 1}-misol</span><span>${d.timeSec != null ? d.timeSec + ' son' : ''}</span></div>
          <div class="e">${pretty(d.text)}</div><div class="r">${res}</div></div>`;
      }).join('');
      const del = pendingDelete === t.id
        ? `<span class="muted">Natija butunlay o'chiriladi.</span><button class="btn small" data-del-yes="${t.id}" style="background:var(--red)">Ha, o'chirish</button><button class="btn ghost small" data-del-no>Bekor qilish</button>`
        : `<button class="btn ghost small danger" data-del="${t.id}">Natijani o'chirish</button>`;
      return row + `<tr class="detail"><td colspan="8"><div class="qgrid">${cards}</div><div class="foot">${del}</div></td></tr>`;
    }).join('');
  }

  function toggle(id) { open.has(id) ? open.delete(id) : open.add(id); render(); }

  $('rows').addEventListener('click', async (e) => {
    const ask = e.target.closest('[data-del]');
    if (ask) { pendingDelete = ask.dataset.del; return render(); }
    if (e.target.closest('[data-del-no]')) { pendingDelete = null; return render(); }
    const yes = e.target.closest('[data-del-yes]');
    if (yes) {
      await fetch(`/api/admin/tests/${yes.dataset.delYes}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
      pendingDelete = null; open.delete(yes.dataset.delYes);
      return load();
    }
    const tr = e.target.closest('tr.main'); if (tr) toggle(tr.dataset.id);
  });
  $('rows').addEventListener('keydown', (e) => {
    const tr = e.target.closest('tr.main');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(tr.dataset.id); }
  });

  ['f-q', 'f-school', 'f-grade', 'f-level', 'f-status'].forEach((id) => $(id).addEventListener('input', render));
  $('b-refresh').addEventListener('click', load);

  function start() {
    $('login-wrap').classList.add('hidden');
    $('panel').classList.remove('hidden');
    $('b-csv').href = `/api/admin/results.csv?token=${encodeURIComponent(token)}`;
    load();
    setInterval(load, 30000);
  }

  if (token) start();
})();

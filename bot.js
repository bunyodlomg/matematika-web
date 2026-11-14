// Telegram bot: /start bosilganda testni Web App sifatida ochadigan tugma chiqaradi.
// Kerak: .env da BOT_TOKEN (BotFather'dan) va WEBAPP_URL (Netlify'dagi sayt manzili).
// Qo'shimcha kutubxonasiz, Node 18+ fetch va long polling bilan ishlaydi.
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
if (!TOKEN || !WEBAPP_URL) {
  console.error("BOT_TOKEN yoki WEBAPP_URL o'rnatilmagan (.env)");
  process.exit(1);
}
const API = `https://api.telegram.org/bot${TOKEN}/`;

async function call(method, body) {
  const r = await fetch(API + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

const startKeyboard = {
  inline_keyboard: [[{ text: '🧮 Testni boshlash', web_app: { url: WEBAPP_URL } }]],
};

async function onMessage(msg) {
  if (!msg.text) return;
  const name = msg.from && msg.from.first_name ? msg.from.first_name : '';
  if (/^\/(start|test)\b/.test(msg.text)) {
    await call('sendMessage', {
      chat_id: msg.chat.id,
      text:
        `Assalomu alaykum${name ? ', ' + name : ''}! 👋\n\n` +
        "📚 1–4 sinflar uchun matematika testi.\n" +
        "Qo'shish, ayirish, ko'paytirish va bo'lish — 12 ta misol.\n" +
        "Oxirida sertifikat olasiz! 🏆\n\n" +
        'Boshlash uchun pastdagi tugmani bosing 👇',
      reply_markup: startKeyboard,
    });
  } else if (/^\/help\b/.test(msg.text)) {
    await call('sendMessage', {
      chat_id: msg.chat.id,
      text: "Testni boshlash uchun /start ni bosing yoki pastdagi «Test» menyu tugmasidan foydalaning.",
    });
  } else {
    await call('sendMessage', { chat_id: msg.chat.id, text: 'Testni ochish uchun tugmani bosing 👇', reply_markup: startKeyboard });
  }
}

async function main() {
  const me = await call('getMe');
  console.log(`🤖 Bot ishga tushdi: @${me.username} → ${WEBAPP_URL}`);
  // Chat yonidagi menyu tugmasi ham Web App'ni ochsin
  await call('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Test', web_app: { url: WEBAPP_URL } } });
  await call('setMyCommands', { commands: [{ command: 'start', description: 'Testni boshlash' }, { command: 'help', description: 'Yordam' }] });
  await call('deleteWebhook', {});

  let offset = 0;
  for (;;) {
    try {
      const updates = await call('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message) onMessage(u.message).catch((e) => console.error('Xabar xatosi:', e.message));
      }
    } catch (e) {
      console.error('getUpdates xatosi:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

// pm2 sozlamasi: serverda `pm2 start ecosystem.config.js` bilan ishga tushiriladi.
// Parol va boshqa sozlamalar .env faylidan olinadi.
module.exports = {
  apps: [
    {
      name: 'matematika',
      script: 'server.js',
      instances: 1, // fayl ombori bilan faqat 1 ta nusxa ishlatilsin
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
    {
      // Telegram bot (.env da BOT_TOKEN bo'lishi kerak)
      name: 'matematika-bot',
      script: 'bot.js',
      instances: 1,
      autorestart: true,
      restart_delay: 5000,
      max_memory_restart: '150M',
    },
  ],
};

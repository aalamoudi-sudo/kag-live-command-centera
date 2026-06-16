// إعدادات تشغيل دائم عبر PM2.
// التشغيل:  pm2 start ecosystem.config.js   ثم   pm2 save
module.exports = {
  apps: [{
    name: "kag",
    script: "server.js",
    env: {
      PORT: 3000,
      ADMIN_USERNAME: "MAYADEEN",
      ADMIN_PASSWORD: "Mayadeen@2026",   // غيّرها لكلمة أقوى وقت ما تحب
      REQUIRE_LOGIN: "true",             // قفل كامل: لا يُعرض أي شيء قبل تسجيل الدخول
      // SHEET_CSV_URL: "رابط_النشر_للويب" // اختياري
    }
  }]
};

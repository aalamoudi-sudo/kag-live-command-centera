"use strict";
/**
 * report-generator.js v5
 * يستخدم fill_template.py + python-pptx لتعبئة القوالب الأصلية بدون تغيير التصميم
 */
const { execFile } = require("child_process");
const path = require("path");

const TPL_DIR   = path.join(__dirname, "templates");
const PY_SCRIPT = path.join(__dirname, "fill_template.py");

function generateReport(type, state) {
  return new Promise((resolve, reject) => {
    const valid = ["comprehensive","أ","ب","ج","د"];
    if (!valid.includes(type)) return reject(new Error("نوع تقرير غير معروف: " + type));
    if (!state || !state.items) return reject(new Error("البيانات غير متاحة"));

    const payload = JSON.stringify({ type, state, tpl_dir: TPL_DIR });

    // جرب python3 أولاً، ثم python
    const tryRun = (cmd) => new Promise((res, rej) => {
      const proc = execFile(cmd, [PY_SCRIPT], { maxBuffer: 20*1024*1024, encoding:"buffer", timeout:30000 }, (err, stdout, stderr) => {
        if (err) return rej({ err, stderr: stderr?.toString() });
        if (!stdout || stdout.length < 500) return rej({ err: new Error("output too small"), stderr: stderr?.toString() });
        res(stdout);
      });
      proc.stdin.write(payload);
      proc.stdin.end();
    });

    tryRun("python3")
      .catch(() => tryRun("python"))
      .then(resolve)
      .catch(({ err, stderr }) => {
        reject(new Error("فشل توليد التقرير: " + (stderr || err?.message || "خطأ غير معروف")));
      });
  });
}

module.exports = { generateReport };

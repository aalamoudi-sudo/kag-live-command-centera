"use strict";
/**
 * report-generator.js v3
 * يستخدم fill_template.py (python-pptx) لضمان استبدال صحيح للنصوص
 * حتى لو كانت موزعة على runs متعددة داخل الشرائح
 */

const { execFile } = require("child_process");
const path = require("path");
const fs   = require("fs");

const TPL_DIR    = path.join(__dirname, "templates");
const PY_SCRIPT  = path.join(__dirname, "fill_template.py");

/**
 * generateReport(type, state) → Promise<Buffer>
 * type: 'comprehensive' | 'أ' | 'ب' | 'ج' | 'د'
 * state: { tracks: [...], items: [...] }
 */
function generateReport(type, state) {
  return new Promise((resolve, reject) => {
    const validTypes = ["comprehensive", "أ", "ب", "ج", "د"];
    if (!validTypes.includes(type)) {
      return reject(new Error("نوع تقرير غير معروف: " + type));
    }
    if (!state || !state.items) {
      return reject(new Error("البيانات غير متاحة"));
    }

    const payload = JSON.stringify({
      type,
      state,
      tpl_dir: TPL_DIR
    });

    const proc = execFile(
      "python3",
      [PY_SCRIPT],
      { maxBuffer: 20 * 1024 * 1024, encoding: "buffer" },
      (err, stdout, stderr) => {
        if (err) {
          const msg = (stderr && stderr.toString) ? stderr.toString().slice(0, 500) : String(err);
          return reject(new Error("فشل توليد التقرير: " + msg));
        }
        if (!stdout || stdout.length < 1000) {
          const msg = (stderr && stderr.toString) ? stderr.toString().slice(0, 300) : "output too small";
          return reject(new Error("ناتج التقرير فارغ أو غير صالح: " + msg));
        }
        resolve(stdout);
      }
    );

    proc.stdin.write(payload);
    proc.stdin.end();
  });
}

module.exports = { generateReport };

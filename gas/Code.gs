/**
 * いえプロ不動産 LP お問い合わせフォーム受付スクリプト
 *
 * このコードは「お問い合わせ」用スプレッドシートの
 * 拡張機能 > Apps Script に貼り付けて使います。
 *
 * やること：
 *   1. 送信内容をスプレッドシートの「お問い合わせ」シートに1行追加
 *   2. NOTIFY_TO 宛てに通知メールを送信
 *   3. 迷惑メール（ボット）対策のチェック
 */

// ===== 設定 =====
const NOTIFY_TO = 'info@iepro-fudosan.com'; // 通知メールの送り先
const SHEET_NAME = 'お問い合わせ';             // 記録するシート名（無ければ自動で作成）
const MIN_FILL_SECONDS = 3;                   // これより速く送信されたらボットとみなす
const MAX_PER_10MIN = 20;                     // 10分あたりの受付上限（大量送信対策）

const TYPE_LABELS = {
  refer: '土地なしのお客様を紹介したい',
  partner: '協業について話を聞きたい',
  other: 'その他',
};

// ===== 受付処理 =====
function doPost(e) {
  const p = (e && e.parameter) || {};

  // --- 迷惑メール対策 1：隠し項目（人には見えない欄）に入力があればボット ---
  // ボットには「成功」と返して、記録もメールもしない
  if (p.website) return json_({ ok: true });

  // --- 迷惑メール対策 2：ページを開いてから送信までが速すぎる ---
  const elapsed = Number(p.elapsed || 0) / 1000;
  if (!(elapsed >= MIN_FILL_SECONDS)) return json_({ ok: true });

  // --- 入力チェック（ブラウザ側でもチェックしていますが、念のためこちらでも） ---
  const data = {
    company: clean_(p.company, 100),
    name: clean_(p.name, 50),
    tel: clean_(p.tel, 30),
    mail: clean_(p.mail, 254),
    type: TYPE_LABELS[p.type] || '',
    msg: clean_(p.msg, 2000),
  };
  if (!data.company || !data.name || !data.mail || !data.type) {
    return json_({ ok: false, error: 'required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.mail)) {
    return json_({ ok: false, error: 'mail' });
  }
  if (data.tel && !/^[0-9０-９\-－()（）+＋\s]+$/.test(data.tel)) {
    return json_({ ok: false, error: 'tel' });
  }
  // URLだらけの本文は迷惑メールの典型
  if ((data.msg.match(/https?:\/\//gi) || []).length > 2) return json_({ ok: true });

  // --- 迷惑メール対策 3：短時間の大量送信を止める ---
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const count = Number(cache.get('count') || 0);
    if (count >= MAX_PER_10MIN) return json_({ ok: false, error: 'busy' });
    cache.put('count', String(count + 1), 600);

    // --- スプレッドシートに記録 ---
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['受付日時', '会社名', 'ご担当者名', '電話番号', 'メールアドレス', 'お問い合わせ内容', 'ご相談内容']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date(),
      safeCell_(data.company),
      safeCell_(data.name),
      safeCell_(data.tel),
      safeCell_(data.mail),
      data.type,
      safeCell_(data.msg),
    ]);
  } finally {
    lock.releaseLock();
  }

  // --- 通知メール ---
  const body = [
    'LPのお問い合わせフォームから送信がありました。',
    '',
    '会社名　　　　：' + data.company,
    'ご担当者名　　：' + data.name,
    '電話番号　　　：' + (data.tel || '（未入力）'),
    'メールアドレス：' + data.mail,
    'お問い合わせ内容：' + data.type,
    '',
    '【ご相談内容】',
    data.msg || '（未入力）',
    '',
    '---',
    '記録先：' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    'このメールに返信すると、お問い合わせ者に返信できます。',
  ].join('\n');

  MailApp.sendEmail({
    to: NOTIFY_TO,
    replyTo: data.mail,
    subject: '【LPお問い合わせ】' + data.company + ' ' + data.name + ' 様',
    body: body,
  });

  return json_({ ok: true });
}

// ブラウザで URL を直接開いたときの表示（動作確認用）
function doGet() {
  return ContentService.createTextOutput('お問い合わせ受付スクリプトは動作しています。');
}

// ===== 補助関数 =====
function clean_(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

// = + - @ で始まる値は数式として実行されないよう先頭に ' を付ける
function safeCell_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Apps Script エディタから実行して、権限の許可とメール送信をテストする用
function testSetup() {
  MailApp.sendEmail(NOTIFY_TO, '【テスト】LPお問い合わせフォーム設定', 'Apps Script からのテスト送信です。このメールが届けば設定OKです。');
  SpreadsheetApp.getActiveSpreadsheet();
}

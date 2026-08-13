/**
 * ui/views/feedback.js — 回報問題
 *
 * 這是全站唯一會把資料送出去的地方，而且只在使用者按下「送出」時才送。
 * 要送什麼一律攤在畫面上（診斷資訊可以點開看、完整規劃要自己勾），不在背後夾帶。
 *
 * 送出管道是 Google 表單。表單端點沒有 CORS，只能用 mode:'no-cors'，
 * 瀏覽器讀不到回應 —— 程式只知道「請求送出去了」，不知道 Google 收下沒有。
 * 所以文案寫「已送出」而不是「已收到」，而且送不出去時不清掉使用者打的字。
 *
 * 檔名不叫 report.js：views/report.js 已經是「判定結果」了。
 */

import { store } from '../store.js';
import { esc, toast } from '../dom.js';
import { FEEDBACK, isConfigured } from '../feedback-config.js';

const LAST_SENT_KEY = 'credit-planner/feedback-last';
const MIN_LENGTH = 5;
const COOLDOWN_MS = 30000;
const PLAN_LIMIT = 30000;

/* ── 附帶內容 ─────────────────────────────── */

/**
 * 自動附上的診斷資訊。只有重現問題會用到的東西，
 * 沒有課名、沒有姓名 —— 那些要使用者自己勾「附上完整規劃」才會送。
 */
function buildDiagnostics() {
  const { plan } = store;
  const scheduled = plan.courses.filter((c) => c.semester).length;
  const identities = [
    ...(plan.identityIds || []),
    ...(plan.customIdentities || []).map((i) => i.label),
  ];
  const options = Object.entries(plan.options || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('、');

  return [
    `版號：${document.documentElement.dataset.build || '(未標記)'}`,
    `網址：${location.href}`,
    `瀏覽器：${navigator.userAgent}`,
    `視窗：${window.innerWidth}×${window.innerHeight}`,
    `主修：${plan.majorId}`,
    `其他身分：${identities.length ? identities.join('、') : '無'}`,
    `修業選項：${options || '無'}`,
    `課程：共 ${plan.courses.length} 門，已排入學期 ${scheduled} 門`,
    `自動保存：${store.persistEnabled ? '開啟' : '關閉'}`,
  ].join('\n');
}

/** 勾選才會呼叫。姓名欄位在這裡拿掉，畫面上也是這樣寫的，兩邊要一致 */
function buildPlanAttachment() {
  const data = JSON.parse(store.exportPlan());
  if (data.meta) delete data.meta.studentName;
  const json = JSON.stringify(data, null, 2);
  return json.length > PLAN_LIMIT
    ? `${json.slice(0, PLAN_LIMIT)}\n…（超過 ${PLAN_LIMIT} 字，其餘略過）`
    : json;
}

/* ── 送出 ─────────────────────────────────── */

/**
 * URLSearchParams 會自動帶 application/x-www-form-urlencoded，
 * 那是 CORS 安全清單裡的型態，不會觸發 preflight（no-cors 也擋不住 preflight）。
 *
 * 換成別的收件服務時，整支站只有這一支函式要改。
 */
async function send({ message, email, diagnostics, plan }) {
  const body = new URLSearchParams();
  const set = (field, value) => field && body.set(field, value);
  set(FEEDBACK.fields.message, message);
  set(FEEDBACK.fields.email, email);
  set(FEEDBACK.fields.diagnostics, diagnostics);
  set(FEEDBACK.fields.plan, plan);

  await fetch(`https://docs.google.com/forms/d/e/${FEEDBACK.formId}/formResponse`, {
    method: 'POST',
    mode: 'no-cors',
    body,
  });
}

/* 無痕模式讀寫 localStorage 會丟例外，跟全站一樣一律包起來 */
const lastSentAt = () => {
  try {
    return Number(localStorage.getItem(LAST_SENT_KEY)) || 0;
  } catch {
    return 0;
  }
};
const markSent = () => {
  try {
    localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
  } catch {
    /* 記不住就算了，頂多擋不到連續送出 */
  }
};

/* ── 視窗 ─────────────────────────────────── */

export function openFeedback() {
  const diagnostics = buildDiagnostics();

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="回報問題">
      <h3>回報問題</h3>
      <p class="sub">判定結果不對、規定科目有誤、畫面壞掉，都可以說。寫得愈具體愈有機會修好。</p>

      <div id="fbError" class="notice bad" hidden></div>

      <label for="fbMessage">遇到什麼問題？</label>
      <textarea id="fbMessage" rows="6" maxlength="2000"
        placeholder="例如：我勾了計財輔系，但「衍生性金融市場」的 3 學分沒有算進輔系項目，還是留在其他選修。"></textarea>

      <label for="fbEmail">聯絡 email</label>
      <input type="text" id="fbEmail" placeholder="選填。想收到回覆再填，不填一樣送得出去">

      <div style="margin-top:14px;padding:10px 12px;background:var(--paper-dark);border:1px solid var(--hairline);border-radius:2px">
        <label for="fbAttachPlan"
          style="display:flex;gap:8px;align-items:flex-start;margin:0;cursor:pointer;font-size:12px;color:var(--ink);letter-spacing:0;line-height:1.6">
          <input type="checkbox" id="fbAttachPlan" style="margin-top:3px;flex:0 0 auto">
          <span>附上我完整的規劃內容（含課名與排課），你比較好重現問題。<b>姓名欄位不會送出。</b></span>
        </label>
      </div>

      <details style="margin-top:10px">
        <summary style="font-size:11.5px;color:var(--ink-soft);cursor:pointer">
          另外會附上這些診斷資訊（點開看實際內容）
        </summary>
        <pre style="margin:8px 0 0;padding:10px;background:var(--paper-dark);border:1px solid var(--hairline);
                    border-radius:2px;font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;
                    color:var(--ink-soft);white-space:pre-wrap;word-break:break-all">${esc(diagnostics)}</pre>
      </details>

      <div class="modal-actions">
        <button class="btn-ghost btn-small" id="fbCopy" type="button">複製內容</button>
        <span class="spacer"></span>
        <button class="btn-ghost" id="fbCancel" type="button">取消</button>
        <button class="btn-ghost" id="fbSend" type="button">送出</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const messageEl = overlay.querySelector('#fbMessage');
  const emailEl = overlay.querySelector('#fbEmail');
  const attachEl = overlay.querySelector('#fbAttachPlan');
  const sendBtn = overlay.querySelector('#fbSend');
  const errorBox = overlay.querySelector('#fbError');

  /* help.js／tags.js 的 Esc 監聽只有按了 Esc 才移除，用別的方式關掉會殘留；這裡一律清掉 */
  const onKey = (e) => e.key === 'Escape' && confirmClose();
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  /* 打了一半的回報被誤觸關掉最惱人，先問一句 */
  function confirmClose() {
    if (messageEl.value.trim() && !confirm('關掉的話剛剛打的內容就沒了。確定關閉？')) return;
    close();
  }

  overlay.addEventListener('click', (e) => e.target === overlay && confirmClose());
  overlay.querySelector('#fbCancel').addEventListener('click', confirmClose);
  document.addEventListener('keydown', onKey);

  /** 送不出去時給人整份帶走的純文字，內容跟真的送出去的完全一樣 */
  const compose = () => {
    const parts = [messageEl.value.trim()];
    const email = emailEl.value.trim();
    if (email) parts.push(`聯絡 email：${email}`);
    parts.push('--- 診斷資訊 ---', diagnostics);
    if (attachEl.checked) parts.push('--- 完整規劃 ---', buildPlanAttachment());
    return parts.join('\n\n');
  };

  const fallback = (reason) => {
    const where = FEEDBACK.contactEmail
      ? `，再寄到 <b>${esc(FEEDBACK.contactEmail)}</b>`
      : '，再用其他方式傳給作者';
    errorBox.innerHTML = `${reason}你打的內容還在，按左下角「複製內容」可以整份帶走${where}。`;
    errorBox.hidden = false;
  };

  overlay.querySelector('#fbCopy').addEventListener('click', async () => {
    const text = compose();
    try {
      await navigator.clipboard.writeText(text);
      toast('已複製，可以貼到信件或訊息裡');
    } catch {
      /* 非 HTTPS 或使用者拒絕權限：至少幫他整理好、選起來，自己按 Ctrl+C */
      messageEl.value = text;
      messageEl.focus();
      messageEl.select();
      toast('這個瀏覽器不給自動複製，內容已整理在欄位裡，請按 Ctrl+C');
    }
  });

  sendBtn.addEventListener('click', async () => {
    const message = messageEl.value.trim();
    if (message.length < MIN_LENGTH) {
      toast('請多描述一點，才有辦法查問題');
      messageEl.focus();
      return;
    }
    if (!isConfigured()) {
      fallback('回報功能還沒設定好收件的表單，沒辦法直接送出。');
      return;
    }
    const wait = COOLDOWN_MS - (Date.now() - lastSentAt());
    if (wait > 0) {
      toast(`剛剛才送出過，請等 ${Math.ceil(wait / 1000)} 秒再送`);
      return;
    }

    errorBox.hidden = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '送出中…';
    try {
      await send({
        message,
        email: emailEl.value.trim(),
        diagnostics,
        plan: attachEl.checked ? buildPlanAttachment() : '',
      });
      markSent();
      close();
      /* no-cors 讀不到回應，只能說「已送出」，不能說「已收到」 */
      toast('已送出，謝謝你的回報');
    } catch {
      fallback('送不出去，可能是網路不通或表單被擋下來。');
      sendBtn.disabled = false;
      sendBtn.textContent = '送出';
    }
  });

  messageEl.focus();
}

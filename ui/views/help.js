/**
 * ui/views/help.js — 使用說明
 *
 * 第一次造訪自動彈出一次（用 localStorage 記住看過了），
 * 之後可以按右上角「使用說明」按鈕隨時再打開。
 */

const SEEN_KEY = 'credit-planner/help-seen';

const SECTIONS = [
  {
    title: '1. 修業設定',
    body: '選主修、輔系／雙主修等身分模組，以及專業學程等修業選項。畢業應修學分由這裡選的身分加總而來，改了會立刻重算右側的判定結果。',
  },
  {
    title: '2. 規定科目匯入',
    body: '一鍵把主修（及所選身分模組）的規定必修科目加進待排課程，不用自己一門一門手動輸入。',
  },
  {
    title: '3. 新增課程',
    body: '手動新增選修課、通識課或任何規定科目以外的課程，填課名、學分、標籤即可。',
  },
  {
    title: '4. 待排課程',
    body: '還沒排進學期的課會列在這裡，可以用上方欄位搜尋課名。卡片上的下拉選單可以改標籤，標籤決定學分算進哪個項目。',
  },
  {
    title: '5. 四年課表',
    body: '把待排課程拖曳到對應學期的格子裡完成排課；也可以先點卡片選取、再點學期格子。拖回「待排課程」區可以取消排課。',
  },
  {
    title: '6. 判定結果',
    body: '依大類 / 項目顯示學分認列進度與是否達成畢業門檻。右上角「標籤設定」可以調整某個標籤要歸屬到哪個項目。判定結果僅供規劃參考，實際畢業資格以系辦與教務處公告為準。',
  },
];

const TIPS = [
  '右上角「自動保存」預設關閉，關掉分頁或重新整理就會清空；打開後規劃只會存在這個瀏覽器裡，不會上傳、不會跨裝置同步。',
  '不管有沒有開自動保存，都可以按「匯出規劃」把目前的排課存成檔案，下次用「匯入規劃」讀回來。',
  '「清空」會清掉所有課程與設定，且無法復原，建議先匯出備份再清空。',
  '判定結果不對或畫面壞掉，可以按右上角「回報問題」告訴作者。<b>只有</b>你按下送出的那一刻才會把你填的內容送出去，平常使用完全不連網；要附上完整規劃內容也是你自己勾選才會附。',
];

export function openHelp() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="使用說明">
      <h3>使用說明</h3>
      <p class="sub">這份規劃表分成六個步驟，由左而右、由上而下依序完成即可。</p>

      ${SECTIONS.map(
        (s) => `
        <div style="margin-bottom:12px">
          <div style="font-weight:600;font-size:13px;margin-bottom:3px">${s.title}</div>
          <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.6">${s.body}</div>
        </div>`
      ).join('')}

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--hairline)">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">小提醒</div>
        <ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-soft);line-height:1.7">
          ${TIPS.map((t) => `<li>${t}</li>`).join('')}
        </ul>
      </div>

      <div class="modal-actions">
        <span class="spacer"></span>
        <button class="btn-ghost" id="helpClose" type="button">知道了</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  overlay.querySelector('#helpClose').addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });
}

/** 第一次造訪才自動跳出；無痕模式讀不到 localStorage 就當作沒看過，照樣顯示，只是記不住 */
export function maybeAutoShowHelp() {
  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === 'yes';
  } catch {
    seen = false;
  }
  if (seen) return;
  openHelp();
  try {
    localStorage.setItem(SEEN_KEY, 'yes');
  } catch {
    /* 無痕模式：這次照樣顯示過了，下次開站會再顯示一次，沒關係 */
  }
}

/* Help body HTML for ZH / EN — loaded into data-i18n-html="helpHtml" */
(function () {
  const zh = `
<h3 class="mb-3">功能說明</h3>
<p class="text-secondary">本工具在你的電腦瀏覽器離線分析 Status History 匯出檔（.mhtml / .html），不上外網。</p>

<h4>1. 整體流程</h4>
<ol>
  <li>在設備網頁開啟 Status History，另存為 mhtml／html。</li>
  <li>拖到本頁上傳區（或按「試用示範檔」）。</li>
  <li>查看站點路徑、斷電／復電、距今與時長。</li>
  <li>可下載 PNG、Word、CSV。檔名依 <strong>TD／站點</strong> 動態命名，不是固定一台機。</li>
</ol>

<h4>2. 名稱與站點（不是固定名稱）</h4>
<ul>
  <li><strong>站點路徑</strong>：來自網頁麵包屑，例如 <code>VHF › TD Tx › TD Tx Cab 2 › TD Tx15 Autotune</code>。</li>
  <li><strong>設備標題</strong>：路徑最後一節（當時選取的機）。</li>
  <li><strong>TD 列表</strong>：頁面樹狀選單中所有 TD 節點；目前選取者會標示。</li>
  <li><strong>匯出檔名</strong>：例如 <code>TD_Tx15_Autotune_TD_Tx_Cab_2_elapsed.png</code>。</li>
</ul>

<h4>3. ETI 是什麼</h4>
<p><strong>Elapsed Time Indication</strong> 是設備累積運轉時間，例如 <code>1904h23m</code> = 1904 小時 23 分。</p>
<ul>
  <li><strong>目前 ETI</strong>：匯出當下頁面上的 ETI。</li>
  <li><strong>事件 ETI</strong>：該筆 Status History 發生時的 ETI。</li>
</ul>

<h4>4. 距今（幾天前）公式</h4>
<div class="help-formula">小時差 = |目前ETI小時 - 事件ETI小時|
距今天數 = 小時差 / 24</div>
<p>畫面會顯示成「X 天 Y 小時 Z 分（約 N.NN 天）」。</p>
<p class="text-secondary mb-0">這是相對<strong>匯出當下</strong>的目前 ETI，不是相對你今天打開報告的時間。請盡量當天匯出、當天分析。</p>

<h4 class="mt-3">5. 日期時間怎麼來</h4>
<ol>
  <li><strong>優先：NTP</strong> — 歷史列若有網路時間（非 N/A），直接轉成本地日期時間。</li>
  <li><strong>否則推算</strong>：事件時刻 = 參考時間 − 小時差。<br>
    參考時間優先用 mhtml 的 Date（匯出時間），其次檔案修改時間，再其次本機現在時間。</li>
</ol>

<h4>6. 斷電／復電判定</h4>
<ul>
  <li><code>AC</code> + <code>Reduced Service</code> → <strong>斷電</strong></li>
  <li><code>AC</code> + <code>Cleared</code> → <strong>復電</strong></li>
  <li><code>DC Supply (V)</code> + Reduced／Cleared → DC 異常／恢復</li>
  <li>其他（System、E-BIT、Radio Start…）→ 狀態</li>
</ul>

<h4>7. 本次時長、斷電次數、斷電總時間</h4>
<ul>
  <li>依 ETI 由舊到新，把「斷電」與下一次「復電」配對。</li>
  <li><strong>本次時長</strong> = 復電ETI小時 − 斷電ETI小時。</li>
  <li>若尚未復電：時長 = 目前ETI − 斷電ETI，並標示未復電中。</li>
  <li><strong>斷電次數</strong> = 配對組數；<strong>斷電總時間</strong> = 各次時長加總。</li>
</ul>

<h4>8. 健康檢查</h4>
<ul>
  <li>服務狀態不是 Full Service，或</li>
  <li>最新一筆 AC 仍是斷電（約 7 天內）→ 標示「需要留意」。</li>
  <li>否則「健康：正常」。</li>
</ul>

<h4>9. 按鈕功能</h4>
<ul class="mb-0">
  <li><strong>下載圖片</strong>：報告區輸出 PNG</li>
  <li><strong>Word / CSV</strong>：表格匯出</li>
  <li><strong>再分析一份</strong>：回到上傳畫面</li>
  <li><strong>中文／English</strong>：介面語言（會記住）</li>
</ul>
`;

  const en = `
<h3 class="mb-3">How it works</h3>
<p class="text-secondary">This tool analyzes Status History exports (.mhtml / .html) offline in your browser — no internet required.</p>

<h4>1. Workflow</h4>
<ol>
  <li>Open Status History on the radio web UI and save as mhtml/html.</li>
  <li>Drop the file here (or use “Try sample file”).</li>
  <li>Review site path, outages, “ago”, and durations.</li>
  <li>Export PNG, Word, or CSV. Filenames use the <strong>TD / site</strong> name dynamically — not one fixed radio.</li>
</ol>

<h4>2. Names &amp; sites (not fixed)</h4>
<ul>
  <li><strong>Site path</strong>: from the page breadcrumb, e.g. <code>VHF › TD Tx › TD Tx Cab 2 › TD Tx15 Autotune</code>.</li>
  <li><strong>Unit title</strong>: last breadcrumb segment (the unit that was selected).</li>
  <li><strong>TD list</strong>: all TD nodes in the tree; the current one is highlighted.</li>
  <li><strong>Export name</strong>: e.g. <code>TD_Tx15_Autotune_TD_Tx_Cab_2_elapsed.png</code>.</li>
</ul>

<h4>3. What is ETI?</h4>
<p><strong>Elapsed Time Indication</strong> is cumulative run time, e.g. <code>1904h23m</code> = 1904 hours 23 minutes.</p>
<ul>
  <li><strong>Current ETI</strong>: value on the page at export time.</li>
  <li><strong>Event ETI</strong>: ETI when that Status History row occurred.</li>
</ul>

<h4>4. “Days ago” formula</h4>
<div class="help-formula">hoursDiff = |currentETI_hours - eventETI_hours|
daysAgo = hoursDiff / 24</div>
<p>Shown as “Xd Yh Zm (~N.NN days)”.</p>
<p class="text-secondary mb-0">This is relative to <strong>current ETI at export</strong>, not the moment you open the report. Prefer export-and-analyze the same day.</p>

<h4 class="mt-3">5. How date/time is derived</h4>
<ol>
  <li><strong>Prefer NTP</strong> — if the history row has a network timestamp (not N/A), convert to local date/time.</li>
  <li><strong>Otherwise estimate</strong>: eventTime = referenceTime − hoursDiff.<br>
    Reference time prefers the mhtml <code>Date</code> header (export time), then file mtime, then “now”.</li>
</ol>

<h4>6. Outage / restore rules</h4>
<ul>
  <li><code>AC</code> + <code>Reduced Service</code> → <strong>Outage</strong></li>
  <li><code>AC</code> + <code>Cleared</code> → <strong>Restored</strong></li>
  <li><code>DC Supply (V)</code> + Reduced/Cleared → DC fault / OK</li>
  <li>Other (System, E-BIT, Radio Start…) → Status</li>
</ul>

<h4>7. Duration, count, total outage time</h4>
<ul>
  <li>Sort AC outage/restore by ETI oldest→newest; pair each outage with the next restore.</li>
  <li><strong>Duration</strong> = restoreETI_hours − outageETI_hours.</li>
  <li>If still out: duration = currentETI − outageETI (marked ongoing).</li>
  <li><strong>Outage count</strong> = number of pairs; <strong>total outage time</strong> = sum of durations.</li>
</ul>

<h4>8. Health check</h4>
<ul>
  <li>Service status is not Full Service, or</li>
  <li>Latest AC event is still an outage (within ~7 days) → “Needs attention”.</li>
  <li>Otherwise “Healthy”.</li>
</ul>

<h4>9. Buttons</h4>
<ul class="mb-0">
  <li><strong>Download PNG</strong>: capture the report area</li>
  <li><strong>Word / CSV</strong>: table export</li>
  <li><strong>Analyze another</strong>: back to upload</li>
  <li><strong>中文 / English</strong>: UI language (remembered)</li>
</ul>
`;

  if (!window.ETI_I18N) window.ETI_I18N = { zh: {}, en: {} };
  window.ETI_I18N.zh.helpBtn = "? 說明";
  window.ETI_I18N.zh.helpTitle = "說明：公式、日期時間與各功能";
  window.ETI_I18N.zh.helpHtml = zh;
  window.ETI_I18N.en.helpBtn = "? Help";
  window.ETI_I18N.en.helpTitle = "Help: formulas, date/time, and features";
  window.ETI_I18N.en.helpHtml = en;
})();

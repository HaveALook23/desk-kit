# Desk Kit

非官方當值參考工具（靜態網頁）。**不是**香港海關、公務員事務局或庫務署的官方網站。

線上試用（GitHub Pages）：<https://havealook23.github.io/desk-kit/>

## 這是什麼

瀏覽器本機計算器，功能包括：

- 煙草應課稅試算（免稅優惠由使用者選擇，不會自動「優先扣雪茄」）
- 公務員退休金粗算（NPS 最高折算 50%，OPS 最高 25%）
- 公務員公積金（CSPF）：查現時政府供款率、積金局截至 31/07/2026 的選定計劃曆年回報；不是個人帳戶結餘
- 更表（香港本地日期）
- 抽假（`crypto.getRandomValues` + 雜湊紀錄）
- 裝備時間分配（可預留早餐／午餐等固定時段，其餘平均分）
- 宿舍計分（標明非正式）

法律數字集中在 [`site/data/legal-data.js`](site/data/legal-data.js)，並顯示最後核實日期。

## 這不是什麼

- 不是法律意見、檢控決定或退休金批核
- 不是完整 PWA：沒有 service worker、沒有離線快取
- 不嵌入第三方 AI
- 不設留言後端（因此不會把「毋須公開姓名」說成「匿名不可追查」）
- 不處理運作需要退休、喪失工作能力、超額人員等特殊退休情況（請用[公務員事務局計算器](https://www.csb.gov.hk/english/admin/retirement/185.html)）

## 本機

```bash
npm test
```

用任何靜態伺服器開 `site/`，例如：

```bash
npx --yes serve site
```

GitHub Pages 只部署 `site/`，workflow 只有一條 Pages 部署（另有一條測試，不會互搶上線內容）。

## 資料來源（最後核實 26/08/2026）

### 煙草／應課稅品

- 稅率：香煙每 1,000 支 HK$3,306；雪茄每公斤 HK$4,258。[香港海關：種類及稅率](https://www.customs.gov.hk/tc/service-enforcement-information/trade-facilitation/dutiable-commodities/types-and-duty-rates/index.html)
- 免稅優惠（或關係）：19 支香煙；或 1 支雪茄／多於 1 支則總重不超過 25 克；或 25 克其他製成煙草。跨境司機不享有免稅優惠。[香港海關：免稅優惠](https://www.customs.gov.hk/tc/service-enforcement-information/passenger-clearance/duty-free-concessions/index.html)
- 未完稅煙草最高刑罰：罰款 HK$2,000,000、監禁 7 年。有代價地不予檢控（未申報）定額罰則 HK$5,000。[香港海關：常見控罪及刑罰](https://www.customs.gov.hk/tc/service-enforcement-information/passenger-clearance/faqs/common-charges-penalties/index.html)
- Compounding Scheme 曾公開為「5 倍應課稅款 + $2,000」（[18/03/2024 新聞公報](https://www.info.gov.hk/gia/general/202403/18/P2024031800529.htm)）。2025 年修例把有代價地不予檢控由 $2,000 調至 $5,000（[25/09/2025 立法會答覆](https://www.info.gov.hk/gia/general/202509/25/P2025092300405.htm)）。5 倍公式在修例文本沒有再覆述；試算會標明這一點。是否不予檢控屬部門酌情。

### 退休金

- 折算上限：OPS 25%、NPS 50%，須為 5% 倍數。[公務員事務局計算器說明](https://www.csb.gov.hk/english/admin/retirement/185.html)、[常見問題](https://www.csb.gov.hk/english/admin/retirement/2541.html)、[庫務署 FAQ](https://www.try.gov.hk/internet/ehpens_faq.html)
- 因子與 14 倍酬金、三分之二上限：[NPS 指引](https://www.csb.gov.hk/english/admin/retirement/files/guide_nps.doc)、[OPS 指引](https://www.csb.gov.hk/english/admin/retirement/files/guide_ops.doc)

NPS 指引把「折算後剩餘年退休金」寫成 50%–95% 的 *reduced pension*；那是剩餘比例，不是可以把 95% 整筆折算。本工具的下拉選單只提供折算 0%–50%（NPS）或 0%–25%（OPS）。

## 免責

計算可能過時或簡化。實際稅款、罰則、免稅資格、退休金由主管當局及現行法例決定。請勿在此輸入個人資料、案件或內部資料。

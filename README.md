# 🎃 南瓜多商鋪 (Nanguado Shop)

歡迎來到南瓜多商鋪的開源單品與多規格電商系統！本專案採用現代化的 Monorepo 架構建立，包含了基於 Next.js 15 的前端 Web 站台、基於 NestJS 的後端 RESTful API、以及 Drizzle ORM 與 PostgreSQL 資料庫。

---

## 🚀 快速開始開發

### 1. 安裝依賴項
專案採用 `pnpm` 工作區管理，請確保本機已安裝 `pnpm`：
```bash
pnpm install
```

### 2. 環境變數設定
複製專案根目錄的 `.env.example` 為 `.env` 並填入資料庫與金流設定：
```bash
cp .env.example .env
```
本專案已預設配置官方的綠界金流測試商戶金鑰 (MerchantID: `2000132`)。

### 3. 同步資料庫與寫入初始資料
```bash
# 同步 Drizzle Schema 到 Neon PostgreSQL 資料庫
pnpm --filter @repo/db run push

# 寫入預設商品、分類資料與管理員帳號 (devince1105@gmail.com / Admin@12345)
pnpm --filter @repo/db run seed
```

### 4. 啟動開發伺服器
```bash
pnpm dev
```
*   **前端 Web 站台**：[http://localhost:3000](http://localhost:3000)
*   **後端 API 伺服器**：[http://localhost:4000/api/v1](http://localhost:4000/api/v1)

---

## 📦 本地 Docker Compose 部署驗證

本專案支援使用 Docker 進行一鍵容器化封裝與部署測試：

```bash
# 一鍵啟動 前端、後端 與 PostgreSQL 資料庫的容器環境
docker-compose up --build
```
運行成功後，即可在本地測試完整的容器化生產環境。

---

## 📡 綠界金流真實 Webhook 回調測試

由於綠界測試收銀台必須向公網傳送付款結果 Webhook（ReturnURL），因此本地開發時必須搭配通道工具（如 `ngrok` 或 `localtunnel`）：

### 步驟 1：啟動本機通道
使用 `localtunnel` 將後端 API 伺服器端口 (`4000`) 映射至公網：
```bash
npx localtunnel --port 4000
```
或使用 `ngrok`：
```bash
ngrok http 4000
```

### 步驟 2：更新環境變數
將通道取得的公網 URL（例如：`https://glorious-bears-jump.loca.lt`）填入根目錄 `.env` 中的 `API_BASE_URL`：
```env
API_BASE_URL=https://glorious-bears-jump.loca.lt
```

### 步驟 3：重新啟動後端並進行交易
重新啟動 API 伺服器，顧客下單並完成模擬付款後，綠界即可透過該公網網址向本地發送 Webhook 回調，成功扣減規格庫存！

---

## 🔒 訂單重新付款（Repay）防護機制

為了解決綠界不允許以相同「商店訂單編號 (MerchantTradeNo)」重複送出交易的防護限制，本系統實作了**自適應重付防護**：
*   當顧客對待付款（`pending`）訂單點選 **「前往付款」** 時，前端將呼叫 `/api/v1/orders/:id/repay` (POST) 介面。
*   後端會自動在資料庫內為該訂單**產生一組全新的隨機交易號（NGD + 時間戳 + 隨機數）**並存檔，同時對齊金額重新與綠界簽章，保證結帳流程順暢無阻。

---

## 🤖 生產部署與 CI/CD (GitHub Actions)

專案可選配 GitHub Actions 自動化管線。當代碼併入 `main` 分支時：
1.  **自動建置與測試**（Linter & TypeScript 檢查）。
2.  **Docker 映像檔封裝**並推送至 Docker Registry（如 GitHub Packages 或 Docker Hub）。
3.  **自動發布**至雲端服務（如 AWS ECS、GCP Cloud Run 或 Render）。

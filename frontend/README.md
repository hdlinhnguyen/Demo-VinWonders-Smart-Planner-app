# Trợ lý VinWonders — Chatbot (Next.js + OpenRouter)

Giao diện chat tư vấn dịch vụ vui chơi tại VinWonders, backend gọi LLM qua **[OpenRouter](https://openrouter.ai/)** và `OPENROUTER_API_KEY`.

## Yêu cầu

- **Node.js** 18 trở lên (khuyến nghị 20+)
- **npm**
- API key OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys)

## Cấu trúc thư mục

```text
frontend/
├── app/                    # UI Next.js (trang chat)
├── bot/                    # Logic bot: prompt, gọi OpenRouter
│   ├── openrouter.ts
│   ├── prompts.ts
│   ├── errors.ts
│   └── types.ts
├── api/                    # Xử lý request chat
│   └── chat.ts
├── app/api/chat/route.ts   # Endpoint POST /api/chat
├── .env.example
└── .env hoặc .env.local    # OPENROUTER_API_KEY (tự tạo, không commit)
```

## Cài đặt

```bash
cd frontend
npm install
```

## Cấu hình biến môi trường

Tạo file **`frontend/.env`** hoặc **`frontend/.env.local`**:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

- Copy từ `.env.example` nếu cần.
- **Không** commit file chứa key thật (đã nằm trong `.gitignore`).
- Danh sách model: [openrouter.ai/models](https://openrouter.ai/models) — model miễn phí thường có hậu tố `:free`.

## Chạy bot (development)

```bash
cd frontend
npm run dev
```

Mở trình duyệt: [http://localhost:3000](http://localhost:3000)

- Gõ tin nhắn hoặc bấm gợi ý sẵn trên màn hình chào.
- Phản hồi được **stream** từ OpenRouter.

### Nếu port 3000 đang bận

```bash
npx next dev -p 3001
```

## Build & chạy production (tùy chọn)

```bash
cd frontend
npm run build
npm run start
```

## Kiểm tra API trực tiếp

**Lưu ý:** `/api/chat` trả về **stream text**. Nên test bằng **trình duyệt** (http://localhost:3000) hoặc `curl`.

```bash
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Gợi ý lịch chơi 1 ngày\"}]}"
```

Khi OpenRouter lỗi (401, 429…), API trả **JSON** `{"error":"..."}`:

```powershell
try {
  Invoke-WebRequest -Uri http://localhost:3000/api/chat -Method POST `
    -ContentType "application/json" `
    -Body '{"messages":[{"role":"user","content":"xin chao"}]}' -UseBasicParsing
} catch {
  $_.Exception.Response.StatusCode
  $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
  $reader.ReadToEnd()
}
```

## Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| `OPENROUTER_API_KEY chưa được cấu hình` (503) | Thêm key vào `frontend/.env`, **restart** `npm run dev`. |
| 401 / key không hợp lệ | Tạo key mới tại [openrouter.ai/keys](https://openrouter.ai/keys). |
| 402 / thiếu credits | Nạp credits hoặc dùng model `:free`. |
| 429 / rate limit | Đợi vài phút hoặc đổi `OPENROUTER_MODEL`. |
| Port đã được sử dụng | Dừng process cũ hoặc `npx next dev -p 3001`. |

## Tùy chỉnh bot

- **Persona / nội dung tư vấn:** `bot/prompts.ts`
- **Model:** `OPENROUTER_MODEL` trong `.env` hoặc `bot/openrouter.ts`
- **Logic API:** `api/chat.ts` và `app/api/chat/route.ts`

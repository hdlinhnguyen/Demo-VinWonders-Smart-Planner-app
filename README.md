# Day 06 - AI Product Hackathon

## Cách chạy prototype

Prototype chat tư vấn dịch vụ vui chơi VinWonders nằm trong folder **`frontend/`**.

```bash
cd frontend
npm install
```

Tạo `frontend/.env` (hoặc `.env.local`) với:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Hoặc OpenRouter (khi không điền OPENAI_API_KEY)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Chạy:

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Hướng dẫn chi tiết, cấu trúc `bot/` / `api/`, xử lý lỗi: xem **[frontend/README.md](frontend/README.md)**.

## Công cụ và API đã sử dụng

## Phân công

| **Thành viên** | **Việc phụ trách** | 
|---|---|
| Nguyễn Hồ Diệu Linh & Nguyễn Thị Bích Duyên | Research / evidence | 
| Nguyễn Thị Hiểu | SPEC |
| Hoàng Đức Trường & Trần Hoàng Hà | Prototype, Implement UI, create code base, dev frontend |
| Nguyễn Hoàng Tùng | Test / failure path |
| Everyone | Demo script / repo |
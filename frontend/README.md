# Gemini Chatbot Frontend

Frontend สำหรับ Gemini File Search Chatbot สร้างด้วย Next.js + Tailwind CSS + shadcn/ui

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Language**: TypeScript

## 🚀 Getting Started

### 1. ติดตั้ง Dependencies

```bash
cd frontend
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Chat UI
│   ├── admin/
│   │   └── page.tsx          # Admin UI
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── ui/                   # shadcn/ui components
├── lib/
│   └── utils.ts              # Utility functions
├── public/                   # Static assets
├── .env.local                # Environment variables
├── .env.example              # Example env file
└── package.json
```

## 🔌 API Integration

Frontend จะเรียก API จาก Backend ที่ URL ระบุใน `NEXT_PUBLIC_API_URL`

### Endpoints ที่ใช้

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | ส่งข้อความถาม |
| `/api/admin/upload` | POST | อัปโหลดไฟล์ |
| `/api/admin/files` | GET | ดูรายการไฟล์ |
| `/api/admin/delete?docId=xxx` | DELETE | ลบไฟล์ |

## 🎨 Pages

### Chat Page (`/`)
- หน้าแชทสำหรับถามตอบ
- แสดงประวัติการสนทนา
- รองรับคำถามแนะนำ

### Admin Page (`/admin`)
- อัปโหลดเอกสารใหม่
- ดูรายการเอกสารทั้งหมด
- ลบเอกสาร

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | URL ของ Backend API | ✅ |

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |

## 🔄 Development Workflow

1. Start backend server first:
   ```bash
   cd backend
   npm run dev
   ```

2. Start frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the app at [http://localhost:3000](http://localhost:3000)

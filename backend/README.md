# Gemini Chatbot Backend

Backend API สำหรับ Gemini File Search Chatbot สร้างด้วย Node.js + Express + TypeScript

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **AI SDK**: @google/genai
- **File Upload**: Multer

## 🚀 Getting Started

### 1. ติดตั้ง Dependencies

```bash
cd backend
npm install
```

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
GEMINI_API_KEY=your_api_key_here
FILE_SEARCH_STORE_NAME=fileSearchStores/your-store-name
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. สร้าง File Search Store (ครั้งเดียว)

```bash
export GEMINI_API_KEY=your_api_key_here
npx ts-node src/scripts/create-store.ts
```

นำ `store.name` ที่ได้ไปใส่ใน `.env`

### 4. Run Development Server

```bash
npm run dev
```

หรือ build แล้ว run:

```bash
npm run build
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main server entry
│   ├── routes/
│   │   ├── chat.ts           # Chat API routes
│   │   └── admin.ts          # Admin API routes
│   ├── lib/
│   │   ├── gemini.ts         # Gemini AI init
│   │   └── fileSearch.ts     # File Search helpers
│   └── scripts/
│       └── create-store.ts   # Create File Search Store
├── uploads/                  # Temporary upload folder
├── .env                      # Environment variables
├── .env.example              # Example env file
└── package.json
```

## 🔌 API Endpoints

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | ส่งข้อความถามและรับคำตอบ |

**Request Body:**
```json
{
  "message": "คำถามของคุณ"
}
```

**Response:**
```json
{
  "response": "คำตอบจาก AI"
}
```

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/upload` | อัปโหลดเอกสาร (multipart/form-data) |
| GET | `/api/admin/files` | ดูรายการเอกสาร |
| DELETE | `/api/admin/delete?docId=xxx` | ลบเอกสาร |

**Upload Request:**
```
POST /api/admin/upload
Content-Type: multipart/form-data

file: <binary file data>
```

**Files Response:**
```json
{
  "documents": [
    {
      "name": "fileSearchStores/xxx/documents/yyy",
      "displayName": "document.pdf",
      "createTime": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | API Key สำหรับ Gemini API | ✅ |
| `FILE_SEARCH_STORE_NAME` | ชื่อ File Search Store | ✅ |
| `PORT` | Port ที่ server จะ run | ❌ (default: 3001) |
| `FRONTEND_URL` | URL ของ frontend (สำหรับ CORS) | ❌ (default: http://localhost:3000) |

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production server |
| `npx ts-node src/scripts/create-store.ts` | Create File Search Store |

## 🔒 Security

- จำกัด file type: PDF, TXT, MD
- จำกัดขนาดไฟล์: 10MB
- CORS enabled สำหรับ frontend URL

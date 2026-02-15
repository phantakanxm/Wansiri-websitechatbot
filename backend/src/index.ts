import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat";
import chatTestRoutes from "./routes/chatTest";
import chatStreamRoutes from "./routes/chatStream";
import adminRoutes from "./routes/admin";
import sessionRoutes from "./routes/sessions";
import healthRoutes from "./routes/health";
import analyticsRoutes from "./routes/analytics";
import patientRoutes from "./routes/patients";
import consultationRoutes from "./routes/consultations";
import dashboardRoutes from "./routes/dashboard";
import { globalErrorHandler } from "./lib/errorHandler";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/chat/test", chatTestRoutes);
app.use("/api/chat/stream", chatStreamRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/health", healthRoutes);

// Global error handler - must be last
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Multilingual support: Thai 🇹🇭 | English 🇬🇧 | Korean 🇰🇷`);
  console.log(`⚡ Features: Retry Logic | Translation Cache | Parallel Processing | Streaming`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/analytics/overview`);
  console.log(`📚 API Documentation:`);
  console.log(`   - POST /api/chat           - Chat (standard)`);
  console.log(`   - POST /api/chat/stream    - Chat (streaming SSE)`);
  console.log(`   - GET  /api/analytics/*    - Dashboard analytics`);
  console.log(`   - GET  /api/chat/languages - List supported languages`);
  console.log(`   - POST /api/chat/test      - Test chat with debug info`);
  console.log(`   - GET  /health             - Basic health check`);
  console.log(`   - GET  /health/detailed    - Detailed service status`);
  console.log(`   - GET  /health/cache       - Translation cache stats`);
  console.log(`   - POST /api/admin/upload   - Upload a file`);
  console.log(`   - GET  /api/admin/files    - List all files`);
  console.log(`   - GET  /api/sessions       - List active sessions`);
});

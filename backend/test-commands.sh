# Test Commands for File Search
# Run these in terminal to test the API

# 1. Check if documents are ready
curl http://localhost:3001/api/chat/health | jq

# 2. Test chat with debug info
curl -X POST http://localhost:3001/api/chat/test \
  -H "Content-Type: application/json" \
  -d '{"message": "เตรียมความพร้อมก่อนเปลี่ยนเพศ"}' | jq

# 3. Test original chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "เตรียมความพร้อมก่อนเปลี่ยนเพศ"}' | jq

# 4. List all files
curl http://localhost:3001/api/admin/files | jq

# 5. Run detailed test script
cd /Users/phantakan/Documents/project-wansiri/chatbotUI3022026/backend
npx ts-node src/scripts/test-file-search.ts

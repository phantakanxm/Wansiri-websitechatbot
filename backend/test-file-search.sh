#!/bin/bash

# Test script for File Search functionality
# Usage: ./test-file-search.sh

echo "🧪 Testing File Search..."
echo ""

API_URL="http://localhost:3001"

# 1. Check health
echo "1️⃣ Checking document status..."
curl -s "$API_URL/api/chat/health" | jq .
echo ""

# 2. Test with a question
echo "2️⃣ Testing chat with debug..."
curl -s -X POST "$API_URL/api/chat/test" \
  -H "Content-Type: application/json" \
  -d '{"message": "เตรียมความพร้อมก่อนเปลี่ยนเพศ"}' | jq .
echo ""

# 3. Run the detailed test script
echo "3️⃣ Running detailed test script..."
npx ts-node src/scripts/test-file-search.ts

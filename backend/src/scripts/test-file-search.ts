import { ai, FILE_SEARCH_STORE_NAME } from "../lib/gemini";

/**
 * Test File Search functionality with detailed logging
 * Run: npx ts-node src/scripts/test-file-search.ts
 */

async function testFileSearch() {
  console.log("🧪 === FILE SEARCH DEBUG TEST ===\n");
  
  // 1. Check store configuration
  console.log("1️⃣ Store Configuration:");
  console.log(`   Store Name: ${FILE_SEARCH_STORE_NAME}`);
  console.log(`   API Key: ${process.env.GEMINI_API_KEY ? "✅ Set" : "❌ Missing"}\n`);

  // 2. List documents in store
  console.log("2️⃣ Documents in Store:");
  try {
    const response = await ai.fileSearchStores.documents.list({
      parent: FILE_SEARCH_STORE_NAME,
    });
    
    const documents = (response as any).pageInternal || response || [];
    console.log(`   Found ${documents.length} document(s)`);
    
    if (documents.length === 0) {
      console.log("   ❌ No documents found! Please upload first.\n");
      return;
    }
    
    documents.forEach((doc: any, i: number) => {
      console.log(`   [${i + 1}] ${doc.displayName || doc.name}`);
      console.log(`       State: ${doc.state || "Unknown"}`);
      console.log(`       Created: ${doc.createTime || "Unknown"}\n`);
    });
  } catch (error) {
    console.error("   ❌ Error listing documents:", error);
    return;
  }

  // 3. Test questions
  const testQuestions = [
    "เตรียมความพร้อมก่อนเปลี่ยนเพศ",
    "ราคาศัลยกรรม",
    "ขั้นตอนการปรึกษาแพทย์",
    "การดูแลหลังผ่าตัด",
  ];

  console.log("3️⃣ Testing File Search with Sample Questions:\n");
  
  for (const question of testQuestions) {
    console.log(`\n📝 Question: "${question}"`);
    console.log("─".repeat(50));
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: question,
        config: {
          systemInstruction: `คุณคือแชตบอทผู้ช่วยของ "โรงพยาบาลวรรณสิริ" 
ตอบคำถามจากข้อมูลในเอกสารเท่านั้น หากไม่มีข้อมูลให้บอกว่าไม่พบ`,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [FILE_SEARCH_STORE_NAME],
              },
            },
          ],
        },
      });

      // Check grounding
      const candidates = (response as any).candidates;
      const metadata = candidates?.[0]?.groundingMetadata;
      
      if (metadata) {
        const chunks = metadata.groundingChunks || [];
        console.log(`   ✅ File Search USED`);
        console.log(`   📄 Chunks found: ${chunks.length}`);
        
        if (chunks.length > 0) {
          chunks.forEach((chunk: any, i: number) => {
            const context = chunk.retrievedContext || {};
            console.log(`      [${i + 1}] ${context.title || "Unknown doc"}`);
          });
        }
        
        if (metadata.retrievalQueries) {
          console.log(`   🔍 Search queries: ${metadata.retrievalQueries.join(", ")}`);
        }
      } else {
        console.log(`   ❌ File Search NOT used`);
        console.log(`   💡 Response: ${response.text?.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  console.log("\n✅ Test completed!");
}

// Run test
testFileSearch().catch(console.error);

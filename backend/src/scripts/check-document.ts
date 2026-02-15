import { ai, FILE_SEARCH_STORE_NAME } from "../lib/gemini";

async function checkDocument() {
  console.log("Checking document status...");
  console.log("Store:", FILE_SEARCH_STORE_NAME);

  try {
    const documents = await ai.fileSearchStores.documents.list({
      parent: FILE_SEARCH_STORE_NAME,
    });

    const docs = (documents as any).pageInternal || [];
    
    for (const doc of docs) {
      console.log("\n📄 Document:", doc.displayName);
      console.log("   Name:", doc.name);
      console.log("   State:", doc.state);
      console.log("   Size:", doc.sizeBytes, "bytes");
      console.log("   Created:", doc.createTime);
      console.log("   Updated:", doc.updateTime);
      
      if (doc.state === "STATE_ACTIVE") {
        console.log("   ✅ Document is ACTIVE and ready for search");
      } else {
        console.log("   ⏳ Document is still processing...");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkDocument();

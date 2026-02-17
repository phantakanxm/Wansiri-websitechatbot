import { PDFDocument, PDFRawStream, PDFName, PDFDict } from "pdf-lib";
import { fromPath } from "pdf2pic";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[PDF Extractor] Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Storage bucket name
const STORAGE_BUCKET = "pdf-images";

export interface ExtractedImage {
  id: string;
  pdfName: string;
  pageNumber: number;
  imageIndex: number;
  storageUrl: string;
  caption?: string;
  extractedText?: string;
  localPath?: string;
  width?: number;
  height?: number;
}

export interface ExtractionResult {
  success: boolean;
  images: ExtractedImage[];
  error?: string;
}

/**
 * Ensure storage bucket exists
 */
async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      if (error) {
        console.error("[PDF Extractor] Error creating bucket:", error);
      } else {
        console.log("[PDF Extractor] Created bucket:", STORAGE_BUCKET);
      }
    }
  } catch (error) {
    console.error("[PDF Extractor] Error checking bucket:", error);
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToStorage(
  filePath: string,
  pdfName: string,
  pageNum: number,
  imageIdx: number
): Promise<string | null> {
  try {
    const fileExt = path.extname(filePath) || ".png";
    const fileName = `${uuidv4()}_${pdfName.replace(/[^a-zA-Z0-9]/g, "_")}_p${pageNum}_i${imageIdx}${fileExt}`;
    const fileContent = fs.readFileSync(filePath);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileContent, {
        contentType: `image/${fileExt.replace(".", "") || "png"}`,
        upsert: true,
      });

    if (error) {
      console.error("[PDF Extractor] Upload error:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (error) {
    console.error("[PDF Extractor] Error uploading:", error);
    return null;
  }
}

/**
 * Save image metadata to database
 */
async function saveImageMetadata(image: ExtractedImage): Promise<boolean> {
  try {
    const { error } = await supabase.from("pdf_images").insert({
      pdf_name: image.pdfName,
      page_number: image.pageNumber,
      image_index: image.imageIndex,
      storage_url: image.storageUrl,
      caption: image.caption,
      extracted_text: image.extractedText,
    });

    if (error) {
      console.error("[PDF Extractor] Error saving metadata:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[PDF Extractor] Error in saveImageMetadata:", error);
    return false;
  }
}

/**
 * Extract images from PDF using pdf-lib
 */
async function extractImagesWithPdfLib(
  pdfPath: string,
  pdfName: string
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  const tempDir = path.join(process.cwd(), "temp", uuidv4());

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    console.log(`[PDF Extractor] PDF has ${pages.length} pages`);

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const pageNumber = pageIndex + 1;

      // Get resources from page
      const resources = (page as any).node.Resources;
      if (!resources) continue;

      // Get XObjects
      const xObjects = resources.lookup?.(PDFName.of("XObject"));
      if (!xObjects) continue;

      let imageIndex = 0;

      // Iterate through XObjects
      for (const [key, xObject] of Object.entries(xObjects.dict || {})) {
        try {
          const obj = xObject as any;

          // Check if it's an image
          const subtype = obj?.dict?.get?.(PDFName.of("Subtype"));
          if (subtype?.toString() !== "/Image") {
            continue;
          }

          const width = obj.dict.get(PDFName.of("Width"))?.numberValue || 0;
          const height = obj.dict.get(PDFName.of("Height"))?.numberValue || 0;

          // Skip small images (likely icons)
          if (width < 100 || height < 100) {
            continue;
          }

          // Get image data
          const filter = obj.dict.get(PDFName.of("Filter"))?.toString();
          let imageBuffer: Buffer | null = null;
          let ext = ".png";

          if (filter === "/DCTDecode") {
            // JPEG image
            imageBuffer = Buffer.from(obj.contents);
            ext = ".jpg";
          } else if (filter === "/FlateDecode") {
            // PNG or other - need to decode
            const colorSpace = obj.dict.get(PDFName.of("ColorSpace"))?.toString();
            
            // Try to decode using sharp
            try {
              const rawData = Buffer.from(obj.contents);
              imageBuffer = await sharp(rawData, {
                raw: {
                  width: width,
                  height: height,
                  channels: colorSpace?.includes("RGB") ? 3 : 4,
                },
              })
                .png()
                .toBuffer();
              ext = ".png";
            } catch (e) {
              console.log(`[PDF Extractor] Could not decode image ${key}, skipping`);
              continue;
            }
          }

          if (imageBuffer) {
            const localPath = path.join(tempDir, `page_${pageNumber}_img_${imageIndex}${ext}`);
            fs.writeFileSync(localPath, imageBuffer);

            // Optimize with sharp - preserve original dimensions for high quality
            const optimizedPath = path.join(tempDir, `page_${pageNumber}_img_${imageIndex}_opt.png`);
            
            // Get original image info to preserve quality
            const imageInfo = await sharp(imageBuffer).metadata();
            const isLargeImage = (imageInfo.width && imageInfo.width > 4000) || 
                                (imageInfo.height && imageInfo.height > 4000);
            
            // Only resize if image is extremely large (>4000px), otherwise keep original size
            if (isLargeImage) {
              await sharp(imageBuffer)
                .resize(3840, 3840, { fit: "inside", withoutEnlargement: true })
                .png({ quality: 95, compressionLevel: 6 })
                .toFile(optimizedPath);
            } else {
              // Keep original dimensions, just optimize compression
              await sharp(imageBuffer)
                .png({ quality: 95, compressionLevel: 6 })
                .toFile(optimizedPath);
            }

            // Upload to storage
            const storageUrl = await uploadToStorage(optimizedPath, pdfName, pageNumber, imageIndex);

            if (storageUrl) {
              const imageInfo: ExtractedImage = {
                id: uuidv4(),
                pdfName,
                pageNumber,
                imageIndex,
                storageUrl,
                localPath: optimizedPath,
                width,
                height,
              };

              await saveImageMetadata(imageInfo);
              images.push(imageInfo);
              imageIndex++;

              console.log(`[PDF Extractor] Extracted image from page ${pageNumber}: ${storageUrl}`);
            }
          }
        } catch (err) {
          console.error(`[PDF Extractor] Error processing XObject:`, err);
        }
      }
    }

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error("[PDF Extractor] Error in extractImagesWithPdfLib:", error);
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  return images;
}

/**
 * Analyze image with Gemini Vision to determine if it contains actual images/graphics
 * and generate caption
 */
interface ImageAnalysisResult {
  hasVisualContent: boolean;
  caption: string;
  extractedText: string;
  confidence: number;
}

export async function analyzeImageWithAI(imagePath: string): Promise<ImageAnalysisResult | null> {
  if (!ai) {
    console.warn("[PDF Extractor] Gemini AI not available, skipping image analysis");
    return null;
  }

  try {
    // Read image as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    
    const mimeType = "image/png";

    console.log(`[PDF Extractor] Analyzing image with Gemini Vision: ${imagePath}`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this image and provide:
1. Does this image contain actual visual content like photos, diagrams, illustrations, or graphics? (not just text/plain text)
2. What is the main content/subject of this image?
3. What text (if any) is visible in this image?

Respond in JSON format:
{
  "hasVisualContent": true/false,
  "caption": "brief description of the visual content",
  "extractedText": "any text visible in the image",
  "confidence": 0-1 score of how confident you are this contains meaningful visuals
}

Note: Return ONLY the JSON, no markdown formatting.`,
            },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const text = response.text;
    if (!text) {
      console.warn("[PDF Extractor] Empty response from Gemini");
      return null;
    }

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleanText) as ImageAnalysisResult;
      
      console.log(`[PDF Extractor] Analysis result: hasVisualContent=${result.hasVisualContent}, confidence=${result.confidence}`);
      return result;
    } catch (parseError) {
      console.error("[PDF Extractor] Failed to parse Gemini response:", text);
      return null;
    }
  } catch (error) {
    console.error("[PDF Extractor] Error analyzing image with AI:", error);
    return null;
  }
}

/**
 * Update image metadata with AI analysis results
 */
async function updateImageMetadataWithAI(
  pdfName: string,
  pageNumber: number,
  analysis: ImageAnalysisResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from("pdf_images")
      .update({
        caption: analysis.caption,
        extracted_text: analysis.extractedText,
      })
      .eq("pdf_name", pdfName)
      .eq("page_number", pageNumber);

    if (error) {
      console.error("[PDF Extractor] Error updating metadata:", error);
    } else {
      console.log(`[PDF Extractor] Updated metadata for page ${pageNumber}`);
    }
  } catch (error) {
    console.error("[PDF Extractor] Error in updateImageMetadataWithAI:", error);
  }
}

/**
 * Filter images based on AI analysis
 * Removes pages that are mostly text (low visual content)
 */
async function filterImagesWithAI(
  images: ExtractedImage[],
  pdfName: string
): Promise<ExtractedImage[]> {
  if (!ai || images.length === 0) {
    // Cleanup temp files if no AI analysis
    for (const image of images) {
      if (image.localPath && fs.existsSync(image.localPath)) {
        try {
          fs.unlinkSync(image.localPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
    return images;
  }

  console.log(`[PDF Extractor] Analyzing ${images.length} images with AI...`);
  const filteredImages: ExtractedImage[] = [];
  const tempPathsToCleanup: string[] = [];

  for (const image of images) {
    if (!image.localPath || !fs.existsSync(image.localPath)) {
      console.warn(`[PDF Extractor] Local file not found for page ${image.pageNumber}`);
      filteredImages.push(image);
      continue;
    }

    console.log(`[PDF Extractor] Analyzing page ${image.pageNumber}...`);
    const analysis = await analyzeImageWithAI(image.localPath);
    
    // Mark for cleanup
    tempPathsToCleanup.push(image.localPath);
    
    if (analysis) {
      console.log(`[PDF Extractor] Page ${image.pageNumber} analysis:`, {
        hasVisualContent: analysis.hasVisualContent,
        confidence: analysis.confidence,
        caption: analysis.caption?.substring(0, 50)
      });
      
      // Update metadata with AI results
      await updateImageMetadataWithAI(pdfName, image.pageNumber, analysis);

      // Filter: keep only if has visual content and confidence > 0.6
      if (analysis.hasVisualContent && analysis.confidence > 0.6) {
        filteredImages.push({
          ...image,
          caption: analysis.caption,
          extractedText: analysis.extractedText,
        });
        console.log(`[PDF Extractor] ✓ Keeping page ${image.pageNumber}: ${analysis.caption?.substring(0, 50)}`);
      } else {
        console.log(`[PDF Extractor] ✗ Filtering out page ${image.pageNumber}: ${analysis.hasVisualContent ? 'low confidence' : 'no visual content'}`);
      }
    } else {
      // If analysis failed, keep the image
      console.warn(`[PDF Extractor] Analysis failed for page ${image.pageNumber}, keeping anyway`);
      filteredImages.push(image);
    }
  }

  // Cleanup temp files
  console.log(`[PDF Extractor] Cleaning up ${tempPathsToCleanup.length} temp files...`);
  for (const tempPath of tempPathsToCleanup) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  // Try to cleanup parent temp directory
  if (tempPathsToCleanup.length > 0) {
    try {
      const tempDir = path.dirname(tempPathsToCleanup[0]);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore
    }
  }

  console.log(`[PDF Extractor] Filtered: ${images.length} → ${filteredImages.length} images`);
  return filteredImages;
}

/**
 * Main function to extract images from PDF
 * NOTE: Only extracts embedded images, does NOT convert pages to images
 */
export async function extractImagesFromPDF(
  pdfPath: string,
  pdfName: string,
  options: { useAI?: boolean } = {}
): Promise<ExtractionResult> {
  console.log(`[PDF Extractor] Starting extraction from: ${pdfName}`);

  try {
    // Ensure bucket exists
    await ensureBucketExists();

    // Only extract embedded images with pdf-lib
    // NO fallback to convert pages - use direct image upload instead
    let images = await extractImagesWithPdfLib(pdfPath, pdfName);

    // AI Analysis and filtering (optional)
    if (options.useAI && ai) {
      images = await filterImagesWithAI(images, pdfName);
    }

    console.log(`[PDF Extractor] Extraction complete. Found ${images.length} images`);

    return {
      success: true,
      images,
    };
  } catch (error) {
    console.error("[PDF Extractor] Extraction failed:", error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete images associated with a PDF
 */
export async function deletePDFImages(pdfName: string): Promise<boolean> {
  try {
    // Get all images for this PDF
    const { data: images, error: fetchError } = await supabase
      .from("pdf_images")
      .select("storage_url")
      .eq("pdf_name", pdfName);

    if (fetchError) {
      console.error("[PDF Extractor] Error fetching images:", fetchError);
      return false;
    }

    // Delete from storage
    for (const img of images || []) {
      const url = new URL(img.storage_url);
      const fileName = path.basename(url.pathname);
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("pdf_images")
      .delete()
      .eq("pdf_name", pdfName);

    if (deleteError) {
      console.error("[PDF Extractor] Error deleting metadata:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[PDF Extractor] Error in deletePDFImages:", error);
    return false;
  }
}

// ============================================
// DIRECT IMAGE UPLOAD FUNCTIONS
// ============================================

export interface DirectUploadResult {
  success: boolean;
  image?: ExtractedImage;
  error?: string;
}

/**
 * Upload image directly with AI analysis
 * This is for uploading standalone images (not from PDF)
 */
export async function uploadImageDirect(
  filePath: string,
  originalFileName: string,
  category?: string
): Promise<DirectUploadResult> {
  console.log(`[Image Upload] Starting upload: ${originalFileName}`);

  try {
    // Ensure bucket exists
    await ensureBucketExists();

    // Optimize image
    const optimizedPath = path.join(process.cwd(), "temp", `${uuidv4()}_opt.png`);
    
    // Create temp dir if not exists
    const tempDir = path.dirname(optimizedPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Optimize with sharp
    await sharp(filePath)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .png({ quality: 90 })
      .toFile(optimizedPath);

    // Upload to storage
    const fileExt = path.extname(originalFileName) || ".png";
    const storageFileName = `${uuidv4()}_${originalFileName.replace(/[^a-zA-Z0-9]/g, "_")}${fileExt}`;
    const fileContent = fs.readFileSync(optimizedPath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storageFileName, fileContent, {
        contentType: `image/${fileExt.replace(".", "") || "png"}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Image Upload] Upload error:", uploadError);
      fs.unlinkSync(optimizedPath);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storageFileName);
    const storageUrl = urlData?.publicUrl;

    if (!storageUrl) {
      fs.unlinkSync(optimizedPath);
      return { success: false, error: "Failed to get public URL" };
    }

    console.log(`[Image Upload] Uploaded: ${storageUrl}`);

    // Analyze with AI
    let caption = "";
    let extractedText = "";
    
    if (ai) {
      console.log(`[Image Upload] Analyzing with AI...`);
      const analysis = await analyzeImageWithAI(optimizedPath);
      if (analysis) {
        caption = analysis.caption;
        extractedText = analysis.extractedText;
        console.log(`[Image Upload] AI Analysis: ${caption?.substring(0, 50)}...`);
      }
    }

    // Save metadata
    const imageId = uuidv4();
    const { error: dbError } = await supabase.from("pdf_images").insert({
      id: imageId,
      pdf_name: category || "direct_upload",
      page_number: 0,
      image_index: 0,
      storage_url: storageUrl,
      caption: caption,
      extracted_text: extractedText,
    });

    if (dbError) {
      console.error("[Image Upload] DB error:", dbError);
      fs.unlinkSync(optimizedPath);
      return { success: false, error: dbError.message };
    }

    // Cleanup
    fs.unlinkSync(optimizedPath);

    const imageInfo: ExtractedImage = {
      id: imageId,
      pdfName: category || "direct_upload",
      pageNumber: 0,
      imageIndex: 0,
      storageUrl,
      caption,
      extractedText,
    };

    console.log(`[Image Upload] Complete: ${originalFileName}`);
    return { success: true, image: imageInfo };

  } catch (error) {
    console.error("[Image Upload] Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * List all uploaded images
 */
export async function listUploadedImages(category?: string): Promise<ExtractedImage[]> {
  try {
    let query = supabase.from("pdf_images").select("*");
    
    if (category) {
      query = query.eq("pdf_name", category);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[Image Upload] List error:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      pdfName: item.pdf_name,
      pageNumber: item.page_number,
      imageIndex: item.image_index,
      storageUrl: item.storage_url,
      caption: item.caption,
      extractedText: item.extracted_text,
    }));
  } catch (error) {
    console.error("[Image Upload] List error:", error);
    return [];
  }
}

/**
 * Delete a specific image by ID
 */
export async function deleteImageById(imageId: string): Promise<boolean> {
  try {
    // Get image info first
    const { data: image, error: fetchError } = await supabase
      .from("pdf_images")
      .select("storage_url")
      .eq("id", imageId)
      .single();

    if (fetchError || !image) {
      console.error("[Image Upload] Fetch error:", fetchError);
      return false;
    }

    // Delete from storage
    const url = new URL(image.storage_url);
    const fileName = path.basename(url.pathname);
    await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);

    // Delete from database
    const { error: deleteError } = await supabase
      .from("pdf_images")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      console.error("[Image Upload] Delete error:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Image Upload] Delete error:", error);
    return false;
  }
}

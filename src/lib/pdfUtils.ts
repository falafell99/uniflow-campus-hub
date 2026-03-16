import { supabase } from './supabase';

// Use the global PDF.js loaded via CDN in index.html
const getPdfJs = () => (window as any).pdfjsLib;

/**
 * Extracts text from PDF files stored in Supabase Vault using PDF.js
 * @param storagePath The Supabase storage path for the file
 * @returns Extracted text (first 6000 characters)
 */
export const extractTextFromPDF = async (storagePath: string): Promise<string> => {
  try {
    const pdfjsLib = getPdfJs();
    if (!pdfjsLib) {
      console.warn("PDF.js library not found on window. Falling back to empty string.");
      return '';
    }

    // Get signed URL for the file
    const { data } = await supabase.storage.from("vault").createSignedUrl(storagePath, 60);
    if (!data?.signedUrl) throw new Error("Could not get file URL");

    // Fetch the file as ArrayBuffer
    const response = await fetch(data.signedUrl);
    const arrayBuffer = await response.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => (item as any).str || "");
      fullText += strings.join(" ") + "\n";
    }
    
    // Limit to first 6000 characters as required by Flashcards
    return fullText.trim().slice(0, 6000);
  } catch (err) {
    console.error('PDF extraction failed:', err);
    return '';
  }
};
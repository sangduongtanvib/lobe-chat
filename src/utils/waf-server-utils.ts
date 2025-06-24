import fs from 'node:fs';
import path from 'node:path';

/**
 * Server-side utility for chunk mappings (Node.js Runtime)
 * This function runs in Node.js runtime and can access file system
 */
export function getChunkMappings(): Record<string, string> {
  const mappingFile = path.join(process.cwd(), 'public', 'static', 'chunk-mappings.json');

  try {
    if (fs.existsSync(mappingFile)) {
      const content = fs.readFileSync(mappingFile, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Error reading chunk mappings:', error);
  }

  return {};
}

/**
 * Server-side function to serve WAF-friendly chunks (Node.js Runtime)
 */
export function serveWAFFriendlyChunk(filename: string): Buffer | null {
  try {
    // Try to serve from public directory first
    const publicFilePath = path.join(process.cwd(), 'public', 'static', 'js', filename);

    if (fs.existsSync(publicFilePath)) {
      return fs.readFileSync(publicFilePath);
    }

    // If not found, try to map back to original chunk
    if (
      filename.includes('_OB_') ||
      filename.includes('_CB_') ||
      filename.includes('_AT_') ||
      filename.includes('_OP_') ||
      filename.includes('_CP_')
    ) {
      const originalFilename = filename
        .replaceAll('_OB_', '%5B')
        .replaceAll('_CB_', '%5D')
        .replaceAll('_AT_', '%40')
        .replaceAll('_OP_', '(')
        .replaceAll('_CP_', ')');

      const originalChunkPath = path.join(
        process.cwd(),
        '.next',
        'static',
        'chunks',
        originalFilename,
      );

      if (fs.existsSync(originalChunkPath)) {
        return fs.readFileSync(originalChunkPath);
      }
    }
  } catch (error) {
    console.warn('Error serving WAF-friendly chunk:', error);
  }

  return null;
}

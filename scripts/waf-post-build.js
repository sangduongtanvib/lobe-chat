#!/usr/bin/env node

/**
 * WAF Post-Build Script
 * Creates symlinks for WAF-friendly static file URLs after Next.js build
 * Run this script after `npm run build`
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = '.next';
const PUBLIC_DIR = 'public';
const STATIC_CHUNKS_DIR = path.join(BUILD_DIR, 'static', 'chunks');
const STATIC_CSS_DIR = path.join(BUILD_DIR, 'static', 'css');
const STATIC_MEDIA_DIR = path.join(BUILD_DIR, 'static', 'media');

// WAF-friendly directories
const WAF_CHUNKS_DIR = path.join(PUBLIC_DIR, 'chunks');
const WAF_STYLES_DIR = path.join(PUBLIC_DIR, 'styles');  
const WAF_MEDIA_DIR = path.join(PUBLIC_DIR, 'media');

console.log('🔧 Creating WAF-friendly static file mappings...');

// Function to check if filename contains problematic characters
const hasProblematicChars = (filename) => {
  return /(%5B|%5D|%40|\(|\)|%|@|\[|\])/.test(filename);
};

// Function to create WAF-friendly filename
const createWAFFriendlyName = (filename) => {
  return filename
    .replace(/%5B/g, 'SB_')
    .replace(/%5D/g, '_SB') 
    .replace(/%40/g, '_AT_')
    .replace(/\(/g, '_LP_')
    .replace(/\)/g, '_RP_')
    .replace(/%/g, '_PCT_')
    .replace(/@/g, '_AT_')
    .replace(/\[/g, 'SB_')
    .replace(/\]/g, '_SB');
};

// Function to create directory if it doesn't exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
};

// Function to create symlinks for problematic files
const createSymlinks = (sourceDir, targetDir, relativePath) => {
  if (!fs.existsSync(sourceDir)) {
    console.log(`⚠️  Source directory not found: ${sourceDir}`);
    return;
  }

  ensureDir(targetDir);

  const files = fs.readdirSync(sourceDir, { withFileTypes: true });
  let linkCount = 0;

  files.forEach((file) => {
    if (file.isDirectory()) {
      // Recursively handle subdirectories
      const subSourceDir = path.join(sourceDir, file.name);
      const subTargetDir = path.join(targetDir, file.name);
      const subRelativePath = path.join(relativePath, file.name);
      createSymlinks(subSourceDir, subTargetDir, subRelativePath);
    } else if (file.isFile() && hasProblematicChars(file.name)) {
      const originalFile = path.join(sourceDir, file.name);
      const wafFriendlyName = createWAFFriendlyName(file.name);
      const symlinkTarget = path.join(targetDir, wafFriendlyName);
      
      // Create relative path to original file
      const relativeSourcePath = path.join(relativePath, file.name);
      
      try {
        // Remove existing symlink if it exists
        if (fs.existsSync(symlinkTarget)) {
          fs.unlinkSync(symlinkTarget);
        }
        
        // Create new symlink
        fs.symlinkSync(relativeSourcePath, symlinkTarget);
        console.log(`🔗 ${file.name} -> ${wafFriendlyName}`);
        linkCount++;
      } catch (error) {
        console.error(`❌ Failed to create symlink for ${file.name}:`, error.message);
      }
    }
  });

  if (linkCount > 0) {
    console.log(`✅ Created ${linkCount} symlinks in ${targetDir}`);
  }
};

// Main execution
const main = () => {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Please run `npm run build` first.');
    process.exit(1);
  }

  console.log('📋 Processing chunks...');
  createSymlinks(
    STATIC_CHUNKS_DIR,
    WAF_CHUNKS_DIR,
    path.relative(WAF_CHUNKS_DIR, STATIC_CHUNKS_DIR)
  );

  console.log('🎨 Processing CSS files...');
  createSymlinks(
    STATIC_CSS_DIR,
    WAF_STYLES_DIR,
    path.relative(WAF_STYLES_DIR, STATIC_CSS_DIR)
  );

  console.log('🖼️  Processing media files...');
  createSymlinks(
    STATIC_MEDIA_DIR,
    WAF_MEDIA_DIR,
    path.relative(WAF_MEDIA_DIR, STATIC_MEDIA_DIR)
  );

  // Create a mapping file for debugging
  const mappingFile = path.join(PUBLIC_DIR, 'waf-mappings.json');
  const mapping = {
    chunks: `/chunks/* -> /_next/static/chunks/*`,
    styles: `/styles/* -> /_next/static/css/*`,
    media: `/media/* -> /_next/static/media/*`,
    timestamp: new Date().toISOString(),
    note: 'WAF-friendly URLs are handled by Next.js rewrites in next.config.ts'
  };

  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`📝 Created mapping file: ${mappingFile}`);
  
  console.log('🎉 WAF-friendly static file mappings created successfully!');
  console.log('💡 Files with special characters can now be accessed via WAF-friendly URLs.');
  console.log('🔍 Next.js rewrites will handle the URL mapping automatically.');
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, createWAFFriendlyName, hasProblematicChars }; 
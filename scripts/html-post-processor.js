#!/usr/bin/env node

/**
 * HTML Post-Processor for WAF-friendly URLs
 * Rewrites all problematic URLs in Next.js generated HTML files
 * Run this after build to fix client-side URL issues
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const BUILD_DIR = '.next';
const SERVER_DIR = path.join(BUILD_DIR, 'server');
const STATIC_DIR = path.join(BUILD_DIR, 'static');

console.log('🔄 Processing HTML files for WAF-friendly URLs...');

// Function to convert problematic URLs to WAF-friendly URLs
function makeWAFFriendlyURL(url) {
  if (!url.includes('/_next/static/')) {
    return url;
  }
  
  // Convert /_next/static/chunks/app/v/%5Bvariant%5D/... -> /chunks/app_v_SB_variant_SB_...
  if (url.includes('/chunks/app/v/%5Bvariant%5D/')) {
    return url
      .replace('/_next/static/chunks/app/v/%5Bvariant%5D/', '/chunks/app_v_SB_variant_SB_')
      .replace('.js', '.js');
  }
  
  // General chunk URL rewriting
  if (url.includes('/_next/static/chunks/')) {
    const chunkPath = url.replace('/_next/static/chunks/', '');
    const wafFriendlyPath = chunkPath
      .replaceAll('%5B', '_OB_')
      .replaceAll('%5D', '_CB_')
      .replaceAll('%40', '_AT_')
      .replaceAll('(', '_OP_')
      .replaceAll(')', '_CP_')
      .replaceAll('@', '_AT_')
      .replaceAll('%', '_PCT_');
    
    return `/chunks/${wafFriendlyPath}`;
  }
  
  // CSS files
  if (url.includes('/_next/static/css/')) {
    const cssPath = url.replace('/_next/static/css/', '');
    const wafFriendlyPath = cssPath
      .replaceAll('%5B', '_OB_')
      .replaceAll('%5D', '_CB_')
      .replaceAll('%40', '_AT_')
      .replaceAll('%', '_PCT_');
      
    return `/styles/${wafFriendlyPath}`;
  }
  
  // Media files
  if (url.includes('/_next/static/media/')) {
    const mediaPath = url.replace('/_next/static/media/', '');
    const wafFriendlyPath = mediaPath
      .replaceAll('%5B', '_OB_')
      .replaceAll('%5D', '_CB_')
      .replaceAll('%40', '_AT_')
      .replaceAll('%', '_PCT_');
      
    return `/media/${wafFriendlyPath}`;
  }
  
  return url;
}

// Function to process HTML content
function processHTMLContent(htmlContent) {
  let processedContent = htmlContent;
  let changesCount = 0;
  
  // Process script src attributes
  processedContent = processedContent.replace(
    /src="([^"]*\/_next\/static\/[^"]*)"/g,
    (match, url) => {
      const wafUrl = makeWAFFriendlyURL(url);
      if (wafUrl !== url) {
        changesCount++;
        console.log(`  📝 Script: ${url} -> ${wafUrl}`);
        return `src="${wafUrl}"`;
      }
      return match;
    }
  );
  
  // Process link href attributes
  processedContent = processedContent.replace(
    /href="([^"]*\/_next\/static\/[^"]*)"/g,
    (match, url) => {
      const wafUrl = makeWAFFriendlyURL(url);
      if (wafUrl !== url) {
        changesCount++;
        console.log(`  🔗 Link: ${url} -> ${wafUrl}`);
        return `href="${wafUrl}"`;
      }
      return match;
    }
  );
  
  // Process preload/prefetch links
  processedContent = processedContent.replace(
    /<link[^>]*rel=["'](preload|prefetch)["'][^>]*href=["']([^"']*\/_next\/static\/[^"']*)["'][^>]*>/g,
    (match, rel, url) => {
      const wafUrl = makeWAFFriendlyURL(url);
      if (wafUrl !== url) {
        changesCount++;
        console.log(`  ⚡ ${rel}: ${url} -> ${wafUrl}`);
        return match.replace(url, wafUrl);
      }
      return match;
    }
  );
  
  return { content: processedContent, changes: changesCount };
}

// Find and process all HTML files
const htmlFiles = glob.sync('**/*.html', { 
  cwd: SERVER_DIR,
  absolute: true 
});

let totalChanges = 0;
const processedFiles = [];

htmlFiles.forEach(filePath => {
  try {
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const { content: processedContent, changes } = processHTMLContent(htmlContent);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, processedContent, 'utf8');
      processedFiles.push(path.relative(process.cwd(), filePath));
      totalChanges += changes;
      console.log(`✅ ${path.relative(SERVER_DIR, filePath)}: ${changes} URLs updated`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

// Summary
console.log('\n📊 HTML Post-Processing Summary:');
console.log(`   Files processed: ${htmlFiles.length}`);
console.log(`   Files updated: ${processedFiles.length}`);
console.log(`   Total URL changes: ${totalChanges}`);

if (processedFiles.length > 0) {
  console.log('\n📁 Updated files:');
  processedFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
}

console.log('\n✅ HTML post-processing completed!');
console.log('   All problematic URLs in HTML have been converted to WAF-friendly URLs.'); 
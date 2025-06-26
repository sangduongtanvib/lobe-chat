#!/usr/bin/env node

/**
 * Azure Blob Storage Integration Verification Script
 * This script verifies that all necessary changes have been made for Azure Blob Storage compatibility
 */

const fs = require('node:fs');
const path = require('node:path');

console.log('🔍 Azure Blob Storage Integration Verification');
console.log('==============================================\n');

const checks = [
  {
    check: (content) => {
      return (
        content.includes('x-ms-blob-type') &&
        content.includes('BlockBlob') &&
        (content.includes('blob.core.windows.net') ||
          content.includes('Remove Content-Type for Azure'))
      );
    },
    description: 'Ensures Azure upload headers are correctly set',
    file: 'src/services/upload.ts',
    name: 'Upload Service - Azure Headers',
  },
  {
    check: (content) => {
      return (
        content.includes("permissions: 'acwd'") ||
        (content.includes('add') &&
          content.includes('create') &&
          content.includes('write') &&
          content.includes('delete'))
      );
    },
    description: 'Verifies SAS tokens include all required permissions',
    file: 'src/server/modules/AzureStorage/index.ts',
    name: 'Azure Storage - SAS Permissions',
  },
  {
    check: (content) => {
      return content.includes('postProcessUrl') && content.includes('fileService.getFullFileUrl');
    },
    description: 'Confirms message router processes file URLs correctly',
    file: 'src/server/routers/lambda/message.ts',
    name: 'Message Router - URL Processing',
  },
  {
    check: (content) => {
      return content.includes('await ctx.fileService.getFullFileUrl');
    },
    description: 'Confirms file router returns pre-signed URLs',
    file: 'src/server/routers/lambda/file.ts',
    name: 'File Router - URL Processing',
  },
  {
    check: (content) => {
      return content.includes('await fileService.getFullFileUrl(state.avatar)');
    },
    description: 'Confirms user avatars use pre-signed URLs',
    file: 'src/server/routers/lambda/user.ts',
    name: 'User Router - Avatar URL Processing',
  },
];

let passedChecks = 0;
let totalChecks = checks.length;

checks.forEach((check, index) => {
  console.log(`${index + 1}. ${check.name}`);
  console.log(`   File: ${check.file}`);
  console.log(`   Check: ${check.description}`);

  try {
    const filePath = path.join(process.cwd(), check.file);

    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ File not found: ${filePath}`);
      console.log('');
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const passed = check.check(content);

    if (passed) {
      console.log('   ✅ PASSED');
      passedChecks++;
    } else {
      console.log('   ❌ FAILED - Required changes not found');
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }

  console.log('');
});

console.log('📊 Summary');
console.log('===========');
console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);
console.log(`❌ Failed: ${totalChecks - passedChecks}/${totalChecks}`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 All checks passed! Azure Blob Storage integration is properly configured.');
  console.log('\n📋 Next Steps:');
  console.log('1. Test file upload with Azure Blob Storage');
  console.log('2. Verify AI model can access image URLs');
  console.log('3. Test file management (view, delete)');
  console.log('4. Use the test-azure-url-access.js script to verify URL accessibility');
} else {
  console.log('\n⚠️  Some checks failed. Review the failed items above.');
  console.log('Ensure all necessary code changes have been applied.');
}

console.log('\n🔗 Related Files to Check:');
console.log('- src/server/services/file/impls/s3.ts (main file service implementation)');
console.log('- src/server/services/file/index.ts (file service wrapper)');
console.log('- src/services/chat.ts (chat service that uses file URLs)');
console.log('- Azure storage configuration in environment variables');

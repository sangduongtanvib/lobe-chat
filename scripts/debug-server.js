#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');

console.log('🔧 Starting LobeChat Server Debug Mode...');
console.log('==========================================');

// Required environment variables for server mode
const serverEnv = {
  DEBUG: '*',
  NEXT_PUBLIC_DEVELOPER_DEBUG: '1',
  NEXT_PUBLIC_I18N_DEBUG: '1',
  NEXT_PUBLIC_I18N_DEBUG_SERVER: '1',
  NEXT_PUBLIC_SERVICE_MODE: 'server',
  NODE_ENV: 'development',
  NODE_OPTIONS: '--inspect=0.0.0.0:9229',
  ...process.env, // Keep existing env vars
};

// Check required environment variables
const requiredVars = ['DATABASE_URL', 'KEY_VAULTS_SECRET', 'APP_URL'];

console.log('📋 Checking required environment variables...');
const missingVars = requiredVars.filter((varName) => !serverEnv[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.log('\n💡 Please set these variables in your .env.local file or environment.');
  console.log('Example:');
  console.log('DATABASE_URL=postgres://username:password@localhost:5432/lobechat');
  console.log('KEY_VAULTS_SECRET=your_secret_key_here');
  console.log('APP_URL=http://localhost:3010');
  process.exit(1);
}

console.log('✅ All required environment variables found');
console.log('🚀 Starting Next.js development server...');
console.log('📍 Debug inspector available at: http://localhost:9229');
console.log('🌐 Application will be available at:', serverEnv.APP_URL || 'http://localhost:3010');
console.log('==========================================\n');

// Spawn Next.js development server
const nextProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  env: serverEnv,
  stdio: 'inherit',
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping debug server...');
  nextProcess.kill('SIGINT');
  process.exit(0);
});

nextProcess.on('close', (code) => {
  console.log(`\n🏁 Debug server exited with code ${code}`);
  process.exit(code);
});

nextProcess.on('error', (error) => {
  console.error('❌ Failed to start debug server:', error);
  process.exit(1);
});

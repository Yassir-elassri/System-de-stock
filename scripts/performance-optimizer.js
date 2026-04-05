#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Platform Stock - Performance Optimizer');
console.log('==========================================');

// Set environment variables for faster compilation
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NEXT_DISABLE_SOURCEMAPS = 'true';
process.env.NEXT_DISABLE_ESLINT = '1';
process.env.NEXT_DISABLE_TYPE_CHECK = '1';
process.env.NODE_ENV = 'development';

console.log('✅ Environment variables set for maximum performance');
console.log('📝 Use "npm run dev:lightning" for fastest development experience');
console.log('📝 Use "npm run build:fast" for faster production builds');
console.log('📝 Use "npm run cache:clear" to clear build cache when needed');

// Check if .next directory exists and suggest clearing if it's large
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  const stats = fs.statSync(nextDir);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  if (stats.size > 100 * 1024 * 1024) { // 100MB
    console.log(`⚠️  Large .next directory detected (${sizeInMB}MB)`);
    console.log('💡 Consider running "npm run cache:clear" to improve performance');
  }
}

console.log('\n🎯 Performance Tips:');
console.log('1. Use "npm run dev:lightning" for fastest development');
console.log('2. Clear cache regularly with "npm run cache:clear"');
console.log('3. Close unnecessary browser tabs and applications');
console.log('4. Use SSD storage for better I/O performance');
console.log('5. Ensure adequate RAM (8GB+ recommended)');

module.exports = {
  optimizeForSpeed: () => {
    // This function can be called from other scripts
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    process.env.NEXT_DISABLE_SOURCEMAPS = 'true';
    process.env.NEXT_DISABLE_ESLINT = '1';
    process.env.NEXT_DISABLE_TYPE_CHECK = '1';
  }
}; 
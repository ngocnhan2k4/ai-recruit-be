#!/usr/bin/env node

/**
 * Script to fetch Swagger JSON from running server
 * Usage: node scripts/fetch-swagger-json.js [PORT] [HOST]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 8080;
const HOST = process.argv[3] || 'localhost';
const URL = `http://${HOST}:${PORT}/docs/json`;

console.log(`📥 Fetching Swagger JSON from ${URL}...`);

// Create docs directory if it doesn't exist
const docsDir = path.join(process.cwd(), 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const outputPath = path.join(docsDir, 'swagger.json');

http.get(URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      // Parse and pretty-print JSON
      const json = JSON.parse(data);
      fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
      
      const stats = fs.statSync(outputPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ Swagger JSON saved to ${outputPath}`);
      console.log(`📄 File size: ${fileSizeKB} KB`);
    } catch (error) {
      console.error('❌ Error parsing JSON:', error.message);
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.error(`❌ Failed to fetch Swagger JSON: ${error.message}`);
  console.log(`💡 Make sure your server is running on ${URL}`);
  process.exit(1);
});


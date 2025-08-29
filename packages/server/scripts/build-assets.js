#!/usr/bin/env node
// Build script to copy frontend dependencies from node_modules to public/assets
// This ensures we have all assets available locally without CDN dependencies

import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Asset mappings: source -> destination
const assets = {
  // CSS files
  'node_modules/bootstrap/dist/css/bootstrap.min.css': 'public/assets/css/bootstrap.min.css',
  'node_modules/bootstrap/dist/css/bootstrap.min.css.map': 'public/assets/css/bootstrap.min.css.map',
  'node_modules/@fortawesome/fontawesome-free/css/all.min.css': 'public/assets/css/fontawesome.min.css',
  'node_modules/toastify-js/src/toastify.css': 'public/assets/css/toastify.css',

  // JavaScript files
  'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js': 'public/assets/js/bootstrap.bundle.min.js',
  'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js.map': 'public/assets/js/bootstrap.bundle.min.js.map',
  'node_modules/chart.js/dist/chart.umd.js': 'public/assets/js/chart.js',
  'node_modules/toastify-js/src/toastify.js': 'public/assets/js/toastify.js',
  'node_modules/date-fns/index.js': 'public/assets/js/date-fns.js',

  // Font Awesome fonts
  'node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2': 'public/assets/fonts/fa-solid-900.woff2',
  'node_modules/@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2': 'public/assets/fonts/fa-regular-400.woff2',
  'node_modules/@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2': 'public/assets/fonts/fa-brands-400.woff2',
};

function ensureDirectoryExists(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function copyAsset(source, destination) {
  const sourcePath = join(projectRoot, source);
  const destPath = join(projectRoot, destination);

  if (!existsSync(sourcePath)) {
    console.warn(`⚠️  Source file not found: ${sourcePath}`);
    return false;
  }

  ensureDirectoryExists(destPath);
  
  try {
    copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied: ${source} → ${destination}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${source}:`, error.message);
    return false;
  }
}

function buildAssets() {
  console.log('🔨 Building local assets from npm packages...\n');

  let successCount = 0;
  let totalCount = 0;

  for (const [source, destination] of Object.entries(assets)) {
    totalCount++;
    if (copyAsset(source, destination)) {
      successCount++;
    }
  }

  console.log(`\n📊 Asset build complete: ${successCount}/${totalCount} files copied`);
  
  if (successCount === totalCount) {
    console.log('✅ All assets built successfully! UltiBiker is now CDN-free.');
  } else {
    console.log('⚠️  Some assets failed to copy. Check warnings above.');
  }

  // Create a manifest file to track what was built
  const manifest = {
    buildTime: new Date().toISOString(),
    assets: Object.entries(assets).reduce((acc, [source, dest]) => {
      const sourcePath = join(projectRoot, source);
      acc[dest] = {
        source,
        exists: existsSync(sourcePath),
        built: existsSync(join(projectRoot, dest))
      };
      return acc;
    }, {}),
    successCount,
    totalCount
  };

  const manifestPath = join(projectRoot, 'public/assets/manifest.json');
  ensureDirectoryExists(manifestPath);
  
  try {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('📋 Asset manifest created: public/assets/manifest.json');
  } catch (error) {
    console.warn('⚠️  Failed to create manifest:', error.message);
  }
}

// Run the build
buildAssets();
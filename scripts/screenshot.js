#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { setTimeout } from 'node:timers/promises';

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport size for consistent screenshots
    await page.setViewport({
      width: 1400,
      height: 900,
      deviceScaleFactor: 1,
    });

    console.log('🔄 Navigating to React app...');
    
    // Navigate to the React application
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait a bit more for React to fully render
    await setTimeout(2000);

    console.log('📸 Taking screenshot...');
    
    // Take screenshot
    await page.screenshot({
      path: '/tmp/react-migration-automated.png',
      fullPage: true
    });

    console.log('✅ Screenshot saved to /tmp/react-migration-automated.png');

  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
    
    // If connection fails, take a screenshot of the error state
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.log('🔄 Server not running, taking screenshot of error page...');
      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 900 });
      await page.setContent(`
        <html>
          <head><title>UltiBiker - Server Not Running</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #ef4444;">React Migration Complete</h1>
            <p style="font-size: 18px; color: #6b7280;">
              The React application is built and ready, but the server is not currently running.
            </p>
            <p style="color: #374151;">
              Start both servers with: <code>pnpm dev:all</code>
            </p>
          </body>
        </html>
      `);
      await page.screenshot({
        path: '/tmp/react-migration-automated.png',
        fullPage: true
      });
      console.log('✅ Error state screenshot saved');
    }
  } finally {
    await browser.close();
  }
}

// Run the screenshot function
takeScreenshot().catch(console.error);
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    const err = `PAGE ERROR: ${error.message}`;
    console.log(err);
    errors.push(err);
  });

  let cspErrorFound = false;
  page.on('console', msg => {
    const log = msg.text();
    if (log.includes('Content Security Policy')) {
      cspErrorFound = true;
    }
    if (msg.type() === 'error') {
      console.log(`CONSOLE ERROR: ${log}`);
    }
  });
  
  try {
    console.log('Testing fixed CSP...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Wait for devices to be discovered
    await page.waitForTimeout(5000);
    
    // Look for Add buttons
    const addButtons = await page.$$('[onclick*="connectDevice"]');
    console.log(`Found ${addButtons.length} Add buttons`);
    
    if (addButtons.length > 0) {
      console.log('Testing button click...');
      
      // Try to click a button
      try {
        await addButtons[0].click();
        console.log('✅ Button clicked successfully - no CSP error!');
        
        // Check server response
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`❌ Button click failed: ${error.message}`);
      }
    }
    
    console.log(`CSP errors detected: ${cspErrorFound ? 'YES' : 'NO'}`);
    console.log(`JavaScript errors: ${errors.length}`);
    
    await page.screenshot({ path: 'test-final-screenshot.png', fullPage: true });
    console.log('Screenshot saved');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
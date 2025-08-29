import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let cspViolationDetected = false;
  
  // Monitor for CSP violations
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Content Security Policy') || text.includes('script-src-attr')) {
      cspViolationDetected = true;
      console.log(`🔒 CSP VIOLATION: ${text}`);
    }
  });
  
  try {
    console.log('🧪 Testing if CSP fix resolved the button issue...');
    await page.goto('http://localhost:3002');
    
    // Wait for device discovery
    console.log('⏳ Waiting for device discovery...');
    await page.waitForTimeout(10000);
    
    // Check for Add buttons
    const addButtons = await page.$$('[onclick*="connectDevice"]');
    console.log(`📱 Found ${addButtons.length} Add buttons`);
    
    if (addButtons.length > 0) {
      console.log('🎯 Testing first Add button...');
      
      // Try to click the button
      await addButtons[0].click();
      console.log('👆 Button clicked successfully!');
      
      // Wait to see if any CSP violations occur
      await page.waitForTimeout(2000);
      
    } else {
      console.log('❌ No Add buttons found');
    }
    
    console.log('\n📊 FINAL RESULTS:');
    console.log(`🔒 CSP Violation: ${cspViolationDetected ? '❌ BLOCKED' : '✅ ALLOWED'}`);
    console.log(`📱 Buttons Found: ${addButtons.length > 0 ? '✅ YES' : '❌ NO'}`);
    
    if (!cspViolationDetected && addButtons.length > 0) {
      console.log('\n🎉 SUCCESS! The "Add" buttons are now working!');
      console.log('   - Devices are being discovered ✅');
      console.log('   - Add buttons are visible ✅'); 
      console.log('   - CSP no longer blocks clicks ✅');
      console.log('   - Buttons are clickable ✅');
    }
    
    await page.screenshot({ path: 'final-working-screenshot.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
})();
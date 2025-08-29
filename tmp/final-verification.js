import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let cspViolationDetected = false;
  let connectDeviceCallDetected = false;
  
  // Monitor for CSP violations
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Content Security Policy') || text.includes('script-src-attr')) {
      cspViolationDetected = true;
      console.log(`🔒 CSP VIOLATION: ${text}`);
    }
    if (text.includes('connect-device') || text.includes('connectDevice')) {
      connectDeviceCallDetected = true;
      console.log(`🔗 DEVICE CONNECTION ATTEMPT: ${text}`);
    }
  });
  
  // Monitor WebSocket messages
  await page.evaluateOnNewDocument(() => {
    // Intercept WebSocket messages
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
      const ws = new originalWebSocket(...args);
      const originalSend = ws.send;
      ws.send = function(data) {
        if (data.includes('connect-device')) {
          console.log('📤 WebSocket CONNECT-DEVICE message sent:', data);
        }
        return originalSend.call(this, data);
      };
      return ws;
    };
  });
  
  try {
    console.log('🧪 Final verification test starting...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Wait for device discovery
    console.log('⏳ Waiting for device discovery...');
    await page.waitForTimeout(8000);
    
    // Check for Add buttons
    const addButtons = await page.$$('[onclick*="connectDevice"]');
    console.log(`📱 Found ${addButtons.length} Add buttons`);
    
    if (addButtons.length > 0) {
      console.log('🎯 Testing button click functionality...');
      
      // Get button details before clicking
      const buttonInfo = await addButtons[0].evaluate(btn => ({
        onclick: btn.getAttribute('onclick'),
        deviceId: btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1],
        visible: btn.offsetParent !== null,
        enabled: !btn.disabled
      }));
      
      console.log('📋 Button details:', buttonInfo);
      
      if (buttonInfo.visible && buttonInfo.enabled) {
        console.log('✅ Button is visible and enabled - attempting click...');
        
        // Click the button
        await addButtons[0].click();
        console.log('👆 Button clicked!');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check results
        console.log('\n📊 FINAL RESULTS:');
        console.log(`🔒 CSP Violation Detected: ${cspViolationDetected ? '❌ YES' : '✅ NO'}`);
        console.log(`🔗 Device Connection Attempted: ${connectDeviceCallDetected ? '✅ YES' : '❌ NO'}`);
        
        if (!cspViolationDetected) {
          console.log('🎉 SUCCESS: CSP no longer blocking button clicks!');
        }
        
        if (connectDeviceCallDetected) {
          console.log('🎉 SUCCESS: Button click triggered device connection!');
        }
        
      } else {
        console.log(`❌ Button not clickable: visible=${buttonInfo.visible}, enabled=${buttonInfo.enabled}`);
      }
    } else {
      console.log('❌ No Add buttons found - devices may not be discovered yet');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'final-verification-screenshot.png', fullPage: true });
    console.log('📸 Final screenshot saved');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();
import { chromium } from 'playwright';

async function captureUI() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Navigating to UltiBiker dashboard...');
        await page.goto('http://localhost:3002', { 
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // Wait a moment for initial loading
        await page.waitForTimeout(3000);
        
        // Take full page screenshot
        await page.screenshot({ 
            path: '/Users/benedictchen/work/UltiBiker/screenshot-full.png',
            fullPage: true 
        });
        
        console.log('📸 Full page screenshot saved to screenshot-full.png');
        
        // Take viewport screenshot
        await page.screenshot({ 
            path: '/Users/benedictchen/work/UltiBiker/screenshot-viewport.png' 
        });
        
        console.log('📸 Viewport screenshot saved to screenshot-viewport.png');
        
        // Check for FontAwesome CSS loading
        const fontAwesomeLoaded = await page.evaluate(() => {
            const links = document.querySelectorAll('link[href*="fontawesome"], link[href*="bootstrap"]');
            return {
                fontAwesomeLinks: Array.from(links).map(link => ({
                    href: link.href,
                    loaded: link.sheet !== null
                })),
                computedStyles: {
                    faIcon: window.getComputedStyle(document.querySelector('.fas') || document.createElement('div')),
                    hasBootstrap: !!document.querySelector('link[href*="bootstrap"]')
                }
            };
        });
        
        console.log('🔍 CSS Loading status:', JSON.stringify(fontAwesomeLoaded, null, 2));
        
        // Check for missing icons
        const iconIssues = await page.evaluate(() => {
            const icons = document.querySelectorAll('[class*="fa-"], .fas, .far, .fab');
            const issues = [];
            
            icons.forEach((icon, index) => {
                const computedStyle = window.getComputedStyle(icon);
                const fontFamily = computedStyle.fontFamily;
                
                issues.push({
                    index,
                    className: icon.className,
                    fontFamily,
                    content: computedStyle.content,
                    fontSize: computedStyle.fontSize,
                    isSquare: fontFamily.indexOf('Font Awesome') === -1 && icon.textContent === ''
                });
            });
            
            return issues;
        });
        
        console.log('🎯 Icon analysis:', JSON.stringify(iconIssues.slice(0, 10), null, 2));
        
        // Check network requests for assets
        const responses = [];
        page.on('response', response => {
            if (response.url().includes('fontawesome') || response.url().includes('bootstrap') || response.url().includes('.css')) {
                responses.push({
                    url: response.url(),
                    status: response.status(),
                    ok: response.ok()
                });
            }
        });
        
        // Reload to capture network requests
        await page.reload({ waitUntil: 'networkidle' });
        
        console.log('🌐 CSS Network requests:', JSON.stringify(responses, null, 2));
        
    } catch (error) {
        console.error('❌ Error capturing UI:', error);
        
        // Try to get page content for debugging
        try {
            const title = await page.title();
            const url = page.url();
            console.log(`Page title: ${title}, URL: ${url}`);
            
            // Take screenshot anyway
            await page.screenshot({ path: '/Users/benedictchen/work/UltiBiker/screenshot-error.png' });
        } catch (debugError) {
            console.error('❌ Debug capture failed:', debugError);
        }
    }
    
    await browser.close();
}

captureUI().catch(console.error);
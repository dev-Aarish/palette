const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Start static file server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(__dirname, 'dist', reqPath);
  if (!fs.existsSync(filePath)) filePath = path.join(__dirname, 'dist', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      let ext = path.extname(filePath);
      let mime = 'text/html';
      if (ext === '.js') mime = 'application/javascript';
      else if (ext === '.css') mime = 'text/css';
      else if (ext === '.png') mime = 'image/png';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.ico') mime = 'image/x-icon';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    }
  });
});

server.listen(4173, '127.0.0.1', async () => {
  console.log('Server running on http://127.0.0.1:4173');
  try {
    const browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('CONSOLE ERROR:', msg.text());
      }
    });

    // 1. Navigate and skip boot screen
    console.log('Navigating...');
    await page.goto('http://127.0.0.1:4173/');
    await new Promise(r => setTimeout(r, 1000));
    console.log('Clicking boot screen to skip...');
    await page.click('body');
    await new Promise(r => setTimeout(r, 1000));

    // 2. Verify desktop loads
    const hasDesktop = await page.evaluate(() => {
      return !!document.querySelector('.desktop');
    });
    console.log('Desktop loaded:', hasDesktop);

    // 3. Double-click Inspirations icon
    console.log('Double-clicking Inspirations icon...');
    await page.evaluate(() => {
      const icons = Array.from(document.querySelectorAll('.desktop-icon'));
      const insp = icons.find(el => el.textContent.includes('Inspirations'));
      if (insp) {
        insp.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    const windowOpen = await page.evaluate(() => {
      const win = document.querySelector('.window');
      return win ? win.querySelector('.window-title').textContent : null;
    });
    console.log('Window title:', windowOpen);

    // 4. Close window
    console.log('Closing window...');
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.window .title-bar-controls button');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 5. Right click on empty desktop wallpaper -> Change Wallpaper
    console.log('Right-clicking on desktop...');
    await page.evaluate(() => {
      const desktop = document.querySelector('.desktop');
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300
      });
      desktop.dispatchEvent(event);
    });
    await new Promise(r => setTimeout(r, 500));

    const contextMenuVisible = await page.evaluate(() => {
      const menu = document.querySelector('.context-menu');
      return !!menu;
    });
    console.log('Context menu visible:', contextMenuVisible);

    console.log('Clicking Change Wallpaper in context menu...');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.context-menu-item'));
      const item = items.find(el => el.textContent.includes('Change Wallpaper'));
      if (item) item.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const wallpaperPickerOpen = await page.evaluate(() => {
      const win = document.querySelector('.window');
      return win ? win.querySelector('.window-title').textContent : null;
    });
    console.log('Wallpaper picker window title:', wallpaperPickerOpen);

    // Click 'City' swatch
    console.log('Clicking City swatch...');
    await page.evaluate(() => {
      const swatches = Array.from(document.querySelectorAll('.wallpaper-swatch'));
      const citySwatch = swatches.find(el => el.textContent.includes('City'));
      if (citySwatch) citySwatch.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 6. Click Start button
    console.log('Clicking Start button...');
    await page.evaluate(() => {
      const startBtn = document.querySelector('.start-button');
      if (startBtn) startBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const startMenuVisible = await page.evaluate(() => {
      const menu = document.querySelector('.start-menu');
      return !!menu;
    });
    console.log('Start menu visible:', startMenuVisible);

    // Press Escape to close Start menu
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // 7. Take screenshot
    await page.screenshot({ path: 'final_screenshot.png' });
    console.log('Screenshot saved to final_screenshot.png');

    console.log('Console errors:', consoleErrors);

    await browser.close();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    server.close();
    process.exit(1);
  }
});

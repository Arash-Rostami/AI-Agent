from playwright.sync_api import sync_playwright

def verify_arvancloud_buttons():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        page.goto('http://localhost:3000')

        # Wait for the service selector to be visible
        selector = page.locator('#service-select')
        selector.wait_for(state='visible')

        # Verify options exist
        options = selector.locator('option')
        texts = options.all_inner_texts()
        print('Found options:', texts)

        # Take screenshot
        page.screenshot(path='verification/ui_options.png')
        print('Screenshot saved to verification/ui_options.png')

        browser.close()

if __name__ == '__main__':
    verify_arvancloud_buttons()

from playwright.sync_api import sync_playwright

def verify_sync_button():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the home page
        page.goto("http://localhost:3000")

        # Wait for the page to load
        page.wait_for_load_state("networkidle")

        # Check if the sync button is visible (it should be now, based on my changes)
        sync_button = page.locator("#sync-btn")

        # Take a screenshot of the header area where the button is
        page.screenshot(path="verification/sync_button_verification.png")

        print("Screenshot taken.")
        browser.close()

if __name__ == "__main__":
    verify_sync_button()

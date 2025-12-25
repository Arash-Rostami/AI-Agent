
from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to static server
        page.goto('http://localhost:8000')

        # We need to simulate the environment for UIHandler.
        # UIHandler's initPromptSuggestions checks 'if (window.self !== window.top) return;'
        # This implies it might NOT run if it thinks it's the top window, or vice versa?
        # Let's check the code: 'if (window.self !== window.top) return;' -> It RETURNS (exits) if it IS an iframe.
        # Wait, usually people want it to ONLY run in iframe? Or NEVER run in iframe?
        # 'if (window.self !== window.top) return;' means: If inside iframe, STOP.
        # So running directly in top window is GOOD.

        # However, app.js might need to be triggered.
        # Let's wait for the selector.

        # Hover to trigger suggestions
        try:
            page.locator('#message-input').hover(timeout=5000)

            # Check for 'Forecast' prompt
            forecast_text = "Forecast for [city] for the next 5 days."
            # Using specific text matcher
            page.wait_for_selector(f'div.prompt-card:has-text("{forecast_text}")', state='attached', timeout=5000)

            print("✅ Found Forecast prompt.")

            aqi_text = "Check air quality in [city]."
            page.wait_for_selector(f'div.prompt-card:has-text("{aqi_text}")', state='attached', timeout=1000)
            print("✅ Found Air Quality prompt.")

            time_text = "What time is it in [city]?"
            page.wait_for_selector(f'div.prompt-card:has-text("{time_text}")', state='attached', timeout=1000)
            print("✅ Found Time prompt.")

            # Screenshot
            page.screenshot(path='verification/frontend_verification.png')

        except Exception as e:
            print(f"❌ Verification failed: {e}")
            # Dump page content to debug
            print("Page content dump:")
            print(page.content()[:1000]) # First 1000 chars

        browser.close()

if __name__ == '__main__':
    verify_frontend()

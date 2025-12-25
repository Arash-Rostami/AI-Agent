
from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to localhost
        page.goto('http://localhost:3000')

        # Wait for JS to load and populate prompts
        # The prompt suggestions are hidden by default, but they should exist in the DOM
        # We can force them to show by simulating hover on the input

        page.locator('#message-input').hover()

        # Check for 'Forecast' prompt
        forecast_text = "Forecast for [city] for the next 5 days."
        page.wait_for_selector(f'text={forecast_text}', state='attached')

        # Check for 'Air Quality' prompt
        aqi_text = "Check air quality in [city]."
        page.wait_for_selector(f'text={aqi_text}', state='attached')

        # Check for 'Time' prompt
        time_text = "What time is it in [city]?"
        page.wait_for_selector(f'text={time_text}', state='attached')

        print("✅ All prompts found in DOM.")

        # Take a screenshot with the suggestions visible
        # We need to hover again or ensure they stay open
        page.locator('#message-input').hover()
        page.screenshot(path='verification/frontend_verification.png')

        browser.close()

if __name__ == '__main__':
    verify_frontend()

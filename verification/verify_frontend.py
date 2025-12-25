
from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the local HTML file directly
        # We need to use absolute path for file:// protocol
        import os
        cwd = os.getcwd()
        page.goto(f'file://{cwd}/public/index.html')

        # Wait for the prompt suggestions to be available in the DOM
        # The prompt suggestions are inside #prompt-suggestions
        # UIHandler populates them, so we expect to find the new texts

        # Check for 'Forecast' prompt
        forecast_locator = page.get_by_text("Forecast for [city] for the next 5 days.")

        # Check for 'Air Quality' prompt
        aqi_locator = page.get_by_text("Check air quality in [city].")

        # Check for 'Time' prompt
        time_locator = page.get_by_text("What time is it in [city]?")

        # We can hover over the input to trigger visibility if needed,
        # but the DOM elements might be present but hidden.
        # Let's inspect the HTML content to verify existence first.

        content = page.content()

        found_forecast = "Forecast for [city] for the next 5 days." in content
        found_aqi = "Check air quality in [city]." in content
        found_time = "What time is it in [city]?" in content

        print(f"Found Forecast Prompt: {found_forecast}")
        print(f"Found Air Quality Prompt: {found_aqi}")
        print(f"Found Time Prompt: {found_time}")

        # Take a screenshot of the prompt suggestions area
        # We might need to make them visible first by simulating the UIHandler logic
        # But for now, let's just capture the whole page
        page.screenshot(path='verification/frontend_verification.png', full_page=True)

        browser.close()

if __name__ == '__main__':
    verify_frontend()

from playwright.sync_api import sync_playwright

def test_login_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Go to login page
        page.goto("http://localhost:3000/login.html")

        # 2. Wait for page to load
        page.wait_for_selector(".card")

        # 3. Take screenshot of Sign In view
        page.screenshot(path="verification/signin_view.png")

        # 4. Click Sign Up button
        # Using data-view attribute or text
        page.click("button[data-view='signup']")

        # 5. Wait for transition (0.5s CSS transition)
        page.wait_for_timeout(1000)

        # 6. Take screenshot of Sign Up view
        page.screenshot(path="verification/signup_view.png")

        browser.close()

if __name__ == "__main__":
    test_login_page()

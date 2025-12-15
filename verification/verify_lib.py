from playwright.sync_api import sync_playwright

def verify_html2pdf_loaded():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Bypass auth via BMS header
        context = browser.new_context(
            extra_http_headers={
                'Referer': 'https://export.communitasker.io/'
            }
        )
        page = context.new_page()

        try:
            # Navigate to index.html
            page.goto("http://localhost:3333/index.html")

            # Wait a bit for scripts
            page.wait_for_timeout(1000)

            # Check window.html2pdf
            is_loaded = page.evaluate("() => typeof window.html2pdf !== 'undefined'")
            print(f"html2pdf loaded: {is_loaded}")

            if not is_loaded:
                # Debug: check if script tag exists and src is correct
                src = page.evaluate("() => document.querySelector('script[src*=\"html2pdf\"]').src")
                print(f"Script src: {src}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_html2pdf_loaded()

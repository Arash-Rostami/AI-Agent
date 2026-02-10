from playwright.sync_api import sync_playwright

def debug_card_hero():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Go to login page
        page.goto("http://localhost:3000/login.html")
        page.wait_for_selector(".card")

        # 2. Get viewport size
        viewport = page.viewport_size
        print(f"Viewport size: {viewport}")

        # 3. Get computed styles for .card-hero
        hero_style = page.eval_on_selector(".card-hero", """
            (el) => {
                const style = window.getComputedStyle(el);
                return {
                    display: style.display,
                    width: style.width,
                    flex: style.flex,
                    visibility: style.visibility,
                    position: style.position
                };
            }
        """)
        print(f"Hero styles: {hero_style}")

        # 4. Get computed styles for .card
        card_style = page.eval_on_selector(".card", """
            (el) => {
                const style = window.getComputedStyle(el);
                return {
                    width: style.width,
                    maxWidth: style.maxWidth
                };
            }
        """)
        print(f"Card styles: {card_style}")

        browser.close()

if __name__ == "__main__":
    debug_card_hero()

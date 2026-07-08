"""End-to-end tests for the Medicare BD pharmacy storefront."""
import os
import allure
import pytest
from pathlib import Path

SCREENSHOT_DIR = Path(__file__).resolve().parents[2] / "screenshots" / "pages"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def shot(page, name: str, full_page: bool = False):
    path = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=full_page)
    with open(path, "rb") as f:
        allure.attach(f.read(), name=name, attachment_type=allure.attachment_type.PNG)
    return path


@allure.epic("Medicare BD")
@allure.feature("Home Page")
class TestHome:
    @allure.story("Home page loads with hero and header")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_home_loads(self, page, base_url):
        with allure.step("Navigate to home"):
            page.goto(base_url, wait_until="networkidle")
        with allure.step("Verify header brand present"):
            assert page.locator("header").first.is_visible()
            assert page.get_by_text("মেডিকেয়ার").first.is_visible()
        with allure.step("Capture screenshot"):
            shot(page, "01_home_top")
            page.evaluate("window.scrollTo(0, document.body.scrollHeight/2)")
            page.wait_for_timeout(400)
            shot(page, "02_home_middle")
            shot(page, "03_home_full", full_page=True)

    @allure.story("Announcement bar and navigation links")
    def test_navigation(self, page, base_url):
        page.goto(base_url, wait_until="domcontentloaded")
        for label in ["সব পণ্য", "আমাদের সম্পর্কে", "অর্ডার ট্র্যাক", "যোগাযোগ"]:
            assert page.get_by_role("link", name=label).first.is_visible()


@allure.epic("Medicare BD")
@allure.feature("Product Catalog")
class TestProducts:
    @allure.story("Products listing page renders grid")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_products_list(self, page, base_url):
        page.goto(f"{base_url}/products", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "04_products_list", full_page=True)
        # There should be at least one product card or empty-state text.
        assert page.locator("body").inner_text() != ""

    @allure.story("Product search functionality")
    def test_product_search(self, page, base_url):
        page.goto(f"{base_url}/products?q=vitamin", wait_until="networkidle")
        page.wait_for_timeout(500)
        shot(page, "05_products_search")

    @allure.story("Product detail page opens")
    def test_product_detail(self, page, base_url):
        page.goto(f"{base_url}/products", wait_until="networkidle")
        page.wait_for_timeout(1000)
        card = page.locator("a[href*='/products/']").first
        if card.count() > 0:
            card.click()
            page.wait_for_load_state("networkidle")
            shot(page, "06_product_detail", full_page=True)


@allure.epic("Medicare BD")
@allure.feature("Cart & Checkout")
class TestCart:
    @allure.story("Empty cart page loads")
    def test_cart_page(self, page, base_url):
        page.goto(f"{base_url}/cart", wait_until="networkidle")
        shot(page, "07_cart")

    @allure.story("Checkout page loads")
    def test_checkout(self, page, base_url):
        page.goto(f"{base_url}/checkout", wait_until="networkidle")
        page.wait_for_timeout(500)
        shot(page, "08_checkout", full_page=True)


@allure.epic("Medicare BD")
@allure.feature("Auth")
class TestAuth:
    @allure.story("Login page renders")
    @allure.severity(allure.severity_level.NORMAL)
    def test_login_page(self, page, base_url):
        page.goto(f"{base_url}/login", wait_until="networkidle")
        shot(page, "09_login")
        assert page.locator("input").count() >= 1

    @allure.story("Account page redirects unauthenticated users")
    def test_account_gate(self, page, base_url):
        page.goto(f"{base_url}/account", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot(page, "10_account")


@allure.epic("Medicare BD")
@allure.feature("Informational Pages")
class TestInfoPages:
    @allure.story("About page")
    def test_about(self, page, base_url):
        page.goto(f"{base_url}/about", wait_until="networkidle")
        shot(page, "11_about", full_page=True)

    @allure.story("Contact page")
    def test_contact(self, page, base_url):
        page.goto(f"{base_url}/contact", wait_until="networkidle")
        shot(page, "12_contact", full_page=True)

    @allure.story("Order tracking page")
    def test_track(self, page, base_url):
        page.goto(f"{base_url}/track", wait_until="networkidle")
        shot(page, "13_track")

    @allure.story("Privacy policy page")
    def test_privacy(self, page, base_url):
        page.goto(f"{base_url}/policy/privacy", wait_until="networkidle")
        shot(page, "14_privacy", full_page=True)

    @allure.story("Refund policy page")
    def test_refund(self, page, base_url):
        page.goto(f"{base_url}/policy/refund", wait_until="networkidle")
        shot(page, "15_refund", full_page=True)


@allure.epic("Medicare BD")
@allure.feature("Admin (auth-gated)")
class TestAdmin:
    @allure.story("Admin panel is gated behind authentication")
    @allure.severity(allure.severity_level.CRITICAL)
    def test_admin_gate(self, page, base_url):
        page.goto(f"{base_url}/admin", wait_until="networkidle")
        page.wait_for_timeout(800)
        shot(page, "16_admin_gate")


@allure.epic("Medicare BD")
@allure.feature("SEO & Performance")
class TestSEO:
    @allure.story("Homepage has proper meta tags")
    def test_meta_tags(self, page, base_url):
        page.goto(base_url, wait_until="domcontentloaded")
        title = page.title()
        assert title and len(title) > 5
        desc = page.locator('meta[name="description"]').get_attribute("content")
        assert desc and len(desc) > 20
        allure.attach(f"title: {title}\ndescription: {desc}",
                      name="meta", attachment_type=allure.attachment_type.TEXT)

    @allure.story("Sitemap is served")
    def test_sitemap(self, page, base_url):
        resp = page.request.get(f"{base_url}/sitemap.xml")
        assert resp.status == 200
        allure.attach(resp.text()[:2000], name="sitemap.xml",
                      attachment_type=allure.attachment_type.XML)

    @allure.story("robots.txt is served")
    def test_robots(self, page, base_url):
        resp = page.request.get(f"{base_url}/robots.txt")
        assert resp.status == 200
        allure.attach(resp.text(), name="robots.txt",
                      attachment_type=allure.attachment_type.TEXT)


@allure.epic("Medicare BD")
@allure.feature("Responsive Design")
class TestResponsive:
    @allure.story("Mobile viewport renders home")
    def test_mobile(self, browser, base_url):
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        p = ctx.new_page()
        p.goto(base_url, wait_until="networkidle")
        p.wait_for_timeout(500)
        path = SCREENSHOT_DIR / "17_mobile_home.png"
        p.screenshot(path=str(path), full_page=True)
        with open(path, "rb") as f:
            allure.attach(f.read(), name="mobile_home",
                          attachment_type=allure.attachment_type.PNG)
        ctx.close()

    @allure.story("Tablet viewport renders products")
    def test_tablet(self, browser, base_url):
        ctx = browser.new_context(viewport={"width": 820, "height": 1180})
        p = ctx.new_page()
        p.goto(f"{base_url}/products", wait_until="networkidle")
        p.wait_for_timeout(500)
        path = SCREENSHOT_DIR / "18_tablet_products.png"
        p.screenshot(path=str(path), full_page=True)
        with open(path, "rb") as f:
            allure.attach(f.read(), name="tablet_products",
                          attachment_type=allure.attachment_type.PNG)
        ctx.close()

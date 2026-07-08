import os
import pytest
import allure
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")


@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance):
    b = playwright_instance.chromium.launch(headless=True)
    yield b
    b.close()


@pytest.fixture()
def page(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 1600})
    page = ctx.new_page()
    yield page
    ctx.close()


@pytest.fixture(autouse=True)
def _attach_on_fail(request, page):
    yield
    if request.node.rep_call.failed if hasattr(request.node, "rep_call") else False:
        allure.attach(page.screenshot(), name="failure", attachment_type=allure.attachment_type.PNG)


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

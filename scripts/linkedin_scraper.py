"""
LinkedIn Profile Scraper using Playwright.
"""

import os
import json
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Page

from scrapers import scrapers

load_dotenv(Path(__file__).parent.parent.parent / ".env")

LINKEDIN_USERNAME = os.getenv("LINKEDIN_USERNAME")
LINKEDIN_PASSWORD = os.getenv("LINKEDIN_PASSWORD")
LINKEDIN_URL = os.getenv("LINKEDIN_URL")

def login(page: Page) -> None:
    if not LINKEDIN_USERNAME or not LINKEDIN_PASSWORD:
        raise ValueError("LINKEDIN_USERNAME and LINKEDIN_PASSWORD must be set in .env")

    print("Navigating to LinkedIn login...")
    page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")

    print("Entering credentials...")
    page.fill('input[name="session_key"]', LINKEDIN_USERNAME)
    page.fill('input[name="session_password"]', LINKEDIN_PASSWORD)
    page.click('button[type="submit"]')

    print("Waiting for login to complete...")
    page.wait_for_url(lambda url: "login" not in url, timeout=15000)
    print("Login successful.")


def load_profile(page: Page) -> None:
    print(f"Navigating to profile: {LINKEDIN_URL}")
    page.goto(LINKEDIN_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    print("Profile loaded.")

def main():
    resume_data = {}
    print("Starting LinkedIn scraper...")
    
    with sync_playwright() as p:
        print("Launching browser...")
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(Path(__file__).parent / "temp" / "linkedin_profile"),
            channel="chrome",
            headless=False,
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
        """)
        page = context.new_page()

        try:
            login(page)
            load_profile(page)

            for name, scraper in scrapers.items():
                resume_data[name] = scraper(page).scrape()
        finally:
            context.close()

            with open(Path(__file__).parent / "resume_data.json", "w", encoding="utf-8") as f:
                json.dump(resume_data, f, indent=2, default=str)

if __name__ == "__main__":
    main()

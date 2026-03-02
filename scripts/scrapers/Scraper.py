import re
from playwright.sync_api import Page
from abc import ABC, abstractmethod
from dotenv import load_dotenv
from pathlib import Path
import random
import os

load_dotenv(Path(__file__).parent.parent.parent / ".env")

LINKEDIN_URL = os.getenv("LINKEDIN_URL")

class Scraper(ABC):
    def __init__(self, page: Page):
        self.page = page
        self.POSITION_DATES = re.compile(
            r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} (?:-|to) "
            r"(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})(?: · .+)?$"
        )
        self.DATE_RANGE = re.compile(
            r"^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}) (?:-|to) "
            r"(Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})"
        )
        
    def _load_page_details(self, endpoint: str, scroll_count: int = 1) -> None:
        print(f"Navigating to experience details: {LINKEDIN_URL}{endpoint}")
        self.page.goto(f"{LINKEDIN_URL}{endpoint}", wait_until="domcontentloaded")
        self._wait()
        print("Scrolling to load lazy content...")
        for _ in range(scroll_count):
            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            self._wait()
        self.page.evaluate("window.scrollTo(0, 0)")
        print("Page details loaded.")
        
    
    def _bullets(self, text: str) -> list[str]:
        return [
            (line[2:].strip() if line.startswith("- ") else line.strip())
            for line in text.split("\n") if line.strip()
        ]


    def _skills(self, text: str) -> list[str]:
        if "Skills:" not in text:
            return []
        return [s.strip() for s in text.split("Skills:", 1)[1].strip().split(" · ") if s.strip()]


    def _is_location(self, s: str) -> bool:
        return ", United States" in s or s.endswith("United States")
    
    def _wait(self, min_wait: int = 1000, max_wait: int = 2000) -> None:
        self.page.wait_for_timeout(random.randint(min_wait, max_wait))

    @abstractmethod
    def scrape(self) -> list[dict]:
        pass
    
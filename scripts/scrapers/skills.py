from .Scraper import Scraper

class SkillsScraper(Scraper):
    def scrape(self) -> list[dict]:
        self._load_page_details("/details/skills/", scroll_count=5)
        items = [s.inner_text() for s in self.page.locator("main section a span[aria-hidden]").all()]
        return items
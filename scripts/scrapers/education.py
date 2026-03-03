import re
from .Scraper import Scraper

DATE_RANGE = re.compile(r"^([A-Za-z]{3} \d{4}) - ([A-Za-z]{3} \d{4})$")
GRADE = re.compile(r"^Grade:\s*(.+)$")


class EducationScraper(Scraper):
    def _parse_education(self, items: list[str]) -> list[dict]:
        entries = []
        i = 0
        while i < len(items):
            m = DATE_RANGE.match(items[i])
            if not m or i < 2:
                i += 1
                continue

            start, end = m.groups()
            degree = items[i - 1].strip()
            school = items[i - 2].strip()

            grade = None
            if i + 1 < len(items) and items[i + 1].startswith("Grade:"):
                grade_match = GRADE.match(items[i + 1])
                if grade_match:
                    grade = grade_match.group(1).strip()
                else:
                    grade = items[i + 1].replace("Grade:", "", 1).strip()
                i += 1

            entries.append({
                "school": school,
                "degree": degree,
                "start": start,
                "end": end,
                "grade": grade,
            })
            i += 1
        return entries
    
    def scrape(self) -> list[dict]:
        self._load_page_details("/details/education/")
        items = [s.inner_text() for s in self.page.locator("main section span[aria-hidden]").all()]
        education = self._parse_education(items)
        print(f"\nFound {len(education)} education(s):\n")
        self.page.go_back()
        return education

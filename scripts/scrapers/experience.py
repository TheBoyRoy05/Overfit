from .Scraper import Scraper 

EMPLOYMENT = ("Internship", "Part-time", "Full-time", "Contract", "Freelance")

class ExperienceScraper(Scraper):
    def _parse_experience_items(self, items: list[str]) -> list[dict]:
        exps, company, i = [], items[0] if items else None, 0

        while i < len(items):
            item = items[i]

            if self.POSITION_DATES.match(item) and i > 0:
                prev = items[i - 1]
                if " · " in prev and any(t in prev for t in EMPLOYMENT):
                    title, company = items[i - 2] if i >= 2 else prev, prev.split(" · ")[0].strip()
                else:
                    title = prev

                dates = self.DATE_RANGE.search(item)
                start, end = dates.groups() if dates else (None, None)
                desc, skills = None, []

                i += 1
                while i < len(items):
                    nxt = items[i]
                    if nxt.startswith("Skills:"):
                        skills = self._skills(nxt)
                        i += 1
                        break
                    if self.POSITION_DATES.match(nxt):
                        break
                    if not self._is_location(nxt):
                        desc = nxt
                    i += 1

                exps.append({
                    "company": company,
                    "title": title,
                    "start": start,
                    "end": end,
                    "description": self._bullets(desc) if desc else [],
                    "skills": skills,
                })

                continue
            i += 1
        return exps

    def scrape(self) -> list[dict]:
        self._load_page_details("/details/experience/")
        items = [s.inner_text() for s in self.page.locator("main section span[aria-hidden]").all()]
        experiences = self._parse_experience_items(items)
        print(f"\nFound {len(experiences)} experience(s):\n")
        self.page.go_back()
        return experiences

from .Scraper import Scraper

class ProjectsScraper(Scraper):
    def _get_project_links(self) -> list[str]:
        links = []
        modal_triggers = self.page.locator("main section li > a[href]").all()
        for trigger in modal_triggers:
            trigger.click()
            view_link = self.page.get_by_role("link", name="View").first
            view_link.wait_for(state="visible", timeout=5000)
            links.append(view_link.get_attribute("href") or "")
            self.page.locator('button[aria-label="Dismiss"]').click()
            self._wait()
        return links

    def _parse_project_items(self, items: list[str], links: list[str]) -> list[dict]:
        projects, link_idx, i = [], 0, 0
        while i < len(items):
            item = items[i]
            if self.POSITION_DATES.match(item) and i > 0:
                title = items[i - 1]
                m = self.DATE_RANGE.search(item)
                start, end = m.groups() if m else (None, None)
                desc_parts, skills = [], []
                i += 1
                while i < len(items):
                    nxt = items[i]
                    if nxt.startswith("Skills:"):
                        skills = self._skills(nxt)
                        i += 1
                        break
                    if self.POSITION_DATES.match(nxt):
                        break
                    desc_parts.append(nxt)
                    i += 1
                desc = "\n\n".join(desc_parts) if desc_parts else None
                link = links[link_idx] if link_idx < len(links) else None
                link_idx += 1
                projects.append({
                    "title": title,
                    "link": link,
                    "start": start,
                    "end": end,
                    "description": self._bullets(desc) if desc else [],
                    "skills": skills,
                })
                continue
            i += 1
        return projects

    def scrape(self) -> list[dict]:
        self._load_page_details("/details/projects/")
        links = self._get_project_links()
        items = [s.inner_text() for s in self.page.locator("main section span[aria-hidden]").all()]
        projects = self._parse_project_items(items, links)
        print(f"\nFound {len(projects)} project(s):\n")
        self.page.go_back()
        return projects

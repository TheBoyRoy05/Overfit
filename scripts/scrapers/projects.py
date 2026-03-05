import re
from .Scraper import Scraper

PROJECT_ID_RE = re.compile(r"/projects/(\d+)/")


class ProjectsScraper(Scraper):
    def _get_project_links(self) -> tuple[list[str], dict[str, str]]:
        """Returns (project_order, project_id_to_url). Only opens type=LINK modals."""
        project_order = []
        project_id_to_url = {}
        seen_ids = set()

        modal_triggers = self.page.locator("main section li > a[href]").all()
        for trigger in modal_triggers:
            href = trigger.get_attribute("href") or ""
            project_id_match = PROJECT_ID_RE.search(href)
            project_id = project_id_match.group(1) if project_id_match else None
            is_link = "type=LINK" in href

            if project_id and project_id not in seen_ids:
                seen_ids.add(project_id)
                project_order.append(project_id)

            if project_id and is_link and project_id not in project_id_to_url:
                trigger.click()
                modal = self.page.locator('[role="dialog"], [aria-modal="true"]').first
                view_link = modal.locator('a[href]').filter(has_text="View").first
                view_link.wait_for(state="visible", timeout=5000)
                url = view_link.get_attribute("href") or ""
                if url and "linkedin.com" not in url:
                    project_id_to_url[project_id] = url
                self.page.locator('button[aria-label="Dismiss"]').click()
                self._wait()

        return project_order, project_id_to_url

    def _parse_project_items(self, items: list[str], project_order: list[str], project_id_to_url: dict[str, str]) -> list[dict]:
        projects, project_idx, i = [], 0, 0
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
                # Count media items (between Skills and next project's date range)
                media_count = 0
                while i < len(items):
                    if i < len(items) - 1 and self.POSITION_DATES.match(items[i + 1]):
                        break
                    media_count += 1
                    i += 1
                desc = "\n\n".join(desc_parts) if desc_parts else None
                project_id = project_order[project_idx] if project_idx < len(project_order) else None
                link = project_id_to_url.get(project_id) if project_id else None
                project_idx += 1
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
        project_order, project_id_to_url = self._get_project_links()
        items = [s.inner_text() for s in self.page.locator("main section span[aria-hidden]").all()]
        projects = self._parse_project_items(items, project_order, project_id_to_url)
        print(f"\nFound {len(projects)} project(s):\n")
        self.page.go_back()
        return projects

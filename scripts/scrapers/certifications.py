import re
from .Scraper import Scraper

ISSUED = re.compile(r"Issued (.+?)(?: · Expires (.+))?$")
CREDENTIAL_ID = re.compile(r"^Credential ID (.+)$")


class CertificationsScraper(Scraper):
    def _get_credential_links(self) -> list[str]:
        return [
            el.get_attribute("href") or ""
            for el in self.page.locator('a:has-text("Show credential")').all()
        ]
        
    def _parse_certifications(self, items: list[str], links: list[str] | None = None) -> list[dict]:
        certs = []
        link_idx = 0
        i = 0
        while i < len(items):
            if not items[i].startswith("Skills:"):
                i += 1
                continue

            skills = self._skills(items[i])
            credential_id = None
            issued = None
            expires = None

            j = i - 1
            if j >= 0 and items[j].startswith("Credential ID "):
                credential_id = items[j].replace("Credential ID ", "", 1).strip()
                j -= 1

            if j >= 0 and items[j].startswith("Issued "):
                m = ISSUED.match(items[j])
                if m:
                    issued = m.group(1).strip()
                    expires = m.group(2).strip() if m.group(2) else None
                j -= 1

            issuer = items[j].strip() if j >= 0 else None
            j -= 1
            name = items[j].strip() if j >= 0 else None

            link = links[link_idx] if links and link_idx < len(links) else None
            link_idx += 1

            certs.append({
                "name": name,
                "issuer": issuer,
                "issued": issued,
                "expires": expires,
                "credential_id": credential_id,
                "skills": skills,
                "link": link,
            })
            i += 1
        return certs

    def scrape(self) -> list[dict]:
        self._load_page_details("/details/certifications/")
        links = self._get_credential_links()
        items = [s.inner_text() for s in self.page.locator("main section span[aria-hidden]").all()]
        certifications = self._parse_certifications(items, links)
        
        print(f"\nFound {len(certifications)} certification(s):\n")
        self.page.go_back()
        return certifications
    
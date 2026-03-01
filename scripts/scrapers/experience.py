import re

try:
    from playwright.sync_api import Page
except ImportError:
    Page = None

POSITION_DATES = re.compile(
    r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} (?:-|to) "
    r"(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}) · .+$"
)
DATE_RANGE = re.compile(
    r"^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}) (?:-|to) "
    r"(Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})"
)
EMPLOYMENT = ("Internship", "Part-time", "Full-time", "Contract", "Freelance")


def _bullets(text: str) -> list[str]:
    return [
        (line[2:].strip() if line.startswith("- ") else line.strip())
        for line in text.split("\n") if line.strip()
    ]


def _skills(text: str) -> list[str]:
    if "Skills:" not in text:
        return []
    return [s.strip() for s in text.split("Skills:", 1)[1].strip().split(" · ") if s.strip()]


def _is_location(s: str) -> bool:
    return ", United States" in s or s.endswith("United States")


def parse_items(items: list[str]) -> list[dict]:
    exps, company, i = [], items[0] if items else None, 0
    
    while i < len(items):
        item = items[i]
        
        if POSITION_DATES.match(item) and i > 0:
            prev = items[i - 1]
            if " · " in prev and any(t in prev for t in EMPLOYMENT):
                title, company = items[i - 2] if i >= 2 else prev, prev.split(" · ")[0].strip()
            else: title = prev
            
            dates = DATE_RANGE.search(item)
            start, end = dates.groups() if dates else (None, None)
            desc, skills = None, []
            
            i += 1
            while i < len(items):
                nxt = items[i]
                if nxt.startswith("Skills:"):
                    skills = _skills(nxt)
                    i += 1
                    break
                if POSITION_DATES.match(nxt):
                    break
                if not _is_location(nxt):
                    desc = nxt
                i += 1
                
            exps.append({
                "company": company,
                "title": title,
                "start": start,
                "end": end,
                "description": _bullets(desc) if desc else [],
                "skills": skills,
            })
            
            continue
        i += 1
    return exps


def scrape_experience(page: Page) -> list[dict]:
    items = [s.inner_text() for s in page.locator("main > section span[aria-hidden]").all()]
    experiences = parse_items(items)
    print(f"\nFound {len(experiences)} experience(s):\n")
    return experiences

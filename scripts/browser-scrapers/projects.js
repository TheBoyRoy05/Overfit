/**
 * LinkedIn Projects Scraper - Run in browser console on:
 * linkedin.com/in/YOUR_USERNAME/details/projects/
 *
 * NOTE: This script collects links by opening/closing modals. Run it and wait
 * for modals to open and close automatically (may take a few seconds per project).
 * Copies JSON result to clipboard when done. Also returns the data.
 */
(async function scrapeProjects() {
  const POSITION_DATES = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} (?:-|to) (?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})(?: · .+)?$/;
  const DATE_RANGE = /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}) (?:-|to) (Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})/;

  function bullets(text) {
    return text.split("\n").filter((l) => l.trim()).map((l) => (l.startsWith("- ") ? l.slice(2).trim() : l.trim()));
  }
  function skills(text) {
    if (!text.includes("Skills:")) return [];
    return (text.split("Skills:", 2)[1] || "").trim().split(" · ").map((s) => s.trim()).filter(Boolean);
  }

  const modalTriggers = [...document.querySelectorAll("main section li > a[href]")];
  const projectOrder = [];
  const projectIdToUrl = {};
  const seenIds = new Set();

  for (const trigger of modalTriggers) {
    const href = trigger.href;
    const projectIdMatch = href.match(/\/projects\/(\d+)\//);
    const projectId = projectIdMatch ? projectIdMatch[1] : null;
    const isLink = href.includes("type=LINK");

    if (projectId && !seenIds.has(projectId)) {
      seenIds.add(projectId);
      projectOrder.push(projectId);
    }

    if (projectId && isLink && !projectIdToUrl[projectId]) {
      trigger.click();
      await new Promise((r) => setTimeout(r, 800));
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('[aria-modal="true"]');
      const viewLink = modal ? [...modal.querySelectorAll("a[href]")].find((a) => a.textContent.trim() === "View") : null;
      const url = viewLink?.href;
      if (url && !url.includes("linkedin.com")) {
        projectIdToUrl[projectId] = url;
      }
      const dismissBtn = document.querySelector('button[aria-label="Dismiss"]');
      if (dismissBtn) dismissBtn.click();
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  const items = [...document.querySelectorAll("main section span[aria-hidden]")].map((s) => s.innerText);
  const projects = [];
  let projectIdx = 0;
  let i = 0;

  while (i < items.length) {
    const item = items[i];
    if (POSITION_DATES.test(item) && i > 0) {
      const title = items[i - 1];
      const dates = item.match(DATE_RANGE);
      const [start, end] = dates ? [dates[1], dates[2]] : [null, null];
      const descParts = [];
      let skillList = [];
      i++;

      while (i < items.length) {
        const nxt = items[i];
        if (nxt.startsWith("Skills:")) {
          skillList = skills(nxt);
          i++;
          break;
        }
        if (POSITION_DATES.test(nxt)) break;
        descParts.push(nxt);
        i++;
      }

      // Count media items (between Skills and next project's date range)
      let mediaCount = 0;
      while (i < items.length) {
        if (i < items.length - 1 && POSITION_DATES.test(items[i + 1])) break;
        mediaCount++;
        i++;
      }

      const desc = descParts.length ? descParts.join("\n\n") : null;
      const projectId = projectOrder[projectIdx];
      const link = (projectId && projectIdToUrl[projectId]) || null;
      projectIdx++;

      projects.push({
        title,
        link,
        start,
        end,
        description: desc ? bullets(desc) : [],
        skills: skillList,
      });
      continue;
    }
    i++;
  }

  const result = JSON.stringify(projects, null, 2);
  navigator.clipboard.writeText(result);
  console.log("Projects data copied to clipboard. Found", projects.length, "entries.");
  return projects;
})();

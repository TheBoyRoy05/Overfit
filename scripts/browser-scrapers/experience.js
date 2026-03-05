/**
 * LinkedIn Experience Scraper - Run in browser console on:
 * linkedin.com/in/YOUR_USERNAME/details/experience/
 *
 * Copies JSON result to clipboard. Also returns the data.
 */
(function scrapeExperience() {
  const POSITION_DATES = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} (?:-|to) (?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})(?: · .+)?$/;
  const DATE_RANGE = /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}) (?:-|to) (Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})/;
  const EMPLOYMENT = ["Internship", "Part-time", "Full-time", "Contract", "Freelance"];

  function bullets(text) {
    return text.split("\n").filter((l) => l.trim()).map((l) => (l.startsWith("- ") ? l.slice(2).trim() : l.trim()));
  }
  function skills(text) {
    if (!text.includes("Skills:")) return [];
    return (text.split("Skills:", 2)[1] || "").trim().split(" · ").map((s) => s.trim()).filter(Boolean);
  }
  function isLocation(s) {
    return s.includes(", United States") || s.endsWith("United States");
  }

  const items = [...document.querySelectorAll("main section span[aria-hidden]")].map((s) => s.innerText);
  const exps = [];
  let company = items[0] || null;
  let i = 0;

  while (i < items.length) {
    const item = items[i];
    if (POSITION_DATES.test(item) && i > 0) {
      const prev = items[i - 1];
      let title, companyName;
      if (prev.includes(" · ") && EMPLOYMENT.some((t) => prev.includes(t))) {
        title = i >= 2 ? items[i - 2] : prev;
        companyName = prev.split(" · ")[0].trim();
        company = companyName;
      } else {
        title = prev;
        companyName = company;
      }

      const dates = item.match(DATE_RANGE);
      const [start, end] = dates ? [dates[1], dates[2]] : [null, null];
      let desc = null;
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
        if (!isLocation(nxt)) desc = nxt;
        i++;
      }

      exps.push({
        company: companyName,
        title,
        start,
        end,
        description: desc ? bullets(desc) : [],
        skills: skillList,
      });
      continue;
    }
    i++;
  }

  const result = JSON.stringify(exps, null, 2);
  navigator.clipboard.writeText(result);
  console.log("Experience data copied to clipboard. Found", exps.length, "entries.");
  return exps;
})();

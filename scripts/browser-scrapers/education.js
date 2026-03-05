/**
 * LinkedIn Education Scraper - Run in browser console on:
 * linkedin.com/in/YOUR_USERNAME/details/education/
 *
 * Copies JSON result to clipboard. Also returns the data.
 */
(function scrapeEducation() {
  const DATE_RANGE = /^([A-Za-z]{3} \d{4}) - ([A-Za-z]{3} \d{4})$/;
  const GRADE = /^Grade:\s*(.+)$/;

  const items = [...document.querySelectorAll("main section span[aria-hidden]")].map((s) => s.innerText);
  const entries = [];
  let i = 0;

  while (i < items.length) {
    const m = items[i].match(DATE_RANGE);
    if (!m || i < 2) {
      i++;
      continue;
    }

    const [_, start, end] = m;
    const degree = items[i - 1].trim();
    const school = items[i - 2].trim();

    let grade = null;
    if (i + 1 < items.length && items[i + 1].startsWith("Grade:")) {
      const gradeMatch = items[i + 1].match(GRADE);
      grade = gradeMatch ? gradeMatch[1].trim() : items[i + 1].replace("Grade:", "", 1).trim();
      i++;
    }

    entries.push({ school, degree, start, end, grade });
    i++;
  }

  const result = JSON.stringify(entries, null, 2);
  navigator.clipboard.writeText(result);
  console.log("Education data copied to clipboard. Found", entries.length, "entries.");
  return entries;
})();

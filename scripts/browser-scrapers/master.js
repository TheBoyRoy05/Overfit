/**
 * LinkedIn Master Scraper - Run in browser console.
 *
 * 1. Start on: linkedin.com/in/YOUR_USERNAME/ (your profile page)
 * 2. Run this script (paste or use as bookmarklet)
 * 3. It navigates to each details page; run again when each page loads
 * 4. Run 6 times total: profile → experience → education → certifications → skills → projects
 * 5. On the last page, it downloads resume.json
 *
 * Scroll down on the skills page before running to load lazy content.
 */
(async function () {
  const STORAGE_KEY = "linkedinResumeData";
  const PAGES = ["experience", "education", "certifications", "skills", "projects"];

  async function waitAndScroll() {
    for (let i = 0; i < 3; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 800));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  }

  function getBaseUrl() {
    const match = window.location.pathname.match(/^(\/in\/[^/]+)\/?/);
    return match ? window.location.origin + match[1].replace(/\/?$/, "/") : null;
  }

  function getCurrentPage() {
    const match = window.location.pathname.match(/\/details\/(\w+)/);
    return match ? match[1] : null;
  }

  function loadStored() {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  }

  function saveStored(data) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function scrapeExperience() {
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
        exps.push({ company: companyName, title, start, end, description: desc ? bullets(desc) : [], skills: skillList });
        continue;
      }
      i++;
    }
    return exps;
  }

  function scrapeEducation() {
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
    return entries;
  }

  function scrapeCertifications() {
    const ISSUED = /^Issued (.+?)(?: · Expires (.+))?$/;
    function skills(text) {
      if (!text.includes("Skills:")) return [];
      return (text.split("Skills:", 2)[1] || "").trim().split(" · ").map((s) => s.trim()).filter(Boolean);
    }
    const links = [...document.querySelectorAll("main section a[href]")].filter((a) =>
      a.textContent.trim().includes("Show credential")
    ).map((a) => a.href || "");
    const items = [...document.querySelectorAll("main section span[aria-hidden]")].map((s) => s.innerText);
    const certs = [];
    let linkIdx = 0;
    let i = 0;
    while (i < items.length) {
      if (!items[i].startsWith("Skills:")) {
        i++;
        continue;
      }
      const skillList = skills(items[i]);
      let credentialId = null, issued = null, expires = null;
      let j = i - 1;
      if (j >= 0 && items[j].startsWith("Credential ID ")) {
        credentialId = items[j].replace("Credential ID ", "", 1).trim();
        j--;
      }
      if (j >= 0 && items[j].startsWith("Issued ")) {
        const issuedMatch = items[j].match(ISSUED);
        if (issuedMatch) {
          issued = issuedMatch[1].trim();
          expires = issuedMatch[2] ? issuedMatch[2].trim() : null;
        }
        j--;
      }
      const issuer = j >= 0 ? items[j].trim() : null;
      j--;
      const name = j >= 0 ? items[j].trim() : null;
      const link = links[linkIdx] ?? null;
      linkIdx++;
      certs.push({ name, issuer, issued, expires, credential_id: credentialId, skills: skillList, link });
      i++;
    }
    return certs;
  }

  function scrapeSkills() {
    return [...new Set(
      [...document.querySelectorAll("main section a span[aria-hidden]")]
        .map((s) => s.innerText.trim())
        .filter((text) => !text.toLowerCase().includes("endorse") && !text.toLowerCase().includes("experiences"))
    )];
  }

  async function scrapeProjects() {
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
    return projects;
  }

  async function run() {
    console.log("%c=== LinkedIn Scraper ===", "font-weight:bold;font-size:14px");
    const baseUrl = getBaseUrl();
    const current = getCurrentPage();
    console.log("URL:", window.location.href, "| Page:", current || "(profile)");

    if (!baseUrl) {
      console.log("Run this on a LinkedIn profile page, e.g. /in/username/");
      return;
    }

    // If on profile page (no /details/), navigate to first details page
    if (!current) {
      const firstUrl = `${baseUrl}details/experience/`;
      alert("When the next page loads, paste and run this script again. (You'll do this 5 times total.)");
      window.location.href = firstUrl;
      return;
    }

    const pageKey = current === "experiences" ? "experience" : current;
    const pageIdx = PAGES.indexOf(pageKey);
    if (pageIdx === -1) {
      console.log("Unknown page:", current, "Expected one of:", PAGES.join(", "));
      return;
    }

    const stored = loadStored();
    const keyMap = { experience: "experiences", education: "education", certifications: "certifications", skills: "skills", projects: "projects" };
    const key = keyMap[pageKey];

    console.log(`Scraping ${pageKey}...`);
    await waitAndScroll();

    const itemCount = document.querySelectorAll("main section span[aria-hidden]").length;
    console.log("Found", itemCount, "content elements");

    let data;
    if (pageKey === "projects") {
      data = await scrapeProjects();
    } else if (pageKey === "skills") {
      data = scrapeSkills();
    } else if (pageKey === "experience") {
      data = scrapeExperience();
    } else if (pageKey === "education") {
      data = scrapeEducation();
    } else if (pageKey === "certifications") {
      data = scrapeCertifications();
    }

    stored[key] = data;
    saveStored(stored);
    console.log(`Saved ${pageKey}:`, data?.length ?? 0, "entries");

    const nextIdx = pageIdx + 1;
    if (nextIdx < PAGES.length) {
      const nextPage = PAGES[nextIdx];
      const nextUrl = `${baseUrl}details/${nextPage}/`;
      alert(`Scraped ${pageKey}. When the next page loads, run the script again.`);
      if (nextPage === "skills") {
        console.log("(Scroll down on the skills page before running to load lazy content)");
      }
      window.location.href = nextUrl;
    } else {
      const resume = {
        education: stored.education || [],
        experiences: stored.experiences || [],
        certifications: stored.certifications || [],
        skills: stored.skills || [],
        projects: stored.projects || [],
      };

      const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "resume.json";
      a.click();
      URL.revokeObjectURL(a.href);

      sessionStorage.removeItem(STORAGE_KEY);
      console.log("Done! resume.json downloaded.");
    }
  }

  run().catch((e) => {
    console.error("Scraper error:", e);
    alert("Scraper error: " + e.message);
  });
})();

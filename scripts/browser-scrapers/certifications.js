/**
 * LinkedIn Certifications Scraper - Run in browser console on:
 * linkedin.com/in/YOUR_USERNAME/details/certifications/
 *
 * Copies JSON result to clipboard. Also returns the data.
 */
(function scrapeCertifications() {
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
    let credentialId = null;
    let issued = null;
    let expires = null;

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

    certs.push({
      name,
      issuer,
      issued,
      expires,
      credential_id: credentialId,
      skills: skillList,
      link,
    });
    i++;
  }

  const result = JSON.stringify(certs, null, 2);
  navigator.clipboard.writeText(result);
  console.log("Certifications data copied to clipboard. Found", certs.length, "entries.");
  return certs;
})();

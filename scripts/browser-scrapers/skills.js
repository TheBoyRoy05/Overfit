/**
 * LinkedIn Skills Scraper - Run in browser console on:
 * linkedin.com/in/YOUR_USERNAME/details/skills/
 *
 * Scroll down first to load lazy content (skills load on scroll).
 * Copies JSON result to clipboard. Also returns the data.
 */
(function scrapeSkills() {
  const skills = [...new Set(
    [...document.querySelectorAll("main section a span[aria-hidden]")]
      .map((s) => s.innerText.trim())
      .filter((text) => !text.toLowerCase().includes("endorse") && !text.toLowerCase().includes("experiences"))
  )];

  const result = JSON.stringify(skills, null, 2);
  navigator.clipboard.writeText(result);
  console.log("Skills data copied to clipboard. Found", skills.length, "skills.");
  return skills;
})();

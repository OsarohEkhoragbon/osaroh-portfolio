const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

function setExpanded(val) {
  if (toggle) toggle.setAttribute("aria-expanded", String(val));
}
if (toggle && links) {
  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    setExpanded(isOpen);
  });
  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      setExpanded(false);
    });
  });
}

// ---- GitHub Projects Loader ----
const cfg = window.PORTFOLIO || { githubUsername: "OsarohEkhoragbon", maxReposToShow: 9, featuredCount: 3 };

const recentGrid = document.getElementById("projectGrid");
const featuredGrid = document.getElementById("featuredGrid");
const repoCountEl = document.getElementById("repoCount");
const starCountEl = document.getElementById("starCount");

let recentRepos = [];
let featuredRepos = [];
let currentFilter = "all";

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });
  } catch {
    return "";
  }
}
function langKey(lang) {
  return (lang || "").toLowerCase().trim();
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function repoCard(repo, variant = "recent") {
  const lang = repo.language || "—";
  const desc = repo.description || "Repository on GitHub.";
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const homepage = repo.homepage && repo.homepage.startsWith("http") ? repo.homepage : null;

  const meta = variant === "featured"
    ? `
      <ul class="meta">
        <li><strong>Primary tool:</strong> ${escapeHtml(lang)}</li>
        <li><strong>Last update:</strong> ${fmtDate(repo.updated_at)}</li>
        <li><strong>Stars/Forks:</strong> ${stars} / ${forks}</li>
      </ul>`
    : `
      <ul class="meta">
        <li><strong>Language:</strong> ${escapeHtml(lang)}</li>
        <li><strong>Updated:</strong> ${fmtDate(repo.updated_at)}</li>
        <li><strong>Stars/Forks:</strong> ${stars} / ${forks}</li>
      </ul>`;

  return `
    <article class="card" data-lang="${langKey(lang)}">
      <h3>${escapeHtml(repo.name)}</h3>
      <p class="muted">${escapeHtml(desc)}</p>
      ${meta}
      <div class="actions">
        <a class="link" href="${repo.html_url}" target="_blank" rel="noreferrer">Code</a>
        ${homepage ? `<a class="link" href="${homepage}" target="_blank" rel="noreferrer">Live</a>` : ""}
      </div>
    </article>
  `;
}

function renderRecent() {
  if (!recentGrid) return;

  const filtered = recentRepos.filter(r => {
    if (currentFilter === "all") return true;
    return langKey(r.language) === currentFilter;
  });

  recentGrid.innerHTML = filtered.map(r => repoCard(r, "recent")).join("");
  if (filtered.length === 0) {
    recentGrid.innerHTML = `<div class="muted">No repositories match this filter yet.</div>`;
  }
}

function renderFeatured() {
  if (!featuredGrid) return;
  featuredGrid.innerHTML = featuredRepos.map(r => repoCard(r, "featured")).join("");
  if (featuredRepos.length === 0) {
    featuredGrid.innerHTML = `<div class="muted">No featured repositories found yet.</div>`;
  }
}

async function loadRepos() {
  const anyGrid = recentGrid || featuredGrid;
  if (anyGrid) anyGrid.innerHTML = `<div class="muted">Loading repositories from GitHub…</div>`;

  try {
    const userRes = await fetch(`https://api.github.com/users/${cfg.githubUsername}`);
    if (!userRes.ok) throw new Error("Failed to load GitHub user.");
    const user = await userRes.json();
    if (repoCountEl) repoCountEl.textContent = user.public_repos ?? "—";

    const repoRes = await fetch(`https://api.github.com/users/${cfg.githubUsername}/repos?per_page=100&sort=updated`);
    if (!repoRes.ok) throw new Error("Failed to load GitHub repos.");
    const repos = await repoRes.json();

    const cleaned = repos.filter(r => !r.fork).filter(r => !r.archived);

    // Featured: top by stars (tie-breaker by updated)
    featuredRepos = [...cleaned]
      .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at) - new Date(a.updated_at)))
      .slice(0, cfg.featuredCount ?? 3);

    // Recent: top by updated
    recentRepos = [...cleaned]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, cfg.maxReposToShow ?? 9);

    const totalStarsFeatured = featuredRepos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
    if (starCountEl) starCountEl.textContent = totalStarsFeatured;

    renderFeatured();
    renderRecent();
  } catch (err) {
    const msg = `
      <div class="muted">
        Couldn’t load repositories right now. You can still view them on
        <a class="link" href="https://github.com/${cfg.githubUsername}" target="_blank" rel="noreferrer">GitHub</a>.
      </div>
    `;
    if (featuredGrid) featuredGrid.innerHTML = msg;
    if (recentGrid) recentGrid.innerHTML = msg;
  }
}

// Filter buttons (filter applies to recent repos)
document.querySelectorAll(".chip-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderRecent();
  });
});

loadRepos();

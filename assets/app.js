/* =============================================================================
   GG Learning Labs — plain JavaScript version
   -----------------------------------------------------------------------------
   No build step, no framework, no terminal. Open index.html and it runs.

   WHERE TO EDIT WHAT
   1. CONTENT  — the lists just below (phases, news, memberships, services,
                 demoAccounts). This is where all the words and prices live.
   2. LOOK     — assets/styles.css
   3. LAYOUT   — index.html
   ========================================================================== */

/* -----------------------------------------------------------------------------
   1. CONTENT
   -------------------------------------------------------------------------- */

const phases = [
  {
    number: "01",
    title: "Diagnose",
    note: "Start with the truth on the ground.",
    accent: "lime",
    icon: "compass",
    services: [
      "TNI — Training Needs Identification",
      "TNA — Training Needs Analysis",
      "Skills-gap mapping",
      "Learning maturity scan",
    ],
  },
  {
    number: "02",
    title: "Design",
    note: "Turn insight into something people can use.",
    accent: "lilac",
    icon: "feather",
    services: ["SOP builder", "Curriculum architecture", "Learning pathway design", "Content and experience blueprint"],
  },
  {
    number: "03",
    title: "Plan",
    note: "Make the next move visible.",
    accent: "coral",
    icon: "target",
    services: ["Capability roadmap", "Cohort and calendar planning", "Facilitator readiness plan", "Learning operations setup"],
  },
  {
    number: "04",
    title: "Deliver",
    note: "Bring the work to life, in the flow of work.",
    accent: "sky",
    icon: "zap",
    services: ["Personalized coaching", "Facilitator enablement", "Workshop and facilitation kits", "Blended learning delivery"],
  },
  {
    number: "05",
    title: "Assess",
    note: "Check for changed capability, not just attendance.",
    accent: "yellow",
    icon: "gauge",
    services: ["Knowledge and skill assessments", "Role-based simulations", "Readiness checks", "Certification journeys"],
  },
  {
    number: "06",
    title: "Coach",
    note: "Build the confidence to keep going.",
    accent: "peach",
    icon: "users",
    services: ["1:1 coaching", "Manager as coach", "Peer practice circles", "Feedback and reflection design"],
  },
  {
    number: "07",
    title: "Observe",
    note: "See what great looks like in practice.",
    accent: "aqua",
    icon: "eye",
    services: ["Trainer observation", "On-the-job observation", "Quality rubrics", "Calibration and feedback loops"],
  },
  {
    number: "08",
    title: "Measure",
    note: "Make the signal stronger than the spreadsheet.",
    accent: "lavender",
    icon: "flame",
    services: ["Learning analytics", "Impact dashboards", "Business-aligned metrics", "ROI and value narratives"],
  },
  {
    number: "09",
    title: "Improve",
    note: "Close the loop. Then raise the bar.",
    accent: "green",
    icon: "lightbulb",
    services: ["Program retrospectives", "Continuous improvement sprints", "Action planning", "L&D operating rhythm"],
  },
];

const news = [
  {
    source: "CompTIA Research",
    category: "Signal / 2026",
    title: "Building skills is now a top-tier business priority.",
    excerpt:
      "The latest Workforce and Learning Trends report points to productivity, retention, engagement, and credentials as the new L&D scorecard.",
    date: "6 min read",
    color: "lime",
    url: "https://www.comptia.org/en-us/resources/research/workforce-and-learning-trends-2026/",
  },
  {
    source: "ELM Learning",
    category: "Field notes / 2026",
    title: "From content delivery to capability building.",
    excerpt:
      "The strongest L&D teams are joining strategy, adaptive learning, flow-of-work support, coaching, and analytics into one connected system.",
    date: "8 min read",
    color: "lilac",
    url: "https://elmlearning.com/blog/hot-topics-in-training-and-development/",
  },
  {
    source: "McKinsey",
    category: "Perspective",
    title: "The L&D function gets closer to the business.",
    excerpt:
      "A useful reminder: learning works hardest when it is designed around the capabilities that move the organisation forward.",
    date: "7 min read",
    color: "coral",
    url: "https://www.mckinsey.com/capabilities/people-and-organization/our-insights/the-essential-components-of-a-successful-l-and-d-strategy",
  },
];

const memberships = {
  individual: [
    {
      name: "One Membership",
      eyebrow: "For the curious operator",
      price: "₹4,999",
      suffix: "/ month",
      copy: "A considered library of L&D tools, templates, clinics, and office hours.",
      featured: true,
      cta: "Start exploring",
      items: ["All phase playbooks", "Monthly live clinic", "Template vault", "Member-only notes"],
    },
    {
      name: "Build Your Own",
      eyebrow: "For a focused project",
      price: "From ₹1,499",
      suffix: " / service",
      copy: "Pick the exact intervention you need, from TNA to a trainer observation kit.",
      featured: false,
      cta: "Choose a service",
      items: ["Single service purchase", "Defined scope and output", "Practical handover", "Add-on coaching"],
    },
    {
      name: "Corporate",
      eyebrow: "For the whole L&D team",
      price: "Let's talk",
      suffix: "",
      copy: "A tailored operating system for teams who are done managing learning in spreadsheets.",
      featured: false,
      cta: "Contact us",
      items: ["Team enrollment", "Custom service mix", "Shared workspace rhythm", "Impact reporting"],
    },
  ],
  corporate: [
    {
      name: "One Membership",
      eyebrow: "For a complete team",
      price: "₹24,999",
      suffix: "/ month",
      copy: "The full GG Learning Labs system for a team that wants a shared language for L&D.",
      featured: true,
      cta: "Bring in your team",
      items: ["Unlimited team seats", "All phase playbooks", "Monthly team clinic", "Impact review prompts"],
    },
    {
      name: "Build Your Own",
      eyebrow: "For a defined business need",
      price: "From ₹39,999",
      suffix: " / project",
      copy: "Assemble a sharp, useful service mix around one capability or business priority.",
      featured: false,
      cta: "Build a scope",
      items: ["Choose your phases", "Dedicated project plan", "Custom outputs", "Progress review"],
    },
    {
      name: "Corporate",
      eyebrow: "For the bigger shift",
      price: "Let's talk",
      suffix: "",
      copy: "A bespoke partner for organisations building a mature, measurable L&D function.",
      featured: false,
      cta: "Contact us",
      items: ["Discovery workshop", "Team capability architecture", "Ongoing advisory", "Leadership reporting"],
    },
  ],
};

const services = [
  { phase: "Diagnose", phaseNumber: "01", title: "Training Needs Analysis", description: "A structured way to surface the gap between performance today and capability tomorrow.", type: "Toolkit", accent: "lime", icon: "compass", status: "Start here", featured: true },
  { phase: "Diagnose", phaseNumber: "01", title: "Training Needs Identification", description: "Turn the first signal of a need into a clear, scoped learning question.", type: "Playbook", accent: "lime", icon: "compass", status: "Ready" },
  { phase: "Design", phaseNumber: "02", title: "SOP Builder", description: "Build clear, usable standard operating procedures without starting from a blank page.", type: "Builder", accent: "lilac", icon: "feather", status: "Popular", featured: true },
  { phase: "Plan", phaseNumber: "03", title: "Capability Roadmap", description: "Connect priorities, cohorts, milestones, and owners in one visible rhythm.", type: "Planner", accent: "coral", icon: "target", status: "Ready" },
  { phase: "Deliver", phaseNumber: "04", title: "Personalized Coaching", description: "A focused coaching journey with prompts, practice, and reflection built in.", type: "Journey", accent: "sky", icon: "zap", status: "For you" },
  { phase: "Assess", phaseNumber: "05", title: "Readiness Check", description: "See where capability is landing before you call the learning complete.", type: "Assessment", accent: "yellow", icon: "gauge", status: "Ready" },
  { phase: "Coach", phaseNumber: "06", title: "Manager as Coach", description: "Small, repeatable conversations that make coaching part of the week.", type: "Practice", accent: "peach", icon: "users", status: "For teams" },
  { phase: "Observe", phaseNumber: "07", title: "Trainer Observation", description: "Replace subjective feedback with a thoughtful, calibrated observation rhythm.", type: "Rubric", accent: "aqua", icon: "eye", status: "For teams", featured: true },
  { phase: "Measure", phaseNumber: "08", title: "Impact Dashboard", description: "Make the signal stronger than the spreadsheet with business-aligned measures.", type: "Dashboard", accent: "lavender", icon: "flame", status: "For teams" },
  { phase: "Improve", phaseNumber: "09", title: "Program Retrospective", description: "Close the loop with a repeatable moment to notice, learn, and improve.", type: "Workshop", accent: "green", icon: "lightbulb", status: "Ready" },
];

const demoAccounts = {
  individual: { email: "individual@gglabs.demo", password: "learn", name: "Aarav Mehta" },
  corporate: { email: "corporate@gglabs.demo", password: "build", name: "Maya Shah" },
};

/* -----------------------------------------------------------------------------
   2. ICONS (Lucide, inlined so the site needs no internet connection)
   -------------------------------------------------------------------------- */

const ICONS = {
  "arrow-down-right":
    '<path d="m7 7 10 10" /><path d="M17 7v10H7" />',
  "arrow-left":
    '<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />',
  "arrow-right":
    '<path d="M5 12h14" /><path d="m12 5 7 7-7 7" />',
  "arrow-up-right":
    '<path d="M7 7h10v10" /><path d="M7 17 17 7" />',
  "bell":
    '<path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />',
  "check":
    '<path d="M20 6 9 17l-5-5" />',
  "chevron-down":
    '<path d="m6 9 6 6 6-6" />',
  "compass":
    '<circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />',
  "eye":
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />',
  "eye-off":
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" />',
  "feather":
    '<path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z" /><path d="M16 8 2 22" /><path d="M17.488 15H9" />',
  "flame":
    '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />',
  "gauge":
    '<path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />',
  "lightbulb":
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />',
  "log-out":
    '<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  "mail":
    '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" /><rect x="2" y="4" width="20" height="16" rx="2" />',
  "menu":
    '<path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" />',
  "moon":
    '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />',
  "play":
    '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />',
  "search":
    '<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />',
  "sparkles":
    '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />',
  "sun":
    '<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  "target":
    '<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />',
  "users":
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" />',
  "wand-sparkles":
    '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />',
  "x":
    '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  "zap":
    '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" />',
};

function ic(name, size, opts) {
  const o = opts || {};
  const cls = "lucide lucide-" + name + (o.cls ? " " + o.cls : "");
  return (
    '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="' + (o.fill || "none") +
    '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    (ICONS[name] || "") + "</svg>"
  );
}

// Swaps every <i data-i="icon-name" data-s="16"></i> placeholder for a real SVG.
function hydrateIcons(root) {
  const nodes = Array.from((root || document).querySelectorAll("i[data-i]"));
  nodes.forEach(function (node) {
    const html = ic(node.dataset.i, node.dataset.s || 16, { fill: node.dataset.fill, cls: node.dataset.cls });
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    node.replaceWith(tmp.firstChild);
  });
}

/* -----------------------------------------------------------------------------
   3. TOASTS
   -------------------------------------------------------------------------- */

const toasterEl = document.getElementById("gg-toaster");

function toast(message) {
  const li = document.createElement("li");
  li.className = "gg-toast";
  li.textContent = message;
  toasterEl.appendChild(li);
  while (toasterEl.children.length > 3) toasterEl.firstChild.remove();
  setTimeout(function () {
    li.classList.add("leaving");
    setTimeout(function () {
      li.remove();
    }, 220);
  }, 4000);
}

/* -----------------------------------------------------------------------------
   4. THEME (light / dark, remembered in the browser)
   -------------------------------------------------------------------------- */

let theme = (function () {
  try {
    return localStorage.getItem("theme") || "light";
  } catch (e) {
    return "light";
  }
})();

function applyTheme() {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {}
  Array.from(document.querySelectorAll("[data-theme-btn]")).forEach(function (btn) {
    btn.setAttribute("aria-label", "Switch to " + (theme === "light" ? "dark" : "light") + " theme");
    // The button shows the mode you are currently in: Day + sun in light, Night + moon in dark.
    btn.innerHTML = ic(theme === "light" ? "sun" : "moon", 16) + "<span>" + (theme === "light" ? "Day" : "Night") + "</span>";
  });
}

function toggleTheme() {
  theme = theme === "light" ? "dark" : "light";
  applyTheme();
}

/* -----------------------------------------------------------------------------
   5. VIEW SWITCHING (home / login / dashboard)
   -------------------------------------------------------------------------- */

const viewEls = {
  home: document.getElementById("view-home"),
  login: document.getElementById("view-login"),
  dashboard: document.getElementById("view-dashboard"),
};

function showView(name) {
  Object.keys(viewEls).forEach(function (key) {
    viewEls[key].classList.toggle("is-active", key === name);
  });
  window.scrollTo({ top: 0 });
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: "smooth" });
}

/* -----------------------------------------------------------------------------
   6. HOMEPAGE
   -------------------------------------------------------------------------- */

let audience = "individual";
let selectedPhase = phases[0];
let selectedService = "Pick a phase to explore";
let hoverPhase = null; // the row the mouse is over — previewed in the card without committing
let genieOpen = false;
let geniePhase = null; // what the visitor picked inside the popup — nothing by default
let newsletterSubmitted = false;

const phaseListEl = document.getElementById("phase-list");
const phaseDetailEl = document.getElementById("phase-detail");
const newsGridEl = document.getElementById("news-grid");
const membershipGridEl = document.getElementById("membership-grid");
const genieDockEl = document.getElementById("genie-dock");
const genieTriggerEl = document.getElementById("genie-trigger");

function renderPhaseList() {
  phaseListEl.innerHTML = phases
    .map(function (phase) {
      const active = phase.number === selectedPhase.number ? " active" : "";
      return (
        '<button class="phase-row' + active + '" data-phase="' + phase.number + '">' +
        '<span class="phase-number">' + phase.number + "</span>" +
        '<span class="phase-title">' + phase.title + "</span>" +
        '<span class="phase-note">' + phase.note + "</span>" +
        '<span class="phase-icon ' + phase.accent + '">' + ic(phase.icon, 17) + "</span>" +
        ic("arrow-right", 17, { cls: "phase-arrow" }) +
        "</button>"
      );
    })
    .join("");
}

function renderPhaseDetail() {
  const shown = hoverPhase || selectedPhase;
  phaseDetailEl.className = "phase-detail " + shown.accent;
  phaseDetailEl.innerHTML =
    '<div class="detail-topline"><span>Phase ' + shown.number + "</span><span>Service map</span></div>" +
    '<div class="detail-icon">' + ic(shown.icon, 24) + "</div>" +
    "<h3>" + shown.title + "</h3>" +
    "<p>" + shown.note + "</p>" +
    '<div class="service-chips">' +
    shown.services
      .map(function (service) {
        return '<button class="' + (selectedService === service ? "chosen" : "") + '" data-service="' + service + '">' + service + "</button>";
      })
      .join("") +
    "</div>" +
    '<button class="detail-link" data-open-genie>Ask the genie about ' + shown.title.toLowerCase() + " " + ic("wand-sparkles", 16) + "</button>";
}

function renderNews() {
  newsGridEl.innerHTML = news
    .map(function (item, index) {
      return (
        '<a class="news-card ' + item.color + '" href="' + item.url + '" target="_blank" rel="noreferrer">' +
        '<div class="news-card-top"><span>' + String(index + 1).padStart(2, "0") + "</span>" + ic("arrow-up-right", 17) + "</div>" +
        '<div class="news-visual"><span class="news-orbit orbit-one"></span><span class="news-orbit orbit-two"></span><span class="news-orbit orbit-three"></span><span class="news-spark">✦</span></div>' +
        '<div class="news-meta">' + item.category + " <span>•</span> " + item.date + "</div>" +
        "<h3>" + item.title + "</h3>" +
        "<p>" + item.excerpt + "</p>" +
        '<div class="source-link">Read on ' + item.source + " " + ic("arrow-right", 15) + "</div>" +
        "</a>"
      );
    })
    .join("");
}

function renderMemberships() {
  membershipGridEl.innerHTML = memberships[audience]
    .map(function (plan) {
      return (
        '<article class="membership-card ' + (plan.featured ? "featured" : "") + '">' +
        (plan.featured ? '<div class="featured-ribbon">' + ic("sparkles", 13) + " Most useful place to start</div>" : "") +
        '<div class="card-eyebrow">' + plan.eyebrow + "</div>" +
        "<h3>" + plan.name + "</h3>" +
        '<div class="price-line"><strong>' + plan.price + "</strong><span>" + plan.suffix + "</span></div>" +
        "<p>" + plan.copy + "</p>" +
        "<ul>" + plan.items.map(function (item) { return "<li>" + ic("check", 15) + " " + item + "</li>"; }).join("") + "</ul>" +
        '<button class="membership-cta ' + (plan.featured ? "light" : "dark") + '" data-toast>' + plan.cta + " " + ic("arrow-up-right", 16) + "</button>" +
        "</article>"
      );
    })
    .join("");
  document.getElementById("audience-note").textContent =
    audience === "individual" ? "For practitioners building the practice." : "For teams building the capability.";
  Array.from(document.querySelectorAll("[data-audience]")).forEach(function (btn) {
    const on = btn.dataset.audience === audience;
    btn.classList.toggle("selected", on);
    btn.setAttribute("aria-selected", String(on));
  });
}

const genieStageEl = document.getElementById("genie-stage");
let genieStageShown = false;

function renderGenie() {
  const existing = genieDockEl.querySelector(".genie-panel");
  if (existing) existing.remove();
  genieDockEl.classList.toggle("open", genieOpen);
  genieTriggerEl.setAttribute("aria-expanded", String(genieOpen));

  // The genie rises out of the lamp on open and sinks back in on close.
  if (genieOpen && !genieStageShown) {
    genieStageShown = true;
    genieStageEl.classList.remove("leaving");
    genieStageEl.hidden = false;
  } else if (!genieOpen && genieStageShown) {
    genieStageShown = false;
    genieStageEl.classList.add("leaving");
    setTimeout(function () {
      if (!genieStageShown) {
        genieStageEl.hidden = true;
        genieStageEl.classList.remove("leaving");
      }
    }, 320);
  }

  if (!genieOpen) return;

  // Nothing is chosen for the visitor. The services and the suggestion only
  // appear once they pick a phase themselves.
  let middle;
  if (geniePhase) {
    const picked = geniePhase.services.indexOf(selectedService) !== -1;
    const answer = picked ? selectedService : geniePhase.services[0];
    middle =
      '<div class="service-chips">' +
      geniePhase.services
        .map(function (service) {
          return '<button class="' + (selectedService === service ? "chosen" : "") + '" data-service="' + service + '">' + service + "</button>";
        })
        .join("") +
      "</div>" +
      '<div class="genie-answer"><span>Try starting with</span><strong>' + answer + "</strong><p>" + geniePhase.note +
      (picked ? " A good next step from here." : " Pick a service above and we’ll map the next useful step.") + "</p></div>";
  } else {
    middle = '<div class="genie-hint">Choose a phase and the services inside it will appear here, along with a useful place to start.</div>';
  }

  const panel = document.createElement("div");
  panel.className = "genie-panel";
  panel.innerHTML =
    '<div class="genie-panel-top"><div><span class="mini-kicker">A little help from the lab</span><h4>What are you looking forward to transform today?</h4></div><button data-close-genie aria-label="Close guide">' + ic("x", 16) + "</button></div>" +
    '<div class="genie-panel-scroll">' +
    '<label for="genie-phase">Pick a phase</label>' +
    '<div class="genie-select-wrap"><select id="genie-phase">' +
    '<option value=""' + (geniePhase ? "" : " selected") + ">Choose a phase</option>" +
    phases
      .map(function (phase) {
        return '<option value="' + phase.number + '"' + (geniePhase && phase.number === geniePhase.number ? " selected" : "") + ">" + phase.number + " — " + phase.title + "</option>";
      })
      .join("") +
    "</select>" + ic("chevron-down", 15) + "</div>" +
    middle +
    '<button class="genie-explore" data-genie-explore>See the full phase map ' + ic("arrow-right", 15) + "</button>" +
    "</div>";

  genieDockEl.insertBefore(panel, genieStageEl);
}

function setPhase(phase) {
  hoverPhase = null;
  selectedPhase = phase;
  selectedService = "Pick a service";
  renderPhaseList();
  renderPhaseDetail();
  if (genieOpen) renderGenie();
}

// --- Homepage events -------------------------------------------------------

phaseListEl.addEventListener("mouseover", function (event) {
  const row = event.target.closest("[data-phase]");
  if (!row) return;
  const phase = phases.find(function (p) { return p.number === row.dataset.phase; });
  if (!phase || (hoverPhase && hoverPhase.number === phase.number)) return;
  hoverPhase = phase;
  renderPhaseDetail();
});

phaseListEl.addEventListener("mouseleave", function () {
  if (!hoverPhase) return;
  hoverPhase = null;
  renderPhaseDetail();
});

phaseListEl.addEventListener("click", function (event) {
  const row = event.target.closest("[data-phase]");
  if (!row) return;
  const phase = phases.find(function (p) { return p.number === row.dataset.phase; });
  if (phase) setPhase(phase);
});

phaseDetailEl.addEventListener("click", function (event) {
  const chip = event.target.closest("[data-service]");
  if (chip) {
    selectedService = chip.dataset.service;
    renderPhaseDetail();
    if (genieOpen) renderGenie();
    toast(selectedService + " added to your exploration list.");
    return;
  }
  if (event.target.closest("[data-open-genie]")) {
    genieOpen = true;
    renderGenie();
  }
});

genieTriggerEl.addEventListener("click", function () {
  genieOpen = !genieOpen;
  renderGenie();
});

genieDockEl.addEventListener("click", function (event) {
  const chip = event.target.closest("[data-service]");
  if (chip) {
    selectedService = chip.dataset.service;
    renderPhaseDetail();
    renderGenie();
    toast(selectedService + " added to your exploration list.");
    return;
  }
  if (event.target.closest("[data-close-genie]")) {
    genieOpen = false;
    renderGenie();
  }
  if (event.target.closest("[data-genie-explore]")) {
    document.getElementById("home-nav").classList.remove("is-open");
    scrollToId("system");
    genieOpen = false;
    renderGenie();
  }
});

genieDockEl.addEventListener("change", function (event) {
  if (event.target.id !== "genie-phase") return;
  const next = phases.find(function (p) { return p.number === event.target.value; });
  if (!next) return;
  geniePhase = next;
  setPhase(next);
});

Array.from(document.querySelectorAll("[data-audience]")).forEach(function (btn) {
  btn.addEventListener("click", function () {
    audience = btn.dataset.audience;
    renderMemberships();
  });
});

document.getElementById("home-menu-btn").addEventListener("click", function () {
  const nav = document.getElementById("home-nav");
  const open = nav.classList.toggle("is-open");
  this.innerHTML = ic(open ? "x" : "menu", 20);
});

document.getElementById("newsletter-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const input = document.getElementById("newsletter-email");
  if (!input.value.includes("@")) {
    toast("Drop in a valid email so we know where to send the good stuff.");
    return;
  }
  newsletterSubmitted = true;
  input.value = "";
  document.getElementById("newsletter-note").textContent = "You’re in. Watch your inbox.";
  toast("You’re on the list. Welcome to the lab notes.");
});

document.getElementById("back-to-top").addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* -----------------------------------------------------------------------------
   7. SIGN IN
   -------------------------------------------------------------------------- */

let role = "individual";
let showPassword = false;
let currentUser = null;

const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");

function fillCredentials() {
  emailInput.value = demoAccounts[role].email;
  passwordInput.value = demoAccounts[role].password;
}

function renderRoleSwitch() {
  Array.from(document.querySelectorAll("[data-role]")).forEach(function (btn) {
    const on = btn.dataset.role === role;
    btn.classList.toggle("selected", on);
    btn.setAttribute("aria-selected", String(on));
  });
  document.getElementById("demo-role-label").textContent =
    role === "individual" ? "Individual practitioner" : "Corporate L&D team";
}

function renderPasswordToggle() {
  const btn = document.getElementById("toggle-password");
  passwordInput.type = showPassword ? "text" : "password";
  btn.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
  btn.innerHTML = ic(showPassword ? "eye-off" : "eye", 16);
}

Array.from(document.querySelectorAll("[data-role]")).forEach(function (btn) {
  btn.addEventListener("click", function () {
    role = btn.dataset.role;
    renderRoleSwitch();
    fillCredentials();
  });
});

document.getElementById("toggle-password").addEventListener("click", function () {
  showPassword = !showPassword;
  renderPasswordToggle();
});

document.getElementById("use-credentials").addEventListener("click", fillCredentials);

document.getElementById("login-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const account = demoAccounts[role];
  if (emailInput.value.trim().toLowerCase() === account.email && passwordInput.value === account.password) {
    currentUser = { name: account.name, email: account.email, role: role };
    renderDashboard();
    showView("dashboard");
    toast("Welcome back, " + account.name.split(" ")[0] + ".");
    return;
  }
  toast("For this demo, use one of the account details shown below.");
});

/* -----------------------------------------------------------------------------
   8. WORKSPACE / DASHBOARD
   -------------------------------------------------------------------------- */

let activePhase = "All services";
let search = "";

const serviceGridEl = document.getElementById("service-grid");
const phaseFiltersEl = document.getElementById("phase-filters");
const dashboardEmptyEl = document.getElementById("dashboard-empty");

function renderDashboard() {
  if (!currentUser) return;
  document.getElementById("profile-avatar").textContent = currentUser.name
    .split(" ")
    .map(function (word) { return word[0]; })
    .join("");
  document.getElementById("profile-name").textContent = currentUser.name;
  document.getElementById("dash-kicker").textContent =
    currentUser.role === "corporate" ? "Corporate L&D workspace" : "Individual practitioner workspace";
  document.getElementById("dash-firstname").textContent = currentUser.name.split(" ")[0] + ".";
  document.getElementById("dash-lede").textContent =
    currentUser.role === "corporate"
      ? "Your team’s L&D system, laid out so the next useful move is never buried."
      : "Your L&D practice, laid out so the next useful move is never buried.";
  document.getElementById("service-count").textContent = services.length;
  renderPhaseFilters();
  renderServices();
}

function renderPhaseFilters() {
  const list = ["All services"].concat(
    services.map(function (s) { return s.phase; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; })
  );
  phaseFiltersEl.innerHTML = list
    .map(function (phase) {
      return '<button class="' + (activePhase === phase ? "selected" : "") + '" data-filter="' + phase + '">' + phase + "</button>";
    })
    .join("");
}

function renderServices() {
  const term = search.toLowerCase();
  const visible = services.filter(function (service) {
    const matchesPhase = activePhase === "All services" || service.phase === activePhase;
    const haystack = (service.title + " " + service.description + " " + service.type).toLowerCase();
    return matchesPhase && haystack.includes(term);
  });

  serviceGridEl.innerHTML = visible
    .map(function (service) {
      return (
        '<article class="service-tile ' + service.accent + " " + (service.featured ? "featured" : "") + '">' +
        '<div class="service-tile-top"><span class="service-number">' + service.phaseNumber + '</span><span class="service-type">' + service.type + "</span></div>" +
        '<div class="service-visual"><span class="service-orbit"></span><span class="service-icon">' + ic(service.icon, 24) + '</span><span class="service-arrow">' + ic("arrow-up-right", 17) + "</span></div>" +
        '<div class="service-copy"><div class="service-phase">' + service.phase + " <span>•</span> " + service.status + "</div><h3>" + service.title + "</h3><p>" + service.description + "</p></div>" +
        '<button class="service-open" data-open-service="' + service.title + '">Open service ' + ic("arrow-right", 15) + "</button>" +
        "</article>"
      );
    })
    .join("");

  dashboardEmptyEl.hidden = visible.length !== 0;
}

phaseFiltersEl.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-filter]");
  if (!btn) return;
  activePhase = btn.dataset.filter;
  renderPhaseFilters();
  renderServices();
});

serviceGridEl.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-open-service]");
  if (!btn) return;
  toast(btn.dataset.openService + " is ready to explore in this demo.");
});

document.getElementById("service-search").addEventListener("input", function () {
  search = this.value;
  renderServices();
});

document.getElementById("reset-filters").addEventListener("click", function () {
  search = "";
  activePhase = "All services";
  document.getElementById("service-search").value = "";
  renderPhaseFilters();
  renderServices();
});

document.getElementById("explore-diagnose").addEventListener("click", function () {
  activePhase = "Diagnose";
  renderPhaseFilters();
  renderServices();
  scrollToId("services");
});

document.getElementById("dash-bell").addEventListener("click", function () {
  toast("No new notes. You’re all caught up.");
});

document.getElementById("dash-brand").addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("dash-menu-btn").addEventListener("click", function () {
  const nav = document.getElementById("dashboard-nav");
  const open = nav.classList.toggle("is-open");
  this.innerHTML = ic(open ? "x" : "menu", 20);
});

/* -----------------------------------------------------------------------------
   9. SHARED EVENTS
   -------------------------------------------------------------------------- */

document.addEventListener("click", function (event) {
  const themeBtn = event.target.closest("[data-theme-btn]");
  if (themeBtn) {
    toggleTheme();
    return;
  }

  const scroller = event.target.closest("[data-scroll]");
  if (scroller) {
    document.getElementById("home-nav").classList.remove("is-open");
    document.getElementById("home-menu-btn").innerHTML = ic("menu", 20);
    scrollToId(scroller.dataset.scroll);
    return;
  }

  const goto = event.target.closest("[data-goto]");
  if (goto) {
    const target = goto.dataset.goto;
    if (target === "home") currentUser = null;
    showView(target);
    return;
  }

  const toastBtn = event.target.closest("[data-toast]");
  if (toastBtn) toast("This doorway is opening soon.");
});

/* -----------------------------------------------------------------------------
   10. START
   -------------------------------------------------------------------------- */

applyTheme();
renderPhaseList();
renderPhaseDetail();
renderNews();
renderMemberships();
renderPhaseFilters();
document.getElementById("home-menu-btn").innerHTML = ic("menu", 20);
document.getElementById("dash-menu-btn").innerHTML = ic("menu", 20);
renderPasswordToggle();
renderRoleSwitch();
fillCredentials();
hydrateIcons(document);

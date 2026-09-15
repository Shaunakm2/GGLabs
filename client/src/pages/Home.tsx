import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  Eye,
  Feather,
  Flame,
  Gauge,
  Gem,
  Lightbulb,
  Mail,
  Menu,
  Moon,
  MoveUpRight,
  Play,
  Plus,
  Sparkles,
  Sun,
  Target,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

type Audience = "individual" | "corporate";

type Phase = {
  number: string;
  title: string;
  note: string;
  accent: string;
  icon: typeof Compass;
  services: string[];
};

const phases: Phase[] = [
  {
    number: "01",
    title: "Diagnose",
    note: "Start with the truth on the ground.",
    accent: "lime",
    icon: Compass,
    services: ["TNI — Training Needs Identification", "TNA — Training Needs Analysis", "Skills-gap mapping", "Learning maturity scan"],
  },
  {
    number: "02",
    title: "Design",
    note: "Turn insight into something people can use.",
    accent: "lilac",
    icon: Feather,
    services: ["SOP builder", "Curriculum architecture", "Learning pathway design", "Content and experience blueprint"],
  },
  {
    number: "03",
    title: "Plan",
    note: "Make the next move visible.",
    accent: "coral",
    icon: Target,
    services: ["Capability roadmap", "Cohort and calendar planning", "Facilitator readiness plan", "Learning operations setup"],
  },
  {
    number: "04",
    title: "Deliver",
    note: "Bring the work to life, in the flow of work.",
    accent: "sky",
    icon: Zap,
    services: ["Personalized coaching", "Facilitator enablement", "Workshop and facilitation kits", "Blended learning delivery"],
  },
  {
    number: "05",
    title: "Assess",
    note: "Check for changed capability, not just attendance.",
    accent: "yellow",
    icon: Gauge,
    services: ["Knowledge and skill assessments", "Role-based simulations", "Readiness checks", "Certification journeys"],
  },
  {
    number: "06",
    title: "Coach",
    note: "Build the confidence to keep going.",
    accent: "peach",
    icon: Users,
    services: ["1:1 coaching", "Manager as coach", "Peer practice circles", "Feedback and reflection design"],
  },
  {
    number: "07",
    title: "Observe",
    note: "See what great looks like in practice.",
    accent: "aqua",
    icon: Eye,
    services: ["Trainer observation", "On-the-job observation", "Quality rubrics", "Calibration and feedback loops"],
  },
  {
    number: "08",
    title: "Measure",
    note: "Make the signal stronger than the spreadsheet.",
    accent: "lavender",
    icon: Flame,
    services: ["Learning analytics", "Impact dashboards", "Business-aligned metrics", "ROI and value narratives"],
  },
  {
    number: "09",
    title: "Improve",
    note: "Close the loop. Then raise the bar.",
    accent: "green",
    icon: Lightbulb,
    services: ["Program retrospectives", "Continuous improvement sprints", "Action planning", "L&D operating rhythm"],
  },
];

const news = [
  {
    source: "CompTIA Research",
    category: "Signal / 2026",
    title: "Building skills is now a top-tier business priority.",
    excerpt: "The latest Workforce and Learning Trends report points to productivity, retention, engagement, and credentials as the new L&D scorecard.",
    date: "6 min read",
    color: "lime",
    url: "https://www.comptia.org/en-us/resources/research/workforce-and-learning-trends-2026/",
  },
  {
    source: "ELM Learning",
    category: "Field notes / 2026",
    title: "From content delivery to capability building.",
    excerpt: "The strongest L&D teams are joining strategy, adaptive learning, flow-of-work support, coaching, and analytics into one connected system.",
    date: "8 min read",
    color: "lilac",
    url: "https://elmlearning.com/blog/hot-topics-in-training-and-development/",
  },
  {
    source: "McKinsey",
    category: "Perspective",
    title: "The L&D function gets closer to the business.",
    excerpt: "A useful reminder: learning works hardest when it is designed around the capabilities that move the organisation forward.",
    date: "7 min read",
    color: "coral",
    url: "https://www.mckinsey.com/capabilities/people-and-organization/our-insights/the-essential-components-of-a-successful-l-and-d-strategy",
  },
];

const memberships = {
  individual: [
    { name: "One Membership", eyebrow: "For the curious operator", price: "₹4,999", suffix: "/ month", copy: "A considered library of L&D tools, templates, clinics, and office hours.", featured: true, cta: "Start exploring", items: ["All phase playbooks", "Monthly live clinic", "Template vault", "Member-only notes"] },
    { name: "Build Your Own", eyebrow: "For a focused project", price: "From ₹1,499", suffix: " / service", copy: "Pick the exact intervention you need, from TNA to a trainer observation kit.", featured: false, cta: "Choose a service", items: ["Single service purchase", "Defined scope and output", "Practical handover", "Add-on coaching"] },
    { name: "Corporate", eyebrow: "For the whole L&D team", price: "Let's talk", suffix: "", copy: "A tailored operating system for teams who are done managing learning in spreadsheets.", featured: false, cta: "Contact us", items: ["Team enrollment", "Custom service mix", "Shared workspace rhythm", "Impact reporting"] },
  ],
  corporate: [
    { name: "One Membership", eyebrow: "For a complete team", price: "₹24,999", suffix: "/ month", copy: "The full GG Learning Labs system for a team that wants a shared language for L&D.", featured: true, cta: "Bring in your team", items: ["Unlimited team seats", "All phase playbooks", "Monthly team clinic", "Impact review prompts"] },
    { name: "Build Your Own", eyebrow: "For a defined business need", price: "From ₹39,999", suffix: " / project", copy: "Assemble a sharp, useful service mix around one capability or business priority.", featured: false, cta: "Build a scope", items: ["Choose your phases", "Dedicated project plan", "Custom outputs", "Progress review"] },
    { name: "Corporate", eyebrow: "For the bigger shift", price: "Let's talk", suffix: "", copy: "A bespoke partner for organisations building a mature, measurable L&D function.", featured: false, cta: "Contact us", items: ["Discovery workshop", "Team capability architecture", "Ongoing advisory", "Leadership reporting"] },
  ],
};

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span className="logo-dot logo-dot-a" />
      <span className="logo-dot logo-dot-b" />
      <span className="logo-dot logo-dot-c" />
    </span>
  );
}

function ToastButton({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button className={className} onClick={onClick ?? (() => toast("This doorway is opening soon."))}>
      {children}
    </button>
  );
}

export default function Home({ onSignIn }: { onSignIn: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [audience, setAudience] = useState<Audience>("individual");
  const [selectedPhase, setSelectedPhase] = useState(phases[0]);
  const [genieOpen, setGenieOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("Pick a phase to explore");
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedServices = useMemo(() => selectedPhase.services, [selectedPhase]);

  const handleNewsletter = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) {
      toast("Drop in a valid email so we know where to send the good stuff.");
      return;
    }
    setSubmitted(true);
    setEmail("");
    toast("You’re on the list. Welcome to the lab notes.");
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand-lockup" onClick={() => scrollTo("top")} aria-label="GG Learning Labs home">
            <LogoMark />
            <span>GG Learning Labs</span>
          </button>

          <nav className={`desktop-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            <button onClick={() => scrollTo("system")}>The system</button>
            <button onClick={() => scrollTo("signal")}>Field notes</button>
            <button onClick={() => scrollTo("membership")}>Membership</button>
            <button onClick={() => scrollTo("contact")}>Contact</button>
          </nav>

          <div className="header-actions">
            <button className="theme-button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={toggleTheme}>
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Night" : "Day"}</span>
            </button>
            <button className="signin-link" onClick={onSignIn}>Sign in <ArrowUpRight size={14} /></button>
            <ToastButton className="header-cta">Get started <ArrowUpRight size={15} /></ToastButton>
            <button className="mobile-menu" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-art" aria-hidden="true" />
        <div className="grain-overlay" aria-hidden="true" />
        <div className="hero-inner page-width">
          <div className="hero-copy reveal-up">
            <div className="eyebrow"><span className="eyebrow-line" /> L&D, without the spreadsheet sprawl</div>
            <h1>Everything L&D.<br /><em>In one considered place.</em></h1>
            <p className="hero-lede">GG Learning Labs is a practical operating system for people who make learning happen—from the first signal of a need to the proof that something changed.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => scrollTo("membership")}>Explore the lab <ArrowRight size={17} /></button>
              <button className="text-button" onClick={() => scrollTo("system")}><span className="play-icon"><Play size={12} fill="currentColor" /></span> See how it works</button>
            </div>
            <div className="hero-footnote"><span className="tiny-orbit" /> Built for individual practitioners and L&D teams</div>
          </div>
          <div className="hero-side-note reveal-up delay-2">
            <div className="side-note-number">09</div>
            <div className="side-note-label">phases, connected<br />into one rhythm</div>
          </div>
        </div>
        <button className="scroll-cue" onClick={() => scrollTo("system")} aria-label="Scroll to the system"><span>scroll to explore</span><ArrowDownRight size={17} /></button>
      </section>

      <section className="intro-section page-width">
        <div className="intro-aside"><span>01</span><div className="vertical-rule" /><span>GG / 2026</span></div>
        <div className="intro-copy">
          <div className="section-kicker">The premise</div>
          <h2>Good L&D is a <span>system</span>,<br />not a string of events.</h2>
        </div>
        <div className="intro-body">
          <p>Diagnose the real need. Design the right intervention. Deliver it with care. Observe what happens next. Then make the next version better.</p>
          <p>We’re creating the layer between L&D intent and L&D impact—so the work feels less like admin, and more like progress.</p>
          <button className="arrow-link" onClick={() => scrollTo("system")}>Explore the phases <ArrowUpRight size={16} /></button>
        </div>
      </section>

      <section className="system-section" id="system">
        <div className="page-width">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">The L&D operating system</div>
              <h2>From first question<br /><em>to lasting change.</em></h2>
            </div>
            <p>Choose a phase to see the kinds of practical services that live inside it. This is the part that makes GG Learning Labs more than another LMS.</p>
          </div>
          <div className="system-layout">
            <div className="phase-list">
              {phases.map((phase) => {
                const Icon = phase.icon;
                const active = phase.number === selectedPhase.number;
                return (
                  <button key={phase.number} className={`phase-row ${active ? "active" : ""}`} onClick={() => { setSelectedPhase(phase); setSelectedService("Pick a service"); }}>
                    <span className="phase-number">{phase.number}</span>
                    <span className="phase-title">{phase.title}</span>
                    <span className="phase-note">{phase.note}</span>
                    <span className={`phase-icon ${phase.accent}`}><Icon size={17} /></span>
                    <ArrowRight className="phase-arrow" size={17} />
                  </button>
                );
              })}
            </div>
            <aside className={`phase-detail ${selectedPhase.accent}`}>
              <div className="detail-topline"><span>Phase {selectedPhase.number}</span><span>Service map</span></div>
              <div className="detail-icon"><selectedPhase.icon size={24} /></div>
              <h3>{selectedPhase.title}</h3>
              <p>{selectedPhase.note}</p>
              <div className="service-chips">
                {selectedServices.map((service) => <button key={service} className={selectedService === service ? "chosen" : ""} onClick={() => { setSelectedService(service); toast(`${service} added to your exploration list.`); }}>{service}</button>)}
              </div>
              <button className="detail-link" onClick={() => setGenieOpen(true)}>Ask the genie about {selectedPhase.title.toLowerCase()} <WandSparkles size={16} /></button>
            </aside>
          </div>
        </div>
      </section>

      <section className="signal-section page-width" id="signal">
        <div className="signal-header">
          <div><div className="section-kicker">Signal / Field notes</div><h2>Useful things<br /><em>worth keeping.</em></h2></div>
          <p>Reading the room, so your L&D practice can respond to what’s actually changing.</p>
        </div>
        <div className="news-grid">
          {news.map((item, index) => (
            <a className={`news-card ${item.color}`} href={item.url} target="_blank" rel="noreferrer" key={item.title}>
              <div className="news-card-top"><span>{String(index + 1).padStart(2, "0")}</span><ArrowUpRight size={17} /></div>
              <div className="news-visual"><span className="news-orbit orbit-one" /><span className="news-orbit orbit-two" /><span className="news-orbit orbit-three" /><span className="news-spark">✦</span></div>
              <div className="news-meta">{item.category} <span>•</span> {item.date}</div>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
              <div className="source-link">Read on {item.source} <ArrowRight size={15} /></div>
            </a>
          ))}
        </div>
        <div className="source-disclaimer">Placeholder editorial cards sourced from public L&D research and field writing. Follow the links for the full original pieces.</div>
      </section>

      <section className="membership-section" id="membership">
        <div className="page-width">
          <div className="membership-top">
            <div><div className="section-kicker">Choose your way in</div><h2>A membership that<br /><em>meets the moment.</em></h2></div>
            <div className="audience-switch-wrap">
              <span className="audience-label">I’m here as</span>
              <div className="audience-switch" role="tablist" aria-label="Choose your audience">
                <button className={audience === "individual" ? "selected" : ""} onClick={() => setAudience("individual")} role="tab" aria-selected={audience === "individual"}>An individual</button>
                <button className={audience === "corporate" ? "selected" : ""} onClick={() => setAudience("corporate")} role="tab" aria-selected={audience === "corporate"}>A company</button>
              </div>
              <p>{audience === "individual" ? "For practitioners building the practice." : "For teams building the capability."}</p>
            </div>
          </div>
          <div className="membership-grid">
            {memberships[audience].map((plan) => (
              <article className={`membership-card ${plan.featured ? "featured" : ""}`} key={plan.name}>
                {plan.featured && <div className="featured-ribbon"><Sparkles size={13} /> Most useful place to start</div>}
                <div className="card-eyebrow">{plan.eyebrow}</div>
                <h3>{plan.name}</h3>
                <div className="price-line"><strong>{plan.price}</strong><span>{plan.suffix}</span></div>
                <p>{plan.copy}</p>
                <ul>{plan.items.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
                <ToastButton className={`membership-cta ${plan.featured ? "light" : "dark"}`}>{plan.cta} <ArrowUpRight size={16} /></ToastButton>
              </article>
            ))}
          </div>
          <div className="membership-caption"><span className="caption-line" /> No forced platform migration. No black-box learning catalogue. Just useful L&D infrastructure.</div>
        </div>
      </section>

      <section className="newsletter-section page-width" id="contact">
        <div className="newsletter-copy"><div className="section-kicker">The lab notes</div><h2>Make room for<br /><em>a better question.</em></h2><p>One thoughtful note every few weeks on L&D systems, practice, and the small moves that compound.</p></div>
        <div className="newsletter-form-wrap">
          <div className="mail-symbol"><Mail size={21} /></div>
          <form onSubmit={handleNewsletter} className="newsletter-form">
            <label htmlFor="newsletter-email">Your email, if you’re into that sort of thing</label>
            <div className="newsletter-input-row"><input id="newsletter-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@somewhere-good.com" type="email" /><button type="submit" aria-label="Sign up for newsletter"><ArrowUpRight size={18} /></button></div>
            <div className="form-note">{submitted ? "You’re in. Watch your inbox." : "No noise. Unsubscribe whenever."}</div>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="page-width">
          <div className="footer-main">
            <div className="footer-brand"><button className="brand-lockup" onClick={() => scrollTo("top")}><LogoMark /><span>GG Learning Labs</span></button><p>One stop solution to everything L&D.<br />Thoughtfully, practically, together.</p></div>
            <div className="footer-column"><span>Explore</span><button onClick={() => scrollTo("system")}>The system</button><button onClick={() => scrollTo("signal")}>Field notes</button><button onClick={() => scrollTo("membership")}>Membership</button></div>
            <div className="footer-column"><span>Start here</span><ToastButton>For individuals</ToastButton><ToastButton>For companies</ToastButton><ToastButton>Talk to GG</ToastButton></div>
            <div className="footer-column"><span>Elsewhere</span><a href="#contact">LinkedIn <ArrowUpRight size={13} /></a><a href="#contact">Instagram <ArrowUpRight size={13} /></a><a href="mailto:hello@gglearninglabs.com">Email us <ArrowUpRight size={13} /></a></div>
          </div>
          <div className="footer-bottom"><span>© 2026 GG Learning Labs</span><span>Made for the people who make learning matter.</span><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top <ArrowUpRight size={14} /></button></div>
        </div>
      </footer>

      <div className={`genie-dock ${genieOpen ? "open" : ""}`}>
        {genieOpen && <div className="genie-panel">
          <div className="genie-panel-top"><div><span className="mini-kicker">A little help from the lab</span><h4>What are you looking forward to transform today?</h4></div><button onClick={() => setGenieOpen(false)} aria-label="Close guide"><X size={16} /></button></div>
          <label htmlFor="genie-phase">Pick a phase</label>
          <div className="genie-select-wrap"><select id="genie-phase" value={selectedPhase.number} onChange={(e) => { const next = phases.find((phase) => phase.number === e.target.value) ?? phases[0]; setSelectedPhase(next); setSelectedService("Pick a service"); }}><option value="" disabled>Choose one</option>{phases.map((phase) => <option value={phase.number} key={phase.number}>{phase.number} — {phase.title}</option>)}</select><ChevronDown size={15} /></div>
          <div className="genie-answer"><span>Try starting with</span><strong>{selectedService === "Pick a phase to explore" || selectedService === "Pick a service" ? selectedServices[0] : selectedService}</strong><p>{selectedPhase.note} Choose a service above and we’ll map the next useful step.</p></div>
          <button className="genie-explore" onClick={() => { scrollTo("system"); setGenieOpen(false); }}>See the full phase map <ArrowRight size={15} /></button>
        </div>}
        <button className="genie-trigger" onClick={() => setGenieOpen(!genieOpen)} aria-label="Open L&D guide">
          <span className="teapot-lid" /><span className="teapot-body"><span className="teapot-handle" /><span className="teapot-spout" /></span><span className="genie-smoke"><span /><span /><span /></span><span className="genie-wand"><Sparkles size={16} /></span><span className="genie-label">Need a nudge?</span>
        </button>
      </div>
    </main>
  );
}

/* =============================================================================
   Signed-in landing page: L&D theories that drift about and are nudged away
   from the cursor, plus a soft glow that follows the pointer.
   Ported from the homepage prototype (data-gg-repel + the mousemove handler).
   Only active while the dashboard is showing; does nothing for people who ask
   their system for reduced motion.
   ========================================================================== */
(function () {
  "use strict";

  const THEORIES = [
    { name: "ADDIE Model", tag: "Design", phase: "All services", color: "#c9ec62", left: "0px", top: "0px", tilt: "-3deg", anim: "ggfloat 7s cubic-bezier(0.23,1,0.32,1) infinite" },
    { name: "Bloom\u2019s Taxonomy", tag: "Objectives", phase: "Design", color: "#d8caf2", left: "168px", top: "46px", tilt: "2.5deg", anim: "ggdrift 13s cubic-bezier(0.23,1,0.32,1) .4s infinite" },
    { name: "Kirkpatrick", tag: "Evaluation", phase: "Measure", color: "#f1a08b", left: "6px", top: "92px", tilt: "1.5deg", anim: "ggdrift 15s cubic-bezier(0.23,1,0.32,1) 1.1s infinite" },
    { name: "70-20-10", tag: "Blend", phase: "Deliver", color: "#f7d06a", left: "214px", top: "138px", tilt: "-2deg", anim: "ggfloat 8s cubic-bezier(0.23,1,0.32,1) .6s infinite" },
    { name: "Kolb\u2019s Cycle", tag: "Experience", phase: "Coach", color: "#b6d8ec", left: "0px", top: "184px", tilt: "2deg", anim: "ggfloat 9s cubic-bezier(0.23,1,0.32,1) 1.4s infinite" },
    { name: "Gagn\u00E9\u2019s Nine", tag: "Instruction", phase: "Design", color: "#a9ded5", left: "158px", top: "230px", tilt: "-1.5deg", anim: "ggdrift 16s cubic-bezier(0.23,1,0.32,1) 1.7s infinite" },
  ];

  const field = document.getElementById("fw-field");
  const glow = document.getElementById("gg-glow");
  const view = document.getElementById("view-dashboard");
  if (!field || !glow || !view) return;

  // outer: gets pushed by the cursor / middle: floats / inner: the coloured, tilted label (a button)
  field.innerHTML = THEORIES.map(function (t) {
    return (
      '<span class="fw-repel" data-gg-repel style="left:' + t.left + ";top:" + t.top + '">' +
      '<span class="fw-float" style="animation:' + t.anim + '">' +
      '<button type="button" class="fw-chip" data-phase="' + t.phase + '" title="Show ' + (t.phase === "All services" ? "all" : t.phase) + ' services" style="background:' + t.color + ";transform:rotate(" + t.tilt + ')">' +
      "<b>" + t.name + "</b><small>" + t.tag + "</small></button></span></span>"
    );
  }).join("");

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const R = 210;     // how close the cursor has to be before a label reacts (px)
  const PUSH = 46;   // the strongest nudge (px)
  let last = null, frame = 0;

  function chips() { return field.querySelectorAll("[data-gg-repel]"); }

  function reset() {
    last = null;
    glow.style.opacity = "0";
    chips().forEach(function (el) { el.style.transform = "translate(0,0)"; });
  }

  function isShowing() {
    const sheet = document.getElementById("tool-sheet");
    return view.classList.contains("is-active") && (!sheet || sheet.hidden);
  }

  function apply() {
    frame = 0;
    if (!last) return;
    chips().forEach(function (el) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = cx - last.clientX, dy = cy - last.clientY;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > R) { el.style.transform = "translate(0,0)"; return; }
      const f = ((R - d) / R) * PUSH;
      el.style.transform = "translate(" + ((dx / d) * f).toFixed(1) + "px," + ((dy / d) * f).toFixed(1) + "px)";
    });
  }

  // Clicking a theory shows the services for the phase it belongs to.
  field.addEventListener("click", function (e) {
    const chip = e.target.closest("[data-phase]");
    if (chip && window.ggFilterPhase) window.ggFilterPhase(chip.dataset.phase);
  });

  window.addEventListener("mousemove", function (e) {
    if (!isShowing()) { if (last) reset(); return; }
    glow.style.opacity = "1";
    glow.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
    if (reduce) return;
    last = e;
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });

  // Only when the pointer leaves the window, not each time it crosses an element.
  document.documentElement.addEventListener("mouseleave", reset);
})();

/* Homefront Family Protection, hffprotect.com
 The ONLY thing to configure: paste the GoHighLevel inbound-webhook URL below.
 See DEPLOY.md §1 for the 3-step GHL wiring. */
const CRM_WEBHOOK_URL = "";

document.documentElement.classList.add("js");

/* ---------- Mobile navigation ---------- */
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
function closeNav() {
 navMenu.classList.remove("is-open");
 navToggle.setAttribute("aria-expanded", "false");
 document.body.classList.remove("nav-open");
}
if (navToggle && navMenu) {
 navToggle.addEventListener("click", () => {
 const open = navMenu.classList.toggle("is-open");
 navToggle.setAttribute("aria-expanded", String(open));
 document.body.classList.toggle("nav-open", open);
 });
 navMenu.addEventListener("click", (e) => {
 if (e.target.closest("a")) closeNav();
 });
 document.addEventListener("keydown", (e) => {
 if (e.key === "Escape" && navMenu.classList.contains("is-open")) {
 closeNav();
 navToggle.focus();
 }
 });
}

/* ---------- Header shadow on scroll ---------- */
const header = document.querySelector("[data-header]");
if (header) {
 const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
 onScroll();
 window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Scroll reveals (reduced-motion handled in CSS) ---------- */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealEls.length) {
 const io = new IntersectionObserver(
 (entries) => {
 for (const entry of entries) {
 if (entry.isIntersecting) {
 entry.target.classList.add("in");
 io.unobserve(entry.target);
 }
 }
 },
 { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
 );
 revealEls.forEach((el) => io.observe(el));
} else {
 revealEls.forEach((el) => el.classList.add("in"));
}

/* ---------- Quote form ---------- */
const form = document.querySelector("[data-quote-form]");
if (form) {
 /* JS is running, so take over validation; without JS the browser's
 native required-field validation stays active. */
 form.setAttribute("novalidate", "");

 const submitBtn = form.querySelector("button[type=submit]");
 const successEl = document.querySelector("[data-form-success]");
 const errorEl = document.querySelector("[data-form-error]");
 const consentBox = form.querySelector("#tcpa");
 const consentTextEl = document.querySelector("[data-consent-text]");

 const digits = (v) => v.replace(/\D/g, "");

 form.addEventListener("submit", async (e) => {
 e.preventDefault();
 errorEl.hidden = true;

 if (!form.reportValidity()) return;

 let phone = digits(form.querySelector("#phone").value);
 if (phone.length === 11 && phone.startsWith("1")) phone = phone.slice(1);
 if (phone.length !== 10 || phone.startsWith("0") || phone.startsWith("1")) {
 const phoneInput = form.querySelector("#phone");
 phoneInput.setCustomValidity("Please enter a 10-digit US phone number.");
 form.reportValidity();
 phoneInput.setCustomValidity("");
 return;
 }

 const payload = {
 full_name: form.querySelector("#full_name").value.trim(),
 phone,
 email: form.querySelector("#email").value.trim(),
 state: form.querySelector("#state").value,
 mortgage_balance: form.querySelector("#mortgage_balance").value,
 tcpa_consent: String(consentBox.checked),
 consent_text: consentTextEl ? consentTextEl.textContent.replace(/\s+/g, " ").trim() : "",
 /* Honeypot: hidden field bots fill and humans never see. We still send
 the lead (flagged) rather than dropping it, autofill can create
 false positives, and a flagged lead beats a lost family. */
 bot_suspected: String(Boolean(form.querySelector("[name=hp_field]").value)),
 page: location.hostname + location.pathname,
 submitted_at: new Date().toISOString(),
 };
 if (window.__fit) {
 payload.fit_result = window.__fit.result;
 payload.fit_answers = JSON.stringify(window.__fit.answers);
 }

 if (!CRM_WEBHOOK_URL) {
 /* Webhook not configured yet (see DEPLOY.md), fail visibly, never silently. */
 errorEl.hidden = false;
 errorEl.focus?.();
 return;
 }

 submitBtn.disabled = true;
 submitBtn.dataset.label = submitBtn.textContent;
 submitBtn.textContent = "Sending…";
 try {
 const res = await fetch(CRM_WEBHOOK_URL, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(payload),
 signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined,
 });
 if (!res.ok) throw new Error("HTTP " + res.status);
 form.hidden = true;
 successEl.hidden = false;
 successEl.focus?.();
 } catch (err) {
 errorEl.hidden = false;
 errorEl.focus?.();
 } finally {
 submitBtn.disabled = false;
 submitBtn.textContent = submitBtn.dataset.label;
 }
 });
}


/* ---------- Find My Fit ---------- */
const fit = document.querySelector("[data-fit]");
if (fit) {
 const steps = [...fit.querySelectorAll("[data-fit-step]")];
 const dots = [...fit.querySelectorAll(".fit__dots li")];
 const result = fit.querySelector("[data-fit-result]");
 const backBtn = fit.querySelector("[data-fit-back]");
 const answers = {};
 let idx = 0;

 const RECS = {
 term: {
 product: "Term life (mortgage protection)",
 why: "The most protection per dollar, with the price and coverage locked for a set stretch of years, matched to what you owe on the house. You’re in the window where term rates are at their best, and your need has an end date.",
 catch: "The honest catch: it ends when the term ends, and it doesn’t build cash value. Your licensed professional will match the length to your mortgage and find which company says yes at the best price.",
 },
 wl: {
 product: "Whole life",
 why: "Coverage that never expires, a payment that never changes, and a cash amount that builds over time, with living benefits many plans include. For your situation, lasting protection you’ll actually keep usually beats a bigger plan that expires on you. It’s also the easiest type to qualify for, usually just health questions, no exam.",
 catch: "The honest catch: it costs more per dollar of coverage than term, so it’s sized to fit your budget. Most families we talk to land here.",
 },
 iul: {
 product: "Indexed universal life (IUL)",
 why: "Lifetime coverage that can also build cash value tied to a market index, with a floor for down years. For someone healthy who wants protection plus growth potential, it’s the strongest fit.",
 catch: "The honest catch: the growth isn’t guaranteed, and it has more moving parts than whole life. A licensed professional will walk you through exactly how it works before you decide anything.",
 },
 fe: {
 product: "Final expense whole life",
 why: "A right-sized plan built for one job: the funeral and any final bills, so your family never covers those costs out of pocket. The price locks for life, it never expires, and qualifying is simple, health questions, no exam.",
 catch: "The honest catch: it’s sized for final costs, not income replacement. Simple, affordable, done.",
 },
 gi: {
 product: "Guaranteed-issue whole life",
 why: "Built specifically for people who’ve been told no before. There are no health questions at all. Coverage in force beats a decline, every time.",
 catch: "The honest catch: these plans carry a waiting period in the first couple of years and smaller coverage amounts. A licensed professional will first check whether you qualify for something stronger, then lock in the best option you can get.",
 },
 };

 function recommend(a) {
 if (a.health === "declined") return "gi";
 if (a.goal === "final") return "fe";
 if (a.health === "serious") return "wl";
 if (a.goal === "grow" && a.health === "great" && a.age !== "65p") return "iul";
 if (a.length === "years" && a.health === "great" && (a.age === "u40" || a.age === "40s")) return "term";
 return "wl";
 }

 function show(i) {
 steps.forEach((s, n) => (s.hidden = n !== i));
 result.hidden = true;
 dots.forEach((d, n) => d.classList.toggle("on", n <= i));
 backBtn.hidden = i === 0;
 idx = i;
 }

 function finish() {
 const key = recommend(answers);
 const rec = RECS[key];
 steps.forEach((s) => (s.hidden = true));
 fit.querySelector("[data-fit-product]").textContent = rec.product;
 fit.querySelector("[data-fit-why]").textContent = rec.why;
 fit.querySelector("[data-fit-catch]").textContent = rec.catch;
 dots.forEach((d) => d.classList.add("on"));
 backBtn.hidden = false;
 result.hidden = false;
 result.focus?.();
 window.__fit = { result: rec.product, answers: Object.assign({}, answers) };
 }

 fit.addEventListener("click", (e) => {
 const opt = e.target.closest(".fit__opt");
 if (opt) {
 answers[opt.dataset.q] = opt.dataset.v;
 if (idx < steps.length - 1) show(idx + 1);
 else finish();
 return;
 }
 if (e.target.closest("[data-fit-back]")) {
 if (!result.hidden) show(steps.length - 1);
 else if (idx > 0) show(idx - 1);
 return;
 }
 if (e.target.closest("[data-fit-restart]")) {
 Object.keys(answers).forEach((k) => delete answers[k]);
 window.__fit = undefined;
 show(0);
 }
 });
}

/* ---------- Footer year ---------- */
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

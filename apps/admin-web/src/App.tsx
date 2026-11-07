import { useEffect, useRef, useState, type FormEvent } from "react";
import { Select } from "./Select";
import { colors } from "@nobogey/ui";
import { describeUserError, isValidEmailAddress, normalizeEmailAddress } from "@nobogey/utils";
import brandLogo from "../../../assets/logo/NoBogey-Logo.png";
import { CaddieVerificationQueue } from "./features/caddie-verification/CaddieVerificationQueue";
import { AdminNotifications } from "./features/notifications/AdminNotifications";
import { adminPasswordResetOptions, adminSignInCredentials } from "./lib/admin-auth";
import { hasAdminRole, supabase } from "./lib/supabase";
import { Turnstile } from "./Turnstile";
import {
  addCaddie,
  addTeeTime,
  assignCaddie,
  describeAdminBackendError,
  formatDate,
  formatTime,
  getState,
  removeStrike,
  removeTeeTime,
  reportCaddie,
  setBookingWindow,
  toggleCaddie,
  unassignCaddie,
  useFleet,
  type Caddie,
  type Tier
} from "./lib/fleet";

const tierLabels: Record<Tier, string> = { TRAINER: "Trainer", "CLASS B": "Class B", "CLASS A": "Class A" };
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function todayKey() { return formatDate(new Date()); }
function dateFromKey(key: string) { return new Date(`${key}T12:00:00`); }
function isoFor(year: number, month: number, day: number) { return formatDate(new Date(year, month, day, 12)); }

export function App() {
  const fleet = useFleet();
  const [path, setPath] = useState(() => window.location.pathname);
  const [signedIn, setSignedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { void supabase.auth.getSession().then(async ({ data }) => { const allowed = data.session ? await hasAdminRole(data.session.user.id).catch(() => false) : false; if (data.session && !allowed) await supabase.auth.signOut(); setSignedIn(allowed); setHydrated(true); }); }, []);
  useEffect(() => { if (!hydrated) return; if (window.location.pathname === "/" || window.location.pathname === "/auth/callback") { history.replaceState({}, "", signedIn ? "/admin" : "/login"); setPath(signedIn ? "/admin" : "/login"); } }, [hydrated, signedIn]);
  const navigate = (next: string) => { history.pushState({}, "", next); setPath(next); };
  useEffect(() => { const onPop = () => setPath(window.location.pathname); addEventListener("popstate", onPop); return () => removeEventListener("popstate", onPop); }, []);
  useEffect(() => { if (hydrated && !signedIn && path !== "/login" && path !== "/reset-password") navigate("/login"); }, [hydrated, path, signedIn]);
  const signIn = () => { setSignedIn(true); navigate("/admin"); };
  const signOut = async () => { await supabase.auth.signOut(); setSignedIn(false); navigate("/login"); };
  if (!hydrated) return <main className="login-page"><section className="login-card"><div className="login-brand">NoBogey</div><p>Checking administrator session…</p></section></main>;
  const page = path === "/reset-password" ? <ResetPassword onComplete={() => navigate("/login")} /> : !signedIn || path === "/login" ? <Login onSuccess={signIn} /> : path === "/admin/assignments" ? <CaddieAssignments /> : path === "/admin/fleet" ? <CaddieFleet /> : path === "/admin/tee-times" ? <TeeTimes /> : path === "/admin/caddies" ? <SupabaseCaddies /> : path === "/admin/caddie-management" ? <CaddieManagement /> : path === "/admin/verifications" ? <CaddieVerificationQueue /> : <Dashboard />;
  return <><style>{`:root{--ink:#151515;--muted:#6f746f;--cream:#f7f5ef;--surface:#fcfbf7;--fairway:#173f35;--fairway-dark:#10332b;--sand:#c79b43;--line:#e5e1d8;--gold:#c79b43;--danger:${colors.flag}}`}</style>{signedIn && path !== "/login" ? <div className="admin-shell"><Header path={path} navigate={navigate} onSignOut={signOut} /><div className="admin-main"><AdminNotifications navigate={navigate} />{fleet.syncError ? <p className="error" role="alert">{fleet.syncError}</p> : null}{page}</div></div> : page}</>;
}

function Header({ path, navigate, onSignOut }: { path: string; navigate: (to: string) => void; onSignOut: () => void }) { return <aside className="topbar"><button className="wordmark" aria-label="NoBogey dashboard" onClick={() => navigate("/admin")}><img src={brandLogo} alt="" /><span>NoBogey</span></button><nav aria-label="Administrator navigation"><p>Organize</p><button className={path === "/admin" ? "active" : ""} onClick={() => navigate("/admin")}>Scheduler</button><button className={path === "/admin/assignments" ? "active" : ""} onClick={() => navigate("/admin/assignments")}>Assignments</button><button className={path === "/admin/tee-times" ? "active" : ""} onClick={() => navigate("/admin/tee-times")}>Tee Times</button><p>Caddies</p><button className={path === "/admin/fleet" ? "active" : ""} onClick={() => navigate("/admin/fleet")}>Caddie Fleet</button><button className={path === "/admin/caddie-management" ? "active" : ""} onClick={() => navigate("/admin/caddie-management")}>Caddie Management</button><button className={path === "/admin/caddies" ? "active" : ""} onClick={() => navigate("/admin/caddies")}>Caddie Onboarding</button><button className={path === "/admin/verifications" ? "active" : ""} onClick={() => navigate("/admin/verifications")}>Caddie Verification</button></nav><span className="admin-label">Golf Course Administrator</span><button className="sign-out" onClick={onSignOut}>Sign out</button></aside>; }

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaKey(value => value + 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmailAddress(email)) return setError("Enter a valid administrator email address.");
    setSubmitting(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        adminSignInCredentials(email, password, captchaToken)
      );
      if (authError) throw authError;
      if (!await hasAdminRole(data.user.id)) {
        await supabase.auth.signOut();
        throw new Error("This account does not have administrator access.");
      }
      onSuccess();
    } catch (reason) {
      setError(describeUserError(reason, "You could not be signed in. Please try again."));
      resetCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const forgot = async () => {
    if (!isValidEmailAddress(email)) return setError("Enter a valid administrator email address first.");
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizeEmailAddress(email),
        adminPasswordResetOptions(window.location.origin, captchaToken)
      );
      if (resetError) throw resetError;
      setNotice("Password-reset email sent. Open its link to choose a new password.");
    } catch (reason) {
      setError(describeUserError(reason, "The reset email could not be sent. Please try again."));
    } finally {
      resetCaptcha();
      setSubmitting(false);
    }
  };

  return <main className="login-page"><section className="login-card"><div className="login-brand">NoBogey</div><p className="eyebrow">Administrator portal</p><h1>Sign in to NoBogey</h1><form onSubmit={(event) => void submit(event)}><label>Email address<input autoComplete="username" name="email" placeholder="admin@example.com" type="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label htmlFor="login-password">Password<span className="login-password-field"><input id="login-password" autoComplete="current-password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} /><button className="login-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="login-password" onClick={() => setShowPassword(value => !value)}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg></button></span></label><Turnstile key={captchaKey} onToken={setCaptchaToken} />{error && <p className="login-error" role="alert">{error}</p>}{notice && <p className="verification-success" role="status">{notice}</p>}<button className="primary login-submit" disabled={submitting || !captchaToken} type="submit">{submitting ? "Please wait…" : "Sign in"}</button><button className="login-link" disabled={submitting || !captchaToken} onClick={() => void forgot()} type="button">Forgot password?</button><a className="login-support" href="/contact/">Contact support</a></form></section></main>;
}

function ResetPassword({ onComplete }: { onComplete: () => void }) { const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false); const save = async (event: FormEvent) => { event.preventDefault(); if (password.length < 8) return setMessage("Use at least 8 characters."); if (password !== confirm) return setMessage("Passwords do not match."); setSubmitting(true); setMessage(""); const { error } = await supabase.auth.updateUser({ password }); if (error) { setMessage(describeUserError(error, "Your password could not be updated. Request a new reset link and try again.")); setSubmitting(false); return; } await supabase.auth.signOut(); onComplete(); }; return <main className="login-page"><section className="login-card"><div className="login-brand">NoBogey</div><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1><p>Enter a new password for your NoBogey account.</p><form onSubmit={(event) => void save(event)}><label>New password<input autoComplete="new-password" minLength={8} onChange={event => setPassword(event.target.value)} type="password" value={password} /></label><label>Confirm new password<input autoComplete="new-password" minLength={8} onChange={event => setConfirm(event.target.value)} type="password" value={confirm} /></label>{message && <p className="login-error" role="alert">{message}</p>}<button className="primary login-submit" disabled={submitting || !password || !confirm} type="submit">{submitting ? "Updating…" : "Update password"}</button><a className="login-support" href="/contact/">Need help? Contact support</a></form></section></main>; }

function Dashboard() {
  const state = useFleet(); const initial = dateFromKey(todayKey()); const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() }); const [selected, setSelected] = useState(todayKey()); const [editingWindow, setEditingWindow] = useState(false);
  const visibleMonths = Array.from({ length: Math.min(12, state.bookingWindow) }, (_, i) => { const d = new Date(initial.getFullYear(), initial.getMonth() + i, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  return <main><section className="course-banner"><div><h1>Manila Golf &amp; Country Club</h1><p>Forbes Park, Makati City</p></div></section><section className="content"><div className="booking-window-action"><button className="outline-button" onClick={() => setEditingWindow(true)}>Edit booking window</button></div><div className="month-tabs">{visibleMonths.map(({ year, month }) => <button key={`${year}-${month}`} className={view.year === year && view.month === month ? "selected" : ""} onClick={() => setView({ year, month })}>{months[month]} {year}</button>)}</div><Calendar year={view.year} month={view.month} selected={selected} onSelect={setSelected} state={state} /></section>{editingWindow && <BookingWindowModal current={state.bookingWindow} onClose={() => setEditingWindow(false)} />}</main>;
}

function BookingWindowModal({ current, onClose }: { current: number; onClose: () => void }) { const [value, setValue] = useState(String(current)); return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="booking-window-title" onMouseDown={event => event.stopPropagation()}><button className="close" aria-label="Close booking window editor" onClick={onClose}>×</button><h2 id="booking-window-title">Edit booking window</h2><p>Set how many months ahead golfers can book, from 1 to 60.</p><label className="window-field">Months<input autoFocus aria-label="Booking window in months" min="1" max="60" type="number" value={value} onChange={event => setValue(event.target.value)} /></label><button className="primary" onClick={() => { setBookingWindow(Number(value)); onClose(); }}>Save booking window</button></section></div>; }

function Calendar({ year, month, selected, onSelect, state }: { year: number; month: number; selected: string; onSelect: (key: string) => void; state: ReturnType<typeof getState> }) { const first = new Date(year, month, 1).getDay(); const calendarStart = new Date(year, month, 1 - first, 12); const cells = Array.from({ length: 42 }, (_, index) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index, 12)); const today = todayKey(); return <div className="calendar"><div className="weekdays">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map(date => { const key = formatDate(date); const currentMonth = date.getMonth() === month; const past = key < today; const disabled = !currentMonth || past; return <button aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}${disabled ? ", unavailable" : ""}`} disabled={disabled} key={key} className={`calendar-day${selected === key ? " selected-day" : ""}${!currentMonth ? " adjacent-month" : ""}${past ? " past-date" : ""}`} onClick={() => onSelect(key)}><b>{date.getDate()}</b><small>{past ? "" : currentMonth ? `${(state.dayTimes[key] ?? state.defaultTimes).length} tt` : "—"}</small></button>; })}</div></div>; }

function CaddieAssignments() { const state = useFleet(); const [selected, setSelected] = useState(todayKey()); const [assigning, setAssigning] = useState<string | null>(null); const [unassigning, setUnassigning] = useState<string | null>(null); const times = state.dayTimes[selected] ?? state.defaultTimes; return <main className="assignments-page"><section className="section-heading"><div><p className="eyebrow">Organize</p><h1>Assignments</h1></div><label className="assignment-date">Date<input aria-label="Assignment date" type="date" value={selected} onChange={event => setSelected(event.target.value)} /></label></section><section className="card slots"><h3>{dateFromKey(selected).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</h3><small>{times.length} published tee times · available or booked caddies</small>{times.map(time => { const assigned = state.assignments[`${selected}|${time}`] ?? []; const filled = assigned.length > 0; const atCapacity = assigned.length >= 4; return <div className="slot" key={time}><b>{time}</b><span>{assigned.map(id => state.caddies.find(c => c.id === id)?.name).filter(Boolean).join(", ") || "No caddie available"}</span><strong className={`availability ${filled ? "is-filled" : "is-available"}`}>{filled ? "Covered" : "Open"}</strong><button aria-label={`Make a caddie available for ${time}`} className="round-button" disabled={atCapacity} onClick={() => setAssigning(time)}>+</button><button aria-label={`Remove the last available caddie from ${time}`} className="round-button assignment-remove-button" disabled={!assigned.length} onClick={() => setUnassigning(time)}>−</button></div>; })}</section>{assigning && <AssignModal date={selected} time={assigning} onClose={() => setAssigning(null)} />}{unassigning && <UnassignConfirmModal date={selected} time={unassigning} onClose={() => setUnassigning(null)} onConfirm={() => { void unassignCaddie(selected, unassigning).then(() => setUnassigning(null)).catch(cause => window.alert(describeAdminBackendError(cause, "Caddie availability could not be updated. Please try again."))); }} />}</main>; }

function UnassignConfirmModal({ date, time, onClose, onConfirm }: { date: string; time: string; onClose: () => void; onConfirm: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="unassign-title" onMouseDown={event => event.stopPropagation()}><p className="eyebrow">Review assignment removal</p><h2 id="unassign-title">Remove last caddie?</h2><p>This removes the most recently assigned caddie from <strong>{time}</strong> on {date}.</p><div className="tee-time-confirm-actions"><button className="small" onClick={onClose}>Cancel</button><button className="danger filled" onClick={onConfirm}>Confirm removal</button></div></section></div>; }

function CaddieFleet() { const state = useFleet(); const [query, setQuery] = useState(""); const [search, setSearch] = useState(""); const caddies = state.caddies.filter(c => c.active && c.name.toLowerCase().includes(query.toLowerCase())); const tiers: Tier[] = ["CLASS A", "CLASS B", "TRAINER"]; return <main className="fleet-page"><section className="fleet"><div className="section-heading"><div><p className="eyebrow">Caddies</p><h1>Caddie Fleet · {state.caddies.filter(c => c.active).length} active</h1></div></div><form className="filters fleet-search" onSubmit={event => { event.preventDefault(); setQuery(search); }}><input aria-label="Search caddies" placeholder="Search caddies…" value={search} onChange={e => setSearch(e.target.value)} /><button className="primary" type="submit">Enter</button></form><div className="fleet-tiers">{tiers.map(tier => { const rankedCaddies = caddies.filter(caddie => caddie.tier === tier); return <section className="fleet-tier" key={tier}><h2>{tierLabels[tier]}</h2><div className="fleet-grid">{rankedCaddies.map(caddie => <CaddieChip hideStrikes key={caddie.id} caddie={caddie} />)}</div>{rankedCaddies.length === 0 ? <p className="fleet-empty">No active caddies in this tier.</p> : null}</section>; })}</div></section></main>; }
function CaddieChip({ caddie, hideStrikes = false }: { caddie: Caddie; hideStrikes?: boolean }) { return <article className="caddie-chip"><Avatar caddie={caddie} /><div><b>{caddie.name}</b><small>{tierLabels[caddie.tier]} · ₱{caddie.rate} · {caddie.years}y{hideStrikes ? "" : ` · ${caddie.strikes === 0 ? "No strikes" : `${caddie.strikes} ${caddie.strikes === 1 ? "strike" : "strikes"}`}`}</small></div>{hideStrikes ? null : <Dot strikes={caddie.strikes} />}</article>; }
function Avatar({ caddie: _caddie }: { caddie: Caddie }) { return <span className="avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 8.5c1.8-2.4 12.2-2.4 14 0l-1.8 1.1H6.8L5 8.5Z" fill="currentColor" /><circle cx="12" cy="11.3" r="3.2" fill="currentColor" /><path d="M5.8 20c.6-3.3 2.8-5.2 6.2-5.2s5.6 1.9 6.2 5.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.3" /></svg></span>; }
function Dot({ strikes }: { strikes: number }) { return <span className={`compliance-dot strikes-${strikes}`} title={`${strikes} strikes`} />; }

function AssignModal({ date, time, onClose }: { date: string; time: string; onClose: () => void }) { const state = useFleet(); const [query, setQuery] = useState(""); const [tier, setTier] = useState("ALL"); const [active, setActive] = useState("ACTIVE"); const [message, setMessage] = useState(""); const [pending, setPending] = useState<Caddie | null>(null); const ref = useRef<HTMLButtonElement>(null); useEffect(() => { ref.current?.focus(); const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [onClose]); const choices = state.caddies.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) && (tier === "ALL" || c.tier === tier) && (active === "ALL" || c.active)); const confirm = async () => { if (!pending) return; try { const result = await assignCaddie(date, time, pending.id); if (result.ok) onClose(); else { setMessage(result.reason); setPending(null); } } catch (cause) { setMessage(describeAdminBackendError(cause, "Caddie availability could not be updated. Please try again.")); setPending(null); } }; return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="assign-title" onMouseDown={e => e.stopPropagation()}><button ref={ref} className="close" aria-label="Close assign caddie dialog" onClick={onClose}>×</button>{pending ? <><p className="eyebrow">Review availability</p><h2 id="assign-title">Confirm caddie availability</h2><p>Make <strong>{pending.name}</strong> bookable for this tee time?</p><div className="tee-time-confirm-summary"><b>{time}</b><span>{date}</span></div><div className="tee-time-confirm-actions"><button className="small" onClick={() => setPending(null)}>Back</button><button className="primary" onClick={() => void confirm()}>Confirm availability</button></div></> : <><h2 id="assign-title">Make caddie available</h2><p>{date} · {time}</p><div className="filters"><input placeholder="Search caddies…" value={query} onChange={e => setQuery(e.target.value)} /><Select value={tier} onChange={e => setTier(e.target.value)}><option value="ALL">All tiers</option>{Object.entries(tierLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Select><Select value={active} onChange={e => setActive(e.target.value)}><option value="ACTIVE">Active</option><option value="ALL">Any status</option></Select></div>{message && <p className="error">{message}</p>}<div className="modal-list">{choices.map(c => <button key={c.id} onClick={() => setPending(c)}><CaddieChip caddie={c} /><span>Review</span></button>)}</div></>}</section></div>; }

type PendingTeeTimeChange = { kind: "schedule" | "remove"; time: string };

function TeeTimes() {
  const state = useFleet();
  const now = dateFromKey(todayKey());
  const [mode, setMode] = useState<"single" | "range">("single");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [day, setDay] = useState(now.getDate());
  const [toDay, setToDay] = useState(now.getDate());
  const [hour, setHour] = useState("7");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");
  const [pendingChange, setPendingChange] = useState<PendingTeeTimeChange | null>(null);
  const date = isoFor(year, month, day);
  const to = isoFor(year, month, toDay);
  const displayTimes = state.dayTimes[date] ?? state.defaultTimes;
  const selectedTime = formatTime(Number(hour), Number(minute), ampm);
  const scopeLabel = mode === "range" ? `${date} through ${to}` : date;
  const confirmChange = async () => {
    if (!pendingChange) return;
    const dates = mode === "range" ? rangeDates(date, to) : [date];
    try {
      for (const key of dates) await (pendingChange.kind === "remove" ? removeTeeTime(key, pendingChange.time, false) : addTeeTime(key, pendingChange.time, false));
      setPendingChange(null);
    } catch (cause) {
      window.alert(describeAdminBackendError(cause, "Unable to update tee times."));
    }
  };

  return <main className="editor tee-times-editor"><div><p className="eyebrow">Manila Golf &amp; Country Club</p><h1>Tee Times</h1></div><div className="tee-time-columns"><section className="card scope-card"><small>Apply to</small><div className="segmented">{(["single", "range"] as const).map(item => <button key={item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>{item === "single" ? "Single day" : "Series of days"}</button>)}</div><DateBoard type="month" year={year} month={month} day={day} setYear={setYear} setMonth={setMonth} setDay={setDay} label="Month & year" /><div className={mode === "range" ? "date-fields range-fields" : "date-fields"}><DateBoard type="day" year={year} month={month} day={day} setYear={setYear} setMonth={setMonth} setDay={setDay} label={mode === "range" ? "From" : "Day"} />{mode === "range" && <DateBoard type="day" year={year} month={month} day={toDay} setYear={setYear} setMonth={setMonth} setDay={setToDay} label="To" />}</div></section><section className="card time-card"><small>Schedule a tee time</small><div className="time-controls"><label>Hour<Select aria-label="Hour" value={hour} onChange={e => setHour(e.target.value)}>{Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n}>{n}</option>)}</Select></label><label>Minute<Select aria-label="Minute" value={minute} onChange={e => setMinute(e.target.value)}>{Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(n => <option key={n}>{n}</option>)}</Select></label><label>AM / PM<Select aria-label="AM or PM" value={ampm} onChange={e => setAmpm(e.target.value)}><option>AM</option><option>PM</option></Select></label><button className="primary" onClick={() => setPendingChange({ kind: "schedule", time: selectedTime })}>＋ Schedule {selectedTime}</button></div></section></div><section className="card tee-list"><h2>Current tee times</h2><small>{date}</small>{displayTimes.map(time => <div key={time}><b>{time}</b><button className="danger" onClick={() => setPendingChange({ kind: "remove", time })}>Remove</button></div>)}</section>{pendingChange && <TeeTimeConfirmModal change={pendingChange} scopeLabel={scopeLabel} onClose={() => setPendingChange(null)} onConfirm={confirmChange} />}</main>;
}

function TeeTimeConfirmModal({ change, scopeLabel, onClose, onConfirm }: { change: PendingTeeTimeChange; scopeLabel: string; onClose: () => void; onConfirm: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  const scheduling = change.kind === "schedule";
  useEffect(() => { button.current?.focus(); const esc = (event: KeyboardEvent) => event.key === "Escape" && onClose(); addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal compact-modal tee-time-confirm" role="dialog" aria-modal="true" aria-labelledby="tee-time-confirm-title" onMouseDown={event => event.stopPropagation()}><button ref={button} className="close" aria-label="Close confirmation dialog" onClick={onClose}>×</button><p className="eyebrow">Review tee-time change</p><h2 id="tee-time-confirm-title">{scheduling ? "Schedule tee time" : "Remove tee time"}</h2><p>{scheduling ? "This tee time will be added to" : "This tee time will be removed from"} <strong>{scopeLabel}</strong>.</p><div className="tee-time-confirm-summary"><b>{change.time}</b><span>{scopeLabel}</span></div><div className="tee-time-confirm-actions"><button className="small" onClick={onClose}>Cancel</button><button className={scheduling ? "primary" : "danger filled"} onClick={onConfirm}>{scheduling ? "Confirm schedule" : "Confirm removal"}</button></div></section></div>;
}

function DateBoard({ type, year, month, day, setYear, setMonth, setDay, label }: { type: "month" | "day"; year: number; month: number; day: number; setYear: (x: number) => void; setMonth: (x: number) => void; setDay: (x: number) => void; label: string }) { const [open, setOpen] = useState(false); const board = useRef<HTMLDivElement>(null); useEffect(() => { if (!open) return; const dismiss = (event: PointerEvent) => { if (!board.current?.contains(event.target as Node)) setOpen(false); }; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape); return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); }; }, [open]); const first = new Date(year, month, 1).getDay(); const end = new Date(year, month + 1, 0).getDate(); const value = type === "month" ? `${months[month]} ${year}` : dateFromKey(isoFor(year, month, day)).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); return <div className="date-board" ref={board}><label>{label}</label><button className="date-input" aria-expanded={open} onClick={() => setOpen(!open)}>{value}<svg className="date-input-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2" /></svg></button>{open && <div className="calendar-popover">{type === "month" ? <><div className="picker-row"><Select aria-label="Month" value={month} onChange={event => setMonth(Number(event.target.value))}>{months.map((name, index) => <option key={name} value={index}>{name}</option>)}</Select><Select aria-label="Year" value={year} onChange={event => setYear(Number(event.target.value))}>{Array.from({ length: 2050 - new Date().getFullYear() + 1 }, (_, index) => new Date().getFullYear() + index).map(value => <option key={value}>{value}</option>)}</Select></div><div className="month-board">{months.map((name, index) => <button key={name} className={index === month ? "picked" : ""} onClick={() => { setMonth(index); setOpen(false); }}>{name.slice(0, 3)}</button>)}</div></> : <><div className="picker-row"><button onClick={() => setMonth((month + 11) % 12)}>‹</button><strong>{months[month]} {year}</strong><button onClick={() => setMonth((month + 1) % 12)}>›</button></div><div className="mini-days">{weekdays.map(value => <span key={value}>{value[0]}</span>)}{Array.from({ length: first }, (_, index) => <i key={index} />)}{Array.from({ length: end }, (_, index) => index + 1).map(value => <button key={value} className={value === day ? "picked" : ""} onClick={() => { setDay(value); setOpen(false); }}>{value}</button>)}</div></>}</div>}</div>; }
function rangeDates(a: string, b: string) { const start = dateFromKey(a); const end = dateFromKey(b); const result: string[] = []; for (const current = start; current <= end; current.setDate(current.getDate() + 1)) result.push(formatDate(current)); return result; }

function SupabaseCaddies() {
  const [email, setEmail] = useState(""); const [name, setName] = useState("");
  const [tier, setTier] = useState<Tier>("CLASS A"); const [rate, setRate] = useState("1500"); const [years, setYears] = useState("5");
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const enroll = async () => { if (!isValidEmailAddress(email) || !name.trim()) return setMessage("Enter a valid account email and full name."); setSaving(true); setMessage(""); try { await addCaddie(normalizeEmailAddress(email), name, tier, Number(rate), Number(years)); setEmail(""); setName(""); setMessage("Caddie saved to Supabase. Assign published tee-time availability before accepting bookings."); } catch (cause) { setMessage(describeAdminBackendError(cause, "The caddie could not be saved. Please try again.")); } finally { setSaving(false); } };
  return <main className="editor"><p className="eyebrow">Caddies · directory</p><h1>Caddie Onboarding</h1><section className="card add-caddie"><small>Add a caddie</small><label>Account email<input type="email" value={email} placeholder="caddie@example.com" onChange={event => setEmail(event.target.value)} /></label><label>Full name<input value={name} placeholder="e.g. Miguel Santos" onChange={event => setName(event.target.value)} /></label><label>Caddie tier<Select value={tier} onChange={event => setTier(event.target.value as Tier)}>{Object.entries(tierLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Select></label><label>Caddie rate (₱ per round)<input min="0" type="number" value={rate} onChange={event => setRate(event.target.value)} /></label><label>Years of experience<input min="0" max="80" type="number" value={years} onChange={event => setYears(event.target.value)} /></label>{message ? <p className={message.includes("saved") ? "verification-success" : "error"}>{message}</p> : null}<button className="primary" disabled={saving} onClick={() => void enroll()}>{saving ? "Saving to Supabase…" : "＋ Add caddie"}</button></section></main>;
}

function CaddieManagement() {
  const state = useFleet();
  const [statusPending, setStatusPending] = useState<Caddie | null>(null);
  const [reporting, setReporting] = useState<Caddie | null>(null);
  const [strikeRemovalNotice, setStrikeRemovalNotice] = useState("");

  const showFailure = (cause: unknown) => window.alert(describeAdminBackendError(cause, "Caddie management could not be updated. Please try again."));
  return <main className="editor"><p className="eyebrow">Caddies · directory</p><h1>Caddie Management</h1><section className="card roster"><h2>Live caddie roster</h2><small>{state.caddies.length} verified caddies</small>{strikeRemovalNotice ? <p className="frontend-notice" role="status">{strikeRemovalNotice}</p> : null}{state.caddies.map(caddie => <div className="roster-row" key={caddie.id}><CaddieChip hideStrikes caddie={caddie} /><button className={`status-toggle ${caddie.active ? "is-active" : ""}`} type="button" role="switch" aria-checked={caddie.active} onClick={() => setStatusPending(caddie)}><span aria-hidden="true" />{caddie.active ? "Active" : "Inactive"}</button><button className="danger small" onClick={() => setReporting(caddie)}>⚐ Report</button><button className="small" disabled={caddie.strikes === 0} onClick={() => void removeStrike(caddie.id).then(() => setStrikeRemovalNotice(`Removed the latest open strike for ${caddie.name}.`)).catch(showFailure)}>Remove strike</button></div>)}</section>{statusPending && <CaddieStatusConfirmModal caddie={statusPending} onClose={() => setStatusPending(null)} onConfirm={() => void toggleCaddie(statusPending.id).then(() => setStatusPending(null)).catch(showFailure)} />}{reporting && <ReportModal caddie={reporting} onClose={() => setReporting(null)} />}</main>;
}

function CaddieStatusConfirmModal({ caddie, onClose, onConfirm }: { caddie: Caddie; onClose: () => void; onConfirm: () => void }) { const nextStatus = caddie.active ? "inactive" : "active"; return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="status-confirm-title" onMouseDown={event => event.stopPropagation()}><p className="eyebrow">Review status change</p><h2 id="status-confirm-title">Set {caddie.name} {nextStatus}?</h2><p>{caddie.active ? "Inactive caddies cannot be assigned to tee times." : "This caddie will be available for new tee-time assignments."}</p><div className="tee-time-confirm-actions"><button className="small" onClick={onClose}>Cancel</button><button className={caddie.active ? "danger filled" : "primary"} onClick={onConfirm}>Confirm {nextStatus}</button></div></section></div>; }

function ReportModal({ caddie, onClose }: { caddie: Caddie; onClose: () => void }) { const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const button = useRef<HTMLButtonElement>(null); useEffect(() => { button.current?.focus(); const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose(); addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [onClose]); const submit = async () => { setSaving(true); setError(""); try { await reportCaddie(caddie.id, reason); onClose(); } catch (cause) { setError(describeAdminBackendError(cause, "The report was not submitted. Please try again.")); } finally { setSaving(false); } }; return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title" onMouseDown={e => e.stopPropagation()}><button ref={button} className="close" aria-label="Close report dialog" onClick={onClose}>×</button><Avatar caddie={caddie} /><p className="eyebrow">Compliance action</p><h2 id="report-title">Report {caddie.name}</h2><p>Explain the compliance concern. Confirming this report adds one strike, up to three.</p><label>Reason<textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe what happened…" /></label>{error ? <p className="error" role="alert">{error}</p> : null}<button className="danger filled" disabled={saving || !reason.trim() || caddie.strikes >= 3} onClick={() => void submit()}>{saving ? "Saving…" : "Confirm report"}</button></section></div>; }

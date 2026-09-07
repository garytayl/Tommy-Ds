"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, FileText, LayoutDashboard, Package, Plus, Search, ShieldCheck, Users, Wrench } from "lucide-react";

type Job = { id: number; name: string; work: string; status: "Scheduled" | "In progress" | "Ready to invoice"; day: string; crew: string };
const sampleJobs: Job[] = [
  { id: 1, name: "Sample Residence A", work: "Window replacement", status: "Scheduled", day: "Today · 9:00 AM", crew: "North Crew" },
  { id: 2, name: "Sample Residence B", work: "Entry door install", status: "In progress", day: "Today · 1:00 PM", crew: "South Crew" },
  { id: 3, name: "Sample Residence C", work: "Patio door measurement", status: "Ready to invoice", day: "Tomorrow · 10:30 AM", crew: "North Crew" },
];
const nav = [["Overview", LayoutDashboard], ["Schedule", CalendarDays], ["Jobs", ClipboardList], ["Customers", Users], ["Quotes", FileText], ["Inventory", Package]] as const;

export default function Demo() {
  const [page, setPage] = useState("Overview");
  const [jobs, setJobs] = useState(sampleJobs);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Everything here is fictitious sample data stored only in this browser.");
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState(""); const [work, setWork] = useState("");
  const shown = useMemo(() => jobs.filter((job) => `${job.name} ${job.work} ${job.status}`.toLowerCase().includes(query.toLowerCase())), [jobs, query]);
  const advance = (id: number) => { setJobs((list) => list.map((job) => job.id === id ? { ...job, status: job.status === "Scheduled" ? "In progress" : "Ready to invoice" } : job)); setNotice("Status updated locally. Refresh to restore the starter demo."); };
  const addJob = () => { if (!name || !work) return; setJobs((list) => [...list, { id: Date.now(), name, work, status: "Scheduled", day: "Next available · 9:00 AM", crew: "North Crew" }]); setName(""); setWork(""); setAddOpen(false); setPage("Jobs"); setNotice("Sample job added to this browser session."); };

  return <main className="shell"><aside><div className="brand"><Wrench />Tommy D&apos;s <small>DEMO</small></div><p className="sub">Windows, Doors & More</p><nav>{nav.map(([label, Icon]) => <button key={label} className={page === label ? "active" : ""} onClick={() => setPage(label)}><Icon size={18} />{label}</button>)}</nav><div className="demo-note"><CheckCircle2 size={17} />No sign-in, database, payment service, or real customer data.</div></aside><section className="content"><header><div><p className="eyebrow">DEMO WORKSPACE</p><h1>{page}</h1></div><div className="actions"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sample data" /></label><button className="primary" onClick={() => setAddOpen(true)}><Plus size={17} />Add sample job</button></div></header><p className="notice">{notice}</p>
    {page === "Overview" && <><DemoInfo /><div className="cards"><Card n="Open jobs" v={String(jobs.length)} /><Card n="Today" v={String(jobs.filter((job) => job.day.startsWith("Today")).length)} /><Card n="Ready to invoice" v={String(jobs.filter((job) => job.status === "Ready to invoice").length)} /></div><section className="panel"><h2>Today&apos;s work</h2><List jobs={jobs.filter((job) => job.day.startsWith("Today"))} advance={advance} /></section></>}
    {page === "Jobs" && <section className="panel"><h2>Job board</h2><List jobs={shown} advance={advance} /></section>}
    {page === "Schedule" && <section className="panel"><h2>Tuesday · Demo day</h2><List jobs={jobs} advance={advance} /></section>}
    {page === "Customers" && <section className="panel"><h2>Sample contacts</h2><p>These labels are fictitious. No names, addresses, phone numbers, or emails are included.</p><div className="rows"><b>Sample Residence A <span>Window replacement</span></b><b>Sample Residence B <span>Entry door install</span></b><b>Sample Residence C <span>Measurement appointment</span></b></div></section>}
    {page === "Quotes" && <section className="panel quote"><h2>Quote builder demo</h2><p>Sample double-hung window <b>$745</b></p><p>Installation allowance <b>$285</b></p><hr /><h3>Demo total <b>$1,030</b></h3><button className="primary" onClick={() => setNotice("Demo quote saved locally — no information was sent anywhere.")}>Save demo quote</button></section>}
    {page === "Inventory" && <div className="cards"><Card n="Window units" v="24" /><Card n="Door slabs" v="8" /><Card n="Hardware kits" v="31" /></div>}
  </section>{addOpen && <div className="modal-wrap"><form className="modal" onSubmit={(event) => { event.preventDefault(); addJob(); }}><h2>Add a sample job</h2><p>It exists only in this browser session.</p><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Sample project name" /><input value={work} onChange={(event) => setWork(event.target.value)} placeholder="Work type" /><div><button type="button" onClick={() => setAddOpen(false)}>Cancel</button><button className="primary">Add job</button></div></form></div>}</main>;
}

function DemoInfo() { return <section className="panel demo-info"><div className="demo-title"><ShieldCheck size={26} /><div><p className="eyebrow">SAFE, SELF-CONTAINED PREVIEW</p><h2>This is a reduced demonstration of a field-service system.</h2></div></div><p>It shows typical workflows without connecting to a live business system. Projects, contact labels, schedules, inventory counts, and quote amounts are fictional examples.</p><div className="capabilities"><span>Removed: sign-in &amp; user accounts</span><span>Removed: customer database &amp; contact details</span><span>Removed: payment processing &amp; invoices</span><span>Removed: live scheduling, APIs &amp; analytics</span><span>Demonstrable: job flow, scheduling, quotes &amp; inventory</span></div></section>; }
function Card({ n, v }: { n: string; v: string }) { return <article className="card"><p>{n}</p><strong>{v}</strong><span>Sample data</span></article>; }
function List({ jobs, advance }: { jobs: Job[]; advance: (id: number) => void }) { return <div className="list">{jobs.length ? jobs.map((job) => <article className="job" key={job.id}><div className="avatar">{job.name.at(-1)}</div><div><h3>{job.name}</h3><p>{job.work} · {job.crew} · {job.day}</p></div><span className="pill">{job.status}</span><button onClick={() => advance(job.id)} disabled={job.status === "Ready to invoice"}>{job.status === "Ready to invoice" ? "Complete" : "Advance"}</button></article>) : <p>No matching sample records.</p>}</div>; }

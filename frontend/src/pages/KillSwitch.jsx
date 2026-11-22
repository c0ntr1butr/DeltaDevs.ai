import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, PageWrap, StatCard } from "@/components/ui-lib";
import { toast } from "sonner";
import {
  Activity, CheckCircle2, Clock3, Database, RefreshCw,
  RotateCcw, ShieldAlert, ShieldCheck, Siren, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const fmt = (v) => v ? formatDistanceToNow(new Date(v), { addSuffix: true }) : "—";
const pretty = (v) => typeof v === "string" ? v : JSON.stringify(v, null, 2);

function StateBadge({ value }) {
  const key = String(value || "unknown").toLowerCase();
  const styles = {
    active: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    recovered: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    resolved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    applied: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    open: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    revoked: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    quarantined: "border-rose-400/20 bg-rose-400/10 text-rose-200",
    conflict: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    blocked: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  };
  return <span className={`badge border ${styles[key] || "badge-muted"}`}>{key.replaceAll("_", " ")}</span>;
}

function Panel({ title, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`surface rounded-xl overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b hairline flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-display text-base">
          {Icon && <Icon size={15} className="text-cyan-300" />}{title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function KillSwitch() {
  const [overview, setOverview] = useState(null);
  const [agents, setAgents] = useState([]);
  const [changes, setChanges] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastDemo, setLastDemo] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [ov, ag, ch, inc, ev, rs] = await Promise.all([
        api.get("/killswitch/overview"), api.get("/killswitch/agents"),
        api.get("/killswitch/changes"), api.get("/killswitch/incidents"),
        api.get("/killswitch/events"), api.get("/killswitch/resources"),
      ]);
      setOverview(ov.data); setAgents(ag.data); setChanges(ch.data);
      setIncidents(inc.data); setEvents(ev.data); setResources(rs.data);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Could not load Kill Switch data");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const runDemo = async () => {
    setBusy(true); setLastDemo(null);
    try {
      const { data } = await api.post("/killswitch/demo/run");
      setLastDemo(data);
      await load();
      toast.success("Kill Switch simulation completed — selective recovery verified");
    } catch (e) { toast.error(e.response?.data?.detail || "Simulation failed"); }
    finally { setBusy(false); }
  };

  const quarantine = async (agent) => {
    if (!window.confirm(`Quarantine ${agent.name}? New governed actions from this agent will be rejected.`)) return;
    try { await api.post(`/killswitch/agents/${agent.id}/quarantine`); await load(); toast.success("Agent quarantined"); }
    catch (e) { toast.error(e.response?.data?.detail || "Quarantine failed"); }
  };

  const release = async (agent) => {
    if (!window.confirm(`Re-authorize ${agent.name}? Ensure the root cause has been addressed first.`)) return;
    try { await api.post(`/killswitch/agents/${agent.id}/release`); await load(); toast.success("Agent re-authorized"); }
    catch (e) { toast.error(e.response?.data?.detail || "Release failed"); }
  };

  const recover = async (change) => {
    if (!window.confirm(`Recover change ${change.id}? Only fields touched by this change will be reverted. Conflicts will not be overwritten.`)) return;
    try {
      const { data } = await api.post(`/killswitch/changes/${change.id}/recover`);
      if (data.status === "conflict") toast.warning("Recovery conflict — no values overwritten");
      else toast.success(data.status === "already_recovered" ? "Already recovered" : "Selective recovery verified");
      await load();
    } catch (e) { toast.error(e.response?.data?.detail || "Recovery failed"); }
  };

  const resetDemo = async () => {
    setBusy(true);
    try { await api.post("/killswitch/demo/reset"); setLastDemo(null); await load(); toast.success("Demo workspace reset"); }
    catch (e) { toast.error(e.response?.data?.detail || "Reset failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <PageWrap><div className="text-neutral-500 font-mono-plex text-sm">Loading RuntimeOS Kill Switch…</div></PageWrap>;

  return (
    <PageWrap>
      <PageHeader
        eyebrow="RuntimeOS / External governance / Track 3"
        title="The Kill Switch"
        subtitle="Attribute every action. Contain one compromised agent. Recover only its damage while healthy agents keep working."
        right={<>
          <button className="btn-secondary flex items-center gap-2" onClick={load}><RefreshCw size={14}/> Refresh</button>
          <button className="btn-secondary flex items-center gap-2" onClick={resetDemo} disabled={busy}>Reset demo</button>
          <button className="btn-primary flex items-center gap-2" onClick={runDemo} disabled={busy}><Zap size={14}/>{busy ? "Running…" : "Run Kill Switch demo"}</button>
        </>}
      />

      {error && <div className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">Backend error: {error}. Check that the API is running and that the console is connected to the correct backend.</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard label="Registered agents" value={overview?.agents ?? 0} hint={`${overview?.active_agents ?? 0} active`} accent="#7cf5ff" />
        <StatCard label="Quarantined agents" value={overview?.quarantined_agents ?? 0} hint="Isolated identities" accent="#ff7a99" />
        <StatCard label="Journalled changes" value={overview?.actions ?? 0} hint={`${overview?.blocked_actions ?? 0} blocked / flagged`} accent="#a78bfa" />
        <StatCard label="Recovered changes" value={overview?.recovered ?? 0} hint={`${overview?.open_incidents ?? 0} open incidents`} accent="#6ee7b7" />
      </div>

      {lastDemo && <div className="surface rounded-xl p-5 mb-5 border border-emerald-400/30">
        <div className="flex items-center gap-2 text-emerald-300 font-display text-lg"><CheckCircle2 size={18}/> Demo completed</div>
        <p className="text-sm text-neutral-300 mt-2">The compromised Finance Agent was quarantined and its committed test mutation was selectively recovered. Research and inventory work was preserved.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-black/20 rounded-lg p-3"><div className="text-[10px] text-neutral-500 uppercase">Supplier</div><div className="text-sm mt-1">{lastDemo.preservation_check?.supplier_name}</div><div className="text-xs text-neutral-500 mt-1">Bank field restored: {lastDemo.preservation_check?.supplier_bank_account}</div></div>
          <div className="bg-black/20 rounded-lg p-3"><div className="text-[10px] text-neutral-500 uppercase">Inventory</div><div className="text-2xl text-cyan-200 mt-1">{lastDemo.preservation_check?.inventory_quantity}</div><div className="text-xs text-neutral-500">Legitimate stock update preserved</div></div>
          <div className="bg-black/20 rounded-lg p-3"><div className="text-[10px] text-neutral-500 uppercase">Recovery result</div><div className="text-sm mt-1 capitalize text-emerald-300">{lastDemo.recovery?.status}</div><div className="text-xs text-neutral-500 mt-1">Healthy agents active: {String(lastDemo.preservation_check?.healthy_agents_active)}</div></div>
        </div>
      </div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <Panel title="Agent registry" icon={ShieldCheck} action={<span className="text-[10px] text-neutral-500 font-mono-plex">TENANT SCOPED</span>}>
          <div className="divide-y divide-white/[0.06]">
            {agents.length === 0 && <div className="p-6 text-sm text-neutral-500">No registered agents. Add agents in the Agents module or run the demo.</div>}
            {agents.map((a) => {
              const quarantined = !!a.kill_switch_quarantined;
              return <div className="p-4 flex items-center gap-3" key={a.id}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${quarantined ? "bg-rose-400/10 text-rose-300" : "bg-cyan-400/10 text-cyan-300"}`}><Activity size={16}/></div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{a.name}</div><div className="text-[11px] text-neutral-500 font-mono-plex truncate">{a.id} · {a.framework || "custom"}</div><div className="text-[11px] text-neutral-600 mt-1">{a.description || a.purpose || "Registered agent"}</div></div>
                <div className="flex flex-col items-end gap-2"><StateBadge value={quarantined ? "quarantined" : a.status}/>{quarantined ? <button className="btn-secondary text-[10px]" onClick={() => release(a)}>Re-authorize</button> : <button className="btn-secondary text-[10px] text-rose-300" onClick={() => quarantine(a)}>Quarantine</button>}</div>
              </div>;
            })}
          </div>
        </Panel>

        <Panel title="Incident center" icon={Siren}>
          <div className="divide-y divide-white/[0.06] max-h-[390px] overflow-auto">
            {incidents.length === 0 && <div className="p-6 text-sm text-neutral-500">No incidents. Run the simulation to create a controlled prompt-injection incident.</div>}
            {incidents.map((i) => <div key={i.id} className="p-4">
              <div className="flex items-start justify-between gap-3"><div className="text-sm font-medium">{i.title}</div><StateBadge value={i.status}/></div>
              <div className="text-[11px] text-neutral-500 mt-2 font-mono-plex">{i.agent_name || i.agent_id} · {i.resource} · {fmt(i.created_at)}</div>
              <div className="text-[11px] text-neutral-400 mt-2">Detection: {i.detection || "runtime monitor"} · Severity: {i.severity}</div>
              {i.change_id && <div className="text-[11px] text-neutral-500 mt-1">Related change: {i.change_id}</div>}
            </div>)}
          </div>
        </Panel>
      </div>

      <Panel title="Change journal & selective recovery" icon={Database} className="mb-4" action={<span className="text-[10px] text-neutral-500">BEFORE / AFTER · VERSION CHECKED</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]"><thead className="text-neutral-500 uppercase tracking-wider border-b hairline"><tr><th className="p-3">Agent / Run</th><th className="p-3">Resource</th><th className="p-3">Changed fields</th><th className="p-3">Decision</th><th className="p-3">Recovery</th><th className="p-3">Action</th></tr></thead>
            <tbody>{changes.map((c) => <tr key={c.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]"><td className="p-3"><div className="text-neutral-200">{c.agent_id}</div><div className="text-neutral-600 mt-1">{c.run_id}</div><div className="text-neutral-600 mt-1">{fmt(c.created_at)}</div></td><td className="p-3 font-mono-plex">{c.resource}</td><td className="p-3"><div>{Object.keys(c.patch || {}).join(", ")}</div><details className="mt-1 text-neutral-500"><summary className="cursor-pointer">Inspect before / after</summary><pre className="whitespace-pre-wrap mt-2 bg-black/30 rounded p-2">Before: {pretty(c.before_data)}{"\n"}After: {pretty(c.after_data)}</pre></details></td><td className="p-3"><StateBadge value={c.decision}/><div className="text-neutral-600 mt-1">risk {c.risk_score ?? "—"}</div></td><td className="p-3"><StateBadge value={c.status}/>{c.recovery_conflicts?.length > 0 && <div className="text-amber-300 mt-1">Conflict: {c.recovery_conflicts.join(", ")}</div>}</td><td className="p-3">{c.status === "applied" ? <button className="btn-secondary flex items-center gap-1" onClick={() => recover(c)}><RotateCcw size={12}/> Recover</button> : <span className="text-neutral-600">—</span>}</td></tr>)}
              {changes.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-neutral-500">No changes journalled yet.</td></tr>}</tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Protected resource state" icon={Database}>
          <div className="divide-y divide-white/[0.06]">{resources.map((r) => <div key={r.resource} className="p-4"><div className="flex justify-between gap-3"><span className="text-sm font-mono-plex">{r.resource}</span><span className="text-[10px] text-neutral-500">v{r.version}</span></div><pre className="text-[11px] text-neutral-400 whitespace-pre-wrap mt-2 bg-black/20 rounded-lg p-3">{pretty(r.data)}</pre></div>)}{resources.length===0 && <div className="p-5 text-sm text-neutral-500">No protected resources yet. Run the demo.</div>}</div>
        </Panel>
        <Panel title="Runtime event timeline" icon={Clock3}>
          <div className="divide-y divide-white/[0.06] max-h-[380px] overflow-auto">{events.map((e) => <div key={e.id} className="p-3 flex gap-3"><div className="mt-1 w-2 h-2 rounded-full bg-cyan-300 shrink-0"/><div className="min-w-0"><div className="text-xs font-medium">{e.event}</div><div className="text-[11px] text-neutral-500 mt-1">{e.actor} · {fmt(e.created_at)}</div><div className="text-[11px] text-neutral-400 mt-1 break-words">{pretty(e.details)}</div></div></div>)}{events.length===0 && <div className="p-5 text-sm text-neutral-500">No runtime events yet.</div>}</div>
        </Panel>
      </div>
      <div className="mt-5 flex items-start gap-2 text-[11px] text-neutral-500 leading-relaxed"><ShieldAlert size={14} className="text-amber-300 shrink-0 mt-0.5"/>The demo uses tenant-scoped synthetic resources. The pre-execution gate blocks sensitive fields; the dedicated attack simulation demonstrates a committed sandbox mutation followed by agent quarantine and version-aware compensation. Irreversible external side effects require provider-specific compensation or human review.</div>
    </PageWrap>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Users, Settings, MapPin, Footprints, ChevronRight, Download } from "lucide-react";

const DEFAULT_MILESTONES = [
  { id: "mtl", name: "Montréal (départ)", distance: 0 },
  { id: "qd", name: "Québec", distance: 250 },
  { id: "rimuski", name: "Rimouski", distance: 540 },
  { id: "matane", name: "Matane", distance: 630 },
  { id: "ste-anne", name: "Ste-Anne-des-Monts", distance: 720 },
  { id: "gaspe", name: "Gaspé", distance: 930 },
  { id: "iles", name: "Îles-de-la-Madeleine (arrivée)", distance: 1200 },
];

const DEFAULT_GROUP = {
  name: "Famille & amis",
  milestones: DEFAULT_MILESTONES,
  members: {},
};

const LS_KEY = "km-ensemble:v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { groups: { [DEFAULT_GROUP.name]: DEFAULT_GROUP } };
    return JSON.parse(raw);
  } catch {
    return { groups: { [DEFAULT_GROUP.name]: DEFAULT_GROUP } };
  }
}
function saveState(state) { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);

// UI atoms
function Card({ children, className = "" }) {
  return <div className={`bg-white/80 backdrop-blur shadow-sm rounded-2xl p-4 ${className}`}>{children}</div>;
}
function Button({ children, onClick, className = "", type = "button" }) {
  return (
    <button type={type} onClick={onClick}
      className={`px-4 py-2 rounded-2xl shadow-sm border border-neutral-200 hover:shadow transition active:scale-[0.99] ${className}`}>
      {children}
    </button>
  );
}
function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition w-full sm:w-auto justify-center ${
        active ? "bg-black text-white border-black" : "bg-white border-neutral-200 hover:bg-neutral-50"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

export default function App() {
  const [state, setState] = useState(loadState());
  const [activeTab, setActiveTab] = useState("log");
  const [currentGroup, setCurrentGroup] = useState(DEFAULT_GROUP.name);
  const [username, setUsername] = useState(localStorage.getItem("km-ensemble:username") || "");
  useEffect(() => saveState(state), [state]);
  useEffect(() => localStorage.setItem("km-ensemble:username", username), [username]);

  const groups = Object.keys(state.groups);
  const group = state.groups[currentGroup];

  // entries + totals
  const { entries, perUserTotals, groupTotal } = useMemo(() => {
    const entries = [];
    const perUserTotals = {};
    if (group?.members) {
      for (const [name, data] of Object.entries(group.members)) {
        const total = (data.entries || []).reduce((s, e) => s + Number(e.km || 0), 0);
        perUserTotals[name] = total;
        for (const e of data.entries || []) entries.push({ ...e, name });
      }
    }
    entries.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    const groupTotal = Object.values(perUserTotals).reduce((s, v) => s + v, 0);
    return { entries, perUserTotals, groupTotal };
  }, [group]);

  const nextMilestone = useMemo(() => {
    if (!group?.milestones?.length) return null;
    const sorted = [...group.milestones].sort((a, b) => a.distance - b.distance);
    let next = sorted[sorted.length - 1];
    for (const m of sorted) { if (groupTotal < m.distance) { next = m; break; } }
    return next;
  }, [group?.milestones, groupTotal]);

  // actions
  function ensureMember(name) {
    if (!name) return;
    setState(prev => {
      const g = prev.groups[currentGroup];
      if (!g.members[name]) g.members[name] = { entries: [] };
      return { ...prev, groups: { ...prev.groups, [currentGroup]: { ...g } } };
    });
  }
  function addEntry({ km, dateISO, note }) {
    if (!username) return alert("Entre ton prénom d'abord.");
    if (!km || km <= 0) return alert("Entre un nombre de kilomètres valide.");
    ensureMember(username);
    setState(prev => {
      const g = { ...prev.groups[currentGroup] };
      const member = g.members[username] || { entries: [] };
      const entry = { id: uid(), km: Number(km), dateISO: dateISO || todayISO(), note: note?.trim() };
      member.entries = [entry, ...(member.entries || [])];
      g.members[username] = member;
      return { ...prev, groups: { ...prev.groups, [currentGroup]: g } };
    });
  }
  function removeEntry(id, name) {
    setState(prev => {
      const g = { ...prev.groups[currentGroup] };
      const m = g.members[name]; if (!m) return prev;
      m.entries = (m.entries || []).filter(e => e.id !== id);
      g.members[name] = m;
      return { ...prev, groups: { ...prev.groups, [currentGroup]: g } };
    });
  }
  function updateMilestones(list) {
    setState(prev => {
      const g = { ...prev.groups[currentGroup], milestones: list };
      return { ...prev, groups: { ...prev.groups, [currentGroup]: g } };
    });
  }
  function resetGroup() {
    if (!confirm("Réinitialiser le groupe? (toutes les entrées seront effacées)")) return;
    setState(prev => {
      const g = { ...prev.groups[currentGroup], members: {} };
      return { ...prev, groups: { ...prev.groups, [currentGroup]: g } };
    });
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-900">
      <div className="max-w-xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="w-10 h-10 rounded-2xl bg-black text-white grid place-items-center font-bold">KM</div>
            </motion.div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">Kilomètres Ensemble</h1>
              <p className="text-sm text-neutral-500">Suivi simple & joli pour ~20 personnes</p>
            </div>
          </div>
          <div className="text-xs text-neutral-500">Prototype</div>
        </div>

        <Card className="mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Groupe</label>
              <select className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white"
                value={currentGroup} onChange={e => setCurrentGroup(e.target.value)}>
                {Object.keys(state.groups).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-1/2">
              <label className="text-xs text-neutral-500">Ton prénom</label>
              <input className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200"
                placeholder="ex. Keven" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <TabButton active={activeTab === "log"} icon={Footprints} label="Ajouter" onClick={() => setActiveTab("log")} />
          <TabButton active={activeTab === "board"} icon={Trophy} label="Classement" onClick={() => setActiveTab("board")} />
          <TabButton active={activeTab === "progress"} icon={MapPin} label="Parcours" onClick={() => setActiveTab("progress")} />
          <TabButton active={activeTab === "admin"} icon={Settings} label="Admin" onClick={() => setActiveTab("admin")} />
        </div>

        {activeTab === "log" && <LogTab addEntry={addEntry} entries={entries} removeEntry={removeEntry} />}
        {activeTab === "board" && <BoardTab perUserTotals={perUserTotals} groupTotal={groupTotal} />}
        {activeTab === "progress" && <ProgressTab milestones={group.milestones} groupTotal={groupTotal} nextMilestone={nextMilestone} />}
        {activeTab === "admin" && <AdminTab milestones={group.milestones} updateMilestones={updateMilestones} resetGroup={resetGroup} />}
      </div>
    </div>
  );
}

// --- Tabs ---
function LogTab({ addEntry, entries, removeEntry }) {
  const [km, setKm] = useState(3);
  const [dateISO, setDateISO] = useState(todayISO());
  const [note, setNote] = useState("");

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-neutral-500">Kilomètres</label>
            <input type="number" min="0" step="0.1" value={km}
              onChange={e => setKm(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200" />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Date</label>
            <input type="date" value={dateISO}
              onChange={e => setDateISO(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200" />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-neutral-500">Note (optionnel)</label>
          <input value={note} onChange={e => setNote(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200" placeholder="ex. marche du soir"/>
        </div>
        <div className="mt-3 flex gap-2">
          <Button className="bg-black text-white" onClick={() => { addEntry({ km: Number(km), dateISO, note }); setNote(""); }}>Ajouter</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4"/><span className="font-medium">Historique</span></div>
        {entries.length === 0 && <p className="text-sm text-neutral-500">Aucune entrée pour l'instant.</p>}
        <ul className="divide-y">
          {entries.map(e => (
            <li key={e.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{e.name} <span className="text-neutral-400 font-normal">· {Number(e.km).toFixed(1)} km</span></div>
                <div className="text-xs text-neutral-500">{e.dateISO} {e.note ? `· ${e.note}` : ""}</div>
              </div>
              <button onClick={() => removeEntry(e.id, e.name)} className="text-xs text-neutral-400 hover:text-red-600">Supprimer</button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function BoardTab({ perUserTotals, groupTotal }) {
  const sorted = Object.entries(perUserTotals).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-2"><Trophy className="w-4 h-4"/><span className="font-medium">Classement</span></div>
        {sorted.length === 0 && <p className="text-sm text-neutral-500">Aucun participant n'a encore enregistré de kilomètres.</p>}
        <ul className="divide-y">
          {sorted.map(([name, total], idx) => (
            <li key={name} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full grid place-items-center border text-sm">{idx + 1}</div>
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-neutral-500">{total.toFixed(1)} km cumulés</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <div className="text-sm text-neutral-500">Total du groupe</div>
        <div className="text-3xl font-bold mt-1">{groupTotal.toFixed(1)} km</div>
      </Card>
    </div>
  );
}

function ProgressTab({ milestones, groupTotal, nextMilestone }) {
  const sorted = [...milestones].sort((a, b) => a.distance - b.distance);
  const max = sorted[sorted.length - 1]?.distance || 1;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4"/><span className="font-medium">Parcours</span></div>
        <div className="flex items-center justify-between text-sm">
          <span>{sorted[0]?.name}</span>
          <span className="text-neutral-500">{groupTotal.toFixed(1)} / {max} km</span>
          <span>{sorted[sorted.length-1]?.name}</span>
        </div>
        <div className="mt-2 h-3 bg-neutral-200 rounded-full overflow-hidden">
          <div className="h-full bg-black" style={{ width: `${(groupTotal / max) * 100}%` }} />
        </div>
        {nextMilestone && (
          <div className="mt-3 text-sm flex items-center gap-2">
            <ChevronRight className="w-4 h-4"/>
            Prochain arrêt: <span className="font-medium">{nextMilestone.name}</span> dans {Math.max(0, nextMilestone.distance - groupTotal).toFixed(1)} km
          </div>
        )}
      </Card>
      <Card>
        <div className="text-sm font-medium mb-2">Étapes</div>
        <ul className="divide-y">
          {sorted.map(m => (
            <li key={m.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-neutral-500">{m.distance} km</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${groupTotal >= m.distance ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>
                {groupTotal >= m.distance ? "Atteint" : "À venir"}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function AdminTab({ milestones, updateMilestones, resetGroup }) {
  const [local, setLocal] = useState(milestones);
  useEffect(() => setLocal(milestones), [milestones]);

  function addMilestone() {
    setLocal(prev => [...prev, { id: uid(), name: "Nouvelle étape", distance: (prev.at(-1)?.distance || 0) + 50 }]);
  }
  function onSave() {
    const clean = [...local]
      .map(m => ({ ...m, name: (m.name || "").trim() }))
      .filter(m => m.name && !Number.isNaN(Number(m.distance)))
      .map(m => ({ ...m, distance: Number(m.distance) }))
      .sort((a, b) => a.distance - b.distance);
    updateMilestones(clean);
    alert("Étapes mises à jour ✅");
  }
  function exportData() {
    const raw = localStorage.getItem(LS_KEY) || "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "kilometres-ensemble-data.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function importData(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        localStorage.setItem(LS_KEY, JSON.stringify(obj));
        location.reload();
      } catch { alert("Fichier invalide"); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-3"><Settings className="w-4 h-4"/><span className="font-medium">Gestion des étapes</span></div>
        <div className="space-y-2">
          {local.map((m) => (
            <div key={m.id} className="grid grid-cols-5 gap-2 items-center">
              <input className="col-span-3 px-3 py-2 rounded-xl border border-neutral-200"
                     value={m.name} onChange={e => setLocal(arr => arr.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))}/>
              <input type="number" className="col-span-1 px-3 py-2 rounded-xl border border-neutral-200"
                     value={m.distance} onChange={e => setLocal(arr => arr.map(x => x.id === m.id ? { ...x, distance: e.target.value } : x))}/>
              <button className="text-xs text-neutral-500" onClick={() => setLocal(arr => arr.filter(x => x.id !== m.id))}>Supprimer</button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={addMilestone}><Plus className="w-4 h-4 mr-1"/> Ajouter une étape</Button>
            <Button className="bg-black text-white" onClick={onSave}>Enregistrer</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="font-medium mb-2">Sauvegarde</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={exportData}><Download className="w-4 h-4 mr-1"/>Exporter</Button>
          <label className="px-4 py-2 rounded-2xl shadow-sm border border-neutral-200 bg-white hover:shadow cursor-pointer">
            Importer JSON
            <input type="file" accept="application/json" onChange={importData} className="hidden" />
          </label>
          <Button className="text-red-600 border-red-600" onClick={resetGroup}>Réinitialiser le groupe</Button>
        </div>
      </Card>
    </div>
  );
}

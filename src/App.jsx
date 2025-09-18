import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Users, Settings, MapPin, Footprints, ChevronRight, Download } from "lucide-react";
import { db, ensureAuth } from "./firebase";
import {
  doc, setDoc, getDoc, onSnapshot,
  collection, getDocs, deleteDoc
} from "firebase/firestore";

const DEFAULT_MILESTONES = [
  { id: "mtl", name: "Montréal (départ)", distance: 0 },
  { id: "qc", name: "Québec", distance: 317 },
  { id: "rdl", name: "Rivière-du-loup", distance: 525 },
  { id: "fre", name: "Frédéricton", distance: 913 },
  { id: "mon", name: "Moncton", distance: 1089 },
  { id: "cht", name: "Charlottetown", distance: 1254 },
  { id: "srs", name: "Charlottetown - Souris", distance: 1334 },
  { id: "iles", name: "Souris - Îles-de-la-Madeleine (arrivée)", distance: 1487 },
];

const LS_USER = "km-ensemble:username";
const DEFAULT_GROUP_ID = "MTL_ILES"; // tu peux créer d'autres groupes avec d'autres IDs

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

// ---- Firestore helpers (structure: groups/{groupId} + subcollection members/{username})
async function ensureGroupDoc(groupId) {
  const gref = doc(db, "groups", groupId);
  const snap = await getDoc(gref);
  if (!snap.exists()) { 
    await ensureAuth(); // ✅
    await setDoc(gref, { milestones: DEFAULT_MILESTONES, createdAt: Date.now() }, { merge: true });
  }
}
async function setMemberEntries(groupId, username, entries) {
  await ensureAuth(); // ✅
  const mref = doc(db, "groups", groupId, "members", username);
  await setDoc(mref, { entries, updatedAt: Date.now() }, { merge: true });
}
async function getMemberEntries(groupId, username) {
  const mref = doc(db, "groups", groupId, "members", username);
  const s = await getDoc(mref);
  return s.exists() ? (s.data().entries || []) : [];
}
async function updateGroupMilestones(groupId, list) {
  await ensureAuth(); // ✅
  const gref = doc(db, "groups", groupId);
  await setDoc(gref, { milestones: list, updatedAt: Date.now() }, { merge: true });
}
async function deleteAllMembers(groupId) {
  await ensureAuth(); // ✅
  const q = await getDocs(collection(db, "groups", groupId, "members"));
  const ops = [];
  q.forEach((d) => ops.push(deleteDoc(d.ref)));
  await Promise.all(ops);
}

export default function App() {
  const [activeTab, setActiveTab] = useState("log");
  const [currentGroup, setCurrentGroup] = useState(DEFAULT_GROUP_ID);
  const [username, setUsername] = useState(localStorage.getItem(LS_USER) || "");
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [members, setMembers] = useState({}); // { [name]: { entries: [...] } }

  // Auth anonyme + abonnements Firestore

 const unsubGroupRef = useRef(null);
const unsubMembersRef = useRef(null);

useEffect(() => {
  let alive = true;
  (async () => {
    // ✅ attendre la connexion anonyme avant tout
    await ensureAuth();

    // s'assurer que le doc du groupe existe
    await ensureGroupDoc(currentGroup);

    // écouter le doc groupe (milestones)
    if (unsubGroupRef.current) unsubGroupRef.current();
    if (!alive) return;
    unsubGroupRef.current = onSnapshot(doc(db, "groups", currentGroup), (snap) => {
      const data = snap.data() || {};
      setMilestones(Array.isArray(data.milestones) && data.milestones.length ? data.milestones : DEFAULT_MILESTONES);
    });

    // écouter les membres
    if (unsubMembersRef.current) unsubMembersRef.current();
    if (!alive) return;
    unsubMembersRef.current = onSnapshot(collection(db, "groups", currentGroup, "members"), (qs) => {
      const obj = {};
      qs.forEach((d) => { obj[d.id] = { entries: d.data()?.entries || [] }; });
      setMembers(obj);
    });
  })();

  return () => {
    alive = false;
    if (unsubGroupRef.current) unsubGroupRef.current();
    if (unsubMembersRef.current) unsubMembersRef.current();
  };
}, [currentGroup]);

  // Dérivés
  const { entries, perUserTotals, groupTotal } = useMemo(() => {
    const entries = [];
    const perUserTotals = {};
    for (const [name, data] of Object.entries(members || {})) {
      const total = (data.entries || []).reduce((s, e) => s + Number(e.km || 0), 0);
      perUserTotals[name] = total;
      for (const e of data.entries || []) entries.push({ ...e, name });
    }
    entries.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    const groupTotal = Object.values(perUserTotals).reduce((s, v) => s + v, 0);
    return { entries, perUserTotals, groupTotal };
  }, [members]);

  const nextMilestone = useMemo(() => {
    const list = milestones || [];
    if (!list.length) return null;
    for (const m of list) {
      if (groupTotal < Number(m.distance || 0)) return m;
    }
    return list[list.length - 1];
  }, [milestones, groupTotal]);

  // Actions
  
async function removeEntry(id, name) {
  await ensureAuth();
  const cur = await getMemberEntries(currentGroup, name);
  await setMemberEntries(currentGroup, name, cur.filter(e => e.id !== id));
}

async function updateMilestonesAction(list) {
  await ensureAuth();
  await updateGroupMilestones(currentGroup, list);
}

async function resetGroup() {
  await ensureAuth();
  if (!confirm("Réinitialiser le groupe? (toutes les entrées seront effacées)")) return;
  await deleteAllMembers(currentGroup);
}
  async function addEntry({ km, dateISO, note }) {
  if (!username) return alert("Entre ton prénom d'abord.");
  if (!km || km <= 0) return alert("Entre un nombre de kilomètres valide.");

  // ⚠️ s’assurer d’être connecté en anonyme avant d’écrire
  await ensureAuth ();

  const cur = await getMemberEntries(currentGroup, username);
  const entry = {
    id: Math.random().toString(36).slice(2, 9),
    km: Number(km),
    dateISO: dateISO || new Date().toISOString().slice(0, 10),
    note: note?.trim(),
  };
  await setMemberEntries(currentGroup, username, [entry, ...cur]);
}
  // UI
  const groups = [DEFAULT_GROUP_ID]; // tu peux étendre si besoin
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-900">
      <div className="max-w-xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="w-10 h-10 rounded-2xl bg-black text-white grid place-items-center font-bold">LM</div>
            </motion.div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">Les motivés</h1>
              <p className="text-sm text-neutral-500">Synchro temps réel (Firestore)</p>
            </div>
          </div>
          <div className="text-xs text-neutral-500">{currentGroup}</div>
        </div>

        <Card className="mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-neutral-500">Groupe</label>
              <select className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 bg-white"
                value={currentGroup} onChange={e => setCurrentGroup(e.target.value)}>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
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
        {activeTab === "progress" && <ProgressTab milestones={milestones} groupTotal={groupTotal} nextMilestone={nextMilestone} />}
        {activeTab === "admin" && <AdminTab milestones={milestones} updateMilestones={updateMilestonesAction} resetGroup={resetGroup} />}
      </div>
    </div>
  );
}

// ---- Tabs
function LogTab({ addEntry, entries, removeEntry }) {
  const [km, setKm] = useState(3);
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0,10));
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
  const list = milestones || [];
  const max = list.at(-1)?.distance || 1;
  const startName = list[0]?.name ?? "Départ";
  const endName = list.at(-1)?.name ?? "Arrivée";
  const pct = Math.max(0, Math.min(100, (groupTotal / max) * 100));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4" /><span className="font-medium">Parcours</span></div>
        <div className="flex items-center justify-between text-sm">
          <span>{startName}</span>
          <span className="text-neutral-500">{groupTotal.toFixed(1)} / {max} km</span>
          <span>{endName}</span>
        </div>

        {/* Barre + jalons */}
        <div className="relative mt-2">
          <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full bg-black" style={{ width: `${pct}%` }} />
          </div>
          {list.map((m, idx) => {
            const left = (Number(m.distance) / max) * 100;
            const reached = groupTotal >= Number(m.distance);
            return (
              <div key={m.id} className="absolute top-1/2 -translate-y-1/2"
                   style={{ left: `${left}%`, transform: "translate(-50%, -50%)" }}
                   title={`${idx + 1}. ${m.name} • ${m.distance} km`}>
                <div className={`w-2 h-2 rounded-full border border-white ${reached ? "bg-black" : "bg-neutral-300"}`} />
              </div>
            );
          })}
        </div>
        <div className="relative mt-1 h-4 text-[10px] text-neutral-500">
          {list.map((m) => {
            const left = (Number(m.distance) / max) * 100;
            return <div key={`lab-${m.id}`} className="absolute -translate-x-1/2" style={{ left: `${left}%` }}>{m.distance} km</div>;
          })}
        </div>

        {nextMilestone && (
          <div className="mt-3 text-sm flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Prochain arrêt: <span className="font-medium">{nextMilestone.name}</span>
            dans {Math.max(0, (nextMilestone.distance ?? 0) - groupTotal).toFixed(1)} km
          </div>
        )}
      </Card>

      <Card>
        <div className="text-sm font-medium mb-2">Étapes</div>
        <ul className="divide-y">
          {list.map((m, idx) => {
            const prev = list[idx - 1];
            const segment = idx === 0 ? 0 : Math.max(0, Number(m.distance) - Number(prev?.distance || 0));
            return (
              <li key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{idx + 1}. {m.name}</div>
                  <div className="text-xs text-neutral-500">{segment} km segment · {m.distance} km cumulés</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  groupTotal >= (m.distance ?? 0) ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                }`}>
                  {groupTotal >= (m.distance ?? 0) ? "Atteint" : "À venir"}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
function AdminTab({ milestones, updateMilestones, resetGroup }) {
  const onChangeDistance = (i, v) => {
    const list = [...milestones];
    list[i] = { ...list[i], distance: Number(v) || 0 };
    updateMilestones(list);
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const list = [...milestones];
    const [x] = list.splice(i, 1);
    list.splice(i - 1, 0, x);
    updateMilestones(list);
  };

  const moveDown = (i) => {
    if (i === milestones.length - 1) return;
    const list = [...milestones];
    const [x] = list.splice(i, 1);
    list.splice(i + 1, 0, x);
    updateMilestones(list);
  };

  const remove = (i) => {
    const list = [...milestones];
    list.splice(i, 1);
    updateMilestones(list);
  };

  const addSeg = () => {
    const list = [
      ...milestones,
      { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), distance: 0 },
    ];
    updateMilestones(list);
  };

  const total = milestones.reduce((s, m) => s + Number(m.distance || 0), 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Étapes (ordre du parcours)</div>
        <div className="text-sm text-neutral-500">{total} km au total</div>
      </div>

      <div className="space-y-3">
        {milestones.map((seg, i) => {
          const cumulativeKm = milestones
            .slice(0, i + 1)
            .reduce((s, m) => s + Number(m.distance || 0), 0);

          return (
            <div key={seg.id || i} className="flex items-start gap-3 py-1">
              <div className="flex-1">
                <label className="text-xs text-neutral-500">
  {i === 0
    ? "Départ"
    : <>Segment vers <span className="font-medium">{seg.name || `Étape ${i + 1}`}</span></>}
</label>

                <div className="relative">
                  {/* on réserve de la place à droite dès md */}
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-neutral-200 md:pr-28"
                    value={Number(seg.distance || 0)}
                    onChange={(e) => onChangeDistance(i, e.target.value)}
                  />

                  {/* mobile: dessous ; ≥ md : à droite sans chevauchement */}
                  <span
                    className="
                      block mt-1 text-xs text-neutral-500 whitespace-nowrap
                      md:mt-0 md:absolute md:right-3 md:top-1/2 md:-translate-y-1/2
                      md:bg-white md:px-1
                    "
                  >
                    {cumulativeKm} km cumulés
                  </span>
                </div>
              </div>

              <div className="flex gap-1 self-center pt-7 md:pt-0">
                <button
                  className="px-2 py-1 rounded border border-neutral-300"
                  onClick={() => moveUp(i)}
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  className="px-2 py-1 rounded border border-neutral-300"
                  onClick={() => moveDown(i)}
                  title="Descendre"
                >
                  ↓
                </button>
                <button
                  className="px-2 py-1 rounded border border-red-300 text-red-600"
                  onClick={() => remove(i)}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 rounded-xl border" onClick={addSeg}>
          Ajouter un segment
        </button>
        <button
          className="ml-auto px-3 py-2 rounded-xl border border-red-300 text-red-600"
          onClick={resetGroup}
        >
          Réinitialiser le groupe
        </button>
      </div>
    </Card>
  );
}

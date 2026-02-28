import { useState, useEffect } from "react";
import axios from "axios";
import DomainGrid from "./components/DomainGrid";
import DiffGrid from "./components/DiffGrid";
import DomainHistoryModal from "./components/DomainHistoryModal";
import ScraperPanel from "./components/ScraperPanel";
import { Database, ArrowRightLeft, History, Activity, Trash2 } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

interface Snapshot {
  id: number;
  name: string;
  created_at: string;
  row_count: number;
}

function App() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "diff" | "scraper">("browse");

  // Browse State
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);

  // Diff State
  const [snapshotA, setSnapshotA] = useState<number | null>(null);
  const [snapshotB, setSnapshotB] = useState<number | null>(null);

  // History State
  const [historyDomain, setHistoryDomain] = useState<{ id: number, name: string } | null>(null);

  useEffect(() => {
    if (activeTab === "browse" || activeTab === "diff") {
      fetchSnapshots();
    }
  }, [activeTab]);

  const fetchSnapshots = async (deletedId?: number) => {
    try {
      const res = await axios.get(`${API_BASE}/snapshots`);
      const snaps = res.data.snapshots as Snapshot[];
      setSnapshots(snaps);
      if (snaps.length > 0) {
        setSelectedSnapshot(prev => (prev === deletedId || !prev) ? snaps[0].id : prev);
        setSnapshotB(prev => (prev === deletedId || !prev) ? snaps[0].id : prev);
        setSnapshotA(prev => (prev === deletedId || !prev) ? (snaps.length > 1 ? snaps[1].id : snaps[0].id) : prev);
      } else {
        setSelectedSnapshot(null);
        setSnapshotA(null);
        setSnapshotB(null);
      }
    } catch (error) {
      console.error("Failed to fetch snapshots", error);
    }
  };

  const handleDeleteSnapshot = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the snapshot "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/snapshots/${id}`);
      await fetchSnapshots(id);
    } catch (error) {
      console.error("Failed to delete snapshot", error);
      alert("Failed to delete snapshot.");
    }
  };

  return (
    <div className="h-screen w-full bg-gray-50 text-gray-900 font-sans flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800">
            HugeDomains Tracker
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "browse"
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            Browse Domains
          </button>
          <button
            onClick={() => setActiveTab("diff")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "diff"
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <History className="w-4 h-4" />
            Changes Overview
          </button>
          <button
            onClick={() => setActiveTab("scraper")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "scraper"
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            <Activity className="w-4 h-4" />
            Live Scraper
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col min-h-0">
        {activeTab === "scraper" && (
          <ScraperPanel />
        )}
        {activeTab === "browse" && (
          <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
              <label className="text-sm font-medium text-gray-700">Select Snapshot:</label>
              <div className="flex items-center gap-2">
                <select
                  title="snapshot_select"
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[200px]"
                  value={selectedSnapshot || ""}
                  onChange={(e) => setSelectedSnapshot(Number(e.target.value))}
                >
                  {snapshots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.row_count.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
                {selectedSnapshot && (
                  <button
                    onClick={() => {
                      const snap = snapshots.find(s => s.id === selectedSnapshot);
                      if (snap) handleDeleteSnapshot(snap.id, snap.name);
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              {selectedSnapshot ? (
                <div className="absolute inset-0">
                  <DomainGrid snapshotId={selectedSnapshot} onOpenHistory={(id: number, name: string) => setHistoryDomain({ id, name })} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Select a snapshot to browse domains
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "diff" && (
          <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Old (A):</label>
                <select
                  title="snapshot_A"
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                  value={snapshotA || ""}
                  onChange={(e) => setSnapshotA(Number(e.target.value))}
                >
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <ArrowRightLeft className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">New (B):</label>
                <select
                  title="snapshot_B"
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                  value={snapshotB || ""}
                  onChange={(e) => setSnapshotB(Number(e.target.value))}
                >
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              {snapshotA && snapshotB ? (
                <div className="absolute inset-0">
                  <DiffGrid snapshotA={snapshotA} snapshotB={snapshotB} onOpenHistory={(id: number, name: string) => setHistoryDomain({ id, name })} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Select two snapshots to compare
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {historyDomain && (
        <DomainHistoryModal
          domainId={historyDomain.id}
          domainName={historyDomain.name}
          onClose={() => setHistoryDomain(null)}
        />
      )}
    </div>
  );
}

export default App;

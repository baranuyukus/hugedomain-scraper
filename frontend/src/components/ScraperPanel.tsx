import { useState, useEffect } from "react";
import axios from "axios";
import { Play, Square, Activity, Database, RefreshCw } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

const ScraperPanel = () => {
    const [status, setStatus] = useState<any>(null);
    const [snapshotName, setSnapshotName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/scrape/status`);
            setStatus(res.data);
            setError("");
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const startScraper = async () => {
        if (!snapshotName) {
            setError("Please enter a snapshot name");
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/scrape/start`, null, {
                params: { snapshot_name: snapshotName }
            });
            setSnapshotName("");
            fetchStatus();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    const stopScraper = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/scrape/stop`);
            fetchStatus();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!status) return (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    const isRunning = status.is_running;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold gap-2 flex items-center text-gray-900">
                                <Activity className="w-6 h-6 text-indigo-500" />
                                Live Scraper Engine
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">Directly extract and stream HugeDomains data into your local database.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            </span>
                            <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                                {status.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center justify-between">
                            <span>{error}</span>
                            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600"><Square className="w-4 h-4" /></button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Control Panel */}
                        <div className="space-y-4">
                            {!isRunning ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Snapshot Name</label>
                                        <input
                                            type="text"
                                            value={snapshotName}
                                            onChange={(e) => setSnapshotName(e.target.value)}
                                            placeholder="e.g. March 2026 Full Scan"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={startScraper}
                                        disabled={loading || !snapshotName}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        <Play className="w-4 h-4" />
                                        Launch Scraper
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
                                        <div className="text-sm text-indigo-600 font-medium tracking-wide uppercase">Active Snapshot</div>
                                        <div className="font-bold text-lg text-indigo-900">{status.snapshot_name}</div>
                                    </div>
                                    <button
                                        onClick={stopScraper}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        <Square className="w-4 h-4 fill-white" />
                                        Stop Execution safely
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metrics Panel */}
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col justify-center items-center text-center">
                            <Database className="w-8 h-8 text-indigo-300 mb-2" />
                            <div className="text-4xl font-extrabold text-gray-900 tracking-tight">
                                {status.total_extracted.toLocaleString()}
                            </div>
                            <div className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-widest">
                                Unique Domains Extracted
                            </div>

                            {isRunning && (
                                <div className="mt-6 flex items-center text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 gap-2">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Writing to DuckDB Live...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScraperPanel;

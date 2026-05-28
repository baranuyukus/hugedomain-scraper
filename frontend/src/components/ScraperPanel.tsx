import { useState, useEffect } from "react";
import axios from "axios";
import { Play, Square, Activity, Database, RefreshCw, Shield, ShieldOff, Eye, EyeOff } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

const ScraperPanel = () => {
    const [status, setStatus] = useState<any>(null);
    const [snapshotName, setSnapshotName] = useState("");
    const [scraperMethod, setScraperMethod] = useState<"legacy" | "prefix">("legacy");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Proxy settings state
    const [proxyEnabled, setProxyEnabled] = useState(false);
    const [proxyUrl, setProxyUrl] = useState("");
    const [proxyShowUrl, setProxyShowUrl] = useState(false);
    const [proxySaving, setProxySaving] = useState(false);
    const [proxySaved, setProxySaved] = useState(false);
    const [proxyError, setProxyError] = useState("");

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

    // Load proxy config on mount
    useEffect(() => {
        axios.get(`${API_BASE}/proxy/config`).then(res => {
            setProxyEnabled(res.data.enabled);
            setProxyUrl(res.data.url);
        }).catch(() => {});
    }, []);

    const saveProxyConfig = async () => {
        setProxySaving(true);
        setProxyError("");
        setProxySaved(false);
        try {
            await axios.post(`${API_BASE}/proxy/config`, { enabled: proxyEnabled, url: proxyUrl });
            setProxySaved(true);
            setTimeout(() => setProxySaved(false), 3000);
        } catch (err: any) {
            setProxyError(err.response?.data?.detail || err.message);
        } finally {
            setProxySaving(false);
        }
    };

    const startScraper = async () => {
        if (!snapshotName) {
            setError("Please enter a snapshot name");
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/scrape/start`, null, {
                params: { snapshot_name: snapshotName, method: scraperMethod }
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Scraping Method</label>
                                        <select
                                            title="scraper_method"
                                            value={scraperMethod}
                                            onChange={(e) => setScraperMethod(e.target.value as "legacy" | "prefix")}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                        >
                                            <option value="legacy">Legacy: length + price phases</option>
                                            <option value="prefix">Prefix: 2-character starts-with scan</option>
                                        </select>
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
                                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                                            Method: {status.method === "prefix" ? "Prefix scan" : "Legacy scan"}
                                        </div>
                                        {status.current_phase && (
                                            <div className="text-xs text-indigo-700">
                                                {status.current_phase}
                                            </div>
                                        )}
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
                            {status.phases_total > 0 && (
                                <div className="mt-4 w-full max-w-xs">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span>Progress</span>
                                        <span>{status.phases_completed.toLocaleString()} / {status.phases_total.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all"
                                            style={{ width: `${Math.min(100, (status.phases_completed / status.phases_total) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

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
            {/* Proxy Settings Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {proxyEnabled
                            ? <Shield className="w-5 h-5 text-emerald-500" />
                            : <ShieldOff className="w-5 h-5 text-gray-400" />}
                        <h3 className="text-base font-bold text-gray-900">Proxy Settings</h3>
                    </div>
                    {/* Toggle switch */}
                    <button
                        onClick={() => setProxyEnabled(v => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${proxyEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                        title={proxyEnabled ? "Disable proxy" : "Enable proxy"}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${proxyEnabled ? "translate-x-6" : "translate-x-1"}`}
                        />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Active indicator */}
                    <div className={`flex items-center gap-2 text-sm font-medium ${proxyEnabled ? "text-emerald-600" : "text-gray-400"}`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${proxyEnabled ? "bg-emerald-500" : "bg-gray-300"}`} />
                        {proxyEnabled ? "Proxy is ACTIVE — requests will be routed through the proxy" : "Proxy is DISABLED — requests go directly"}
                    </div>

                    {/* URL input */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Proxy URL</label>
                        <div className="flex items-center gap-2">
                            <div className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2 transition-colors ${proxyEnabled ? "border-gray-300 bg-white focus-within:ring-2 focus-within:ring-emerald-400" : "border-gray-200 bg-gray-50"}`}>
                                <input
                                    type={proxyShowUrl ? "text" : "password"}
                                    value={proxyUrl}
                                    onChange={e => setProxyUrl(e.target.value)}
                                    placeholder="http://user:pass@host:port"
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
                                />
                                <button
                                    onClick={() => setProxyShowUrl(v => !v)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                    title={proxyShowUrl ? "Hide URL" : "Show URL"}
                                >
                                    {proxyShowUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">Format: http://username:password@host:port</p>
                    </div>

                    {proxyError && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {proxyError}
                        </div>
                    )}

                    <button
                        onClick={saveProxyConfig}
                        disabled={proxySaving}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${proxySaved ? "bg-emerald-600 text-white" : "bg-gray-800 hover:bg-gray-900 text-white"}`}
                    >
                        {proxySaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : proxySaved ? (
                            <Shield className="w-4 h-4" />
                        ) : null}
                        {proxySaving ? "Saving…" : proxySaved ? "Saved!" : "Save Proxy Settings"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScraperPanel;

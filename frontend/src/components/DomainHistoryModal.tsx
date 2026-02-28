import { useState, useEffect } from "react";
import axios from "axios";
import { X, Clock } from "lucide-react";

interface HistoryEvent {
    snapshot_id: number;
    snapshot_name: string;
    created_at: string;
    price_usd: number | null;
    status: "NEW" | "DELETED" | "CHANGED" | "UNCHANGED" | "ABSENT";
}

interface DomainHistoryModalProps {
    domainId: number;
    domainName: string;
    onClose: () => void;
}

const API_BASE = "http://127.0.0.1:8000";

const DomainHistoryModal = ({ domainId, domainName, onClose }: DomainHistoryModalProps) => {
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE}/domain/${domainId}/history`);
                setHistory(res.data.history);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [domainId]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <Clock className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Domain Lifecycle</h2>
                            <p className="text-sm text-gray-500 font-medium">{domainName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto w-full">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-indigo-100 ml-4 pl-6 space-y-8 py-4">
                            {history.map((evt, idx) => {
                                const isNew = evt.status === "NEW";
                                const isDel = evt.status === "DELETED";
                                const isChang = evt.status === "CHANGED";
                                const isAbsent = evt.status === "ABSENT";

                                let colorClass = "bg-gray-100 text-gray-600 border-gray-200";
                                let dotClass = "bg-gray-300 ring-4 ring-white";

                                if (isNew) { colorClass = "bg-green-50 text-green-700 border-green-200"; dotClass = "bg-green-500 ring-4 ring-white"; }
                                if (isDel) { colorClass = "bg-red-50 text-red-700 border-red-200"; dotClass = "bg-red-500 ring-4 ring-white"; }
                                if (isChang) { colorClass = "bg-orange-50 text-orange-700 border-orange-200"; dotClass = "bg-orange-500 ring-4 ring-white"; }

                                return (
                                    <div key={idx} className={`relative flex flex-col gap-1 ${isAbsent ? 'opacity-50' : ''}`}>
                                        <div className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full ${dotClass} shadow-sm z-10`}></div>
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            {evt.snapshot_name} <span className="text-gray-300 font-normal ml-2">({new Date(evt.created_at).toLocaleString()})</span>
                                        </div>
                                        <div className="mt-1 flex items-center">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClass}`}>
                                                <span className="font-bold text-sm tracking-wide">{evt.status}</span>
                                                {evt.price_usd != null && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-current opacity-30"></span>
                                                        <span className="font-semibold">${evt.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DomainHistoryModal;

import { useState, useEffect, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { ColDef, CellValueChangedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import axios from "axios";
import { Bookmark, Trash2, RefreshCw } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const API_BASE = "http://127.0.0.1:8000";

interface WatchlistItem {
    id: number;
    domain_id: number;
    domain: string;
    price_usd: number | null;
    note: string;
    added_at: string;
}

interface WatchlistGridProps {
    onOpenHistory: (domainId: number, domainName: string) => void;
}

const WatchlistGrid = ({ onOpenHistory }: WatchlistGridProps) => {
    const gridRef = useRef<AgGridReact>(null);
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWatchlist = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/watchlist`);
            setItems(res.data.items);
        } catch (e) {
            console.error("Failed to fetch watchlist", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWatchlist();
    }, [fetchWatchlist]);

    const handleRemove = async (domainId: number) => {
        try {
            await axios.delete(`${API_BASE}/watchlist/${domainId}`);
            setItems(prev => prev.filter(item => item.domain_id !== domainId));
        } catch (e) {
            console.error("Failed to remove from watchlist", e);
        }
    };

    const handleNoteChange = async (event: CellValueChangedEvent) => {
        const { domain_id, note } = event.data as WatchlistItem;
        try {
            await axios.put(`${API_BASE}/watchlist/${domain_id}/note`, { note: note ?? "" });
        } catch (e) {
            console.error("Failed to update note", e);
        }
    };

    const columnDefs: ColDef[] = [
        {
            field: "remove",
            headerName: "",
            sortable: false,
            filter: false,
            width: 52,
            pinned: "left",
            cellRenderer: (params: any) => (
                <button
                    onClick={() => handleRemove(params.data.domain_id)}
                    className="mt-1 p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                    title="Remove from watchlist"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            ),
        },
        {
            field: "history_action",
            headerName: "Flow",
            sortable: false,
            filter: false,
            width: 100,
            pinned: "left",
            cellRenderer: (params: any) => (
                <button
                    onClick={() => onOpenHistory(params.data.domain_id, params.data.domain)}
                    className="mt-1 text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1 rounded shadow-sm hover:bg-indigo-100 transition-colors"
                >
                    History
                </button>
            ),
        },
        {
            field: "domain",
            headerName: "Domain Name",
            sortable: true,
            flex: 2,
            cellRenderer: (params: any) => (
                <a
                    href={`http://${params.value}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline"
                >
                    {params.value}
                </a>
            ),
        },
        {
            field: "price_usd",
            headerName: "Price (USD)",
            sortable: true,
            flex: 1,
            valueFormatter: (p) =>
                p.value == null
                    ? "-"
                    : `$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        },
        {
            field: "note",
            headerName: "Note",
            editable: true,
            flex: 3,
            cellStyle: { cursor: "text" },
            cellRenderer: (params: any) =>
                params.value ? (
                    <span className="text-gray-800">{params.value}</span>
                ) : (
                    <span className="text-gray-400 italic">Double-click to add note…</span>
                ),
        },
        {
            field: "added_at",
            headerName: "Saved At",
            sortable: true,
            width: 130,
            valueFormatter: (p) =>
                p.value ? new Date(p.value).toLocaleDateString() : "-",
        },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-amber-500" fill="currentColor" />
                    <span className="text-sm font-semibold text-gray-700">
                        {items.length.toLocaleString()} saved domain{items.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Double-click the Note cell to edit</span>
                    <button
                        onClick={fetchWatchlist}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-md transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="ag-theme-alpine flex-1 w-full min-h-0" style={{ height: "100%" }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Loading watchlist…
                    </div>
                ) : (
                    <AgGridReact
                        ref={gridRef}
                        rowData={items}
                        columnDefs={columnDefs}
                        defaultColDef={{ resizable: true }}
                        onCellValueChanged={handleNoteChange}
                        overlayNoRowsTemplate='<span style="color:#9ca3af">No saved domains yet — click the bookmark icon in the domain list to save domains here.</span>'
                    />
                )}
            </div>
        </div>
    );
};

export default WatchlistGrid;

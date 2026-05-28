import { useState, useRef, useMemo, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { ColDef, IDatasource, IGetRowsParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import axios from "axios";

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);
import { useDebounceValue } from "usehooks-ts";
import { Search, Bookmark, History } from "lucide-react";

interface DomainGridProps {
    snapshotId: number;
    onOpenHistory: (domainId: number, domainName: string) => void;
}

const API_BASE = "http://127.0.0.1:8000";

const DomainGrid = ({ snapshotId, onOpenHistory }: DomainGridProps) => {
    const gridRef = useRef<AgGridReact>(null);
    // Pagination & Search
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch] = useDebounceValue(searchText, 800);
    const [searchMode, setSearchMode] = useState<"contains" | "prefix" | "exact">("contains");

    // Filters & Sorting
    const [minPrice, setMinPrice] = useState<string>("");
    const [debouncedMinPrice] = useDebounceValue(minPrice, 800);
    const [maxPrice, setMaxPrice] = useState<string>("");
    const [debouncedMaxPrice] = useDebounceValue(maxPrice, 800);

    // Length Filters
    const [minLength, setMinLength] = useState<string>("");
    const [debouncedMinLength] = useDebounceValue(minLength, 800);
    const [maxLength, setMaxLength] = useState<string>("");
    const [debouncedMaxLength] = useDebounceValue(maxLength, 800);

    // Sort combined state (e.g., 'price_usd-desc')
    const [sortOption, setSortOption] = useState<string>("domain-asc");

    // Metadata
    const [totalRowCount, setTotalRowCount] = useState(0);
    const [queryTimeMs, setQueryTimeMs] = useState(0);

    // Watchlist
    const savedIdsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        axios.get(`${API_BASE}/watchlist`).then(res => {
            savedIdsRef.current = new Set(res.data.items.map((item: any) => item.domain_id));
            gridRef.current?.api?.refreshCells({ force: true, columns: ["bookmark"] });
        }).catch(() => {});
    }, []);

    const handleToggleWatchlist = async (data: any) => {
        if (!data) return;
        const { domain_id, domain, price_usd } = data;
        try {
            if (savedIdsRef.current.has(domain_id)) {
                await axios.delete(`${API_BASE}/watchlist/${domain_id}`);
                const next = new Set(savedIdsRef.current);
                next.delete(domain_id);
                savedIdsRef.current = next;
            } else {
                await axios.post(`${API_BASE}/watchlist`, { domain_id, domain, price_usd });
                savedIdsRef.current = new Set([...savedIdsRef.current, domain_id]);
            }
            gridRef.current?.api?.refreshCells({ force: true, columns: ["bookmark"] });
        } catch (e) {
            console.error("Failed to toggle watchlist", e);
        }
    };

    const columnDefs: ColDef[] = [
        {
            field: "bookmark", headerName: "", sortable: false, filter: false, width: 44, minWidth: 44, maxWidth: 44, pinned: "left", cellClass: "hd-center-cell",
            cellRenderer: (params: any) => {
                const isSaved = savedIdsRef.current.has(params.data?.domain_id);
                return (
                    <button
                        onClick={() => handleToggleWatchlist(params.data)}
                        className={`hd-icon-button ${isSaved ? "text-amber-500 hover:text-amber-700" : "text-gray-300 hover:text-amber-400"}`}
                        title={isSaved ? "Remove from watchlist" : "Save to watchlist"}
                    >
                        <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                    </button>
                );
            }
        },
        {
            field: "history_action", headerName: "Flow", sortable: false, filter: false, width: 78, minWidth: 78, maxWidth: 90, pinned: "left", cellClass: "hd-center-cell",
            cellRenderer: (params: any) => (
                <button
                    onClick={() => onOpenHistory(params.data.domain_id, params.data.domain)}
                    className="hd-row-action"
                    title="Open price history"
                >
                    <History className="w-3.5 h-3.5" />
                    History
                </button>
            )
        },
        {
            field: "domain", headerName: "Domain Name", sortable: true, filter: false, flex: 1, minWidth: 360,
            cellRenderer: (params: any) => (
                <a href={`http://${params.value}`} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                    {params.value}
                </a>
            )
        },
        {
            field: "price_usd", headerName: "Price (USD)", sortable: true, filter: false, width: 170, minWidth: 150, cellClass: "hd-price-cell",
            valueFormatter: (p) => p.value == null ? "-" : `$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        },
        { field: "length", headerName: "Length", sortable: true, filter: false, width: 110, minWidth: 90 }
    ];

    const dataSource: IDatasource = useMemo(() => {
        return {
            rowCount: undefined,
            getRows: async (params: IGetRowsParams) => {
                try {
                    const sortModel = params.sortModel[0];
                    const [sortColState, sortDirState] = sortOption.split("-");

                    // Allow clicking column headers to override dropdown
                    const finalSortCol = sortModel ? sortModel.colId : sortColState;
                    const finalSortDir = sortModel ? sortModel.sort : sortDirState;

                    const res = await axios.get(`${API_BASE}/rows`, {
                        params: {
                            snapshot_id: snapshotId,
                            search: debouncedSearch,
                            search_mode: searchMode,
                            sort_col: finalSortCol,
                            sort_dir: finalSortDir,
                            min_price: debouncedMinPrice ? parseFloat(debouncedMinPrice) : undefined,
                            max_price: debouncedMaxPrice ? parseFloat(debouncedMaxPrice) : undefined,
                            min_length: debouncedMinLength ? parseInt(debouncedMinLength, 10) : undefined,
                            max_length: debouncedMaxLength ? parseInt(debouncedMaxLength, 10) : undefined,
                            offset: params.startRow,
                            limit: params.endRow - params.startRow
                        }
                    });

                    const lastRow = res.data.rows.length < (params.endRow - params.startRow)
                        ? params.startRow + res.data.rows.length
                        : -1;

                    setTotalRowCount(res.data.total_count);
                    setQueryTimeMs(res.data.elapsed_ms);
                    params.successCallback(res.data.rows, lastRow);
                } catch (error) {
                    console.error("Error fetching rows", error);
                    params.failCallback();
                }
            }
        };
    }, [snapshotId, debouncedSearch, searchMode, debouncedMinPrice, debouncedMaxPrice, debouncedMinLength, debouncedMaxLength, sortOption]);



    return (
        <div className="flex flex-col h-full">
            <div className="control-strip border-b border-gray-200 px-4 py-3 flex flex-col gap-3">
                {/* Top Row: Search & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="hd-field flex items-center gap-2 flex-1 min-w-[360px] max-w-3xl px-3">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search domains (e.g. meta, crypto, ai...)"
                            className="bg-transparent border-none outline-none flex-1 text-sm text-gray-800 placeholder-gray-400"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                        <select
                            title="search_mode"
                            className="bg-transparent text-sm text-gray-700 border-none outline-none font-semibold cursor-pointer min-w-[138px]"
                            value={searchMode}
                            onChange={e => setSearchMode(e.target.value as any)}
                        >
                            <option value="contains">Contains</option>
                            <option value="prefix">Starts With</option>
                            <option value="exact">Exact Match</option>
                        </select>
                    </div>

                    {/* Second Row: Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Price Filter */}
                        <div className="hd-field flex items-center gap-2 px-3">
                            <span className="text-xs font-bold text-gray-500 pr-1 uppercase tracking-wide">Price</span>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 min-h-[30px]">
                                <span className="text-gray-400 font-medium">$</span>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    className="w-16 bg-transparent border-none outline-none text-sm text-gray-800"
                                    value={minPrice}
                                    onChange={e => setMinPrice(e.target.value)}
                                />
                            </div>
                            <span className="text-gray-300 font-medium">-</span>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 min-h-[30px]">
                                <span className="text-gray-400 font-medium">$</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    className="w-16 bg-transparent border-none outline-none text-sm text-gray-800"
                                    value={maxPrice}
                                    onChange={e => setMaxPrice(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Length Filter */}
                        <div className="hd-field flex items-center gap-2 px-3">
                            <span className="text-xs font-bold text-gray-500 pr-1 uppercase tracking-wide">Length</span>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 min-h-[30px]">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    className="w-14 bg-transparent border-none outline-none text-sm text-gray-800"
                                    value={minLength}
                                    onChange={e => setMinLength(e.target.value)}
                                />
                            </div>
                            <span className="text-gray-300 font-medium">-</span>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 min-h-[30px]">
                                <input
                                    type="number"
                                    placeholder="Max"
                                    className="w-14 bg-transparent border-none outline-none text-sm text-gray-800"
                                    value={maxLength}
                                    onChange={e => setMaxLength(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Sort By & Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">Sort by:</label>
                            <select
                                title="sort_by"
                                className="hd-field px-3 text-sm font-medium bg-white text-gray-800 min-w-[210px]"
                                value={sortOption}
                                onChange={e => setSortOption(e.target.value)}
                            >
                                <option value="domain-asc">Domain: A - Z</option>
                                <option value="domain-desc">Domain: Z - A</option>
                                <option value="price_usd-asc">Price: Low to High</option>
                                <option value="price_usd-desc">Price: High to Low</option>
                                <option value="length-asc">Length: Short to Long</option>
                                <option value="length-desc">Length: Long to Short</option>
                            </select>
                        </div>

                        <div className="text-sm text-gray-500 flex items-center gap-4">
                            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium shadow-sm border border-indigo-100">
                                {totalRowCount.toLocaleString()} matches
                            </div>
                            <div className="bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs">
                                Query: <span className="font-semibold">{queryTimeMs}ms</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ag-theme-alpine hd-domain-grid flex-1 w-full min-h-0" style={{ height: "100%" }}>
                <AgGridReact
                    key={`${snapshotId}-${debouncedSearch}-${searchMode}`}
                    ref={gridRef}
                    theme="legacy"
                    columnDefs={columnDefs}
                    rowModelType="infinite"
                    datasource={dataSource}
                    cacheBlockSize={1000}
                    maxBlocksInCache={20}
                    pagination={true}
                    paginationPageSize={100}
                    paginationPageSizeSelector={[100, 500, 1000]}
                    defaultColDef={{
                        resizable: true,
                        suppressMovable: true,
                    }}
                    suppressCellFocus={true}
                    overlayLoadingTemplate='<span class="ag-overlay-loading-center">Fetching from DuckDB...</span>'
                />
            </div>
        </div>
    );
};

export default DomainGrid;

import { useState, useRef, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { ColDef, IDatasource, IGetRowsParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import axios from "axios";

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);
import { useDebounceValue } from "usehooks-ts";
import { Search } from "lucide-react";

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

    const columnDefs: ColDef[] = [
        {
            field: "history_action", headerName: "Flow", sortable: false, filter: false, width: 100, pinned: "left",
            cellRenderer: (params: any) => (
                <button
                    onClick={() => onOpenHistory(params.data.domain_id, params.data.domain)}
                    className="mt-1 text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1 rounded shadow-sm hover:bg-indigo-100 transition-colors"
                >
                    History
                </button>
            )
        },
        {
            field: "domain", headerName: "Domain Name", sortable: true, filter: false, flex: 2,
            cellRenderer: (params: any) => (
                <a href={`http://${params.value}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    {params.value}
                </a>
            )
        },
        {
            field: "price_usd", headerName: "Price (USD)", sortable: true, filter: false, flex: 1,
            valueFormatter: (p) => p.value == null ? "-" : `$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        },
        { field: "length", headerName: "Length", sortable: true, filter: false, flex: 1 }
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
            <div className="p-4 bg-white border-b border-gray-100 flex flex-col gap-4">
                {/* Top Row: Search & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 max-w-2xl bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search domains (e.g. meta, crypto, ai...)"
                            className="bg-transparent border-none outline-none flex-1 text-sm text-gray-800 placeholder-gray-400"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                        <select
                            title="search_mode"
                            className="bg-transparent text-sm text-gray-500 border-none outline-none font-medium cursor-pointer"
                            value={searchMode}
                            onChange={e => setSearchMode(e.target.value as any)}
                        >
                            <option value="contains">Contains</option>
                            <option value="prefix">Starts With</option>
                            <option value="exact">Exact Match</option>
                        </select>
                    </div>

                    {/* Second Row: Filters */}
                    <div className="flex flex-wrap items-center gap-6">
                        {/* Price Filter */}
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-1">
                            <span className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wide">Price</span>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1">
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
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1">
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
                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-1">
                            <span className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wide">Chars Length</span>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    className="w-14 bg-transparent border-none outline-none text-sm text-gray-800"
                                    value={minLength}
                                    onChange={e => setMinLength(e.target.value)}
                                />
                            </div>
                            <span className="text-gray-300 font-medium">-</span>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2 py-1">
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
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">Sort by:</label>
                            <select
                                title="sort_by"
                                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer min-w-[200px]"
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

            <div className="ag-theme-alpine flex-1 w-full min-h-0" style={{ height: "100%" }}>
                <AgGridReact
                    key={`${snapshotId}-${debouncedSearch}-${searchMode}`}
                    ref={gridRef}
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
                    }}
                    overlayLoadingTemplate='<span class="ag-overlay-loading-center">Fetching from DuckDB...</span>'
                />
            </div>
        </div>
    );
};

export default DomainGrid;

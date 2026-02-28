import { useState, useRef, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import type { ColDef, IDatasource, IGetRowsParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import axios from "axios";

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);

interface DiffGridProps {
    snapshotA: number;
    snapshotB: number;
    onOpenHistory: (domainId: number, domainName: string) => void;
}

const API_BASE = "http://127.0.0.1:8000";

const DiffGrid = ({ snapshotA, snapshotB, onOpenHistory }: DiffGridProps) => {
    const gridRef = useRef<AgGridReact>(null);
    const [diffType, setDiffType] = useState<"all" | "new" | "deleted" | "changed">("all");
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
            field: "domain", headerName: "Domain Name", sortable: false, flex: 2,
            cellRenderer: (params: any) => (
                <a href={`http://${params.value}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    {params.value}
                </a>
            )
        },
        {
            field: "status", headerName: "Status", sortable: false, flex: 1,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (status === "NEW") return <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">NEW</span>;
                if (status === "DELETED") return <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">DELETED</span>;
                if (status === "CHANGED") return <span className="text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded">PRICE CHANGED</span>;
                return <span className="text-gray-400">{status}</span>;
            }
        },
        {
            field: "old_price", headerName: "Old Price", sortable: false, flex: 1,
            valueFormatter: (p) => p.value == null ? "-" : `$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        },
        {
            field: "new_price", headerName: "New Price", sortable: false, flex: 1,
            valueFormatter: (p) => p.value == null ? "-" : `$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        }
    ];

    const dataSource: IDatasource = useMemo(() => {
        return {
            rowCount: undefined,
            getRows: async (params: IGetRowsParams) => {
                try {
                    const res = await axios.get(`${API_BASE}/diff`, {
                        params: {
                            snapshot_a: snapshotA,
                            snapshot_b: snapshotB,
                            diff_type: diffType,
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
                    console.error("Error fetching diff rows", error);
                    params.failCallback();
                }
            }
        };
    }, [snapshotA, snapshotB, diffType]);



    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Filter Changes:</label>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {["all", "new", "deleted", "changed"].map(type => (
                            <button
                                key={type}
                                onClick={() => setDiffType(type as any)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md uppercase tracking-wider transition-colors ${diffType === type
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-sm text-gray-500 flex items-center gap-4">
                    <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
                        {totalRowCount.toLocaleString()} differences
                    </div>
                    <div>Join & Query Time: <span className="font-semibold">{queryTimeMs}ms</span></div>
                </div>
            </div>

            <div className="ag-theme-alpine flex-1 w-full min-h-0" style={{ height: "100%" }}>
                <AgGridReact
                    key={`${snapshotA}-${snapshotB}-${diffType}`}
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
                    overlayLoadingTemplate='<span class="ag-overlay-loading-center">Performing FULL OUTER JOIN in DuckDB...</span>'
                />
            </div>
        </div>
    );
};

export default DiffGrid;

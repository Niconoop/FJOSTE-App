import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Database as DatabaseIcon, ArrowUpDown, ChevronLeft, ChevronRight, Eye, X,
  Filter, Info, CornerDownRight, Loader2, ArrowLeft, ExternalLink, RefreshCw, Check
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { API_URL, API_BASE_URL } from "../config";

const isImageUrl = (val: any): boolean => {
  if (typeof val !== "string") return false;
  const clean = val.trim().toLowerCase();
  return (
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/.test(clean) ||
    clean.startsWith("/api/auth/avatar/") ||
    clean.startsWith("/api/gallery/image/") ||
    clean.includes("/uploads/")
  );
};

const resolveImageUrl = (val: string): string => {
  if (!val) return "";
  if (val.startsWith("http")) return val;
  if (val.startsWith("/")) {
    return `${API_BASE_URL}${val}`;
  }
  return val;
};

interface Collection {
  id: string;
  name: string;
  type: string;
  schema?: Array<{ name: string; type: string }>;
}

interface RecordItem {
  id: string;
  created: string;
  updated: string;
  [key: string]: any;
}

interface DatabaseProps {
  onBack: () => void;
}

export const DatabasePage: React.FC<DatabaseProps> = ({ onBack }) => {
  const { token, isAdmin } = useAuth();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCol, setSelectedCol] = useState<Collection | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loadingCols, setLoadingCols] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Pagination & Queries
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterInput, setFilterInput] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Record Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilterHelp, setShowFilterHelp] = useState(false);
  const [inspectorCell, setInspectorCell] = useState<{ record: RecordItem, field: string, value: any } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  // Initialize edit value when inspectorCell opens
  useEffect(() => {
    if (inspectorCell) {
      setIsEditing(false);
      setEditValue(
        typeof inspectorCell.value === "object" && inspectorCell.value !== null
          ? JSON.stringify(inspectorCell.value, null, 2)
          : typeof inspectorCell.value === "boolean"
          ? inspectorCell.value ? "true" : "false"
          : String(inspectorCell.value)
      );
    }
  }, [inspectorCell]);

  const handleSaveEdit = async () => {
    if (!inspectorCell || !selectedCol) return;
    setSavingEdit(true);
    try {
      let finalVal: any = editValue;

      // Parse JSON if the original value was an object
      if (typeof inspectorCell.value === "object" && inspectorCell.value !== null) {
        try {
          finalVal = JSON.parse(editValue);
        } catch (e) {
          toast.error("Ungültiges JSON-Format!");
          setSavingEdit(false);
          return;
        }
      } else if (typeof inspectorCell.value === "boolean") {
        finalVal = editValue === "true";
      } else if (typeof inspectorCell.value === "number") {
        finalVal = Number(editValue);
        if (isNaN(finalVal)) {
          toast.error("Ungültige Zahl!");
          setSavingEdit(false);
          return;
        }
      }

      // Map special user fields
      let payload: Record<string, any> = { [inspectorCell.field]: finalVal };
      if (selectedCol.name === "users") {
        if (inspectorCell.field === "name") {
          payload["username"] = finalVal;
          payload["name"] = finalVal;
        } else if (inspectorCell.field === "avatar") {
          payload["custom_avatar_url"] = finalVal;
        }
      }

      const res = await axios.patch(
        `${API_URL}/admin/database/collections/${selectedCol.name}/${inspectorCell.record.id}`,
        payload,
        { headers: h }
      );

      if (res.status === 200) {
        toast.success("Feld erfolgreich aktualisiert!");

        // Update local records state
        setRecords(prev => prev.map(rec => {
          if (rec.id === inspectorCell.record.id) {
            return { ...rec, ...payload } as unknown as RecordItem;
          }
          return rec;
        }));

        // Update inspectorCell value
        setInspectorCell(prev => prev ? ({
          ...prev,
          value: finalVal,
          record: { ...prev.record, ...payload } as unknown as RecordItem
        }) : null);

        setIsEditing(false);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Fehler beim Speichern: " + (e.response?.data?.detail || e.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const isReadOnlyField = (field: string) => ["id", "created", "updated"].includes(field);

  // Fetch all collections
  const loadCollections = useCallback(async () => {
    setLoadingCols(true);
    try {
      const res = await axios.get(`${API_URL}/admin/database/collections`, { headers: h });
      if (Array.isArray(res.data)) {
        setCollections(res.data);
        if (res.data.length > 0) {
          setSelectedCol(res.data[0]);
        }
      }
    } catch (err) {
      toast.error("Fehler beim Laden der Tabellen");
      console.error(err);
    } finally {
      setLoadingCols(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) loadCollections();
  }, [isAdmin, loadCollections]);

  // Fetch records
  const loadRecords = useCallback(async () => {
    if (!selectedCol) return;
    setLoadingRecords(true);
    try {
      let sortParam = "";
      if (sortField) {
        sortParam = sortDir === "desc" ? `-${sortField}` : sortField;
      }

      const res = await axios.get(`${API_URL}/admin/database/collections/${selectedCol.name}`, {
        headers: h,
        params: {
          page,
          perPage,
          filter: activeFilter || undefined,
          sort: sortParam || undefined
        }
      });

      if (res.data) {
        setRecords(res.data.items || []);
        setTotalItems(res.data.totalItems || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      toast.error("Fehler beim Laden der Datensätze");
      console.error(err);
    } finally {
      setLoadingRecords(false);
    }
  }, [selectedCol, page, perPage, activeFilter, sortField, sortDir, token]);

  useEffect(() => {
    if (isAdmin && selectedCol) {
      loadRecords();
    }
  }, [isAdmin, selectedCol, page, perPage, activeFilter, sortField, sortDir, loadRecords]);

  // Reset pagination when collection changes
  const handleColSelect = (col: Collection) => {
    setSelectedCol(col);
    setPage(1);
    setFilterInput("");
    setActiveFilter("");
    setSortField("");
    setSortDir("desc");
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilter(filterInput);
    setPage(1);
  };

  const handleClearFilter = () => {
    setFilterInput("");
    setActiveFilter("");
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  if (!isAdmin) return null;

  // Columns to show: 'id' + fields from schema + actual record keys + 'created' + 'updated'
  const getColumns = () => {
    if (!selectedCol) return [];
    const schemaFields = selectedCol.schema ? selectedCol.schema.map(f => f.name) : [];

    // Gather all unique keys present in the loaded records (to catch built-in system fields like username, email, avatar)
    const recordKeys = new Set<string>();
    records.forEach(rec => {
      Object.keys(rec).forEach(key => {
        recordKeys.add(key);
      });
    });

    const allKeys = new Set<string>(["id", ...schemaFields, ...Array.from(recordKeys)]);

    // Remove internal fields that shouldn't be main table columns
    allKeys.delete("collectionId");
    allKeys.delete("collectionName");
    allKeys.delete("expand");
    allKeys.delete("created");
    allKeys.delete("updated");

    // For users table: hide redundant columns since we map username -> name and avatar_url -> avatar
    if (selectedCol.name === "users") {
      if (allKeys.has("name") && allKeys.has("username")) {
        allKeys.delete("username");
      }
      if (allKeys.has("avatar")) {
        allKeys.delete("avatar_url");
        allKeys.delete("custom_avatar_url");
      }
    }

    return [...Array.from(allKeys), "created", "updated"];
  };

  return (
    <div className="space-y-8 pb-10 max-w-[1800px] mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/30 hover:bg-white/[0.05] text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <h1 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
              Interne Datenbank
            </h1>
          </div>
          <p className="text-slate-500 font-medium text-xs tracking-wide">
            Geschützte Echtzeit-Ansicht der Systemtabellen.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Sidebar - Collections */}
        <div className="xl:col-span-1 frosted-card !p-4 space-y-4 hover-glow transition-all">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">Tabellen ({collections.length})</h2>
          </div>

          {loadingCols ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="text-primary animate-spin" size={24} />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[300px] xl:max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
              {collections.map(col => {
                const isSelected = selectedCol?.id === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => handleColSelect(col)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 border cursor-pointer ${isSelected
                      ? "bg-primary/10 text-primary font-bold border-primary/20 shadow-[0_0_16px_rgba(245, 158, 11,0.08)]"
                      : "text-slate-400 hover:text-white bg-white/[0.02] hover:bg-primary/5 border border-transparent"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider">{col.name}</span>
                    <span className="text-[8px] px-2 py-0.5 rounded-md bg-white/5 text-slate-500 font-mono font-black">{col.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Area - Records */}
        <div className="xl:col-span-3 space-y-6">
          <div className="frosted-card !p-6 hover-glow transition-all space-y-6">
            {/* Header info & Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div>
                <h2 className="font-unbounded text-base font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <CornerDownRight size={16} className="text-primary" />
                  {selectedCol?.name || "Tabelle laden..."}
                </h2>
                <p className="text-[10px] font-mono text-slate-500 mt-1">ID: {selectedCol?.id}</p>
              </div>

              {/* Filter Form */}
              <form onSubmit={handleApplyFilter} className="flex items-center gap-2 max-w-md w-full">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={filterInput}
                    onChange={(e) => setFilterInput(e.target.value)}
                    placeholder="Filter (z.B. username ~ 'test')"
                    className="w-full pl-9 pr-8 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300"
                  />
                  <Filter size={14} className="absolute left-3 top-3 text-slate-500" />

                  {filterInput && (
                    <button
                      type="button"
                      onClick={handleClearFilter}
                      className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilterHelp(!showFilterHelp)}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/25 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all cursor-pointer"
                  title="Hilfe zur Filterung"
                >
                  <Info size={14} />
                </button>

                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer whitespace-nowrap"
                >
                  Filtern
                </button>
                <button
                  type="button"
                  onClick={loadRecords}
                  disabled={loadingRecords}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/25 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                  title="Tabelle aktualisieren"
                >
                  <RefreshCw size={14} className={loadingRecords ? "animate-spin text-primary" : ""} />
                </button>
              </form>
            </div>

            {/* Filter Help Dropdown */}
            <AnimatePresence>
              {showFilterHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-[10px] text-primary/90 space-y-2 leading-relaxed overflow-hidden"
                >
                  <p className="font-bold uppercase tracking-wider mb-1">💡 PocketBase Filter-Syntax Hilfestellung:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Gleichheit:</strong> <code className="bg-white/5 px-1 py-0.5 rounded font-mono">role = 'admin'</code></li>
                    <li><strong>Ungleichheit:</strong> <code className="bg-white/5 px-1 py-0.5 rounded font-mono">is_admin != true</code></li>
                    <li><strong>Ähnlichkeit (Like/Regex):</strong> <code className="bg-white/5 px-1 py-0.5 rounded font-mono">username ~ 'driver'</code> (nicht Case-Sensitive)</li>
                    <li><strong>Größer/Kleiner:</strong> <code className="bg-white/5 px-1 py-0.5 rounded font-mono">age &gt;= 18</code></li>
                    <li><strong>Logische Verknüpfungen:</strong> <code className="bg-white/5 px-1 py-0.5 rounded font-mono">used = false &amp;&amp; created_at &gt; '2026-01-01'</code></li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Records Table */}
            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-white/[0.02]">
              {loadingRecords ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="text-primary animate-spin" size={32} />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Lade Daten...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <DatabaseIcon className="mx-auto text-slate-700 opacity-20" size={36} />
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic opacity-50">Keine Datensätze gefunden</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.03]">
                      {getColumns().map(col => {
                        const isSorted = sortField === col;
                        return (
                          <th
                            key={col}
                            onClick={() => handleSort(col)}
                            className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-white cursor-pointer select-none transition-colors border-r border-white/5 last:border-r-0"
                          >
                            <div className="flex items-center gap-1.5">
                              {col}
                              <ArrowUpDown size={10} className={isSorted ? "text-primary" : "text-slate-600"} />
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-500 text-right w-16">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {records.map((rec, rIdx) => (
                      <tr key={rec.id || rIdx} className="hover:bg-primary/5 transition-colors group">
                        {getColumns().map(col => {
                          let val = rec[col];

                          // Fallbacks for users table: map username -> name and avatar_url -> avatar
                          if (selectedCol?.name === "users") {
                            if (col === "name" && (!val || val === "")) {
                              val = rec["username"];
                            }
                            if (col === "avatar" && (!val || val === "")) {
                              val = rec["custom_avatar_url"] || rec["avatar_url"];
                            }
                          }

                          let renderedVal = "";
                          if (val === undefined || val === null) {
                            renderedVal = "-";
                          } else if (typeof val === "object") {
                            renderedVal = JSON.stringify(val);
                          } else if (typeof val === "boolean") {
                            renderedVal = val ? "true" : "false";
                          } else {
                            renderedVal = String(val);
                          }

                          // Truncate long texts
                          const isLong = renderedVal.length > 35;
                          const displayText = isLong ? `${renderedVal.substring(0, 32)}...` : renderedVal;

                          return (
                            <td
                              key={col}
                              onClick={() => setInspectorCell({ record: rec, field: col, value: val })}
                              className="p-4 text-[10px] text-slate-300 font-mono border-r border-white/5 last:border-r-0 max-w-[200px] cursor-pointer hover:bg-primary/5 transition-colors"
                              title="Klicken zum Vergrößern"
                            >
                              {col === "id" ? (
                                <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">{displayText}</span>
                              ) : (
                                displayText
                              )}
                            </td>
                          );
                        })}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => { setSelectedRecord(rec); setShowDetail(true); }}
                            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                            title="Datensatz ansehen"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {records.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Datensätze gesamt: <strong className="text-white font-mono">{totalItems}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <span>Pro Seite:</span>
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                      className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/40"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-white/[0.03] rounded-xl border border-white/10 hover:border-primary/25 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span>Seite <strong className="text-white font-mono">{page}</strong> von <strong className="text-white font-mono">{totalPages}</strong></span>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-white/[0.03] rounded-xl border border-white/10 hover:border-primary/30 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Detail JSON Viewer Modal */}
      <AnimatePresence>
        {showDetail && selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setShowDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="frosted-card !bg-[#000000] border-2 border-[#f59e0b]/20 w-full max-w-3xl !p-0 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h3 className="font-unbounded text-xs font-bold text-amber-400 uppercase tracking-widest">
                    Datensatz-Details
                  </h3>
                  <p className="text-[9px] font-mono text-slate-500 mt-1">ID: {selectedRecord.id}</p>
                </div>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <pre className="text-[11px] font-mono text-primary bg-black/40 p-5 rounded-2xl border border-white/5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-end">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-6 py-2.5 bg-white/[0.03] border border-white/10 hover:border-primary/20 hover:bg-primary/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cell Value Inspector Modal */}
      <AnimatePresence>
        {inspectorCell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setInspectorCell(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="frosted-card !bg-[#000000] border-2 border-[#f59e0b]/20 w-full max-w-xl !p-0 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <h3 className="font-unbounded text-xs font-bold text-amber-400 uppercase tracking-widest">
                    Feld-Inspektor
                  </h3>
                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">Feld: {inspectorCell.field}</p>
                </div>
                <button
                  onClick={() => setInspectorCell(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-grow flex flex-col items-center justify-center min-h-[200px]">
                {isEditing ? (
                  <div className="w-full space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Wert bearbeiten:</p>
                    {typeof inspectorCell.value === "boolean" ? (
                      <div className="flex items-center gap-4 py-2">
                        <button
                          type="button"
                          onClick={() => setEditValue(editValue === "true" ? "false" : "true")}
                          className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 outline-none ${editValue ? "bg-primary" : "bg-slate-700"}`}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-all duration-300 ${editValue ? "translate-x-7" : "translate-x-0"}`}
                          />
                        </button>
                        <span className={`text-xs font-black uppercase tracking-widest select-none ${editValue ? "text-primary" : "text-slate-500"}`}>
                          {editValue ? "true" : "false"}
                        </span>
                      </div>
                    ) : typeof inspectorCell.value === "object" && inspectorCell.value !== null ? (
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        rows={6}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:border-primary/40 outline-none transition-all"
                        placeholder='{"key": "value"}'
                      />
                    ) : typeof inspectorCell.value === "number" ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/40 outline-none transition-all"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/40 outline-none transition-all font-mono"
                      />
                    )}
                  </div>
                ) : isImageUrl(inspectorCell.value) ? (
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <div className="max-w-full max-h-[40vh] rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner flex items-center justify-center">
                      <img
                        src={resolveImageUrl(inspectorCell.value)}
                        alt="Enlarged view"
                        className="object-contain max-w-full max-h-[40vh]"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="text-center space-y-2 w-full">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bild-Link:</p>
                      <a
                        href={resolveImageUrl(inspectorCell.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline font-mono break-all inline-flex items-center gap-1.5"
                      >
                        {resolveImageUrl(inspectorCell.value)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Inhalt:</p>
                    <pre className="text-xs font-mono text-white/90 bg-black/40 p-4 rounded-xl border border-white/10 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[40vh]">
                      {typeof inspectorCell.value === "object"
                        ? JSON.stringify(inspectorCell.value, null, 2)
                        : String(inspectorCell.value)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-white/[0.02] flex justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = typeof inspectorCell.value === "object"
                        ? JSON.stringify(inspectorCell.value, null, 2)
                        : String(inspectorCell.value);
                      navigator.clipboard.writeText(text);
                      toast.success("Inhalt in die Zwischenablage kopiert!");
                    }}
                    className="px-4 py-2 bg-white/[0.03] border border-white/10 hover:border-primary/20 hover:bg-primary/10 text-white/80 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Kopieren
                  </button>
                  {!isReadOnlyField(inspectorCell.field) && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-white/[0.03] border border-primary/25 hover:bg-primary/10 hover:border-primary/50 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                    >
                      Bearbeiten
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-white/[0.03] border border-white/10 hover:border-primary/20 hover:bg-primary/10 text-white/80 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {savingEdit ? <Loader2 size={12} className="animate-spin" /> : "Speichern"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInspectorCell(null)}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                    >
                      Schließen
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

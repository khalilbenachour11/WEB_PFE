import { useMemo } from "react";

export default function useRecettesFilter(
  data,
  dateFilter,
  search,
  dateField = "date_heure",
  searchFields = null
) {
  return useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.filter((item) => {
      if (dateFilter) {
        const val = item[dateField];
        if (!val) return false;
        const itemDate = new Date(val).toISOString().split("T")[0];
        if (itemDate !== dateFilter) return false;
      }

      if (!q) return true;

      const candidates = searchFields
        ? searchFields.map((f) => String(item[f] ?? "").toLowerCase())
        : Object.values(item).map((v) => String(v ?? "").toLowerCase());

      return candidates.some((c) => c.includes(q));
    });
  }, [data, dateFilter, search, dateField, searchFields]);
}
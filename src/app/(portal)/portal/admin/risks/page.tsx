"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type RiskRow = {
  risk_id: number;
  risk_name: string | null;
  category_id: number | null;
  sub_category_id: number | null;
  risk_level: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

type CategoryRow = {
  category_id: number;
  name: string;
  is_active: boolean | null;
};

type SubCategoryRow = {
  sub_category_id: number;
  category_id: number;
  name: string;
  is_active: boolean | null;
};

export default function AdminRisksPage() {
  const [tab, setTab] = useState<"risks" | "predefined">("risks");
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryRow[]>([]);
  const [newRisk, setNewRisk] = useState({
    risk_name: "",
    category_id: "",
    sub_category_id: "",
    risk_level: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminInvoke<{ risks: RiskRow[] }>("listRiskESG"),
      adminInvoke<{ categories: CategoryRow[]; subCategories: SubCategoryRow[] }>(
        "listReportCategories"
      ),
    ])
      .then(([riskData, categoryData]) => {
        if (!isMounted) return;
        setRisks(riskData.risks);
        setCategories(categoryData.categories);
        setSubCategories(categoryData.subCategories);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load risks.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((cat) => [cat.category_id, cat.name])),
    [categories]
  );

  const subCategoryNameById = useMemo(
    () => Object.fromEntries(subCategories.map((sub) => [sub.sub_category_id, sub.name])),
    [subCategories]
  );

  const filteredSubCategories = useMemo(() => {
    if (!newRisk.category_id) return subCategories;
    return subCategories.filter((sub) => String(sub.category_id) === newRisk.category_id);
  }, [newRisk.category_id, subCategories]);

  const addRisk = async () => {
    if (!newRisk.risk_name.trim()) {
      setError("Risk name is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createRiskESG", {
        risk_name: newRisk.risk_name.trim(),
        category_id: newRisk.category_id ? Number(newRisk.category_id) : null,
        sub_category_id: newRisk.sub_category_id ? Number(newRisk.sub_category_id) : null,
        risk_level: newRisk.risk_level ? Number(newRisk.risk_level) : null,
        is_active: true,
      });
      const refreshed = await adminInvoke<{ risks: RiskRow[] }>("listRiskESG");
      setRisks(refreshed.risks);
      setNewRisk({ risk_name: "", category_id: "", sub_category_id: "", risk_level: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add risk.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRisk = async (riskId: number, current: boolean | null) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateRiskESG", { risk_id: riskId, is_active: !current });
      setRisks((prev) =>
        prev.map((item) =>
          item.risk_id === riskId ? { ...item, is_active: !current } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update risk.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCategories = categories.filter((cat) => cat.is_active !== false);

  return (
    <SectionCard
      title={tab === "risks" ? "Risks" : "Predefined Risks"}
      description={`${tab === "risks" ? risks.length : activeCategories.length} results`}
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
          </select>
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Filter</option>
          </select>
        </div>
      }
    >
      <div className="flex items-center gap-2">
        <button
          className={`rounded-full px-4 py-2 text-xs font-semibold ${
            tab === "risks"
              ? "bg-[var(--wb-cobalt)] text-white"
              : "border border-slate-200 text-slate-500"
          }`}
          onClick={() => setTab("risks")}
        >
          Risks
        </button>
        <button
          className={`rounded-full px-4 py-2 text-xs font-semibold ${
            tab === "predefined"
              ? "bg-[var(--wb-cobalt)] text-white"
              : "border border-slate-200 text-slate-500"
          }`}
          onClick={() => setTab("predefined")}
        >
          Predefined Risks
        </button>
      </div>

      {tab === "risks" ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1.2fr_1fr_1fr_120px_auto]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Risk name"
            value={newRisk.risk_name}
            onChange={(event) => setNewRisk((prev) => ({ ...prev, risk_name: event.target.value }))}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={newRisk.category_id}
            onChange={(event) =>
              setNewRisk((prev) => ({
                ...prev,
                category_id: event.target.value,
                sub_category_id: "",
              }))
            }
          >
            <option value="">Category</option>
            {categories.map((cat) => (
              <option key={cat.category_id} value={String(cat.category_id)}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={newRisk.sub_category_id}
            onChange={(event) =>
              setNewRisk((prev) => ({ ...prev, sub_category_id: event.target.value }))
            }
          >
            <option value="">Subcategory</option>
            {filteredSubCategories.map((sub) => (
              <option key={sub.sub_category_id} value={String(sub.sub_category_id)}>
                {sub.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Level"
            value={newRisk.risk_level}
            onChange={(event) =>
              setNewRisk((prev) => ({
                ...prev,
                risk_level: event.target.value.replace(/[^\d]/g, ""),
              }))
            }
          />
          <button
            type="button"
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={addRisk}
            disabled={isSaving}
          >
            Add
          </button>
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {tab === "risks" ? (
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Subcategory</th>
                <th className="px-4 py-3">Creation Date</th>
                <th className="px-4 py-3">Approved</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((row, index) => (
                <tr key={row.risk_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.risk_name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {row.category_id ? categoryNameById[row.category_id] : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {row.sub_category_id ? subCategoryNameById[row.sub_category_id] : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                      onClick={() => toggleRisk(row.risk_id, row.is_active)}
                      disabled={isSaving}
                    >
                      {row.is_active ? "Yes" : "No"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Subcategories</th>
                <th className="px-4 py-3">Creation Date</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {activeCategories.map((row, index) => (
                <tr key={row.category_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">
                    {subCategories
                      .filter((sub) => sub.category_id === row.category_id)
                      .map((sub) => sub.name)
                      .slice(0, 3)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">{row.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}

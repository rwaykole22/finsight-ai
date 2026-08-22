"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { apiFetch } from "../../lib/api";

type Budget = {
  id: number;
  category: string;
  monthly_limit: number;
  spent: number;
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingBudget, setEditingBudget] =
    useState<Budget | null>(null);

  const [category, setCategory] = useState("Groceries");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [spent, setSpent] = useState("");

  async function loadBudgets() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/budgets");

      if (!response.ok) {
        throw new Error("Failed to fetch budgets");
      }

      const data = await response.json();
      setBudgets(data);
    } catch (error) {
      console.error("Failed to load budgets:", error);

      setError(
        "Could not load budgets. Please make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBudgets();
  }, []);

  function resetForm() {
    setCategory("Groceries");
    setMonthlyLimit("");
    setSpent("");
    setEditingBudget(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(budget: Budget) {
    setEditingBudget(budget);
    setCategory(budget.category);
    setMonthlyLimit(String(budget.monthly_limit));
    setSpent(String(budget.spent));
    setShowModal(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        category,
        monthly_limit: Number(monthlyLimit),
        spent: Number(spent),
      };

      let response;

      if (editingBudget) {
        response = await apiFetch(
          `/budgets/${editingBudget.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiFetch("/budgets", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error:", errorData);
        throw new Error("Budget request failed");
      }

      const savedBudget = await response.json();

      if (editingBudget) {
        setBudgets((currentBudgets) =>
          currentBudgets.map((budget) =>
            budget.id === savedBudget.id
              ? savedBudget
              : budget
          )
        );
      } else {
        setBudgets((currentBudgets) => [
          ...currentBudgets,
          savedBudget,
        ]);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save budget:", error);
      alert("Could not save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(budget: Budget) {
    const confirmed = window.confirm(
      `Delete ${budget.category} budget?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/budgets/${budget.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      setBudgets((currentBudgets) =>
        currentBudgets.filter(
          (item) => item.id !== budget.id
        )
      );
    } catch (error) {
      console.error("Failed to delete budget:", error);
      alert("Could not delete budget.");
    }
  }

  const totals = useMemo(() => {
    const totalBudget = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.monthly_limit || 0),
      0
    );

    const totalSpent = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.spent || 0),
      0
    );

    const remaining = totalBudget - totalSpent;

    const percentage =
      totalBudget > 0
        ? (totalSpent / totalBudget) * 100
        : 0;

    return {
      totalBudget,
      totalSpent,
      remaining,
      percentage,
    };
  }, [budgets]);

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 sm:text-sm">
              Plan and monitor your monthly spending
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Budgets
            </h1>
          </div>

          <button
            onClick={openAddModal}
            className="shrink-0 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm"
          >
            + Add Budget
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
        <section className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Monthly Budget
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${totals.totalBudget.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Spent
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${totals.totalSpent.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Remaining
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                totals.remaining >= 0
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {totals.remaining < 0 ? "-" : ""}$
              {Math.abs(totals.remaining).toFixed(2)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Monthly Budget Progress
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Overall monthly spending progress
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold text-slate-600">
              {totals.percentage.toFixed(1)}%
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                totals.percentage > 100
                  ? "bg-red-500"
                  : totals.percentage >= 80
                    ? "bg-amber-500"
                    : "bg-slate-900"
              }`}
              style={{
                width: `${Math.min(
                  totals.percentage,
                  100
                )}%`,
              }}
            />
          </div>
        </section>

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="text-sm text-slate-500">
              Loading budgets...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 rounded-2xl bg-red-50 p-5">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((budget) => {
              const limit = Number(
                budget.monthly_limit || 0
              );

              const used = Number(
                budget.spent || 0
              );

              const remaining = limit - used;

              const progress =
                limit > 0
                  ? (used / limit) * 100
                  : 0;

              return (
                <div
                  key={budget.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 sm:text-sm">
                        Category
                      </p>

                      <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
                        {budget.category}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        progress > 100
                          ? "bg-red-50 text-red-600"
                          : progress >= 80
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {progress.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">
                          Spent
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          ${used.toFixed(2)}
                        </p>
                      </div>

                      <p className="text-sm text-slate-500">
                        of ${limit.toFixed(2)}
                      </p>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          progress > 100
                            ? "bg-red-500"
                            : progress >= 80
                              ? "bg-amber-500"
                              : "bg-slate-900"
                        }`}
                        style={{
                          width: `${Math.min(
                            progress,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p
                      className={`mt-3 text-sm font-medium ${
                        remaining >= 0
                          ? "text-slate-600"
                          : "text-red-500"
                      }`}
                    >
                      {remaining >= 0
                        ? `$${remaining.toFixed(2)} remaining`
                        : `$${Math.abs(
                            remaining
                          ).toFixed(2)} over budget`}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() =>
                        openEditModal(budget)
                      }
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(budget)
                      }
                      className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {!loading &&
          !error &&
          budgets.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
              <p className="text-sm text-slate-500">
                No budgets found.
              </p>

              <button
                onClick={openAddModal}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add Your First Budget
              </button>
            </div>
          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  {editingBudget
                    ? "Update your monthly budget"
                    : "Create a new monthly budget"}
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingBudget
                    ? "Edit Budget"
                    : "Add Budget"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Category
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option>Groceries</option>
                  <option>Food & Dining</option>
                  <option>Shopping</option>
                  <option>Transportation</option>
                  <option>Rent</option>
                  <option>Bills</option>
                  <option>Entertainment</option>
                  <option>Travel</option>
                  <option>Health</option>
                  <option>Education</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Monthly Limit
                </label>

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyLimit}
                  onChange={(event) =>
                    setMonthlyLimit(
                      event.target.value
                    )
                  }
                  placeholder="500.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Amount Spent
                </label>

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={spent}
                  onChange={(event) =>
                    setSpent(event.target.value)
                  }
                  placeholder="320.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingBudget
                      ? "Save Changes"
                      : "Add Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
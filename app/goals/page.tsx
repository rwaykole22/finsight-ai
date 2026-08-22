"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { apiFetch } from "../../lib/api";

type Goal = {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingGoal, setEditingGoal] =
    useState<Goal | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  async function loadGoals() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/goals");

      if (!response.ok) {
        throw new Error("Failed to fetch goals");
      }

      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error("Failed to load goals:", error);

      setError(
        "Could not load goals. Please make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function resetForm() {
    setName("");
    setTargetAmount("");
    setSavedAmount("");
    setTargetDate("");
    setEditingGoal(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(goal: Goal) {
    setEditingGoal(goal);

    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setSavedAmount(String(goal.saved_amount));
    setTargetDate(goal.target_date ?? "");

    setShowModal(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        name,
        target_amount: Number(targetAmount),
        saved_amount: Number(savedAmount),
        target_date: targetDate || null,
      };

      let response;

      if (editingGoal) {
        response = await apiFetch(
          `/goals/${editingGoal.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiFetch("/goals", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error:", errorData);

        throw new Error("Goal request failed");
      }

      const savedGoal = await response.json();

      if (editingGoal) {
        setGoals((currentGoals) =>
          currentGoals.map((goal) =>
            goal.id === savedGoal.id
              ? savedGoal
              : goal
          )
        );
      } else {
        setGoals((currentGoals) => [
          ...currentGoals,
          savedGoal,
        ]);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save goal:", error);
      alert("Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goal: Goal) {
    const confirmed = window.confirm(
      `Delete ${goal.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/goals/${goal.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete goal");
      }

      setGoals((currentGoals) =>
        currentGoals.filter(
          (item) => item.id !== goal.id
        )
      );
    } catch (error) {
      console.error("Failed to delete goal:", error);
      alert("Could not delete goal.");
    }
  }

  const totals = useMemo(() => {
    const totalTarget = goals.reduce(
      (sum, goal) =>
        sum + Number(goal.target_amount || 0),
      0
    );

    const totalSaved = goals.reduce(
      (sum, goal) =>
        sum + Number(goal.saved_amount || 0),
      0
    );

    const remaining = totalTarget - totalSaved;

    const progress =
      totalTarget > 0
        ? (totalSaved / totalTarget) * 100
        : 0;

    return {
      totalTarget,
      totalSaved,
      remaining,
      progress,
    };
  }, [goals]);

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 sm:text-sm">
              Track progress toward your financial goals
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Savings Goals
            </h1>
          </div>

          <button
            onClick={openAddModal}
            className="shrink-0 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm"
          >
            + Add Goal
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
        <section className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Goal Amount
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${totals.totalTarget.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Saved
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              ${totals.totalSaved.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Remaining
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              $
              {Math.max(
                totals.remaining,
                0
              ).toFixed(2)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Overall Progress
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Progress across all your savings goals
              </p>
            </div>

            <p className="shrink-0 text-sm font-semibold text-slate-600">
              {totals.progress.toFixed(1)}%
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: `${Math.min(
                  totals.progress,
                  100
                )}%`,
              }}
            />
          </div>
        </section>

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="text-sm text-slate-500">
              Loading savings goals...
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
            {goals.map((goal) => {
              const target = Number(
                goal.target_amount || 0
              );

              const saved = Number(
                goal.saved_amount || 0
              );

              const remaining = Math.max(
                target - saved,
                0
              );

              const progress =
                target > 0
                  ? (saved / target) * 100
                  : 0;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 sm:text-sm">
                        Savings Goal
                      </p>

                      <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
                        {goal.name}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {Math.min(
                        progress,
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Saved
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      ${saved.toFixed(2)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      of ${target.toFixed(2)}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.min(
                            progress,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-3 text-sm font-medium text-slate-600">
                      ${remaining.toFixed(2)} remaining
                    </p>

                    {goal.target_date && (
                      <p className="mt-2 text-xs text-slate-400">
                        Target date: {goal.target_date}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() =>
                        openEditModal(goal)
                      }
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(goal)
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
          goals.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
              <p className="text-sm text-slate-500">
                No savings goals yet.
              </p>

              <button
                onClick={openAddModal}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Add Your First Goal
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
                  {editingGoal
                    ? "Update your savings goal"
                    : "Create a new savings goal"}
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingGoal
                    ? "Edit Goal"
                    : "Add Goal"}
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
                  Goal Name
                </label>

                <input
                  required
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Example: Emergency Fund"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Target Amount
                </label>

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetAmount}
                  onChange={(event) =>
                    setTargetAmount(
                      event.target.value
                    )
                  }
                  placeholder="10000.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Amount Saved
                </label>

                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={savedAmount}
                  onChange={(event) =>
                    setSavedAmount(
                      event.target.value
                    )
                  }
                  placeholder="6500.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Target Date
                </label>

                <input
                  type="date"
                  value={targetDate}
                  onChange={(event) =>
                    setTargetDate(
                      event.target.value
                    )
                  }
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
                    : editingGoal
                      ? "Save Changes"
                      : "Add Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import { apiFetch } from "../../lib/api";

type Investment = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  asset_type: string;
};

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingInvestment, setEditingInvestment] =
    useState<Investment | null>(null);

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [assetType, setAssetType] = useState("Stock");

  async function loadInvestments() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/investments");

      if (!response.ok) {
        throw new Error("Failed to fetch investments");
      }

      const data = await response.json();
      setInvestments(data);
    } catch (error) {
      console.error("Failed to load investments:", error);

      setError(
        "Could not load investments. Please make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvestments();
  }, []);

  function resetForm() {
    setSymbol("");
    setName("");
    setQuantity("");
    setPurchasePrice("");
    setCurrentPrice("");
    setAssetType("Stock");
    setEditingInvestment(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(investment: Investment) {
    setEditingInvestment(investment);

    setSymbol(investment.symbol);
    setName(investment.name);
    setQuantity(String(investment.quantity));
    setPurchasePrice(String(investment.purchase_price));
    setCurrentPrice(String(investment.current_price));
    setAssetType(investment.asset_type);

    setShowModal(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        symbol: symbol.toUpperCase(),
        name,
        quantity: Number(quantity),
        purchase_price: Number(purchasePrice),
        current_price: Number(currentPrice),
        asset_type: assetType,
      };

      let response;

      if (editingInvestment) {
        response = await apiFetch(
          `/investments/${editingInvestment.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiFetch("/investments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();

        console.error("Backend error:", errorData);

        throw new Error("Investment request failed");
      }

      const savedInvestment = await response.json();

      if (editingInvestment) {
        setInvestments((currentInvestments) =>
          currentInvestments.map((investment) =>
            investment.id === savedInvestment.id
              ? savedInvestment
              : investment
          )
        );
      } else {
        setInvestments((currentInvestments) => [
          ...currentInvestments,
          savedInvestment,
        ]);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save investment:", error);

      alert("Could not save investment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(investment: Investment) {
    const confirmed = window.confirm(
      `Delete ${investment.symbol} from your portfolio?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/investments/${investment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete investment");
      }

      setInvestments((currentInvestments) =>
        currentInvestments.filter(
          (item) => item.id !== investment.id
        )
      );
    } catch (error) {
      console.error("Failed to delete investment:", error);

      alert("Could not delete investment.");
    }
  }

  const totals = useMemo(() => {
    const invested = investments.reduce(
      (sum, investment) =>
        sum +
        Number(investment.quantity || 0) *
          Number(investment.purchase_price || 0),
      0
    );

    const currentValue = investments.reduce(
      (sum, investment) =>
        sum +
        Number(investment.quantity || 0) *
          Number(investment.current_price || 0),
      0
    );

    const gainLoss = currentValue - invested;

    const gainLossPercent =
      invested > 0
        ? (gainLoss / invested) * 100
        : 0;

    return {
      invested,
      currentValue,
      gainLoss,
      gainLossPercent,
    };
  }, [investments]);

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 sm:text-sm">
              Track your investment portfolio
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Investments
            </h1>
          </div>

          <button
            onClick={openAddModal}
            className="shrink-0 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm"
          >
            + Add Investment
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Portfolio Value
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${totals.currentValue.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Invested
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${totals.invested.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Gain / Loss
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                totals.gainLoss >= 0
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {totals.gainLoss >= 0 ? "+" : "-"}$
              {Math.abs(totals.gainLoss).toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Return
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                totals.gainLossPercent >= 0
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {totals.gainLossPercent >= 0 ? "+" : ""}
              {totals.gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Portfolio Holdings
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Your authenticated investment holdings
            </p>
          </div>

          {loading && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                Loading investments...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="mt-6 rounded-xl bg-red-50 p-4">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* MOBILE INVESTMENT CARDS */}
              <div className="mt-6 space-y-4 md:hidden">
                {investments.map((investment) => {
                  const purchaseValue =
                    Number(investment.quantity || 0) *
                    Number(
                      investment.purchase_price || 0
                    );

                  const currentValue =
                    Number(investment.quantity || 0) *
                    Number(
                      investment.current_price || 0
                    );

                  const gainLoss =
                    currentValue - purchaseValue;

                  const percentage =
                    purchaseValue > 0
                      ? (gainLoss / purchaseValue) * 100
                      : 0;

                  return (
                    <div
                      key={investment.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-slate-900">
                            {investment.symbol}
                          </p>

                          <p className="mt-1 truncate text-sm text-slate-500">
                            {investment.name}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {investment.asset_type}
                        </span>
                      </div>

                      <div className="mt-5 rounded-xl bg-slate-50 p-4">
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs text-slate-400">
                              Current Value
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                              ${currentValue.toFixed(2)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p
                              className={`font-semibold ${
                                gainLoss >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }`}
                            >
                              {gainLoss >= 0 ? "+" : "-"}$
                              {Math.abs(
                                gainLoss
                              ).toFixed(2)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {percentage >= 0 ? "+" : ""}
                              {percentage.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-400">
                              Quantity
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {Number(
                                investment.quantity
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Current Price
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              $
                              {Number(
                                investment.current_price
                              ).toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Purchase Price
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              $
                              {Number(
                                investment.purchase_price
                              ).toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Cost Basis
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              ${purchaseValue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() =>
                            openEditModal(investment)
                          }
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(investment)
                          }
                          className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE */}
              <div className="mt-6 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3">Investment</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Quantity</th>
                      <th className="pb-3">
                        Purchase Price
                      </th>
                      <th className="pb-3">
                        Current Price
                      </th>
                      <th className="pb-3">Value</th>
                      <th className="pb-3">
                        Gain / Loss
                      </th>
                      <th className="pb-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {investments.map((investment) => {
                      const purchaseValue =
                        Number(
                          investment.quantity || 0
                        ) *
                        Number(
                          investment.purchase_price || 0
                        );

                      const currentValue =
                        Number(
                          investment.quantity || 0
                        ) *
                        Number(
                          investment.current_price || 0
                        );

                      const gainLoss =
                        currentValue - purchaseValue;

                      const percentage =
                        purchaseValue > 0
                          ? (gainLoss /
                              purchaseValue) *
                            100
                          : 0;

                      return (
                        <tr
                          key={investment.id}
                          className="border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="py-4">
                            <p className="font-bold text-slate-900">
                              {investment.symbol}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {investment.name}
                            </p>
                          </td>

                          <td className="py-4 text-sm text-slate-500">
                            {investment.asset_type}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            {Number(
                              investment.quantity
                            )}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            $
                            {Number(
                              investment.purchase_price
                            ).toFixed(2)}
                          </td>

                          <td className="py-4 text-sm text-slate-600">
                            $
                            {Number(
                              investment.current_price
                            ).toFixed(2)}
                          </td>

                          <td className="py-4 font-semibold text-slate-900">
                            ${currentValue.toFixed(2)}
                          </td>

                          <td className="py-4">
                            <p
                              className={`font-semibold ${
                                gainLoss >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }`}
                            >
                              {gainLoss >= 0
                                ? "+"
                                : "-"}
                              $
                              {Math.abs(
                                gainLoss
                              ).toFixed(2)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {percentage >= 0
                                ? "+"
                                : ""}
                              {percentage.toFixed(2)}%
                            </p>
                          </td>

                          <td className="py-4 text-right">
                            <button
                              onClick={() =>
                                openEditModal(
                                  investment
                                )
                              }
                              className="mr-4 text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  investment
                                )
                              }
                              className="text-sm font-medium text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {investments.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">
                    No investments found.
                  </p>

                  <button
                    onClick={openAddModal}
                    className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Add Your First Investment
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  {editingInvestment
                    ? "Update investment details"
                    : "Add a portfolio holding"}
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingInvestment
                    ? "Edit Investment"
                    : "Add Investment"}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Symbol
                  </label>

                  <input
                    required
                    value={symbol}
                    onChange={(event) =>
                      setSymbol(event.target.value)
                    }
                    placeholder="AAPL"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Asset Type
                  </label>

                  <select
                    value={assetType}
                    onChange={(event) =>
                      setAssetType(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option>Stock</option>
                    <option>ETF</option>
                    <option>Crypto</option>
                    <option>Bond</option>
                    <option>Mutual Fund</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Investment Name
                </label>

                <input
                  required
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Apple Inc."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Quantity
                </label>

                <input
                  required
                  type="number"
                  min="0"
                  step="0.0001"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  placeholder="10"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Purchase Price
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(event) =>
                      setPurchasePrice(
                        event.target.value
                      )
                    }
                    placeholder="175.00"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Current Price
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentPrice}
                    onChange={(event) =>
                      setCurrentPrice(
                        event.target.value
                      )
                    }
                    placeholder="190.00"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  />
                </div>
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
                    : editingInvestment
                      ? "Save Changes"
                      : "Add Investment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
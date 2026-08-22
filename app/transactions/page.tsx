"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiFetch } from "../../lib/api";

type Transaction = {
  id: number;
  merchant: string;
  category: string;
  transaction_date: string;
  account: string;
  amount: number;
  type: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [account, setAccount] = useState("Checking");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load transactions:", error);

      setError(
        "Could not load transactions. Please make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  function resetForm() {
    setMerchant("");
    setCategory("Groceries");
    setAccount("Checking");
    setDate("");
    setAmount("");
    setType("expense");
    setEditingTransaction(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(transaction: Transaction) {
    setEditingTransaction(transaction);

    setMerchant(transaction.merchant);
    setCategory(transaction.category);
    setAccount(transaction.account);
    setDate(transaction.transaction_date);
    setAmount(String(transaction.amount));
    setType(transaction.type);

    setShowModal(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const payload = {
        merchant,
        category,
        account,
        transaction_date: date,
        amount: Number(amount),
        type,
      };

      let response;

      if (editingTransaction) {
        response = await apiFetch(
          `/transactions/${editingTransaction.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiFetch("/transactions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();

        console.error("Backend error:", errorData);

        throw new Error("Transaction request failed");
      }

      const savedTransaction = await response.json();

      if (editingTransaction) {
        setTransactions((currentTransactions) =>
          currentTransactions.map((transaction) =>
            transaction.id === savedTransaction.id
              ? savedTransaction
              : transaction
          )
        );
      } else {
        setTransactions((currentTransactions) => [
          savedTransaction,
          ...currentTransactions,
        ]);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save transaction:", error);

      alert("Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    const confirmed = window.confirm(
      `Delete ${transaction.merchant} transaction?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/transactions/${transaction.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }

      setTransactions((currentTransactions) =>
        currentTransactions.filter(
          (item) => item.id !== transaction.id
        )
      );
    } catch (error) {
      console.error("Failed to delete transaction:", error);

      alert("Could not delete transaction.");
    }
  }

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.merchant
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      transaction.category
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      transaction.account
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    );

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    );

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 sm:text-sm">
              Manage your financial activity
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Transactions
            </h1>
          </div>

          <button
            onClick={openAddModal}
            className="shrink-0 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm"
          >
            + Add Transaction
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
        <section className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Transactions
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {transactions.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Income
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              ${totalIncome.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Expenses
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${totalExpenses.toFixed(2)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Transaction History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your authenticated FinSight transactions
              </p>
            </div>

            <input
              type="text"
              placeholder="Search merchant, category, account..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none md:max-w-sm"
            />
          </div>

          {loading && (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">
                Loading transactions...
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
            <div className="mt-6">
              {/* MOBILE TRANSACTION CARDS */}
              <div className="space-y-4 md:hidden">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {transaction.merchant}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {transaction.category}
                        </p>
                      </div>

                      <p
                        className={`shrink-0 text-lg font-bold ${
                          transaction.type === "income"
                            ? "text-emerald-600"
                            : "text-slate-900"
                        }`}
                      >
                        {transaction.type === "income"
                          ? "+"
                          : "-"}
                        $
                        {Number(
                          transaction.amount
                        ).toFixed(2)}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs text-slate-400">
                          Account
                        </p>

                        <p className="mt-1 truncate text-sm font-medium text-slate-700">
                          {transaction.account}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Date
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {transaction.transaction_date}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() =>
                          openEditModal(transaction)
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(transaction)
                        }
                        className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-3">Merchant</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Account</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-right">
                        Amount
                      </th>
                      <th className="pb-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map(
                      (transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-slate-50 hover:bg-slate-50"
                        >
                          <td className="py-4 font-medium text-slate-800">
                            {transaction.merchant}
                          </td>

                          <td className="py-4 text-sm text-slate-500">
                            {transaction.category}
                          </td>

                          <td className="py-4 text-sm text-slate-500">
                            {transaction.account}
                          </td>

                          <td className="py-4 text-sm text-slate-500">
                            {transaction.transaction_date}
                          </td>

                          <td
                            className={`py-4 text-right font-semibold ${
                              transaction.type === "income"
                                ? "text-emerald-600"
                                : "text-slate-800"
                            }`}
                          >
                            {transaction.type === "income"
                              ? "+"
                              : "-"}
                            $
                            {Number(
                              transaction.amount
                            ).toFixed(2)}
                          </td>

                          <td className="py-4 text-right">
                            <button
                              onClick={() =>
                                openEditModal(transaction)
                              }
                              className="mr-4 text-sm font-medium text-slate-600 hover:text-slate-900"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(transaction)
                              }
                              className="text-sm font-medium text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {filteredTransactions.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500">
                  No transactions found.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  {editingTransaction
                    ? "Update financial activity"
                    : "New financial activity"}
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingTransaction
                    ? "Edit Transaction"
                    : "Add Transaction"}
                </h2>
              </div>

              <button
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
                  Merchant
                </label>

                <input
                  required
                  value={merchant}
                  onChange={(event) =>
                    setMerchant(event.target.value)
                  }
                  placeholder="Example: Target"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Amount
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="42.50"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Type
                  </label>

                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="expense">
                      Expense
                    </option>

                    <option value="income">
                      Income
                    </option>
                  </select>
                </div>
              </div>

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
                  <option>Income</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Account
                </label>

                <select
                  value={account}
                  onChange={(event) =>
                    setAccount(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option>Checking</option>
                  <option>Savings</option>
                  <option>Credit Card</option>
                  <option>Cash</option>
                  <option>Investment</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Date
                </label>

                <input
                  required
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
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
                    : editingTransaction
                      ? "Save Changes"
                      : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
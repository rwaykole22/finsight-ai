"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { apiFetch } from "../../lib/api";

type Account = {
  id: number;
  name: string;
  type: string;
  balance: number;
  institution: string | null;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("Checking");
  const [balance, setBalance] = useState("");
  const [institution, setInstitution] = useState("");

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch("/accounts");

      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }

      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);

      setError(
        "Could not load accounts. Please make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function resetForm() {
    setName("");
    setType("Checking");
    setBalance("");
    setInstitution("");
    setEditingAccount(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(account: Account) {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(String(account.balance));
    setInstitution(account.institution ?? "");
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
        type,
        balance: Number(balance),
        institution: institution || null,
      };

      let response;

      if (editingAccount) {
        response = await apiFetch(
          `/accounts/${editingAccount.id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await apiFetch("/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();

        console.error("Backend error:", errorData);

        throw new Error("Account request failed");
      }

      const savedAccount = await response.json();

      if (editingAccount) {
        setAccounts((currentAccounts) =>
          currentAccounts.map((account) =>
            account.id === savedAccount.id
              ? savedAccount
              : account
          )
        );
      } else {
        setAccounts((currentAccounts) => [
          ...currentAccounts,
          savedAccount,
        ]);
      }

      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save account:", error);

      alert("Could not save account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    const confirmed = window.confirm(
      `Delete ${account.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/accounts/${account.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      setAccounts((currentAccounts) =>
        currentAccounts.filter(
          (item) => item.id !== account.id
        )
      );
    } catch (error) {
      console.error("Failed to delete account:", error);

      alert("Could not delete account.");
    }
  }

  const assets = accounts
    .filter((account) => Number(account.balance) >= 0)
    .reduce(
      (sum, account) =>
        sum + Number(account.balance || 0),
      0
    );

  const liabilities = accounts
    .filter((account) => Number(account.balance) < 0)
    .reduce(
      (sum, account) =>
        sum + Math.abs(Number(account.balance || 0)),
      0
    );

  const netWorth = assets - liabilities;

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 sm:text-sm">
              Manage your connected financial accounts
            </p>

            <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Accounts
            </h1>
          </div>

          <button
            onClick={openAddModal}
            className="shrink-0 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 sm:px-4 sm:py-3 sm:text-sm"
          >
            + Add Account
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
        <section className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Assets
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600">
              ${assets.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Total Liabilities
            </p>

            <p className="mt-2 text-2xl font-bold text-red-500">
              ${liabilities.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm text-slate-500">
              Net Worth
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              ${netWorth.toFixed(2)}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Your Accounts
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Only accounts belonging to your signed-in user
            </p>
          </div>

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">
                Loading accounts...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-2xl bg-red-50 p-5">
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-500">
                        {account.institution ||
                          "Financial Institution"}
                      </p>

                      <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
                        {account.name}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {account.type}
                    </span>
                  </div>

                  <div className="mt-6 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Balance
                    </p>

                    <p
                      className={`mt-1 break-words text-2xl font-bold sm:text-3xl ${
                        Number(account.balance) < 0
                          ? "text-red-500"
                          : "text-slate-900"
                      }`}
                    >
                      {Number(account.balance) < 0
                        ? "-"
                        : ""}
                      $
                      {Math.abs(
                        Number(account.balance)
                      ).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() =>
                        openEditModal(account)
                      }
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(account)
                      }
                      className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading &&
            !error &&
            accounts.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
                <p className="text-sm text-slate-500">
                  No accounts found.
                </p>

                <button
                  onClick={openAddModal}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Add Your First Account
                </button>
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
                  {editingAccount
                    ? "Update account details"
                    : "Create a new account"}
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingAccount
                    ? "Edit Account"
                    : "Add Account"}
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
                  Account Name
                </label>

                <input
                  required
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Example: Main Checking"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Institution
                </label>

                <input
                  value={institution}
                  onChange={(event) =>
                    setInstitution(event.target.value)
                  }
                  placeholder="Example: Chase"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Account Type
                </label>

                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option>Checking</option>
                  <option>Savings</option>
                  <option>Credit Card</option>
                  <option>Cash</option>
                  <option>Investment</option>
                  <option>Loan</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Balance
                </label>

                <input
                  required
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(event) =>
                    setBalance(event.target.value)
                  }
                  placeholder="4250.75"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
                />

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Use a negative number for debt, for example
                  -1250.40.
                </p>
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
                    : editingAccount
                      ? "Save Changes"
                      : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
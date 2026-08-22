"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppShell from "./components/AppShell";
import { apiFetch } from "../lib/api";

type Transaction = {
  id: number;
  merchant: string;
  category: string;
  transaction_date: string;
  account: string;
  amount: number;
  type: string;
};

type Account = {
  id: number;
  name: string;
  type: string;
  balance: number;
  institution: string | null;
};

type Budget = {
  id: number;
  category: string;
  monthly_limit: number;
  spent: number;
};

type Goal = {
  id: number;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
};

type Investment = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  asset_type: string;
};

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(
    []
  );

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        transactionsResponse,
        accountsResponse,
        budgetsResponse,
        goalsResponse,
        investmentsResponse,
      ] = await Promise.all([
        apiFetch("/transactions"),
        apiFetch("/accounts"),
        apiFetch("/budgets"),
        apiFetch("/goals"),
        apiFetch("/investments"),
      ]);

      if (
        !transactionsResponse.ok ||
        !accountsResponse.ok ||
        !budgetsResponse.ok ||
        !goalsResponse.ok ||
        !investmentsResponse.ok
      ) {
        throw new Error("Failed to load dashboard data");
      }

      const [
        transactionsData,
        accountsData,
        budgetsData,
        goalsData,
        investmentsData,
      ] = await Promise.all([
        transactionsResponse.json(),
        accountsResponse.json(),
        budgetsResponse.json(),
        goalsResponse.json(),
        investmentsResponse.json(),
      ]);

      setTransactions(transactionsData);
      setAccounts(accountsData);
      setBudgets(budgetsData);
      setGoals(goalsData);
      setInvestments(investmentsData);
    } catch (error) {
      console.error("Dashboard loading error:", error);

      setError(
        "Could not load dashboard data. Make sure the FastAPI backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const income = transactions
      .filter(
        (transaction) => transaction.type === "income"
      )
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const expenses = transactions
      .filter(
        (transaction) => transaction.type === "expense"
      )
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const positiveAccounts = accounts
      .filter(
        (account) => Number(account.balance || 0) >= 0
      )
      .reduce(
        (sum, account) =>
          sum + Number(account.balance || 0),
        0
      );

    const liabilities = accounts
      .filter(
        (account) => Number(account.balance || 0) < 0
      )
      .reduce(
        (sum, account) =>
          sum + Math.abs(Number(account.balance || 0)),
        0
      );

    const investmentValue = investments.reduce(
      (sum, investment) =>
        sum +
        Number(investment.quantity || 0) *
          Number(investment.current_price || 0),
      0
    );

    const netWorth =
      positiveAccounts - liabilities + investmentValue;

    const savingsRate =
      income > 0
        ? ((income - expenses) / income) * 100
        : 0;

    const totalBudget = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.monthly_limit || 0),
      0
    );

    const totalBudgetSpent = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.spent || 0),
      0
    );

    const budgetRemaining =
      totalBudget - totalBudgetSpent;

    return {
      income,
      expenses,
      positiveAccounts,
      liabilities,
      investmentValue,
      netWorth,
      savingsRate,
      totalBudget,
      totalBudgetSpent,
      budgetRemaining,
    };
  }, [
    transactions,
    accounts,
    budgets,
    investments,
  ]);

  const spendingData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    transactions
      .filter(
        (transaction) => transaction.type === "expense"
      )
      .forEach((transaction) => {
        const category =
          transaction.category || "Other";

        categoryTotals[category] =
          (categoryTotals[category] || 0) +
          Number(transaction.amount || 0);
      });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const budgetChartData = useMemo(() => {
    return budgets.map((budget) => ({
      category: budget.category,
      spent: Number(budget.spent || 0),
      limit: Number(budget.monthly_limit || 0),
    }));
  }, [budgets]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      )
      .slice(0, 5);
  }, [transactions]);

  const featuredGoal = useMemo(() => {
    if (goals.length === 0) {
      return null;
    }

    return [...goals].sort((a, b) => {
      const aProgress =
        Number(a.target_amount || 0) > 0
          ? Number(a.saved_amount || 0) /
            Number(a.target_amount)
          : 0;

      const bProgress =
        Number(b.target_amount || 0) > 0
          ? Number(b.saved_amount || 0) /
            Number(b.target_amount)
          : 0;

      return bProgress - aProgress;
    })[0];
  }, [goals]);

  const featuredGoalProgress =
    featuredGoal &&
    Number(featuredGoal.target_amount || 0) > 0
      ? (Number(featuredGoal.saved_amount || 0) /
          Number(featuredGoal.target_amount || 0)) *
        100
      : 0;

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs text-slate-500 sm:text-sm">
            Your financial overview
          </p>

          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            Dashboard
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-5 md:p-8">
        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-medium text-red-600">
              {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading your financial dashboard...
            </p>
          </div>
        )}

        {/* SUMMARY CARDS */}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <DashboardCard
            label="Net Worth"
            value={`$${summary.netWorth.toFixed(2)}`}
            note="Accounts + investments - debt"
          />

          <DashboardCard
            label="Income"
            value={`$${summary.income.toFixed(2)}`}
            note="Recorded income"
            valueClassName="text-emerald-600"
          />

          <DashboardCard
            label="Expenses"
            value={`$${summary.expenses.toFixed(2)}`}
            note="Recorded spending"
          />

          <DashboardCard
            label="Savings Rate"
            value={`${summary.savingsRate.toFixed(1)}%`}
            note={
              summary.income > 0
                ? "Based on recorded income"
                : "Add income to calculate"
            }
          />
        </section>

        {/* MAIN CHARTS */}

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Spending by Category
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Where your recorded expenses are going
              </p>
            </div>

            {spendingData.length > 0 ? (
              <div className="mt-5 h-[260px] w-full sm:h-[300px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={spendingData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      innerRadius="45%"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        `$${Number(value).toFixed(2)}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart text="Add expense transactions to see your spending chart." />
            )}

            {spendingData.length > 0 && (
              <div className="mt-2 space-y-2">
                {spendingData
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="truncate text-slate-500">
                        {item.name}
                      </span>

                      <span className="shrink-0 font-semibold text-slate-900">
                        ${item.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Budget Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Spending compared with your limits
              </p>
            </div>

            {budgetChartData.length > 0 ? (
              <div className="mt-5 h-[260px] w-full sm:h-[300px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={budgetChartData}
                    margin={{
                      top: 10,
                      right: 0,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="category"
                      tick={{
                        fontSize: 10,
                      }}
                      interval={0}
                    />

                    <YAxis
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      formatter={(value) =>
                        `$${Number(value).toFixed(2)}`
                      }
                    />

                    <Bar
                      dataKey="limit"
                      name="Budget"
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="spent"
                      name="Spent"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart text="Add budgets to see your budget chart." />
            )}

            <div className="mt-3 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">
                  Remaining
                </span>

                <span
                  className={`font-bold ${
                    summary.budgetRemaining >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {summary.budgetRemaining < 0
                    ? "-"
                    : ""}
                  $
                  {Math.abs(
                    summary.budgetRemaining
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* LOWER DASHBOARD */}

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          {/* RECENT TRANSACTIONS */}

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Recent Transactions
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Your latest financial activity
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {recentTransactions.map(
                (transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 sm:p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {transaction.merchant}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {transaction.category} •{" "}
                        {transaction.transaction_date}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 text-sm font-bold ${
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
                )
              )}

              {recentTransactions.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No transactions yet.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT SIDE */}

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-semibold text-slate-900">
                Savings Goal
              </p>

              {featuredGoal ? (
                <>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    {featuredGoal.name}
                  </h3>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Saved
                      </p>

                      <p className="mt-1 text-2xl font-bold text-emerald-600">
                        $
                        {Number(
                          featuredGoal.saved_amount
                        ).toFixed(2)}
                      </p>
                    </div>

                    <p className="text-sm text-slate-500">
                      of $
                      {Number(
                        featuredGoal.target_amount
                      ).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          featuredGoalProgress,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {featuredGoalProgress.toFixed(1)}%
                    complete
                  </p>

                  {featuredGoal.target_date && (
                    <p className="mt-2 text-xs text-slate-400">
                      Target:{" "}
                      {featuredGoal.target_date}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Add a savings goal to track your
                  progress here.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm sm:p-5">
              <p className="text-xs text-slate-400">
                FinSight Insight
              </p>

              <h3 className="mt-2 text-lg font-bold">
                Your financial snapshot
              </h3>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                You currently have $
                {summary.positiveAccounts.toFixed(2)} in
                positive account balances and $
                {summary.investmentValue.toFixed(2)} in
                investment value.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-slate-400">
                    Account Assets
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    $
                    {summary.positiveAccounts.toFixed(
                      2
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-slate-400">
                    Investments
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    $
                    {summary.investmentValue.toFixed(
                      2
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function DashboardCard({
  label,
  value,
  note,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  note: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 break-words text-2xl font-bold ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        {note}
      </p>
    </div>
  );
}

function EmptyChart({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-5 flex h-[220px] items-center justify-center rounded-xl bg-slate-50 p-6 text-center sm:h-[260px]">
      <p className="text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}
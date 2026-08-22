"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  target_date?: string | null;
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

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

export default function AssistantPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

  const [input, setInput] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text:
        "Hi! I’m your FinSight Assistant. I can analyze your spending, accounts, budgets, savings goals, and investments using your authenticated FinSight data.",
    },
  ]);

  async function loadFinancialData() {
    try {
      setLoadingData(true);
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
        throw new Error("Failed to load financial data");
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
      console.error("Could not load finance data:", error);

      setError(
        "Could not load your financial data. Please make sure you are logged in and the backend is running."
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadFinancialData();
  }, []);

  const financialSummary = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const expenses = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce(
        (sum, transaction) =>
          sum + Number(transaction.amount || 0),
        0
      );

    const assets = accounts
      .filter((account) => Number(account.balance || 0) >= 0)
      .reduce(
        (sum, account) =>
          sum + Number(account.balance || 0),
        0
      );

    const liabilities = accounts
      .filter((account) => Number(account.balance || 0) < 0)
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

    const amountInvested = investments.reduce(
      (sum, investment) =>
        sum +
        Number(investment.quantity || 0) *
          Number(investment.purchase_price || 0),
      0
    );

    const investmentGain =
      investmentValue - amountInvested;

    const budgetLimit = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.monthly_limit || 0),
      0
    );

    const budgetSpent = budgets.reduce(
      (sum, budget) =>
        sum + Number(budget.spent || 0),
      0
    );

    const savings = income - expenses;

    const netWorth =
      assets - liabilities + investmentValue;

    return {
      income,
      expenses,
      savings,
      assets,
      liabilities,
      investmentValue,
      investmentGain,
      budgetLimit,
      budgetSpent,
      netWorth,
    };
  }, [
    transactions,
    accounts,
    budgets,
    investments,
  ]);

  function getTopSpendingCategory() {
    const categoryTotals: Record<string, number> = {};

    transactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const category =
          transaction.category || "Other";

        categoryTotals[category] =
          (categoryTotals[category] || 0) +
          Number(transaction.amount || 0);
      });

    const categories = Object.entries(categoryTotals);

    if (categories.length === 0) {
      return null;
    }

    categories.sort((a, b) => b[1] - a[1]);

    return {
      category: categories[0][0],
      amount: categories[0][1],
    };
  }

  function getAssistantResponse(question: string) {
    const text = question.toLowerCase();
    const topSpending = getTopSpendingCategory();

    if (
      text.includes("net worth") ||
      text.includes("worth")
    ) {
      return `Your estimated net worth is $${financialSummary.netWorth.toFixed(
        2
      )}. This includes your positive account balances and investments, minus your liabilities.`;
    }

    if (
      text.includes("spending") ||
      text.includes("spend") ||
      text.includes("expenses")
    ) {
      if (!topSpending) {
        return "You do not have enough expense transactions yet for me to analyze your spending.";
      }

      return `You have recorded $${financialSummary.expenses.toFixed(
        2
      )} in expenses. Your highest spending category is ${
        topSpending.category
      } at $${topSpending.amount.toFixed(2)}.`;
    }

    if (
      text.includes("income") ||
      text.includes("salary")
    ) {
      return `You currently have $${financialSummary.income.toFixed(
        2
      )} in recorded income and $${financialSummary.expenses.toFixed(
        2
      )} in recorded expenses.`;
    }

    if (
      text.includes("saving") ||
      text.includes("savings rate")
    ) {
      if (financialSummary.income <= 0) {
        return `You currently have $${financialSummary.expenses.toFixed(
          2
        )} in expenses but no income transactions recorded yet. Add your salary or other income transactions so I can calculate an accurate savings rate.`;
      }

      const rate =
        (financialSummary.savings /
          financialSummary.income) *
        100;

      return `You are currently saving $${financialSummary.savings.toFixed(
        2
      )}, giving you an estimated savings rate of ${rate.toFixed(
        1
      )}%.`;
    }

    if (
      text.includes("budget") ||
      text.includes("budgeting")
    ) {
      const remaining =
        financialSummary.budgetLimit -
        financialSummary.budgetSpent;

      return `Your total monthly budget is $${financialSummary.budgetLimit.toFixed(
        2
      )}. You have used $${financialSummary.budgetSpent.toFixed(
        2
      )}, leaving $${remaining.toFixed(2)} available.`;
    }

    if (
      text.includes("goal") ||
      text.includes("emergency fund")
    ) {
      if (goals.length === 0) {
        return "You currently do not have any savings goals.";
      }

      const bestGoal = [...goals].sort((a, b) => {
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

      const progress =
        Number(bestGoal.target_amount || 0) > 0
          ? (Number(bestGoal.saved_amount || 0) /
              Number(bestGoal.target_amount)) *
            100
          : 0;

      return `Your strongest savings goal is ${
        bestGoal.name
      }. You have saved $${Number(
        bestGoal.saved_amount || 0
      ).toFixed(2)} of $${Number(
        bestGoal.target_amount || 0
      ).toFixed(2)}, which is ${progress.toFixed(
        1
      )}% complete.`;
    }

    if (
      text.includes("investment") ||
      text.includes("portfolio") ||
      text.includes("stock")
    ) {
      return `Your investment portfolio is currently worth $${financialSummary.investmentValue.toFixed(
        2
      )}. Your estimated total gain or loss is ${
        financialSummary.investmentGain >= 0 ? "+" : "-"
      }$${Math.abs(
        financialSummary.investmentGain
      ).toFixed(2)}.`;
    }

    if (
      text.includes("financial health") ||
      text.includes("how am i doing") ||
      text.includes("overview")
    ) {
      return `Here is your current FinSight overview: net worth $${financialSummary.netWorth.toFixed(
        2
      )}, recorded income $${financialSummary.income.toFixed(
        2
      )}, expenses $${financialSummary.expenses.toFixed(
        2
      )}, and investments worth $${financialSummary.investmentValue.toFixed(
        2
      )}. ${
        financialSummary.income === 0
          ? "You should add your income transactions next so I can give you a more complete financial analysis."
          : financialSummary.savings >= 0
            ? "Your recorded cash flow is currently positive."
            : "Your recorded expenses currently exceed your income."
      }`;
    }

    return `I can help you analyze your net worth, spending, income, savings, budgets, goals, and investments. Try asking “What is my net worth?”, “How much am I spending?”, or “How are my investments doing?”`;
  }

  function addQuestion(question: string) {
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: question,
    };

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      text: getAssistantResponse(question),
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const question = input.trim();

    if (!question) {
      return;
    }

    addQuestion(question);
    setInput("");
  }

  return (
    <AppShell>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs text-slate-500 sm:text-sm">
            Ask questions about your finances
          </p>

          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            FinSight AI Assistant
          </h1>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 sm:p-5 md:p-8 xl:grid-cols-[1fr_320px]">
        {/* CHAT */}

        <section className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-h-[620px]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
                AI
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  FinSight Assistant
                </p>

                <p
                  className={`mt-0.5 text-xs ${
                    error
                      ? "text-red-500"
                      : "text-emerald-600"
                  }`}
                >
                  {loadingData
                    ? "Loading your financial data..."
                    : error
                      ? "Could not connect to your data"
                      : "Connected securely"}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 sm:px-5">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 sm:p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[80%] ${
                    message.role === "user"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-slate-100 bg-white p-3 sm:p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                placeholder="Ask about your finances..."
                disabled={loadingData || Boolean(error)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-100"
              />

              <button
                type="submit"
                disabled={
                  loadingData ||
                  Boolean(error) ||
                  !input.trim()
                }
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:shrink-0"
              >
                Ask
              </button>
            </div>
          </form>
        </section>

        {/* SIDE CONTENT */}

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-900">
              Quick Questions
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <QuickQuestion
                text="What is my net worth?"
                disabled={loadingData || Boolean(error)}
                onClick={() =>
                  addQuestion(
                    "What is my net worth?"
                  )
                }
              />

              <QuickQuestion
                text="How much am I spending?"
                disabled={loadingData || Boolean(error)}
                onClick={() =>
                  addQuestion(
                    "How much am I spending?"
                  )
                }
              />

              <QuickQuestion
                text="How is my budget?"
                disabled={loadingData || Boolean(error)}
                onClick={() =>
                  addQuestion(
                    "How is my budget?"
                  )
                }
              />

              <QuickQuestion
                text="How are my savings goals?"
                disabled={loadingData || Boolean(error)}
                onClick={() =>
                  addQuestion(
                    "How are my savings goals?"
                  )
                }
              />

              <QuickQuestion
                text="How are my investments?"
                disabled={loadingData || Boolean(error)}
                onClick={() =>
                  addQuestion(
                    "How are my investments?"
                  )
                }
              />

              <QuickQuestion
                text="How is my financial health?"
                disabled={loadingData || Boolean(error)}
                onClick={() =>
                  addQuestion(
                    "How is my financial health?"
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm sm:p-5">
            <p className="text-sm text-slate-300">
              Live Snapshot
            </p>

            <p className="mt-4 text-xs text-slate-400">
              Net Worth
            </p>

            <p className="mt-1 break-words text-2xl font-bold">
              $
              {financialSummary.netWorth.toFixed(
                2
              )}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-700 pt-4">
              <div>
                <p className="text-xs text-slate-400">
                  Expenses
                </p>

                <p className="mt-1 text-sm font-semibold">
                  $
                  {financialSummary.expenses.toFixed(
                    2
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  Investments
                </p>

                <p className="mt-1 text-sm font-semibold">
                  $
                  {financialSummary.investmentValue.toFixed(
                    2
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-900">
              Secure Data Access
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your assistant reads finance data through your authenticated FastAPI API and only receives records belonging to your signed-in user.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function QuickQuestion({
  text,
  onClick,
  disabled,
}: {
  text: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-left text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {text}
    </button>
  );
}
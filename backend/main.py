import os
from datetime import date
from typing import Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Field, Session, SQLModel, create_engine, select
from supabase import create_client


# =========================================================
# ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "",
).strip()

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "",
).strip()

SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY",
    "",
).strip()


if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing from environment variables"
    )

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing from environment variables"
    )

if not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError(
        "SUPABASE_PUBLISHABLE_KEY is missing from environment variables"
    )


# =========================================================
# DATABASE
# =========================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


def get_session():
    with Session(engine) as session:
        yield session


# =========================================================
# SUPABASE AUTH
# =========================================================

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    ),
):
    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        return response.user

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Authentication error:",
            repr(error),
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )


def get_user_id(user) -> UUID:
    try:
        return UUID(str(user.id))

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid user ID",
        )


# =========================================================
# DATABASE MODELS
# =========================================================


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    merchant: str
    category: str
    transaction_date: date
    account: str
    amount: float
    type: str

    user_id: Optional[UUID] = Field(
        default=None
    )


class Account(SQLModel, table=True):
    __tablename__ = "accounts"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    name: str
    type: str
    balance: float
    institution: Optional[str] = None

    user_id: Optional[UUID] = Field(
        default=None
    )


class Budget(SQLModel, table=True):
    __tablename__ = "budgets"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    category: str
    monthly_limit: float
    spent: float

    user_id: Optional[UUID] = Field(
        default=None
    )


class Goal(SQLModel, table=True):
    __tablename__ = "goals"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    name: str
    target_amount: float
    saved_amount: float
    target_date: Optional[date] = None

    user_id: Optional[UUID] = Field(
        default=None
    )


class Investment(SQLModel, table=True):
    __tablename__ = "investments"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    symbol: str
    name: str
    quantity: float
    purchase_price: float
    current_price: float
    asset_type: str

    user_id: Optional[UUID] = Field(
        default=None
    )


# =========================================================
# REQUEST / RESPONSE MODELS
# =========================================================


class TransactionCreate(SQLModel):
    merchant: str
    category: str
    transaction_date: date
    account: str
    amount: float
    type: str


class TransactionUpdate(SQLModel):
    merchant: str
    category: str
    transaction_date: date
    account: str
    amount: float
    type: str


class TransactionRead(SQLModel):
    id: int
    merchant: str
    category: str
    transaction_date: date
    account: str
    amount: float
    type: str


class AccountCreate(SQLModel):
    name: str
    type: str
    balance: float
    institution: Optional[str] = None


class AccountUpdate(SQLModel):
    name: str
    type: str
    balance: float
    institution: Optional[str] = None


class AccountRead(SQLModel):
    id: int
    name: str
    type: str
    balance: float
    institution: Optional[str] = None


class BudgetCreate(SQLModel):
    category: str
    monthly_limit: float
    spent: float


class BudgetUpdate(SQLModel):
    category: str
    monthly_limit: float
    spent: float


class BudgetRead(SQLModel):
    id: int
    category: str
    monthly_limit: float
    spent: float


class GoalCreate(SQLModel):
    name: str
    target_amount: float
    saved_amount: float
    target_date: Optional[date] = None


class GoalUpdate(SQLModel):
    name: str
    target_amount: float
    saved_amount: float
    target_date: Optional[date] = None


class GoalRead(SQLModel):
    id: int
    name: str
    target_amount: float
    saved_amount: float
    target_date: Optional[date] = None


class InvestmentCreate(SQLModel):
    symbol: str
    name: str
    quantity: float
    purchase_price: float
    current_price: float
    asset_type: str


class InvestmentUpdate(SQLModel):
    symbol: str
    name: str
    quantity: float
    purchase_price: float
    current_price: float
    asset_type: str


class InvestmentRead(SQLModel):
    id: int
    symbol: str
    name: str
    quantity: float
    purchase_price: float
    current_price: float
    asset_type: str


class AssistantRequest(SQLModel):
    question: str


class AssistantResponse(SQLModel):
    answer: str


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="FinSight AI API",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://finsight-ai-web-three.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# PUBLIC ROUTES
# =========================================================


@app.get("/")
def root():
    return {
        "message": "FinSight AI backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": "connected",
        "authentication": "enabled",
        "assistant": "enabled",
    }


# =========================================================
# TRANSACTIONS
# =========================================================


@app.get(
    "/transactions",
    response_model=list[TransactionRead],
)
def get_transactions(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    statement = (
        select(Transaction)
        .where(
            Transaction.user_id == user_id
        )
        .order_by(
            Transaction.transaction_date.desc()
        )
    )

    return session.exec(statement).all()


@app.post(
    "/transactions",
    response_model=TransactionRead,
)
def create_transaction(
    transaction_data: TransactionCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    transaction = Transaction(
        merchant=transaction_data.merchant,
        category=transaction_data.category,
        transaction_date=transaction_data.transaction_date,
        account=transaction_data.account,
        amount=transaction_data.amount,
        type=transaction_data.type,
        user_id=get_user_id(user),
    )

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


@app.put(
    "/transactions/{transaction_id}",
    response_model=TransactionRead,
)
def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id
        == get_user_id(user),
    )

    transaction = session.exec(
        statement
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    transaction.merchant = transaction_data.merchant
    transaction.category = transaction_data.category
    transaction.transaction_date = (
        transaction_data.transaction_date
    )
    transaction.account = transaction_data.account
    transaction.amount = transaction_data.amount
    transaction.type = transaction_data.type

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


@app.delete(
    "/transactions/{transaction_id}"
)
def delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id
        == get_user_id(user),
    )

    transaction = session.exec(
        statement
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    session.delete(transaction)
    session.commit()

    return {
        "message":
        "Transaction deleted successfully"
    }


# =========================================================
# ACCOUNTS
# =========================================================


@app.get(
    "/accounts",
    response_model=list[AccountRead],
)
def get_accounts(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Account).where(
        Account.user_id
        == get_user_id(user)
    )

    return session.exec(statement).all()


@app.post(
    "/accounts",
    response_model=AccountRead,
)
def create_account(
    account_data: AccountCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    account = Account(
        name=account_data.name,
        type=account_data.type,
        balance=account_data.balance,
        institution=account_data.institution,
        user_id=get_user_id(user),
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@app.put(
    "/accounts/{account_id}",
    response_model=AccountRead,
)
def update_account(
    account_id: int,
    account_data: AccountUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Account).where(
        Account.id == account_id,
        Account.user_id
        == get_user_id(user),
    )

    account = session.exec(
        statement
    ).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    account.name = account_data.name
    account.type = account_data.type
    account.balance = account_data.balance
    account.institution = (
        account_data.institution
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@app.delete(
    "/accounts/{account_id}"
)
def delete_account(
    account_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Account).where(
        Account.id == account_id,
        Account.user_id
        == get_user_id(user),
    )

    account = session.exec(
        statement
    ).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    session.delete(account)
    session.commit()

    return {
        "message":
        "Account deleted successfully"
    }


# =========================================================
# BUDGETS
# =========================================================


@app.get(
    "/budgets",
    response_model=list[BudgetRead],
)
def get_budgets(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Budget).where(
        Budget.user_id
        == get_user_id(user)
    )

    return session.exec(statement).all()


@app.post(
    "/budgets",
    response_model=BudgetRead,
)
def create_budget(
    budget_data: BudgetCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    budget = Budget(
        category=budget_data.category,
        monthly_limit=(
            budget_data.monthly_limit
        ),
        spent=budget_data.spent,
        user_id=get_user_id(user),
    )

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return budget


@app.put(
    "/budgets/{budget_id}",
    response_model=BudgetRead,
)
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Budget).where(
        Budget.id == budget_id,
        Budget.user_id
        == get_user_id(user),
    )

    budget = session.exec(
        statement
    ).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    budget.category = budget_data.category
    budget.monthly_limit = (
        budget_data.monthly_limit
    )
    budget.spent = budget_data.spent

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return budget


@app.delete(
    "/budgets/{budget_id}"
)
def delete_budget(
    budget_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Budget).where(
        Budget.id == budget_id,
        Budget.user_id
        == get_user_id(user),
    )

    budget = session.exec(
        statement
    ).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    session.delete(budget)
    session.commit()

    return {
        "message":
        "Budget deleted successfully"
    }


# =========================================================
# GOALS
# =========================================================


@app.get(
    "/goals",
    response_model=list[GoalRead],
)
def get_goals(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Goal).where(
        Goal.user_id
        == get_user_id(user)
    )

    return session.exec(statement).all()


@app.post(
    "/goals",
    response_model=GoalRead,
)
def create_goal(
    goal_data: GoalCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    goal = Goal(
        name=goal_data.name,
        target_amount=(
            goal_data.target_amount
        ),
        saved_amount=(
            goal_data.saved_amount
        ),
        target_date=(
            goal_data.target_date
        ),
        user_id=get_user_id(user),
    )

    session.add(goal)
    session.commit()
    session.refresh(goal)

    return goal


@app.put(
    "/goals/{goal_id}",
    response_model=GoalRead,
)
def update_goal(
    goal_id: int,
    goal_data: GoalUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Goal).where(
        Goal.id == goal_id,
        Goal.user_id
        == get_user_id(user),
    )

    goal = session.exec(
        statement
    ).first()

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    goal.name = goal_data.name
    goal.target_amount = (
        goal_data.target_amount
    )
    goal.saved_amount = (
        goal_data.saved_amount
    )
    goal.target_date = (
        goal_data.target_date
    )

    session.add(goal)
    session.commit()
    session.refresh(goal)

    return goal


@app.delete(
    "/goals/{goal_id}"
)
def delete_goal(
    goal_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Goal).where(
        Goal.id == goal_id,
        Goal.user_id
        == get_user_id(user),
    )

    goal = session.exec(
        statement
    ).first()

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    session.delete(goal)
    session.commit()

    return {
        "message":
        "Goal deleted successfully"
    }


# =========================================================
# INVESTMENTS
# =========================================================


@app.get(
    "/investments",
    response_model=list[InvestmentRead],
)
def get_investments(
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Investment).where(
        Investment.user_id
        == get_user_id(user)
    )

    return session.exec(statement).all()


@app.post(
    "/investments",
    response_model=InvestmentRead,
)
def create_investment(
    investment_data: InvestmentCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    investment = Investment(
        symbol=investment_data.symbol,
        name=investment_data.name,
        quantity=investment_data.quantity,
        purchase_price=(
            investment_data.purchase_price
        ),
        current_price=(
            investment_data.current_price
        ),
        asset_type=(
            investment_data.asset_type
        ),
        user_id=get_user_id(user),
    )

    session.add(investment)
    session.commit()
    session.refresh(investment)

    return investment


@app.put(
    "/investments/{investment_id}",
    response_model=InvestmentRead,
)
def update_investment(
    investment_id: int,
    investment_data: InvestmentUpdate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Investment).where(
        Investment.id == investment_id,
        Investment.user_id
        == get_user_id(user),
    )

    investment = session.exec(
        statement
    ).first()

    if not investment:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    investment.symbol = (
        investment_data.symbol
    )
    investment.name = (
        investment_data.name
    )
    investment.quantity = (
        investment_data.quantity
    )
    investment.purchase_price = (
        investment_data.purchase_price
    )
    investment.current_price = (
        investment_data.current_price
    )
    investment.asset_type = (
        investment_data.asset_type
    )

    session.add(investment)
    session.commit()
    session.refresh(investment)

    return investment


@app.delete(
    "/investments/{investment_id}"
)
def delete_investment(
    investment_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    statement = select(Investment).where(
        Investment.id == investment_id,
        Investment.user_id
        == get_user_id(user),
    )

    investment = session.exec(
        statement
    ).first()

    if not investment:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    session.delete(investment)
    session.commit()

    return {
        "message":
        "Investment deleted successfully"
    }


# =========================================================
# FREE FINANCIAL ASSISTANT
# =========================================================


@app.post(
    "/assistant",
    response_model=AssistantResponse,
)
def ask_assistant(
    request: AssistantRequest,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    question = request.question.strip().lower()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty",
        )

    user_id = get_user_id(user)

    transactions = session.exec(
        select(Transaction).where(
            Transaction.user_id == user_id
        )
    ).all()

    accounts = session.exec(
        select(Account).where(
            Account.user_id == user_id
        )
    ).all()

    budgets = session.exec(
        select(Budget).where(
            Budget.user_id == user_id
        )
    ).all()

    goals = session.exec(
        select(Goal).where(
            Goal.user_id == user_id
        )
    ).all()

    investments = session.exec(
        select(Investment).where(
            Investment.user_id == user_id
        )
    ).all()

    # -----------------------------------------------------
    # CORE CALCULATIONS
    # -----------------------------------------------------

    total_income = sum(
        float(transaction.amount)
        for transaction in transactions
        if transaction.type.lower() == "income"
    )

    total_expenses = sum(
        float(transaction.amount)
        for transaction in transactions
        if transaction.type.lower() == "expense"
    )

    positive_accounts = sum(
        float(account.balance)
        for account in accounts
        if float(account.balance) >= 0
    )

    liabilities = sum(
        abs(float(account.balance))
        for account in accounts
        if float(account.balance) < 0
    )

    investment_value = sum(
        float(investment.quantity)
        * float(investment.current_price)
        for investment in investments
    )

    investment_cost = sum(
        float(investment.quantity)
        * float(investment.purchase_price)
        for investment in investments
    )

    investment_gain_loss = (
        investment_value
        - investment_cost
    )

    net_worth = (
        positive_accounts
        - liabilities
        + investment_value
    )

    savings = (
        total_income
        - total_expenses
    )

    savings_rate = (
        (savings / total_income) * 100
        if total_income > 0
        else 0
    )

    # -----------------------------------------------------
    # SPENDING BY CATEGORY
    # -----------------------------------------------------

    category_totals: dict[str, float] = {}

    for transaction in transactions:
        if transaction.type.lower() != "expense":
            continue

        category = transaction.category.strip()

        if not category:
            category = "Uncategorized"

        category_totals[category] = (
            category_totals.get(
                category,
                0,
            )
            + float(transaction.amount)
        )

    sorted_categories = sorted(
        category_totals.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    top_category = (
        sorted_categories[0][0]
        if sorted_categories
        else None
    )

    top_category_amount = (
        sorted_categories[0][1]
        if sorted_categories
        else 0
    )

    # -----------------------------------------------------
    # NET WORTH
    # -----------------------------------------------------

    if (
        "net worth" in question
        or "worth" in question
    ):
        return AssistantResponse(
            answer=(
                f"Your current net worth is "
                f"${net_worth:,.2f}. "
                f"That comes from "
                f"${positive_accounts:,.2f} in positive "
                f"account balances, minus "
                f"${liabilities:,.2f} in liabilities, "
                f"plus ${investment_value:,.2f} "
                f"in investments."
            )
        )

    # -----------------------------------------------------
    # HIGHEST SPENDING CATEGORY
    # -----------------------------------------------------

    if (
        "highest spending" in question
        or "spending the most" in question
        or "spend the most" in question
        or "most money" in question
        or (
            "category" in question
            and "spend" in question
        )
    ):
        if not top_category:
            return AssistantResponse(
                answer=(
                    "You do not have enough expense "
                    "transactions yet for me to identify "
                    "your highest spending category."
                )
            )

        return AssistantResponse(
            answer=(
                f"Your highest spending category is "
                f"{top_category}. You have recorded "
                f"${top_category_amount:,.2f} "
                f"in expenses in that category."
            )
        )

    # -----------------------------------------------------
    # SPENDING BREAKDOWN
    # -----------------------------------------------------

    if (
        "breakdown" in question
        and (
            "spend" in question
            or "expense" in question
        )
    ):
        if not sorted_categories:
            return AssistantResponse(
                answer=(
                    "You do not have any expense "
                    "transactions recorded yet."
                )
            )

        breakdown = "; ".join(
            f"{category}: ${amount:,.2f}"
            for category, amount
            in sorted_categories[:5]
        )

        return AssistantResponse(
            answer=(
                f"Your top spending categories are: "
                f"{breakdown}."
            )
        )

    # -----------------------------------------------------
    # TOTAL EXPENSES
    # -----------------------------------------------------

    if (
        "how much have i spent" in question
        or "total spending" in question
        or "total expenses" in question
        or question == "expenses"
    ):
        answer = (
            f"You have recorded "
            f"${total_expenses:,.2f} "
            f"in total expenses."
        )

        if top_category:
            answer += (
                f" Your largest spending category "
                f"is {top_category} at "
                f"${top_category_amount:,.2f}."
            )

        return AssistantResponse(
            answer=answer
        )

    # -----------------------------------------------------
    # INCOME
    # -----------------------------------------------------

    if "income" in question:
        return AssistantResponse(
            answer=(
                f"You currently have "
                f"${total_income:,.2f} "
                f"in recorded income."
            )
        )

    # -----------------------------------------------------
    # SAVINGS
    # -----------------------------------------------------

    if (
        "saving" in question
        and "goal" not in question
    ):
        if total_income <= 0:
            return AssistantResponse(
                answer=(
                    f"You have recorded "
                    f"${total_expenses:,.2f} in expenses, "
                    f"but no income yet. "
                    f"Add your income transactions so "
                    f"I can calculate a meaningful "
                    f"savings rate."
                )
            )

        return AssistantResponse(
            answer=(
                f"Based on your recorded income and "
                f"expenses, your savings amount is "
                f"${savings:,.2f}. "
                f"Your savings rate is approximately "
                f"{savings_rate:.1f}%."
            )
        )

    # -----------------------------------------------------
    # BUDGETS
    # -----------------------------------------------------

    if (
        "budget" in question
        or "budgets" in question
    ):
        if not budgets:
            return AssistantResponse(
                answer=(
                    "You do not currently have "
                    "any budgets saved in FinSight."
                )
            )

        total_limit = sum(
            float(budget.monthly_limit)
            for budget in budgets
        )

        total_spent = sum(
            float(budget.spent)
            for budget in budgets
        )

        remaining = (
            total_limit
            - total_spent
        )

        over_budget = [
            budget
            for budget in budgets
            if float(budget.spent)
            > float(budget.monthly_limit)
        ]

        near_limit = [
            budget
            for budget in budgets
            if float(budget.monthly_limit) > 0
            and (
                float(budget.spent)
                / float(budget.monthly_limit)
            )
            >= 0.8
            and float(budget.spent)
            <= float(budget.monthly_limit)
        ]

        answer = (
            f"Your total monthly budget is "
            f"${total_limit:,.2f}. "
            f"You have used "
            f"${total_spent:,.2f}, "
            f"leaving ${remaining:,.2f}."
        )

        if over_budget:
            categories = ", ".join(
                budget.category
                for budget in over_budget
            )

            answer += (
                f" You are over budget in: "
                f"{categories}."
            )

        elif near_limit:
            categories = ", ".join(
                budget.category
                for budget in near_limit
            )

            answer += (
                f" You are getting close to the limit "
                f"in: {categories}."
            )

        else:
            answer += (
                " None of your saved budgets "
                "are currently over their limits."
            )

        return AssistantResponse(
            answer=answer
        )

    # -----------------------------------------------------
    # SAVINGS GOALS
    # -----------------------------------------------------

    if (
        "goal" in question
        or "goals" in question
    ):
        if not goals:
            return AssistantResponse(
                answer=(
                    "You do not currently have "
                    "any savings goals saved in FinSight."
                )
            )

        goal_parts = []

        for goal in goals:
            target = float(
                goal.target_amount
            )

            saved = float(
                goal.saved_amount
            )

            remaining = max(
                target - saved,
                0,
            )

            percent = (
                (saved / target) * 100
                if target > 0
                else 0
            )

            part = (
                f"{goal.name}: "
                f"${saved:,.2f} of "
                f"${target:,.2f} saved "
                f"({percent:.1f}%), "
                f"${remaining:,.2f} remaining"
            )

            if goal.target_date:
                part += (
                    f", target date "
                    f"{goal.target_date}"
                )

            goal_parts.append(part)

        return AssistantResponse(
            answer=(
                "Your savings goals are: "
                + "; ".join(goal_parts)
                + "."
            )
        )

    # -----------------------------------------------------
    # INVESTMENTS
    # -----------------------------------------------------

    if (
        "investment" in question
        or "investments" in question
        or "portfolio" in question
        or "stocks" in question
    ):
        if not investments:
            return AssistantResponse(
                answer=(
                    "You do not currently have "
                    "any investments saved in FinSight."
                )
            )

        percentage = (
            (
                investment_gain_loss
                / investment_cost
            )
            * 100
            if investment_cost > 0
            else 0
        )

        answer = (
            f"Your investments are currently worth "
            f"${investment_value:,.2f}. "
            f"Your recorded cost basis is "
            f"${investment_cost:,.2f}. "
        )

        if investment_gain_loss >= 0:
            answer += (
                f"That is a gain of "
                f"${investment_gain_loss:,.2f} "
                f"({percentage:.1f}%)."
            )
        else:
            answer += (
                f"That is a loss of "
                f"${abs(investment_gain_loss):,.2f} "
                f"({abs(percentage):.1f}%)."
            )

        return AssistantResponse(
            answer=answer
        )

    # -----------------------------------------------------
    # ACCOUNTS
    # -----------------------------------------------------

    if (
        "account" in question
        or "balance" in question
    ):
        if not accounts:
            return AssistantResponse(
                answer=(
                    "You do not currently have "
                    "any accounts saved in FinSight."
                )
            )

        account_text = "; ".join(
            (
                f"{account.name}: "
                f"${float(account.balance):,.2f}"
            )
            for account in accounts
        )

        return AssistantResponse(
            answer=(
                "Your account balances are: "
                + account_text
                + "."
            )
        )

    # -----------------------------------------------------
    # DEBT / LIABILITIES
    # -----------------------------------------------------

    if (
        "debt" in question
        or "liabilit" in question
    ):
        if liabilities <= 0:
            return AssistantResponse(
                answer=(
                    "You currently have no negative "
                    "account balances recorded as "
                    "liabilities in FinSight."
                )
            )

        return AssistantResponse(
            answer=(
                f"You currently have "
                f"${liabilities:,.2f} "
                f"in recorded liabilities."
            )
        )

    # -----------------------------------------------------
    # FINANCIAL HEALTH / FOCUS
    # -----------------------------------------------------

    if (
        "financial health" in question
        or "focus" in question
        or "advice" in question
        or "how am i doing" in question
    ):
        tips = []

        if total_income > 0:
            if savings_rate < 0:
                tips.append(
                    "your recorded expenses are "
                    "higher than your income"
                )

            elif savings_rate < 10:
                tips.append(
                    f"your savings rate is about "
                    f"{savings_rate:.1f}%, so increasing "
                    f"your savings margin could help"
                )

            else:
                tips.append(
                    f"your savings rate is about "
                    f"{savings_rate:.1f}%"
                )

        else:
            tips.append(
                "you have not recorded income yet, "
                "so add income transactions for a "
                "more complete financial picture"
            )

        if liabilities > 0:
            tips.append(
                f"you have "
                f"${liabilities:,.2f} "
                f"in recorded liabilities"
            )

        if top_category:
            tips.append(
                f"your largest spending category "
                f"is {top_category} at "
                f"${top_category_amount:,.2f}"
            )

        if goals:
            incomplete_goals = [
                goal
                for goal in goals
                if float(goal.saved_amount)
                < float(goal.target_amount)
            ]

            if incomplete_goals:
                tips.append(
                    "you still have active savings "
                    "goals to work toward"
                )

        return AssistantResponse(
            answer=(
                "Based on your FinSight data, "
                + "; ".join(tips)
                + "."
            )
        )

    # -----------------------------------------------------
    # HELP
    # -----------------------------------------------------

    if (
        "help" in question
        or "what can you do" in question
    ):
        return AssistantResponse(
            answer=(
                "I can analyze the financial data "
                "saved in FinSight. Ask me about "
                "your net worth, spending, top "
                "spending categories, income, "
                "savings, budgets, goals, accounts, "
                "liabilities, investments, or "
                "overall financial health."
            )
        )

    # -----------------------------------------------------
    # DEFAULT
    # -----------------------------------------------------

    return AssistantResponse(
        answer=(
            "I can help analyze your FinSight data. "
            "Try asking: "
            "'What is my net worth?', "
            "'Which category am I spending the most on?', "
            "'How are my budgets doing?', "
            "'How are my savings goals progressing?', "
            "or 'How are my investments performing?'"
        )
    )
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

DATABASE_URL = os.getenv("DATABASE_URL")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY"
)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing from backend/.env")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing from backend/.env")

if not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError(
        "SUPABASE_PUBLISHABLE_KEY is missing from backend/.env"
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
        print("Authentication error:", error)

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

    # IMPORTANT:
    # Do NOT add foreign_key="auth.users.id" here.
    # Supabase already has the real database foreign key.
    user_id: Optional[UUID] = Field(default=None)


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

    user_id: Optional[UUID] = Field(default=None)


class Budget(SQLModel, table=True):
    __tablename__ = "budgets"

    id: Optional[int] = Field(
        default=None,
        primary_key=True,
    )

    category: str
    monthly_limit: float
    spent: float

    user_id: Optional[UUID] = Field(default=None)


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

    user_id: Optional[UUID] = Field(default=None)


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

    user_id: Optional[UUID] = Field(default=None)


# =========================================================
# REQUEST / RESPONSE MODELS
# =========================================================


# -------------------------
# TRANSACTIONS
# -------------------------


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


# -------------------------
# ACCOUNTS
# -------------------------


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


# -------------------------
# BUDGETS
# -------------------------


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


# -------------------------
# GOALS
# -------------------------


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


# -------------------------
# INVESTMENTS
# -------------------------


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
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc())
    )

    transactions = session.exec(statement).all()

    return transactions


@app.post(
    "/transactions",
    response_model=TransactionRead,
)
def create_transaction(
    transaction_data: TransactionCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    transaction = Transaction(
        merchant=transaction_data.merchant,
        category=transaction_data.category,
        transaction_date=transaction_data.transaction_date,
        account=transaction_data.account,
        amount=transaction_data.amount,
        type=transaction_data.type,
        user_id=user_id,
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
    user_id = get_user_id(user)

    statement = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
    )

    transaction = session.exec(statement).first()

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


@app.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    statement = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
    )

    transaction = session.exec(statement).first()

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    session.delete(transaction)
    session.commit()

    return {
        "message": "Transaction deleted successfully"
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
    user_id = get_user_id(user)

    statement = select(Account).where(
        Account.user_id == user_id
    )

    accounts = session.exec(statement).all()

    return accounts


@app.post(
    "/accounts",
    response_model=AccountRead,
)
def create_account(
    account_data: AccountCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    account = Account(
        name=account_data.name,
        type=account_data.type,
        balance=account_data.balance,
        institution=account_data.institution,
        user_id=user_id,
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
    user_id = get_user_id(user)

    statement = select(Account).where(
        Account.id == account_id,
        Account.user_id == user_id,
    )

    account = session.exec(statement).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    account.name = account_data.name
    account.type = account_data.type
    account.balance = account_data.balance
    account.institution = account_data.institution

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@app.delete("/accounts/{account_id}")
def delete_account(
    account_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    statement = select(Account).where(
        Account.id == account_id,
        Account.user_id == user_id,
    )

    account = session.exec(statement).first()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    session.delete(account)
    session.commit()

    return {
        "message": "Account deleted successfully"
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
    user_id = get_user_id(user)

    statement = select(Budget).where(
        Budget.user_id == user_id
    )

    budgets = session.exec(statement).all()

    return budgets


@app.post(
    "/budgets",
    response_model=BudgetRead,
)
def create_budget(
    budget_data: BudgetCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    budget = Budget(
        category=budget_data.category,
        monthly_limit=budget_data.monthly_limit,
        spent=budget_data.spent,
        user_id=user_id,
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
    user_id = get_user_id(user)

    statement = select(Budget).where(
        Budget.id == budget_id,
        Budget.user_id == user_id,
    )

    budget = session.exec(statement).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    budget.category = budget_data.category
    budget.monthly_limit = budget_data.monthly_limit
    budget.spent = budget_data.spent

    session.add(budget)
    session.commit()
    session.refresh(budget)

    return budget


@app.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    statement = select(Budget).where(
        Budget.id == budget_id,
        Budget.user_id == user_id,
    )

    budget = session.exec(statement).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found",
        )

    session.delete(budget)
    session.commit()

    return {
        "message": "Budget deleted successfully"
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
    user_id = get_user_id(user)

    statement = select(Goal).where(
        Goal.user_id == user_id
    )

    goals = session.exec(statement).all()

    return goals


@app.post(
    "/goals",
    response_model=GoalRead,
)
def create_goal(
    goal_data: GoalCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    goal = Goal(
        name=goal_data.name,
        target_amount=goal_data.target_amount,
        saved_amount=goal_data.saved_amount,
        target_date=goal_data.target_date,
        user_id=user_id,
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
    user_id = get_user_id(user)

    statement = select(Goal).where(
        Goal.id == goal_id,
        Goal.user_id == user_id,
    )

    goal = session.exec(statement).first()

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    goal.name = goal_data.name
    goal.target_amount = goal_data.target_amount
    goal.saved_amount = goal_data.saved_amount
    goal.target_date = goal_data.target_date

    session.add(goal)
    session.commit()
    session.refresh(goal)

    return goal


@app.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    statement = select(Goal).where(
        Goal.id == goal_id,
        Goal.user_id == user_id,
    )

    goal = session.exec(statement).first()

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    session.delete(goal)
    session.commit()

    return {
        "message": "Goal deleted successfully"
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
    user_id = get_user_id(user)

    statement = select(Investment).where(
        Investment.user_id == user_id
    )

    investments = session.exec(statement).all()

    return investments


@app.post(
    "/investments",
    response_model=InvestmentRead,
)
def create_investment(
    investment_data: InvestmentCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    investment = Investment(
        symbol=investment_data.symbol,
        name=investment_data.name,
        quantity=investment_data.quantity,
        purchase_price=investment_data.purchase_price,
        current_price=investment_data.current_price,
        asset_type=investment_data.asset_type,
        user_id=user_id,
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
    user_id = get_user_id(user)

    statement = select(Investment).where(
        Investment.id == investment_id,
        Investment.user_id == user_id,
    )

    investment = session.exec(statement).first()

    if not investment:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    investment.symbol = investment_data.symbol
    investment.name = investment_data.name
    investment.quantity = investment_data.quantity
    investment.purchase_price = (
        investment_data.purchase_price
    )
    investment.current_price = (
        investment_data.current_price
    )
    investment.asset_type = investment_data.asset_type

    session.add(investment)
    session.commit()
    session.refresh(investment)

    return investment


@app.delete("/investments/{investment_id}")
def delete_investment(
    investment_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    user_id = get_user_id(user)

    statement = select(Investment).where(
        Investment.id == investment_id,
        Investment.user_id == user_id,
    )

    investment = session.exec(statement).first()

    if not investment:
        raise HTTPException(
            status_code=404,
            detail="Investment not found",
        )

    session.delete(investment)
    session.commit()

    return {
        "message": "Investment deleted successfully"
    }
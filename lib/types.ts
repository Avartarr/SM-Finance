export type MonthStatus = "open" | "closed";

export type Category =
  | "Household"
  | "Food"
  | "Transport"
  | "Utilities"
  | "Health"
  | "Entertainment"
  | "Savings"
  | "Other";

export type Month = {
  id: string;
  month_start: string;
  status: MonthStatus;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
};

export type Budget = {
  id: string;
  month_id: string;
  house_budget_amount: number;
  total_budget_amount: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdditionalIncome = {
  id: string;
  month_id: string;
  title: string;
  amount: number;
  date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type DirectDebit = {
  id: string;
  name: string;
  amount: number;
  category: string;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DirectDebitMonthStatus = {
  id: string;
  month_id: string;
  direct_debit_id: string;
  is_enabled: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  month_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Saving = {
  id: string;
  month_id: string;
  title: string;
  amount: number;
  date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreditCardTotal = {
  id: string;
  month_id: string;
  card_key: "lloyds" | "amex";
  amount: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthlySummary = {
  id: string;
  month_id: string;
  total_budget: number;
  additional_income: number;
  total_direct_debits: number;
  total_expenses: number;
  total_savings: number;
  remaining_balance: number;
  house_budget: number;
  house_expenses: number;
  house_budget_remaining: number;
  closed_by: string | null;
  closed_at: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  is_authorized: boolean;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: Table<Profile>;
      months: Table<Month>;
      budgets: Table<Budget>;
      additional_income: Table<AdditionalIncome>;
      direct_debits: Table<DirectDebit>;
      direct_debit_month_statuses: Table<DirectDebitMonthStatus>;
      expenses: Table<Expense>;
      savings: Table<Saving>;
      credit_card_totals: Table<CreditCardTotal>;
      notes: Table<Note>;
      monthly_summaries: Table<MonthlySummary>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const categories: Category[] = [
  "Household",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Entertainment",
  "Savings",
  "Other",
];

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  Lock,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import {
  categories,
  type AdditionalIncome,
  type Budget,
  type CreditCardTotal,
  type DirectDebit,
  type DirectDebitMonthStatus,
  type Expense,
  type Month,
  type MonthlySummary,
  type Note,
  type Saving,
} from "@/lib/types";
import {
  currency,
  firstDayOfMonth,
  isoToday,
  monthLabel,
  nextMonthStart,
  percentage,
} from "@/lib/utils/format";

type View = "dashboard" | "expenses" | "direct-debits" | "history" | "reports" | "notes";

const creditCards = [
  { key: "lloyds", name: "Lloyds Credit Card" },
  { key: "amex", name: "American Express" },
] as const;

const MONTHLY_DIRECT_DEBITS_START = "2026-07-01";

type CreditCardKey = (typeof creditCards)[number]["key"];
type DeleteTable = "expenses" | "savings" | "direct_debits" | "notes";

type Totals = {
  houseBudget: number;
  totalBudgetBase: number;
  additionalIncome: number;
  totalBudget: number;
  directDebitsTotal: number;
  expensesTotal: number;
  savingsTotal: number;
  houseExpenses: number;
  remainingTotal: number;
  remainingHouse: number;
};

const emptyTotals: Totals = {
  houseBudget: 0,
  totalBudgetBase: 0,
  additionalIncome: 0,
  totalBudget: 0,
  directDebitsTotal: 0,
  expensesTotal: 0,
  savingsTotal: 0,
  houseExpenses: 0,
  remainingTotal: 0,
  remainingHouse: 0,
};

function optionalTableError(error: { message?: string } | null) {
  if (!error) return null;
  return /relation .* does not exist|schema cache|could not find/i.test(error.message ?? "")
    ? null
    : error;
}

function deleteLabel(table: DeleteTable) {
  return {
    expenses: "Expense",
    savings: "Savings Entry",
    direct_debits: "Direct Debit",
    notes: "Note",
  }[table];
}

function usesMonthlyDirectDebits(month?: Pick<Month, "month_start">) {
  return Boolean(month && month.month_start >= MONTHLY_DIRECT_DEBITS_START);
}

export function FinanceApp({ view }: { view: View }) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [months, setMonths] = useState<Month[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [income, setIncome] = useState<AdditionalIncome[]>([]);
  const [directDebits, setDirectDebits] = useState<DirectDebit[]>([]);
  const [debitMonthStatuses, setDebitMonthStatuses] = useState<DirectDebitMonthStatus[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [creditCardTotals, setCreditCardTotals] = useState<CreditCardTotal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [closePreview, setClosePreview] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("All");
  const [reportMonth, setReportMonth] = useState("All");
  const [reportCategory, setReportCategory] = useState("All");
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [editingDebit, setEditingDebit] = useState<DirectDebit | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [creditCardDraft, setCreditCardDraft] = useState<CreditCardKey | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [deleteDraft, setDeleteDraft] = useState<{ table: DeleteTable; id: string } | null>(null);

  const selectedMonth = months.find((month) => month.id === selectedMonthId) ?? months[0];
  const selectedBudget = budgets.find((budget) => budget.month_id === selectedMonth?.id);
  const selectedIncome = income.filter((entry) => entry.month_id === selectedMonth?.id);
  const selectedExpenses = expenses.filter((expense) => expense.month_id === selectedMonth?.id);
  const selectedSavings = savings.filter((saving) => saving.month_id === selectedMonth?.id);
  const selectedCreditCards = creditCardTotals.filter(
    (card) => card.month_id === selectedMonth?.id,
  );
  const isClosed = selectedMonth?.status === "closed";
  const monthlyDebitStatusMode = usesMonthlyDirectDebits(selectedMonth);
  const isDebitEnabledForMonth = (debit: DirectDebit, month = selectedMonth) => {
    if (!debit.is_active) return false;
    if (!usesMonthlyDirectDebits(month)) return debit.is_active;
    return debitMonthStatuses.some(
      (status) =>
        status.month_id === month?.id &&
        status.direct_debit_id === debit.id &&
        status.is_enabled,
    );
  };
  const activeDebits = directDebits.filter((debit) => isDebitEnabledForMonth(debit));

  const totals = useMemo(() => {
    if (!selectedMonth) return emptyTotals;
    const houseBudget = selectedBudget?.house_budget_amount ?? 0;
    const totalBudgetBase = selectedBudget?.total_budget_amount ?? 0;
    const additionalIncome = selectedIncome.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const totalBudget = totalBudgetBase + additionalIncome;
    const directDebitsTotal = activeDebits.reduce((sum, debit) => sum + Number(debit.amount), 0);
    const expensesTotal = selectedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const savingsTotal = selectedSavings.reduce((sum, saving) => sum + Number(saving.amount), 0);
    const houseExpenses = expensesTotal;

    return {
      houseBudget,
      totalBudgetBase,
      additionalIncome,
      totalBudget,
      directDebitsTotal,
      expensesTotal,
      savingsTotal,
      houseExpenses,
      remainingTotal: totalBudget - directDebitsTotal - expensesTotal - savingsTotal,
      remainingHouse: houseBudget - houseExpenses,
    };
  }, [activeDebits, selectedBudget, selectedExpenses, selectedIncome, selectedMonth, selectedSavings]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [
      monthsResult,
      budgetsResult,
      incomeResult,
      debitsResult,
      debitStatusesResult,
      expensesResult,
      savingsResult,
      creditCardsResult,
      notesResult,
      summariesResult,
    ] = await Promise.all([
      supabase.from("months").select("*").order("month_start", { ascending: false }),
      supabase.from("budgets").select("*"),
      supabase.from("additional_income").select("*").order("date", { ascending: false }),
      supabase.from("direct_debits").select("*").order("created_at", { ascending: true }),
      supabase.from("direct_debit_month_statuses").select("*"),
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("savings").select("*").order("date", { ascending: false }),
      supabase.from("credit_card_totals").select("*"),
      supabase.from("notes").select("*").order("updated_at", { ascending: false }),
      supabase.from("monthly_summaries").select("*").order("closed_at", { ascending: false }),
    ]);

    const firstError =
      monthsResult.error ||
      budgetsResult.error ||
      incomeResult.error ||
      debitsResult.error ||
      optionalTableError(debitStatusesResult.error) ||
      expensesResult.error ||
      optionalTableError(savingsResult.error) ||
      optionalTableError(creditCardsResult.error) ||
      notesResult.error ||
      summariesResult.error;

    if (firstError) {
      setMessage(firstError.message ?? "Could not load finance data.");
      setLoading(false);
      return;
    }

    let monthRows = (monthsResult.data ?? []) as Month[];

    if (monthRows.length === 0) {
      const { data: createdMonth, error: monthError } = await supabase
        .from("months")
        .insert({ month_start: firstDayOfMonth(), status: "open" })
        .select("*")
        .single();

      if (monthError || !createdMonth) {
        setMessage(monthError?.message ?? "Could not create the first month.");
        setLoading(false);
        return;
      }

      await supabase.from("budgets").insert({
        month_id: createdMonth.id,
        house_budget_amount: 0,
        total_budget_amount: 0,
      });

      monthRows = [createdMonth as Month];
    }

    setMonths(monthRows);
    setBudgets((budgetsResult.data ?? []) as Budget[]);
    setIncome((incomeResult.data ?? []) as AdditionalIncome[]);
    setDirectDebits((debitsResult.data ?? []) as DirectDebit[]);
    setDebitMonthStatuses(
      debitStatusesResult.error ? [] : ((debitStatusesResult.data ?? []) as DirectDebitMonthStatus[]),
    );
    setExpenses((expensesResult.data ?? []) as Expense[]);
    setSavings(savingsResult.error ? [] : ((savingsResult.data ?? []) as Saving[]));
    setCreditCardTotals(
      creditCardsResult.error ? [] : ((creditCardsResult.data ?? []) as CreditCardTotal[]),
    );
    setNotes((notesResult.data ?? []) as Note[]);
    setSummaries((summariesResult.data ?? []) as MonthlySummary[]);
    setSelectedMonthId((current) => {
      if (current && monthRows.some((month) => month.id === current)) return current;
      const currentMonth = monthRows.find((month) => month.month_start === firstDayOfMonth());
      return currentMonth?.id ?? monthRows.find((month) => month.status === "open")?.id ?? monthRows[0]?.id ?? "";
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
    const channel = supabase
      .channel("finance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "months" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => loadData())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "additional_income" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_debits" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_debit_month_statuses" },
        () => loadData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "savings" }, () => loadData())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credit_card_totals" },
        () => loadData(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => loadData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  useEffect(() => {
    const monthFromUrl = searchParams.get("month");
    if (monthFromUrl && months.some((month) => month.id === monthFromUrl)) {
      setSelectedMonthId(monthFromUrl);
    }
  }, [months, searchParams]);

  async function withSave(action: () => Promise<void>) {
    setSaving(true);
    setMessage("");
    try {
      await action();
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function requireOpenMonth() {
    if (!selectedMonth) throw new Error("Create a month before adding records.");
    if (isClosed) throw new Error("This month is closed and cannot be edited.");
    return selectedMonth;
  }

  async function createMonth() {
    const currentStart = selectedMonth?.month_start ?? firstDayOfMonth();
    const newStart = selectedMonth ? nextMonthStart(currentStart) : firstDayOfMonth();
    await withSave(async () => {
      const { data: existing } = await supabase
        .from("months")
        .select("*")
        .eq("month_start", newStart)
        .maybeSingle();

      if (existing) {
        setSelectedMonthId((existing as Month).id);
        return;
      }

      const { data, error } = await supabase
        .from("months")
        .insert({ month_start: newStart, status: "open" })
        .select("*")
        .single();
      if (error) throw error;
      await supabase.from("budgets").insert({
        month_id: data.id,
        house_budget_amount: 0,
        total_budget_amount: 0,
      });
      setSelectedMonthId(data.id);
    });
  }

  async function saveBudget(formData: FormData) {
    const month = requireOpenMonth();
    const house = Number(formData.get("house_budget_amount") || 0);
    const total = Number(formData.get("total_budget_amount") || 0);
    await withSave(async () => {
      const { error } = await supabase.from("budgets").upsert(
        {
          month_id: month.id,
          house_budget_amount: house,
          total_budget_amount: total,
        },
        { onConflict: "month_id" },
      );
      if (error) throw error;
    });
  }

  async function addIncome(formData: FormData) {
    const month = requireOpenMonth();
    await withSave(async () => {
      const { error } = await supabase.from("additional_income").insert({
        month_id: month.id,
        title: String(formData.get("title") || ""),
        amount: Number(formData.get("amount") || 0),
        date: String(formData.get("date") || isoToday()),
        notes: String(formData.get("notes") || "") || null,
      });
      if (error) throw error;
    });
  }

  async function addExpense(formData: FormData) {
    const month = requireOpenMonth();
    await withSave(async () => {
      const { error } = await supabase.from("expenses").insert({
        month_id: month.id,
        title: String(formData.get("title") || ""),
        amount: Number(formData.get("amount") || 0),
        category: String(formData.get("category") || "Other"),
        date: isoToday(),
        notes: String(formData.get("notes") || "") || null,
      });
      if (error) throw error;
    });
  }

  async function addSaving(formData: FormData) {
    const month = requireOpenMonth();
    await withSave(async () => {
      const { error } = await supabase.from("savings").insert({
        month_id: month.id,
        title: String(formData.get("title") || ""),
        amount: Number(formData.get("amount") || 0),
        date: String(formData.get("date") || isoToday()),
        notes: String(formData.get("notes") || "") || null,
      });
      if (error) throw error;
    });
  }

  async function saveCreditCardTotal(formData: FormData) {
    const month = requireOpenMonth();
    if (!creditCardDraft) return;
    const cardKey = creditCardDraft;
    const amount = Number(formData.get("amount") || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage("Enter a valid credit card total.");
      return;
    }

    await withSave(async () => {
      const { error } = await supabase.from("credit_card_totals").upsert(
        {
          month_id: month.id,
          card_key: cardKey,
          amount,
        },
        { onConflict: "month_id,card_key" },
      );
      if (error) throw error;
    });
    setCreditCardDraft(null);
  }

  async function editExpense(formData: FormData) {
    if (!editingExpense || isClosed) return;
    const title = String(formData.get("title") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    const category = String(formData.get("category") || "Other");
    const notes = String(formData.get("notes") || "").trim() || null;
    if (!title || !Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid expense title and amount.");
      return;
    }
    await withSave(async () => {
      const { error } = await supabase
        .from("expenses")
        .update({ title, amount, category, notes })
        .eq("id", editingExpense.id);
      if (error) throw error;
      setEditingExpense(null);
    });
  }

  async function editSaving(formData: FormData) {
    if (!editingSaving || isClosed) return;
    const title = String(formData.get("title") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    const notes = String(formData.get("notes") || "").trim() || null;
    if (!title || !Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid savings title and amount.");
      return;
    }
    await withSave(async () => {
      const { error } = await supabase
        .from("savings")
        .update({ title, amount, notes })
        .eq("id", editingSaving.id);
      if (error) throw error;
      setEditingSaving(null);
    });
  }

  async function deleteRow() {
    if (!deleteDraft) return;
    const { table, id } = deleteDraft;
    await withSave(async () => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      setDeleteDraft(null);
    });
  }

  async function saveDebit(formData: FormData) {
    await withSave(async () => {
      const payload = {
        name: String(formData.get("name") || ""),
        amount: Number(formData.get("amount") || 0),
        category: String(formData.get("category") || "Other"),
        is_active: formData.get("is_active") === "on",
      };
      const result = editingDebit
        ? await supabase.from("direct_debits").update(payload).eq("id", editingDebit.id)
        : await supabase.from("direct_debits").insert(payload);
      if (result.error) throw result.error;
      setEditingDebit(null);
    });
  }

  async function toggleDebit(debit: DirectDebit) {
    const month = requireOpenMonth();
    await withSave(async () => {
      if (usesMonthlyDirectDebits(month)) {
        const nextEnabled = !isDebitEnabledForMonth(debit, month);
        const { error } = await supabase.from("direct_debit_month_statuses").upsert(
          {
            month_id: month.id,
            direct_debit_id: debit.id,
            is_enabled: nextEnabled,
          },
          { onConflict: "month_id,direct_debit_id" },
        );
        if (error) throw error;
        if (nextEnabled && !debit.is_active) {
          const { error: debitError } = await supabase
            .from("direct_debits")
            .update({ is_active: true })
            .eq("id", debit.id);
          if (debitError) throw debitError;
        }
        return;
      }

      const { error } = await supabase
        .from("direct_debits")
        .update({ is_active: !debit.is_active })
        .eq("id", debit.id);
      if (error) throw error;
    });
  }

  async function saveNote(formData: FormData) {
    await withSave(async () => {
      const payload = {
        title: String(formData.get("title") || ""),
        content: String(formData.get("content") || ""),
      };
      const result = editingNote
        ? await supabase.from("notes").update(payload).eq("id", editingNote.id)
        : await supabase.from("notes").insert(payload);
      if (result.error) throw result.error;
      setEditingNote(null);
    });
  }

  async function closeMonth() {
    const month = requireOpenMonth();
    await withSave(async () => {
      const { error: summaryError } = await supabase.from("monthly_summaries").upsert(
        {
          month_id: month.id,
          total_budget: totals.totalBudget,
          additional_income: totals.additionalIncome,
          total_direct_debits: totals.directDebitsTotal,
          total_expenses: totals.expensesTotal,
          total_savings: totals.savingsTotal,
          remaining_balance: totals.remainingTotal,
          house_budget: totals.houseBudget,
          house_expenses: totals.houseExpenses,
          house_budget_remaining: totals.remainingHouse,
        },
        { onConflict: "month_id" },
      );
      if (summaryError) throw summaryError;

      const { error: monthError } = await supabase
        .from("months")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", month.id);
      if (monthError) throw monthError;

      const nextStart = nextMonthStart(month.month_start);
      const { data: existingNext } = await supabase
        .from("months")
        .select("*")
        .eq("month_start", nextStart)
        .maybeSingle();

      if (!existingNext) {
        const { data: nextMonth, error: nextError } = await supabase
          .from("months")
          .insert({ month_start: nextStart, status: "open" })
          .select("*")
          .single();
        if (nextError) throw nextError;
        await supabase.from("budgets").insert({
          month_id: nextMonth.id,
          house_budget_amount: 0,
          total_budget_amount: 0,
        });
        setSelectedMonthId(nextMonth.id);
      }
      setClosePreview(false);
    });
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesMonth = view === "expenses" ? expense.month_id === selectedMonth?.id : true;
      const query = expenseSearch.toLowerCase();
      const matchesSearch =
        !query ||
        expense.title.toLowerCase().includes(query) ||
        (expense.notes ?? "").toLowerCase().includes(query);
      const matchesCategory = expenseCategory === "All" || expense.category === expenseCategory;
      return matchesMonth && matchesSearch && matchesCategory;
    });
  }, [expenseCategory, expenseSearch, expenses, selectedMonth?.id, view]);

  const reportExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesMonth = reportMonth === "All" || expense.month_id === reportMonth;
      const matchesCategory = reportCategory === "All" || expense.category === reportCategory;
      const afterStart = !reportStart || expense.date >= reportStart;
      const beforeEnd = !reportEnd || expense.date <= reportEnd;
      return matchesMonth && matchesCategory && afterStart && beforeEnd;
    });
  }, [expenses, reportCategory, reportEnd, reportMonth, reportStart]);

  const monthlySeries = useMemo(() => {
    return months
      .slice()
      .reverse()
      .map((month) => {
        const summary = summaries.find((item) => item.month_id === month.id);
        const budget = budgets.find((item) => item.month_id === month.id);
        const monthIncome = income
          .filter((entry) => entry.month_id === month.id)
          .reduce((sum, entry) => sum + Number(entry.amount), 0);
        const monthExpenses = expenses
          .filter((expense) => expense.month_id === month.id)
          .reduce((sum, expense) => sum + Number(expense.amount), 0);
        const monthSavings = savings
          .filter((saving) => saving.month_id === month.id)
          .reduce((sum, saving) => sum + Number(saving.amount), 0);
        const debitTotal =
          summary?.total_direct_debits ??
          directDebits
            .filter((debit) => isDebitEnabledForMonth(debit, month))
            .reduce((sum, debit) => sum + Number(debit.amount), 0);
        const savingsTotal = summary?.total_savings ?? monthSavings;
        const totalBudget = summary?.total_budget ?? (budget?.total_budget_amount ?? 0) + monthIncome;
        return {
          label: monthLabel(month.month_start),
          spending: summary?.total_expenses ?? monthExpenses,
          debits: debitTotal,
          remaining: summary?.remaining_balance ?? totalBudget - debitTotal - monthExpenses - savingsTotal,
          budget: totalBudget,
        };
      });
  }, [budgets, debitMonthStatuses, directDebits, expenses, income, months, savings, summaries]);

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="glass rounded-[8px] p-6 text-sm font-bold text-white/70">Loading S&amp;M...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Header
        title={titleForView(view)}
        selectedMonth={selectedMonth}
        months={months}
        onMonthChange={setSelectedMonthId}
        onCreateMonth={createMonth}
        showMonth={view !== "notes" && view !== "direct-debits"}
      />

      {message ? (
        <div className="rounded-[8px] border border-rose/40 bg-rose/12 p-3 text-sm font-semibold text-rose">
          {message}
        </div>
      ) : null}

      {isClosed && view !== "history" ? (
        <div className="flex items-center gap-3 rounded-[8px] border border-brass/35 bg-brass/12 p-3 text-sm font-bold text-brass">
          <Lock className="h-4 w-4" aria-hidden="true" />
          {monthLabel(selectedMonth.month_start)} is closed and view-only.
        </div>
      ) : null}

      {view === "dashboard" ? (
        <Dashboard
          totals={totals}
          expenses={selectedExpenses}
          savings={selectedSavings}
          debits={directDebits}
          income={selectedIncome}
          creditCardTotals={selectedCreditCards}
          budget={selectedBudget}
          disabled={saving || isClosed}
          onBudget={saveBudget}
          onIncome={addIncome}
          onCreditCardAdd={setCreditCardDraft}
          onClose={() => setClosePreview(true)}
          canClose={Boolean(selectedMonth) && !isClosed}
        />
      ) : null}

      {view === "expenses" ? (
        <ExpensesView
          expenses={filteredExpenses}
          savings={selectedSavings}
          search={expenseSearch}
          category={expenseCategory}
          disabled={saving || isClosed}
          onSearch={setExpenseSearch}
          onCategory={setExpenseCategory}
          onAdd={addExpense}
          onAddSaving={addSaving}
          onEdit={setEditingExpense}
          onEditSaving={setEditingSaving}
          onDelete={(id) => setDeleteDraft({ table: "expenses", id })}
          onDeleteSaving={(id) => setDeleteDraft({ table: "savings", id })}
        />
      ) : null}

      {view === "direct-debits" ? (
        <DirectDebitsView
          debits={directDebits}
          activeTotal={totals.directDebitsTotal}
          editing={editingDebit}
          disabled={saving}
          monthlyMode={monthlyDebitStatusMode}
          isDebitEnabled={isDebitEnabledForMonth}
          onSave={saveDebit}
          onEdit={setEditingDebit}
          onCancelEdit={() => setEditingDebit(null)}
          onToggle={toggleDebit}
          onDelete={(id) => setDeleteDraft({ table: "direct_debits", id })}
        />
      ) : null}

      {view === "history" ? (
        <HistoryView
          months={months}
          budgets={budgets}
          summaries={summaries}
          expenses={expenses}
          savings={savings}
          getDirectDebitTotal={(month) =>
            directDebits
              .filter((debit) => isDebitEnabledForMonth(debit, month))
              .reduce((sum, debit) => sum + Number(debit.amount), 0)
          }
        />
      ) : null}

      {view === "reports" ? (
        <ReportsView
          months={months}
          series={monthlySeries}
          expenses={reportExpenses}
          reportMonth={reportMonth}
          reportCategory={reportCategory}
          reportStart={reportStart}
          reportEnd={reportEnd}
          onMonth={setReportMonth}
          onCategory={setReportCategory}
          onStart={setReportStart}
          onEnd={setReportEnd}
        />
      ) : null}

      {view === "notes" ? (
        <NotesView
          notes={notes}
          editing={editingNote}
          disabled={saving}
          onSave={saveNote}
          onEdit={setEditingNote}
          onCancelEdit={() => setEditingNote(null)}
          onDelete={(id) => setDeleteDraft({ table: "notes", id })}
        />
      ) : null}

      {closePreview ? (
        <CloseDialog
          month={selectedMonth}
          totals={totals}
          saving={saving}
          onCancel={() => setClosePreview(false)}
          onConfirm={closeMonth}
        />
      ) : null}

      {creditCardDraft ? (
        <CreditCardDialog
          cardKey={creditCardDraft}
          saving={saving}
          currentAmount={
            Number(selectedCreditCards.find((item) => item.card_key === creditCardDraft)?.amount ?? 0)
          }
          onCancel={() => setCreditCardDraft(null)}
          onSave={saveCreditCardTotal}
        />
      ) : null}

      {editingExpense ? (
        <ExpenseDialog
          expense={editingExpense}
          saving={saving}
          onCancel={() => setEditingExpense(null)}
          onSave={editExpense}
        />
      ) : null}

      {editingSaving ? (
        <SavingDialog
          savingEntry={editingSaving}
          saving={saving}
          onCancel={() => setEditingSaving(null)}
          onSave={editSaving}
        />
      ) : null}

      {deleteDraft ? (
        <DeleteDialog
          saving={saving}
          label={deleteLabel(deleteDraft.table)}
          onCancel={() => setDeleteDraft(null)}
          onConfirm={deleteRow}
        />
      ) : null}
    </div>
  );
}

function Header({
  title,
  selectedMonth,
  months,
  showMonth,
  onMonthChange,
  onCreateMonth,
}: {
  title: string;
  selectedMonth?: Month;
  months: Month[];
  showMonth: boolean;
  onMonthChange: (id: string) => void;
  onCreateMonth: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-sm font-black uppercase tracking-normal text-blueglass">S&amp;M Finance</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">{title}</h1>
      </div>
      {showMonth ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-64">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blueglass" aria-hidden="true" />
            <select
              className="field h-12 appearance-none rounded-[8px] border-white/12 bg-white/[0.055] py-0 pl-10 pr-10 text-base font-bold text-white shadow-none"
              value={selectedMonth?.id ?? ""}
              onChange={(event) => onMonthChange(event.target.value)}
              aria-label="Select month"
            >
              {months.map((month) => (
                <option key={month.id} value={month.id}>
                  {monthLabel(month.month_start)} - {month.status}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" aria-hidden="true" />
          </label>
          <button className="btn btn-secondary h-12 px-4 text-sm" onClick={onCreateMonth}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New month
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Dashboard({
  totals,
  expenses,
  savings,
  debits,
  income,
  creditCardTotals,
  budget,
  disabled,
  canClose,
  onBudget,
  onIncome,
  onCreditCardAdd,
  onClose,
}: {
  totals: Totals;
  expenses: Expense[];
  savings: Saving[];
  debits: DirectDebit[];
  income: AdditionalIncome[];
  creditCardTotals: CreditCardTotal[];
  budget?: Budget;
  disabled: boolean;
  canClose: boolean;
  onBudget: (data: FormData) => Promise<void>;
  onIncome: (data: FormData) => Promise<void>;
  onCreditCardAdd: (cardKey: CreditCardKey) => void;
  onClose: () => void;
}) {
  const [editingBudget, setEditingBudget] = useState(false);
  const budgetComplete = Boolean(
    budget && (Number(budget.house_budget_amount) > 0 || Number(budget.total_budget_amount) > 0),
  );
  const showBudgetForm = !budgetComplete || editingBudget;

  async function handleBudget(data: FormData) {
    await onBudget(data);
    setEditingBudget(false);
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Budget" value={currency(totals.totalBudget)} accent="blueglass" />
        <StatCard label="Additional Income" value={currency(totals.additionalIncome)} accent="ice" />
        <StatCard label="Direct Debits" value={currency(totals.directDebitsTotal)} accent="rose" />
        <StatCard label="Expenses" value={currency(totals.expensesTotal)} accent="brass" />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-[8px] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Budget Summary</h2>
              <p className="mt-1 text-sm text-white/55">Real-time totals after income, bills, and expenses.</p>
            </div>
            <button className="btn btn-primary" disabled={!canClose || disabled} onClick={onClose}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Close and Balance Month
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ProgressCard label="Budget Used" used={totals.expensesTotal + totals.directDebitsTotal + totals.savingsTotal} total={totals.totalBudget} />
            <ProgressCard label="Household Budget Used" used={totals.houseExpenses} total={totals.houseBudget} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniStat label="Household Budget" value={currency(totals.houseBudget)} />
            <MiniStat label="Household Expenses" value={currency(totals.houseExpenses)} />
            <MiniStat label="Household Balance" value={currency(totals.remainingHouse)} />
            <MiniStat label="Expense Count" value={String(expenses.length)} />
            <MiniStat label="Direct Debit Count" value={String(debits.length)} />
            <MiniStat label="Savings" value={currency(totals.savingsTotal)} />
          </div>

          <CreditCardsBlock
            cards={creditCardTotals}
            disabled={disabled}
            onAdd={onCreditCardAdd}
          />

          <div className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-white">Additional Income</h3>
              <span className="text-sm font-black text-blueglass">
                {currency(totals.additionalIncome)}
              </span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {income.slice(0, 4).map((entry) => (
                <RecordLine key={entry.id} title={entry.title} meta={entry.date} amount={entry.amount} />
              ))}
              {income.length === 0 ? <Empty text="No additional income has been added this month." /> : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <FormCard title="Monthly Budgets">
            {showBudgetForm ? (
              <form action={handleBudget} className="grid gap-3">
                <NumberField name="house_budget_amount" label="Household Budget Amount" defaultValue={budget?.house_budget_amount ?? 0} disabled={disabled} />
                <NumberField name="total_budget_amount" label="Total Budget Amount" defaultValue={budget?.total_budget_amount ?? 0} disabled={disabled} />
                <button className="btn btn-primary" disabled={disabled}>{editingBudget ? "Save Changes" : "Save Budgets"}</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[8px] border border-blueglass/30 bg-blueglass/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-blueglass">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Monthly budget set
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Household Budget" value={currency(budget?.house_budget_amount ?? 0)} />
                    <MiniStat label="Total Budget" value={currency(budget?.total_budget_amount ?? 0)} />
                  </div>
                </div>
                <button className="btn btn-secondary w-full" disabled={disabled} onClick={() => setEditingBudget(true)}>
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  Edit Budget
                </button>
              </div>
            )}
          </FormCard>

          <FormCard title="Add Additional Income">
            <form action={onIncome} className="grid gap-3">
              <TextField name="title" label="Title" placeholder="Bonus, refund, gift" disabled={disabled} />
              <NumberField name="amount" label="Amount" disabled={disabled} />
              <DateField name="date" label="Date" defaultValue={isoToday()} disabled={disabled} />
              <TextField name="notes" label="Notes" placeholder="Optional" disabled={disabled} />
              <button className="btn btn-primary" disabled={disabled}>Add Income</button>
            </form>
          </FormCard>
        </div>
      </section>

    </>
  );
}

function CreditCardsBlock({
  cards,
  disabled,
  onAdd,
}: {
  cards: CreditCardTotal[];
  disabled: boolean;
  onAdd: (cardKey: CreditCardKey) => void;
}) {
  function amountFor(cardKey: CreditCardKey) {
    return Number(cards.find((card) => card.card_key === cardKey)?.amount ?? 0);
  }

  return (
    <div className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-white">Credit Cards</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {creditCards.map((card) => {
          const amount = amountFor(card.key);
          return (
            <div
              key={card.key}
              className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4"
            >
              <div className="flex min-h-16 items-start justify-between gap-3">
                <CreditCardLogo cardKey={card.key} />
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-normal text-white/42">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-black text-white">{currency(amount)}</p>
                </div>
              </div>
              <button
                className="mt-4 w-full btn btn-secondary"
                disabled={disabled}
                onClick={() => onAdd(card.key)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {amount > 0 ? "Edit total" : "Set total"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreditCardLogo({ cardKey }: { cardKey: CreditCardKey }) {
  if (cardKey === "amex") {
    return (
      <div className="grid h-14 w-20 place-items-center rounded-[6px] border border-blueglass/40 bg-[#1f5ca8] px-2 text-center shadow-glow">
        <span className="text-[10px] font-black leading-3 tracking-normal text-white">
          AMERICAN
          <br />
          EXPRESS
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-14 w-24 items-center justify-center rounded-[6px] border border-brass/35 bg-[#07120d] px-3">
      <div className="text-center">
        <div className="mx-auto mb-1 h-4 w-4 rounded-full border border-brass/70" />
        <span className="text-[10px] font-black tracking-normal text-brass">LLOYDS</span>
      </div>
    </div>
  );
}

function ExpensesView({
  expenses,
  savings,
  search,
  category,
  disabled,
  onSearch,
  onCategory,
  onAdd,
  onAddSaving,
  onEdit,
  onEditSaving,
  onDelete,
  onDeleteSaving,
}: {
  expenses: Expense[];
  savings: Saving[];
  search: string;
  category: string;
  disabled: boolean;
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  onAdd: (data: FormData) => Promise<void>;
  onAddSaving: (data: FormData) => Promise<void>;
  onEdit: (expense: Expense) => void;
  onEditSaving: (saving: Saving) => void;
  onDelete: (id: string) => void;
  onDeleteSaving: (id: string) => void;
}) {
  const savingsTotal = savings.reduce((sum, saving) => sum + Number(saving.amount), 0);

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="space-y-5">
        <FormCard title="Add Expense">
          <form action={onAdd} className="grid gap-3">
            <TextField name="title" label="Title" disabled={disabled} />
            <NumberField name="amount" label="Amount" disabled={disabled} />
            <CategoryField disabled={disabled} />
            <TextField name="notes" label="Notes" disabled={disabled} />
            <p className="text-xs font-semibold text-white/45">Date is automatically set to today.</p>
            <button className="btn btn-primary" disabled={disabled}>Add Expense</button>
          </form>
        </FormCard>

        <FormCard title="Add Savings">
          <form action={onAddSaving} className="grid gap-3">
            <TextField name="title" label="Title" placeholder="Emergency fund, ISA, holiday pot" disabled={disabled} />
            <NumberField name="amount" label="Amount" disabled={disabled} />
            <DateField name="date" label="Date" defaultValue={isoToday()} disabled={disabled} />
            <TextField name="notes" label="Notes" placeholder="Optional" disabled={disabled} />
            <button className="btn btn-primary" disabled={disabled}>Add Savings</button>
          </form>
        </FormCard>
      </div>

      <div className="space-y-5">
        <div className="glass rounded-[8px] p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
            <input className="field pl-10" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search expenses" />
          </label>
          <select className="field" value={category} onChange={(event) => onCategory(event.target.value)}>
            <option>All</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="mt-5 space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/6 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <RecordLine title={expense.title} meta={`${expense.category} - ${expense.date}`} amount={expense.amount} />
              <div className="flex gap-2">
                <button className="btn btn-secondary" disabled={disabled} onClick={() => onEdit(expense)} aria-label="Edit expense">
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button className="btn btn-danger" disabled={disabled} onClick={() => onDelete(expense.id)} aria-label="Delete expense">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {expenses.length === 0 ? <Empty text="No expenses match the current filters." /> : null}
        </div>
      </div>

        <div className="glass rounded-[8px] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-white">Savings This Month</h2>
            <StatPill label="Savings" value={currency(savingsTotal)} />
          </div>
          <div className="mt-5 space-y-3">
            {savings.map((saving) => (
              <div key={saving.id} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/6 p-3 md:grid-cols-[1fr_auto] md:items-center">
                <RecordLine title={saving.title} meta={saving.date} amount={saving.amount} />
                <div className="flex gap-2">
                  <button className="btn btn-secondary" disabled={disabled} onClick={() => onEditSaving(saving)} aria-label="Edit savings">
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button className="btn btn-danger" disabled={disabled} onClick={() => onDeleteSaving(saving.id)} aria-label="Delete savings">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            {savings.length === 0 ? <Empty text="No savings have been added for this month." /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function DirectDebitsView({
  debits,
  activeTotal,
  editing,
  disabled,
  monthlyMode,
  isDebitEnabled,
  onSave,
  onEdit,
  onCancelEdit,
  onToggle,
  onDelete,
}: {
  debits: DirectDebit[];
  activeTotal: number;
  editing: DirectDebit | null;
  disabled: boolean;
  monthlyMode: boolean;
  isDebitEnabled: (debit: DirectDebit) => boolean;
  onSave: (data: FormData) => Promise<void>;
  onEdit: (debit: DirectDebit) => void;
  onCancelEdit: () => void;
  onToggle: (debit: DirectDebit) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <FormCard title={editing ? "Edit Direct Debit" : "Add Direct Debit"}>
        <form key={editing?.id ?? "new"} action={onSave} className="grid gap-3">
          <TextField name="name" label="Name" defaultValue={editing?.name} disabled={disabled} />
          <NumberField name="amount" label="Amount" defaultValue={editing?.amount ?? 0} disabled={disabled} />
          <CategoryField defaultValue={editing?.category} disabled={disabled} />
          <label className="flex items-center gap-3 rounded-[8px] border border-white/10 bg-white/6 p-3 text-sm font-bold text-white/78">
            <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} disabled={disabled} />
            Keep in recurring list
          </label>
          <button className="btn btn-primary" disabled={disabled}>{editing ? "Save Direct Debit" : "Add Direct Debit"}</button>
          {editing ? (
            <button type="button" className="btn btn-secondary" onClick={onCancelEdit}>Cancel Edit</button>
          ) : null}
        </form>
      </FormCard>
      <div className="glass rounded-[8px] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-white">Recurring Direct Debits</h2>
          <StatPill label="Active Monthly Total" value={currency(activeTotal)} />
        </div>
        {monthlyMode ? (
          <p className="mt-3 text-sm font-semibold text-white/50">
            Direct debits start disabled for this month. Enable each one when it is ready to count.
          </p>
        ) : null}
        <div className="mt-5 space-y-3">
          {debits.map((debit) => {
            const enabled = isDebitEnabled(debit);
            return (
            <div key={debit.id} className="grid gap-3 rounded-[8px] border border-white/10 bg-white/6 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <RecordLine title={debit.name} meta={`${debit.category} - ${enabled ? "Active" : "Inactive"}`} amount={debit.amount} muted={!enabled} />
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary" onClick={() => onToggle(debit)}>
                  {enabled ? "Disable" : "Enable"}
                </button>
                <button className="btn btn-secondary" onClick={() => onEdit(debit)} aria-label="Edit direct debit">
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button className="btn btn-danger" onClick={() => onDelete(debit.id)} aria-label="Delete direct debit">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            );
          })}
          {debits.length === 0 ? <Empty text="No recurring direct debits yet." /> : null}
        </div>
      </div>
    </section>
  );
}

function HistoryView({
  months,
  budgets,
  summaries,
  expenses,
  savings,
  getDirectDebitTotal,
}: {
  months: Month[];
  budgets: Budget[];
  summaries: MonthlySummary[];
  expenses: Expense[];
  savings: Saving[];
  getDirectDebitTotal: (month: Month) => number;
}) {
  const rows = months.map((month) => {
    const summary = summaries.find((item) => item.month_id === month.id);
    const budget = budgets.find((item) => item.month_id === month.id);
    const monthExpenses = expenses.filter((expense) => expense.month_id === month.id).reduce((sum, expense) => sum + Number(expense.amount), 0);
    const monthSavings = savings.filter((saving) => saving.month_id === month.id).reduce((sum, saving) => sum + Number(saving.amount), 0);
    const debitTotal = getDirectDebitTotal(month);
    const savingsTotal = summary?.total_savings ?? monthSavings;
    const totalBudget = summary?.total_budget ?? budget?.total_budget_amount ?? 0;
    return {
      month,
      budget: totalBudget,
      expenses: summary?.total_expenses ?? monthExpenses,
      debits: summary?.total_direct_debits ?? debitTotal,
      remaining: summary?.remaining_balance ?? totalBudget - debitTotal - monthExpenses - savingsTotal,
    };
  });

  return (
    <div className="glass overflow-hidden rounded-[8px]">
      <div className="grid min-w-[760px] grid-cols-6 border-b border-white/10 px-5 py-3 text-xs font-black uppercase tracking-normal text-white/48">
        <span>Month</span>
        <span>Budget</span>
        <span>Expenses</span>
        <span>Direct Debits</span>
        <span>Remaining</span>
        <span>Status</span>
      </div>
      <div className="overflow-x-auto">
        {rows.map((row) => (
          <a
            key={row.month.id}
            href={`/dashboard?month=${row.month.id}`}
            className="grid min-w-[760px] grid-cols-6 border-b border-white/8 px-5 py-4 text-sm font-bold text-white/78 hover:bg-white/6"
          >
            <span>{monthLabel(row.month.month_start)}</span>
            <span>{currency(row.budget)}</span>
            <span>{currency(row.expenses)}</span>
            <span>{currency(row.debits)}</span>
            <span>{currency(row.remaining)}</span>
            <span className={row.month.status === "closed" ? "text-brass" : "text-blueglass"}>{row.month.status}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function ReportsView({
  months,
  series,
  expenses,
  reportMonth,
  reportCategory,
  reportStart,
  reportEnd,
  onMonth,
  onCategory,
  onStart,
  onEnd,
}: {
  months: Month[];
  series: Array<{ label: string; spending: number; debits: number; remaining: number; budget: number }>;
  expenses: Expense[];
  reportMonth: string;
  reportCategory: string;
  reportStart: string;
  reportEnd: string;
  onMonth: (value: string) => void;
  onCategory: (value: string) => void;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
}) {
  const byCategory = categories.map((category) => ({
    label: category,
    value: expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + Number(expense.amount), 0),
  })).filter((row) => row.value > 0);

  return (
    <div className="space-y-5">
      <div className="glass grid gap-3 rounded-[8px] p-4 md:grid-cols-4">
        <select className="field" value={reportMonth} onChange={(event) => onMonth(event.target.value)}>
          <option value="All">All months</option>
          {months.map((month) => <option key={month.id} value={month.id}>{monthLabel(month.month_start)}</option>)}
        </select>
        <select className="field" value={reportCategory} onChange={(event) => onCategory(event.target.value)}>
          <option>All</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <DateFilterInput label="Start date" value={reportStart} onChange={onStart} />
        <DateFilterInput label="End date" value={reportEnd} onChange={onEnd} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Monthly Spending" rows={series.map((row) => ({ label: row.label, value: row.spending }))} />
        <ChartCard title="Direct Debit Totals" rows={series.map((row) => ({ label: row.label, value: row.debits }))} />
        <ChartCard title="Budget Remaining" rows={series.map((row) => ({ label: row.label, value: row.remaining }))} />
        <ChartCard title="Category Spending" rows={byCategory} />
      </div>
    </div>
  );
}

function NotesView({
  notes,
  editing,
  disabled,
  onSave,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  notes: Note[];
  editing: Note | null;
  disabled: boolean;
  onSave: (data: FormData) => Promise<void>;
  onEdit: (note: Note) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = notes.filter((note) => {
    const needle = query.toLowerCase();
    return !needle || note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle);
  });

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <FormCard title={editing ? "Edit Note" : "Create Note"}>
        <form key={editing?.id ?? "new"} action={onSave} className="grid gap-3">
          <TextField name="title" label="Title" defaultValue={editing?.title} disabled={disabled} />
          <label>
            <span className="label">Note Content</span>
            <textarea className="field min-h-36" name="content" defaultValue={editing?.content} disabled={disabled} required />
          </label>
          <button className="btn btn-primary" disabled={disabled}>{editing ? "Save Note" : "Create Note"}</button>
          {editing ? <button type="button" className="btn btn-secondary" onClick={onCancelEdit}>Cancel Edit</button> : null}
        </form>
      </FormCard>
      <div className="glass rounded-[8px] p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
          <input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" />
        </label>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filtered.map((note) => (
            <article key={note.id} className="rounded-[8px] border border-white/10 bg-white/6 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-white">{note.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-white/45">Updated {new Date(note.updated_at).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" onClick={() => onEdit(note)} aria-label="Edit note"><Edit3 className="h-4 w-4" aria-hidden="true" /></button>
                  <button className="btn btn-danger" onClick={() => onDelete(note.id)} aria-label="Delete note"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/66">{note.content}</p>
            </article>
          ))}
          {filtered.length === 0 ? <Empty text="No notes match your search." /> : null}
        </div>
      </div>
    </section>
  );
}

function ExpenseDialog({
  expense,
  saving,
  onCancel,
  onSave,
}: {
  expense: Expense;
  saving: boolean;
  onCancel: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <form action={onSave} className="glass w-full max-w-lg rounded-[8px] p-5">
        <p className="text-xs font-black uppercase tracking-normal text-blueglass">
          Expense tracking
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">Edit Expense</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">
          Date stays as {expense.date}.
        </p>

        <div className="mt-5 grid gap-3">
          <TextField name="title" label="Title" defaultValue={expense.title} disabled={saving} />
          <NumberField
            name="amount"
            label="Amount"
            defaultValue={Number(expense.amount)}
            disabled={saving}
          />
          <CategoryField defaultValue={expense.category} disabled={saving} />
          <TextField
            name="notes"
            label="Notes"
            placeholder="Optional"
            defaultValue={expense.notes ?? ""}
            disabled={saving}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SavingDialog({
  savingEntry,
  saving,
  onCancel,
  onSave,
}: {
  savingEntry: Saving;
  saving: boolean;
  onCancel: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <form action={onSave} className="glass w-full max-w-lg rounded-[8px] p-5">
        <p className="text-xs font-black uppercase tracking-normal text-blueglass">
          Monthly savings
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">Edit Savings</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">
          Date stays as {savingEntry.date}.
        </p>

        <div className="mt-5 grid gap-3">
          <TextField name="title" label="Title" defaultValue={savingEntry.title} disabled={saving} />
          <NumberField
            name="amount"
            label="Amount"
            defaultValue={Number(savingEntry.amount)}
            disabled={saving}
          />
          <TextField
            name="notes"
            label="Notes"
            placeholder="Optional"
            defaultValue={savingEntry.notes ?? ""}
            disabled={saving}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Savings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteDialog({
  label,
  saving,
  onCancel,
  onConfirm,
}: {
  label: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-[8px] p-5">
        <p className="text-xs font-black uppercase tracking-normal text-rose">
          Delete record
        </p>
        <h2 className="mt-2 text-2xl font-black text-white">Delete {label}?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
          This will permanently remove this {label.toLowerCase()} from the database.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreditCardDialog({
  cardKey,
  currentAmount,
  saving,
  onCancel,
  onSave,
}: {
  cardKey: CreditCardKey;
  currentAmount: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  const card = creditCards.find((item) => item.key === cardKey);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <form action={onSave} className="glass w-full max-w-md rounded-[8px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-blueglass">
              Credit card
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {card?.name ?? "Credit Card"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/55">
              Current total: {currency(currentAmount)}
            </p>
          </div>
          <CreditCardLogo cardKey={cardKey} />
        </div>

        <label className="mt-5 block">
          <span className="label">Total amount</span>
          <input
            className="field"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={currentAmount}
            placeholder="0.00"
            autoFocus
            required
          />
        </label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Total"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CloseDialog({
  month,
  totals,
  saving,
  onCancel,
  onConfirm,
}: {
  month?: Month;
  totals: Totals;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-[8px] p-5">
        <h2 className="text-2xl font-black text-white">Close and Balance Month</h2>
        <p className="mt-2 text-sm text-white/58">
          Confirm these final figures for {month ? monthLabel(month.month_start) : "this month"}.
        </p>
        <div className="mt-5 grid gap-3">
          <MiniStat label="Total Budget" value={currency(totals.totalBudget)} />
          <MiniStat label="Total Expenses" value={currency(totals.expensesTotal)} />
          <MiniStat label="Total Direct Debits" value={currency(totals.directDebitsTotal)} />
          <MiniStat label="Savings" value={currency(totals.savingsTotal)} />
          <MiniStat label="Remaining Balance" value={currency(totals.remainingTotal)} />
          <MiniStat label="Household Budget Remaining" value={currency(totals.remainingHouse)} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={saving}>
            {saving ? "Closing..." : "Confirm Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: "blueglass" | "ice" | "rose" | "brass" }) {
  const accentClass = {
    blueglass: "text-blueglass",
    ice: "text-ice",
    rose: "text-rose",
    brass: "text-brass",
  }[accent];
  return (
    <div className="glass rounded-[8px] p-4">
      <CircleDollarSign className={`h-5 w-5 ${accentClass}`} aria-hidden="true" />
      <p className="mt-4 text-xs font-black uppercase tracking-normal text-white/42">{label}</p>
      <p className="mt-2 break-words text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ProgressCard({ label, used, total }: { label: string; used: number; total: number }) {
  const value = percentage(used, total);
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/6 p-3">
      <div className="flex justify-between gap-3 text-sm font-bold">
        <span className="text-white">{label}</span>
        <span className="text-white/60">{value.toFixed(0)}%</span>
      </div>
      <div className="mt-3 h-3 rounded-full bg-white/8">
        <div className="h-3 rounded-full bg-gradient-to-r from-blueglass to-ice" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-xs font-semibold text-white/45">{currency(used)} of {currency(total)}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/6 p-3">
      <p className="text-xs font-black uppercase tracking-normal text-white/42">{label}</p>
      <p className="mt-1 break-words text-lg font-black text-white">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-blueglass/30 bg-blueglass/12 px-3 py-2 text-sm font-black text-blueglass">
      {label}: {value}
    </div>
  );
}

function ChartCard({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  return (
    <div className="glass rounded-[8px] p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blueglass" aria-hidden="true" />
        <h2 className="text-xl font-black text-white">{title}</h2>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-2">
            <div className="flex justify-between gap-3 text-xs font-bold text-white/58">
              <span className="truncate">{row.label}</span>
              <span>{currency(row.value)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/8">
              <div className="h-3 rounded-full bg-gradient-to-r from-rose via-brass to-blueglass" style={{ width: `${Math.max(3, (Math.abs(row.value) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 ? <Empty text="No report data for this filter." /> : null}
      </div>
    </div>
  );
}

function RecordLine({ title, meta, amount, muted }: { title: string; meta: string; amount: number; muted?: boolean }) {
  return (
    <div className={muted ? "opacity-55" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">{title}</p>
          <p className="mt-1 text-xs font-semibold text-white/45">{meta}</p>
        </div>
        <p className="shrink-0 font-black text-white">{currency(amount)}</p>
      </div>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-[8px] p-5">
      <h2 className="mb-4 text-xl font-black text-white">{title}</h2>
      {children}
    </div>
  );
}

function TextField({ name, label, placeholder, defaultValue, disabled }: { name: string; label: string; placeholder?: string; defaultValue?: string; disabled?: boolean }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" name={name} placeholder={placeholder} defaultValue={defaultValue} disabled={disabled} required={name !== "notes"} />
    </label>
  );
}

function NumberField({ name, label, defaultValue, disabled }: { name: string; label: string; defaultValue?: number; disabled?: boolean }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" name={name} type="number" step="0.01" min="0" defaultValue={defaultValue} disabled={disabled} required />
    </label>
  );
}

function DateField({ name, label, defaultValue, disabled }: { name: string; label: string; defaultValue?: string; disabled?: boolean }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" name={name} type="date" defaultValue={defaultValue} disabled={disabled} required />
    </label>
  );
}

function DateFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      />
    </label>
  );
}

function CategoryField({ defaultValue, disabled }: { defaultValue?: string; disabled?: boolean }) {
  return (
    <label>
      <span className="label">Category</span>
      <select className="field" name="category" defaultValue={defaultValue ?? "Household"} disabled={disabled}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-white/16 p-5 text-sm font-semibold text-white/45">
      {text}
    </div>
  );
}

function titleForView(view: View) {
  return {
    dashboard: "Monthly Dashboard",
    expenses: "Expense Tracking",
    "direct-debits": "Direct Debits",
    history: "Monthly History",
    reports: "Reports and Trends",
    notes: "Notes",
  }[view];
}

// ==========================================================
// Daily Expense Tracker - App logic
// Day 2: validate the form, keep expenses in memory and
// show them in the Recent Expenses list.
// Day 3: delete individual expenses.
// Day 4: save expenses in the browser (LocalStorage) so they
// survive a refresh or reopening the page.
// ==========================================================

// ---------- Page elements ----------
const expenseForm = document.getElementById("expense-form");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");
const formMessage = document.getElementById("form-message");
const expenseList = document.getElementById("expense-list");
const emptyState = document.getElementById("empty-state");
const recentExpensesTitle = document.getElementById("recent-expenses-title");

// ---------- App data ----------
// All expenses (newest first). Loaded from LocalStorage at start.
let expenses = [];

// Each expense gets a unique id so we can find it again (e.g. to delete it)
let nextExpenseId = 1;

// Display names for each category value used in the <select>
const CATEGORY_LABELS = {
  food: "Food",
  groceries: "Groceries",
  travel: "Travel",
  shopping: "Shopping",
  bills: "Bills",
  health: "Health",
  entertainment: "Entertainment",
  other: "Other",
};

// Formats numbers as Indian Rupees, e.g. 1234.5 -> "₹1,234.50"
const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

// How long the success message stays visible (milliseconds)
const MESSAGE_DURATION = 3000;
let messageTimer = null;

// LocalStorage key where expenses are saved
const STORAGE_KEY = "dailyExpenses";

// ---------- Helpers ----------

// Returns today's date in the YYYY-MM-DD format used by <input type="date">
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Turns "2026-11-03" into a friendly date like "3 Nov 2026".
// The parts are read separately so the date never shifts because of time zones.
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Shows an error under a field and marks the field as invalid
function showError(input, message) {
  const errorElement = document.getElementById(`${input.id}-error`);
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", "true");
}

// Removes the error from a field
function clearError(input) {
  const errorElement = document.getElementById(`${input.id}-error`);
  errorElement.textContent = "";
  input.removeAttribute("aria-invalid");
}

// Shows the green success message, then hides it after a few seconds
function showSuccessMessage(message) {
  formMessage.textContent = message;
  formMessage.hidden = false;

  clearTimeout(messageTimer);
  messageTimer = setTimeout(hideSuccessMessage, MESSAGE_DURATION);
}

function hideSuccessMessage() {
  clearTimeout(messageTimer);
  formMessage.hidden = true;
  formMessage.textContent = "";
}

// ---------- Saving & loading (LocalStorage) ----------

// Checks that one saved expense has everything the app needs,
// so broken or old data can never crash the page
function isValidSavedExpense(expense) {
  return (
    expense !== null &&
    typeof expense === "object" &&
    Number.isInteger(expense.id) &&
    expense.id > 0 &&
    typeof expense.amount === "number" &&
    Number.isFinite(expense.amount) &&
    expense.amount > 0 &&
    CATEGORY_LABELS.hasOwnProperty(expense.category) &&
    typeof expense.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(expense.date) &&
    typeof expense.note === "string"
  );
}

// Reads saved expenses. Returns an empty list if there is nothing saved,
// the data is not valid JSON, or the browser blocks storage.
function loadExpenses() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn("Could not read saved expenses:", error);
    return [];
  }

  // Nothing saved yet (getItem returns null) or not a list
  if (!Array.isArray(saved)) {
    return [];
  }

  // Keep only valid expenses, and skip any repeated ids
  const seenIds = new Set();
  return saved.filter(function (expense) {
    if (!isValidSavedExpense(expense) || seenIds.has(expense.id)) {
      return false;
    }
    seenIds.add(expense.id);
    return true;
  });
}

// Saves the current expenses. The app keeps working (without saving)
// if storage is full or blocked, e.g. in some private browsing modes.
function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.warn("Could not save expenses:", error);
  }
}

// ---------- Validation ----------

// Checks the form values. Shows errors and returns true only if all are valid.
function validateForm(values) {
  let isValid = true;

  clearError(amountInput);
  clearError(categoryInput);
  clearError(dateInput);

  if (amountInput.validity.badInput) {
    // The browser could not read the text as a number (e.g. "1e")
    showError(amountInput, "Please enter a valid number.");
    isValid = false;
  } else if (amountInput.value.trim() === "") {
    showError(amountInput, "Please enter an amount.");
    isValid = false;
  } else if (!Number.isFinite(values.amount) || values.amount <= 0) {
    showError(amountInput, "Amount must be greater than zero.");
    isValid = false;
  }

  if (values.category === "") {
    showError(categoryInput, "Please select a category.");
    isValid = false;
  }

  if (values.date === "") {
    showError(dateInput, "Please choose a date.");
    isValid = false;
  }

  // Move the cursor to the first field with a problem
  const firstInvalid = expenseForm.querySelector('[aria-invalid="true"]');
  if (firstInvalid) {
    firstInvalid.focus();
  }

  return isValid;
}

// ---------- Rendering ----------

// Trash-can icon used on Delete buttons (fixed SVG, no user text inside)
const TRASH_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
  </svg>`;

// Builds one <li> for an expense
function createExpenseItem(expense) {
  const item = document.createElement("li");
  item.className = "expense-item";

  const details = document.createElement("div");
  details.className = "expense-details";

  const category = document.createElement("p");
  category.className = "expense-category";
  category.textContent = CATEGORY_LABELS[expense.category];

  const date = document.createElement("p");
  date.className = "expense-date";
  date.textContent = formatDate(expense.date);

  details.append(category, date);

  // Only show the note if the user wrote one
  if (expense.note !== "") {
    const note = document.createElement("p");
    note.className = "expense-note";
    note.textContent = expense.note; // textContent keeps user text safe
    details.append(note);
  }

  const amount = document.createElement("p");
  amount.className = "expense-amount";
  amount.textContent = rupeeFormatter.format(expense.amount);

  // Amount and Delete button stay together on the right
  const actions = document.createElement("div");
  actions.className = "expense-actions";
  actions.append(amount, createDeleteButton(expense));

  item.append(details, actions);
  return item;
}

// Builds the trash-can Delete button for an expense
function createDeleteButton(expense) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-delete";
  // Remember which expense this button belongs to
  button.dataset.id = expense.id;
  // The button only shows an icon, so give screen readers a clear label
  button.setAttribute(
    "aria-label",
    `Delete ${CATEGORY_LABELS[expense.category]} expense of ${rupeeFormatter.format(expense.amount)}`
  );
  button.innerHTML = TRASH_ICON;
  return button;
}

// Redraws the Recent Expenses list from the expenses array
function renderExpenses() {
  expenseList.innerHTML = "";

  expenses.forEach(function (expense) {
    expenseList.append(createExpenseItem(expense));
  });

  // Show the empty message only when there are no expenses
  emptyState.hidden = expenses.length > 0;
}

// ---------- Form handling ----------

// Puts the form back to its starting state
function resetForm() {
  expenseForm.reset();
  dateInput.value = getTodayDate();
}

expenseForm.addEventListener("submit", function (event) {
  // Stop the browser from reloading the page
  event.preventDefault();
  hideSuccessMessage();

  // Read the form values
  const values = {
    amount: Number(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
    note: noteInput.value.trim(),
  };

  if (!validateForm(values)) {
    return;
  }

  // Give the expense its unique id
  values.id = nextExpenseId;
  nextExpenseId++;

  // Newest expense goes to the top of the list
  expenses.unshift(values);
  saveExpenses();
  renderExpenses();

  resetForm();
  showSuccessMessage(
    `Added ${rupeeFormatter.format(values.amount)} for ${CATEGORY_LABELS[values.category]}.`
  );
});

// Clear a field's error as soon as the user fixes it
[amountInput, categoryInput, dateInput].forEach(function (input) {
  input.addEventListener("input", function () {
    clearError(input);
  });
});

// ---------- Deleting ----------

// Removes one expense (after the user confirms) and redraws the list
function deleteExpense(id) {
  const expense = expenses.find(function (item) {
    return item.id === id;
  });
  if (!expense) {
    return;
  }

  const confirmed = window.confirm(
    `Delete this ${CATEGORY_LABELS[expense.category]} expense of ${rupeeFormatter.format(expense.amount)}?`
  );
  if (!confirmed) {
    return;
  }

  // Remember the position so keyboard focus can stay nearby
  const index = expenses.indexOf(expense);

  // Keep every expense except the one being deleted
  expenses = expenses.filter(function (item) {
    return item.id !== id;
  });
  saveExpenses();
  renderExpenses();
  showSuccessMessage("Expense deleted.");

  // Move focus to the next Delete button (or the heading if the list is empty)
  // so keyboard users are not sent back to the top of the page
  const buttons = expenseList.querySelectorAll(".btn-delete");
  const nextButton = buttons[index] || buttons[index - 1];
  if (nextButton) {
    nextButton.focus();
  } else {
    recentExpensesTitle.focus();
  }
}

// One click listener on the whole list handles every Delete button,
// including buttons for expenses added later
expenseList.addEventListener("click", function (event) {
  const button = event.target.closest(".btn-delete");
  if (button) {
    deleteExpense(Number(button.dataset.id));
  }
});

// ---------- Start ----------
expenses = loadExpenses();

// Continue numbering after the highest saved id, so new expenses
// never reuse an id (which would make Delete remove the wrong one)
expenses.forEach(function (expense) {
  if (expense.id >= nextExpenseId) {
    nextExpenseId = expense.id + 1;
  }
});

dateInput.value = getTodayDate();
renderExpenses();

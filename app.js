// ==========================================================
// Daily Expense Tracker - App logic
// Day 2: validate the form, keep expenses in memory and
// show them in the Recent Expenses list.
// Note: expenses are lost on page refresh until storage is added.
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

// ---------- App data ----------
// All expenses added in this session (newest first)
const expenses = [];

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

  item.append(details, amount);
  return item;
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

  // Newest expense goes to the top of the list
  expenses.unshift(values);
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

// ---------- Start ----------
dateInput.value = getTodayDate();
renderExpenses();

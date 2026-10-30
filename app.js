// ==========================================================
// Daily Expense Tracker - App logic
// Day 1: basic setup only. Saving, listing and calculating
// expenses will be added in later days.
// ==========================================================

// Grab the elements we need from the page
const expenseForm = document.getElementById("expense-form");
const dateInput = document.getElementById("date");

// Returns today's date in the YYYY-MM-DD format used by <input type="date">
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Pre-fill the date field with today's date
dateInput.value = getTodayDate();

// Handle form submission
expenseForm.addEventListener("submit", function (event) {
  // Stop the browser from reloading the page
  event.preventDefault();

  // For now we only log the values. Saving will come later.
  const expense = {
    amount: expenseForm.amount.value,
    category: expenseForm.category.value,
    date: expenseForm.date.value,
    note: expenseForm.note.value.trim(),
  };
  console.log("Expense submitted:", expense);

  // Clear the form and keep today's date selected
  expenseForm.reset();
  dateInput.value = getTodayDate();
});

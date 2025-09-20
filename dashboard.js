auth.onAuthStateChanged((user) => {
  if (!user) {
    // Not logged in → redirect back to homepage
    window.location.href = "index.html";
  }
});

const userEmailEl = document.getElementById("userEmail");
const userAvatar = document.getElementById("userAvatar");
const avatarUpload = document.getElementById("avatarUpload");
const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const txCategory = document.getElementById("txCategory");
const categoryList = document.getElementById("categoryList");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");
let currentFilter = "all"; // all, Expense, Income (show everything)
let categories = JSON.parse(localStorage.getItem("categories")) || [
  "Home",
  "Groceries",
  "Insurance",
  "Travel",
  "Rent",
  "Food",
  "Other",
];

// --- Avatar Handling ---
function setUserEmail(email) {
  if (email) {
    userEmailEl.textContent = email;
    if (!localStorage.getItem("avatar")) {
      userAvatar.textContent = email[0].toUpperCase();
    }
  }
}
userAvatar.addEventListener("click", () => avatarUpload.click());
avatarUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    userAvatar.style.backgroundImage = `url(${reader.result})`;
    userAvatar.textContent = "";
    saveAvatar(reader.result);
  };
  reader.readAsDataURL(file);
});
if (localStorage.getItem("avatar")) {
  userAvatar.style.backgroundImage = `url(${localStorage.getItem("avatar")})`;
  userAvatar.textContent = "";
}

// --- Sidebar Navigation ---
document.querySelectorAll(".sidebar button").forEach((btn) => {
  btn.addEventListener("click", () => {
    // highlight active button
    document
      .querySelectorAll(".sidebar button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // toggle settings section
    if (btn.dataset.section === "settings") {
      document.getElementById("settingsSection").style.display = "block";
    } else {
      document.getElementById("settingsSection").style.display = "none";
    }

    // set filter based on clicked section
    if (btn.dataset.section === "expenses") {
      currentFilter = "Expense";
    } else if (btn.dataset.section === "income") {
      currentFilter = "Income";
    } else {
      currentFilter = "all"; // Home or default
    }

    // re-render table with filter
    renderTransactions();
  });
});

// sidebar open and close by hamburger and close button (toggle in mobile device)
const closeSidebar = document.getElementById("closeSidebar");

hamburger.addEventListener("click", () => {
  sidebar.classList.add("active"); //add the active class to make it appear
  hamburger.style.display = "none";
  closeSidebar.style.display = "block";
  // show text labels again when sidebar is active
  document.querySelectorAll(".sidebar button span").forEach((span) => {
    span.style.display = "inline";
  });
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("active"); //remove the active class to make it disappear (but it is not working as expected)
  closeSidebar.style.display = "none";
  hamburger.style.display = "block";
  // hide text labels again when sidebar is collapsed
  if (window.innerWidth <= 700) {
    document.querySelectorAll(".sidebar button span").forEach((span) => {
      span.style.display = "none";
    });
  }
});

// --- Modal Handling ---
const modal = document.getElementById("transactionModal");
const modalTitle = document.getElementById("modalTitle");
const txTypeInput = document.getElementById("txType");
const txDate = document.getElementById("txDate");
const closeBtn = document.querySelector(".closeBtn");
let editingRow = null;

function openModal(type) {
  modal.style.display = "flex";
  modalTitle.innerText = `Add ${type}`;
  txTypeInput.value = type;
  const today = new Date().toISOString().split("T")[0];
  txDate.value = today;
  modal.querySelector("input,select,button").focus();
}
closeBtn.onclick = () => (modal.style.display = "none");
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

// Trap focus inside modal
modal.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    const focusable = modal.querySelectorAll("input,button,select,.closeBtn");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

document
  .getElementById("addExpenseBtn")
  .addEventListener("click", () => openModal("Expense"));
document
  .getElementById("addIncomeBtn")
  .addEventListener("click", () => openModal("Income"));

// --- Transactions ---
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));

  const user = auth.currentUser;
  if (user) {
    db.collection("users").doc(user.uid).set(
      { transactions },
      { merge: true } // merge instead of overwrite
    );
  }
}

function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));

  const user = auth.currentUser;
  if (user) {
    db.collection("users").doc(user.uid).set({ categories }, { merge: true });
  }
}

function saveCurrency() {
  localStorage.setItem("currency", selectedCurrency);

  const user = auth.currentUser;
  if (user) {
    db.collection("users")
      .doc(user.uid)
      .set({ currency: selectedCurrency }, { merge: true });
  }
}

function saveAvatar(base64) {
  localStorage.setItem("avatar", base64);

  const user = auth.currentUser;
  if (user) {
    db.collection("users")
      .doc(user.uid)
      .set({ avatar: base64 }, { merge: true });
  }
}

// --- Currency Handling ---
// Get saved currency or default to USD
let selectedCurrency = localStorage.getItem("currency") || "USD";

// Mapping currency codes to symbols (optional, Intl will handle automatically)
const currencyOptions = [
  { code: "USD", label: "US Dollar" },
  { code: "INR", label: "Indian Rupee" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
];

// Function to format numbers as currency
function formatCurrency(num) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: selectedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Render currency dropdown in settings
function renderCurrencySettings() {
  const select = document.getElementById("currencySelect");

  select.innerHTML = currencyOptions
    .map(
      (c) =>
        `<option value="${c.code}" ${
          c.code === selectedCurrency ? "selected" : ""
        }>${c.label}</option>`
    )
    .join("");

  // Use onchange instead of addEventListener to avoid duplicates
  select.onchange = (e) => {
    selectedCurrency = e.target.value;
    saveCurrency();
    renderTransactions();
  };
}

function addTransactionRow(tx, index) {
  const tbody = document.getElementById("transactionTableBody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${tx.date}</td>
    <td>${tx.description}</td>
    <td>${tx.category}</td>
    <td class="amount ${tx.type.toLowerCase()}">${formatCurrency(
    tx.amount
  )}</td>
    <td class="type ${tx.type.toLowerCase()}">
      ${tx.type}
      <button class="editBtn"><i class="fa fa-pencil"></i></button>
      <button class="deleteBtn"><i class="fa fa-trash"></i></button>
    </td>`;
  row
    .querySelector(".editBtn")
    .addEventListener("click", () => editTransaction(index));
  row
    .querySelector(".deleteBtn")
    .addEventListener("click", () => deleteTransaction(index));
  tbody.appendChild(row);
}

function renderTransactions() {
  document.getElementById("transactionTableBody").innerHTML = "";

  // Apply filter
  let filteredTx = transactions;
  if (currentFilter === "Expense") {
    filteredTx = transactions.filter((tx) => tx.type === "Expense");
  } else if (currentFilter === "Income") {
    filteredTx = transactions.filter((tx) => tx.type === "Income");
  }

  filteredTx.forEach((tx, i) => addTransactionRow(tx, i));

  updateTotals();
}

function editTransaction(index) {
  const tx = transactions[index];
  editingRow = index;
  modal.style.display = "flex";
  modalTitle.innerText = `Edit ${tx.type}`;
  txTypeInput.value = tx.type;
  txDate.value = tx.date;
  document.getElementById("txDescription").value = tx.description;
  txCategory.value = tx.category;
  document.getElementById("txAmount").value = tx.amount;
}
function deleteTransaction(index) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions.splice(index, 1);
    saveTransactions();
    renderTransactions();
  }
}
function updateTotals() {
  let income = 0,
    expenses = 0;
  transactions.forEach((tx) => {
    if (tx.type === "Income") income += parseFloat(tx.amount);
    if (tx.type === "Expense") expenses += parseFloat(tx.amount);
  });
  document.getElementById("totalIncome").textContent = formatCurrency(income);
  document.getElementById("totalExpenses").textContent =
    formatCurrency(expenses);
  document.getElementById("netBalance").textContent = formatCurrency(
    income - expenses
  );
}

document.getElementById("transactionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const desc = document.getElementById("txDescription").value.trim();
  const amt = parseFloat(document.getElementById("txAmount").value);
  if (!desc || amt <= 0) {
    alert("Please enter a valid description and amount greater than 0.");
    return;
  }
  const tx = {
    date: txDate.value,
    description: desc,
    category: txCategory.value,
    amount: amt,
    type: txTypeInput.value,
  };
  if (editingRow !== null) {
    transactions[editingRow] = tx;
    editingRow = null;
  } else {
    transactions.push(tx);
  }
  saveTransactions();
  renderTransactions();
  modal.style.display = "none";
  e.target.reset();
});

// --- Categories ---
function renderCategories() {
  txCategory.innerHTML = categories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  categoryList.innerHTML = "";
  categories.forEach((c, i) => {
    const li = document.createElement("li");
    li.textContent = c;
    const del = document.createElement("button");
    del.textContent = "x";
    del.onclick = () => {
      categories.splice(i, 1);
      saveCategories();
      renderCategories();
    };

    li.appendChild(del);
    categoryList.appendChild(li);
  });
}
addCategoryBtn.addEventListener("click", () => {
  const val = newCategoryInput.value.trim();
  if (val && !categories.includes(val)) {
    categories.push(val);
    saveCategories();
    renderCategories();
    newCategoryInput.value = "";
  }
});

// logout from the account
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth
      .signOut()
      .then(() => {
        // Firebase signs the user out
        localStorage.clear(); // optional: clear cached data
        window.location.href = "index.html"; // back to login page
      })
      .catch((error) => {
        console.error("Logout error:", error);
        alert("Error logging out. Try again.");
      });
  });
}

// --- Init ---
renderCategories();
renderTransactions();
renderCurrencySettings();
auth.onAuthStateChanged((user) => {
  if (!user) {
    // Not logged in → kick back to homepage
    window.location.href = "index.html";
  } else {
    setUserEmail(user.email);
    loadUserData(user.uid);
  }
});

// important event
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    location.reload();
  }, 400); // refresh after 400ms of no resize
});

// load the data whenever refresh from the firebase account (online mode)
async function loadUserData(uid) {
  const doc = await db.collection("users").doc(uid).get();
  if (doc.exists) {
    const data = doc.data();

    // restore from Firestore
    if (data.transactions) {
      transactions = data.transactions;
      localStorage.setItem("transactions", JSON.stringify(transactions));
    }
    if (data.categories) {
      categories = data.categories;
      localStorage.setItem("categories", JSON.stringify(categories));
    }
    if (data.currency) {
      selectedCurrency = data.currency;
      localStorage.setItem("currency", selectedCurrency);
    }
    if (data.avatar) {
      localStorage.setItem("avatar", data.avatar);
      userAvatar.style.backgroundImage = `url(${data.avatar})`;
      userAvatar.textContent = "";
    }

    // refresh UI
    renderCategories();
    renderTransactions();
    renderCurrencySettings();
  }
}

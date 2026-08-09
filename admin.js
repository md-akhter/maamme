// firebaseConfig ও firebase.initializeApp() firebase-init.js এ আছে (শেয়ার্ড)

const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// Login / Logout
// ============================================================

function login() {
  let email = document.getElementById("email").value;
  let pass = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, pass)
    .catch((error) => {
      alert("লগইন ব্যর্থ হয়েছে: " + error.message);
    });
  // সফল হলে onAuthStateChanged (নিচে) নিজে থেকেই ড্যাশবোর্ড দেখিয়ে দেবে।
}

// Email বা Password বক্সে থেকে Enter চাপলেই Login হয়ে যাবে, মাউস দিয়ে
// বাটনে ক্লিক করার দরকার নেই।
document.getElementById("email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});

function logout() {
  auth.signOut();
}

// Orders আর Products ট্যাবের মধ্যে সুইচ করে
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tabBtn-' + tab).classList.add('active');
  document.getElementById('tabContent-' + tab).classList.add('active');
}

auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("login").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadOrders();
    loadProducts();
  } else {
    document.getElementById("login").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});


// ============================================================
// Customer Orders — লোড ও status আপডেট
// ============================================================

// ============================================================
// Customer Orders — লোড, স্ট্যাটাস আপডেট, ফিল্টার ও কাউন্ট সামারি
// ============================================================

const ORDER_STATUSES = [
  { key: 'pending',   icon: '⏳', label: 'Pending' },
  { key: 'confirmed', icon: '✅', label: 'Confirmed' },
  { key: 'delivered', icon: '📦', label: 'Delivered' },
  { key: 'cancelled', icon: '❌', label: 'বাতিল' },
  { key: 'returned',  icon: '↩️', label: 'রিটার্ন' }
];

let allOrders = [];      // সব অর্ডার এখানে ক্যাশ থাকে — বারবার Firestore থেকে না এনে filter/count করা যায়
let currentFilter = 'all';

function loadOrders() {
  const list = document.getElementById("ordersList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("orders").orderBy("createdAt", "desc").get()
    .then((snapshot) => {
      allOrders = [];
      snapshot.forEach((doc) => allOrders.push({ id: doc.id, ...doc.data() }));
      document.getElementById('ordersCount').textContent = allOrders.length ? allOrders.length : '';
      renderOrders();
    })
    .catch((err) => {
      list.innerHTML = "<p>অর্ডার লোড করতে সমস্যা হয়েছে।</p>";
      console.error("Firestore load error:", err);
    });
}

function statusMeta(key) {
  return ORDER_STATUSES.find(s => s.key === key) || ORDER_STATUSES[0];
}

// ক্যাশ করা allOrders থেকেই stats bar + filtered লিস্ট বানায় — কোনো নতুন Firestore কল লাগে না
function renderOrders() {
  const list = document.getElementById("ordersList");

  if (allOrders.length === 0) {
    list.innerHTML = "<p>এখনো কোনো অর্ডার নেই।</p>";
    return;
  }

  const counts = { all: allOrders.length };
  ORDER_STATUSES.forEach(s => counts[s.key] = 0);
  allOrders.forEach(o => {
    const st = o.status || 'pending';
    counts[st] = (counts[st] || 0) + 1;
  });

  let statsHtml = '<div class="stats-bar">';
  statsHtml += `<div class="stat-chip ${currentFilter === 'all' ? 'active' : ''}" data-key="all">সব <span class="stat-count">${counts.all}</span></div>`;
  ORDER_STATUSES.forEach(s => {
    statsHtml += `<div class="stat-chip ${currentFilter === s.key ? 'active' : ''}" data-key="${s.key}">${s.icon} ${s.label} <span class="stat-count">${counts[s.key] || 0}</span></div>`;
  });
  statsHtml += '</div>';

  const filtered = currentFilter === 'all' ? allOrders : allOrders.filter(o => (o.status || 'pending') === currentFilter);

  let itemsHtml = '';
  if (filtered.length === 0) {
    itemsHtml = '<p style="padding:10px 0;">এই স্ট্যাটাসে কোনো অর্ডার নেই।</p>';
  } else {
    filtered.forEach((o) => {
      const total = o.total ? Number(o.total).toLocaleString('en-IN') : '—';
      const status = o.status || 'pending';
      itemsHtml += `
        <div class="order-item status-${status}">
          <div class="order-top"><b>#${o.orderId || ''}</b><span>${o.date || ''}</span></div>
          <div>${o.name || ''} — ${o.phone || ''}</div>
          <div>${o.product || ''} × ${o.quantity || ''}</div>
          <div>${o.address || ''}</div>
          ${o.note ? `<div class="order-note">মন্তব্য: ${o.note}</div>` : ''}
          <div class="order-total">৳ ${total}</div>
          <div class="status-row">
            <label>স্ট্যাটাস: </label>
            <select class="status-select" data-id="${o.id}">
              ${ORDER_STATUSES.map(s => `<option value="${s.key}" ${status === s.key ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
            </select>
          </div>
        </div>`;
    });
  }

  list.innerHTML = statsHtml + itemsHtml;

  document.querySelectorAll('.stat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentFilter = chip.getAttribute('data-key');
      renderOrders();
    });
  });

  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const orderId = e.target.getAttribute('data-id');
      const newStatus = e.target.value;
      updateOrderStatus(orderId, newStatus);
    });
  });
}

function updateOrderStatus(orderId, newStatus) {
  db.collection("orders").doc(orderId).update({
    status: newStatus
  })
  .then(() => {
    const o = allOrders.find(x => x.id === orderId);
    if (o) o.status = newStatus;
    renderOrders(); // কাউন্ট/ফিল্টার নতুন করে রিফ্রেশ হয়, আবার Firestore থেকে আনার দরকার নেই
  })
  .catch((err) => {
    alert("Status আপডেট করতে সমস্যা হয়েছে।");
    console.error("Status update error:", err);
  });
}


// ============================================================
// Products — Add / Edit / Delete
// ============================================================

let allProducts = [];

function loadProducts() {
  const list = document.getElementById("productsList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("products").orderBy("order", "asc").get()
    .then((snapshot) => {
      allProducts = [];
      snapshot.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() }));
      document.getElementById('productsCount').textContent = snapshot.size ? snapshot.size : '';
      if (snapshot.empty) {
        list.innerHTML = "<p>এখনো কোনো প্রোডাক্ট নেই।</p>";
        return;
      }
      let html = "";
      snapshot.forEach((doc) => {
        const p = doc.data();
        const price = p.price ? Number(p.price).toLocaleString('en-IN') : '—';
        html += `
          <div class="order-item">
            <div class="order-top"><b>${p.name || ''}</b><span>৳ ${price}</span></div>
            <div>${p.fullName || ''}</div>
            <div class="order-note">${p.tag || ''} · slug: ${p.slug || doc.id}</div>
            <div class="status-row">
              <button class="small-btn edit-btn" data-id="${doc.id}">✏️ এডিট</button>
              <button class="small-btn delete-btn" data-id="${doc.id}">🗑️ ডিলিট</button>
            </div>
          </div>`;
      });
      list.innerHTML = html;

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.getAttribute('data-id')));
      });
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-id')));
      });
    })
    .catch((err) => {
      list.innerHTML = "<p>প্রোডাক্ট লোড করতে সমস্যা হয়েছে।</p>";
      console.error("Products load error:", err);
    });
}

// ফর্মের ভ্যালু দিয়ে নতুন প্রোডাক্ট তৈরি করে, অথবা এডিট মোডে থাকলে আপডেট করে
function saveProduct() {
  const msg = document.getElementById("productFormMsg");
  const editingId = document.getElementById("editingProductId").value;

  const name = document.getElementById("pName").value.trim();
  const fullName = document.getElementById("pFullName").value.trim();
  const tag = document.getElementById("pTag").value.trim();
  const description = document.getElementById("pDescription").value.trim();
  const price = Number(document.getElementById("pPrice").value);
  const image = document.getElementById("pImage").value.trim();
  const slug = document.getElementById("pSlug").value.trim();
  const order = Number(document.getElementById("pOrder").value) || 0;

  if (!name || !fullName || !price || !image || !slug) {
    msg.style.color = "#c0533e";
    msg.textContent = "নাম, পুরো নাম, দাম, ছবি ও slug — এই ৫টা অবশ্যই দিতে হবে।";
    return;
  }

  const productData = { name, fullName, tag, description, price, image, slug, order };

  // slug-কেই doc ID হিসেবে ব্যবহার করা হচ্ছে — যাতে link/anchor মেলে
  db.collection("products").doc(slug).set(productData)
    .then(() => {
      msg.style.color = "#2e7d32";
      msg.textContent = editingId ? "✅ প্রোডাক্ট আপডেট হয়েছে।" : "✅ প্রোডাক্ট যোগ হয়েছে।";
      cancelEdit();
      loadProducts();
    })
    .catch((err) => {
      msg.style.color = "#c0533e";
      msg.textContent = "সেভ করতে সমস্যা হয়েছে: " + err.message;
      console.error("Product save error:", err);
    });
}

function editProduct(id) {
  db.collection("products").doc(id).get().then((doc) => {
    if (!doc.exists) return;
    const p = doc.data();
    document.getElementById("editingProductId").value = id;
    document.getElementById("pName").value = p.name || '';
    document.getElementById("pFullName").value = p.fullName || '';
    document.getElementById("pTag").value = p.tag || '';
    document.getElementById("pDescription").value = p.description || '';
    document.getElementById("pPrice").value = p.price || '';
    document.getElementById("pImage").value = p.image || '';
    document.getElementById("pSlug").value = p.slug || id;
    document.getElementById("pOrder").value = p.order || '';

    document.getElementById("productFormTitle").textContent = "✏️ প্রোডাক্ট এডিট করুন";
    document.getElementById("saveProductBtn").textContent = "আপডেট করুন";
    document.getElementById("cancelEditBtn").style.display = "block";
    document.getElementById("productFormTitle").scrollIntoView({ behavior: "smooth" });
  });
}

function cancelEdit() {
  document.getElementById("editingProductId").value = "";
  document.getElementById("pName").value = '';
  document.getElementById("pFullName").value = '';
  document.getElementById("pTag").value = '';
  document.getElementById("pDescription").value = '';
  document.getElementById("pPrice").value = '';
  document.getElementById("pImage").value = '';
  document.getElementById("pSlug").value = '';
  document.getElementById("pOrder").value = '';

  document.getElementById("productFormTitle").textContent = "➕ নতুন প্রোডাক্ট যোগ করুন";
  document.getElementById("saveProductBtn").textContent = "প্রোডাক্ট যোগ করুন";
  document.getElementById("cancelEditBtn").style.display = "none";
}

function deleteProduct(id) {
  if (!confirm("আপনি কি নিশ্চিত এই প্রোডাক্টটি ডিলিট করতে চান?")) return;

  db.collection("products").doc(id).delete()
    .then(() => {
      loadProducts();
    })
    .catch((err) => {
      alert("ডিলিট করতে সমস্যা হয়েছে।");
      console.error("Product delete error:", err);
    });
}


// ============================================================
// Backup — Orders / Products CSV হিসেবে ডাউনলোড (Google Sheets/Excel-এ খোলা যায়)
// ============================================================

// কোনো ভ্যালুতে কমা/quote/নতুন লাইন থাকলে CSV ফরম্যাটে ঠিকভাবে র‍্যাপ করে
function csvEscape(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowsToCSV(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach(r => lines.push(r.map(csvEscape).join(',')));
  // শুরুতে UTF-8 BOM (\ufeff) দেওয়া হচ্ছে, নাহলে Excel/Sheets-এ বাংলা লেখা ভাঙাচোরা দেখাতে পারে
  return '\ufeff' + lines.join('\r\n');
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// অর্ডার — তারিখ অনুযায়ী (সবচেয়ে নতুন আগে, যেভাবে Firestore থেকে আনা হয়েছে) CSV হিসেবে ডাউনলোড
function exportOrdersToCSV() {
  if (allOrders.length === 0) {
    alert("ডাউনলোড করার মতো কোনো অর্ডার নেই।");
    return;
  }
  const headers = ['Order ID', 'তারিখ', 'নাম', 'ফোন', 'প্রোডাক্ট', 'পরিমাণ', 'ঠিকানা', 'মন্তব্য', 'মোট (৳)', 'স্ট্যাটাস'];
  const rows = allOrders.map(o => [
    o.orderId || '',
    o.date || '',
    o.name || '',
    o.phone || '',
    o.product || '',
    o.quantity || '',
    o.address || '',
    o.note || '',
    o.total || 0,
    statusMeta(o.status || 'pending').label
  ]);
  downloadCSV(`orders_backup_${todayStr()}.csv`, rowsToCSV(headers, rows));
}

// প্রোডাক্ট — ক্রম নম্বর অনুযায়ী CSV হিসেবে ডাউনলোড
function exportProductsToCSV() {
  if (allProducts.length === 0) {
    alert("ডাউনলোড করার মতো কোনো প্রোডাক্ট নেই।");
    return;
  }
  const headers = ['Slug', 'নাম', 'পুরো নাম', 'ট্যাগ', 'বিবরণ', 'দাম (৳)', 'ছবি', 'ক্রম'];
  const rows = allProducts.map(p => [
    p.slug || p.id || '',
    p.name || '',
    p.fullName || '',
    p.tag || '',
    p.description || '',
    p.price || 0,
    p.image || '',
    p.order || 0
  ]);
  downloadCSV(`products_backup_${todayStr()}.csv`, rowsToCSV(headers, rows));
}

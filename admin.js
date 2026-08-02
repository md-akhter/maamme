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

function loadOrders() {
  const list = document.getElementById("ordersList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("orders").orderBy("createdAt", "desc").get()
    .then((snapshot) => {
      document.getElementById('ordersCount').textContent = snapshot.size ? snapshot.size : '';
      if (snapshot.empty) {
        list.innerHTML = "<p>এখনো কোনো অর্ডার নেই।</p>";
        return;
      }
      let html = "";
      snapshot.forEach((doc) => {
        const o = doc.data();
        const id = doc.id;
        const total = o.total ? Number(o.total).toLocaleString('en-IN') : '—';
        const status = o.status || 'pending';

        html += `
          <div class="order-item">
            <div class="order-top"><b>#${o.orderId || ''}</b><span>${o.date || ''}</span></div>
            <div>${o.name || ''} — ${o.phone || ''}</div>
            <div>${o.product || ''} × ${o.quantity || ''}</div>
            <div>${o.address || ''}</div>
            ${o.note ? `<div class="order-note">মন্তব্য: ${o.note}</div>` : ''}
            <div class="order-total">৳ ${total}</div>
            <div class="status-row">
              <label>স্ট্যাটাস: </label>
              <select class="status-select" data-id="${id}">
                <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
                <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>📦 Delivered</option>
              </select>
            </div>
          </div>`;
      });
      list.innerHTML = html;

      document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
          const orderId = e.target.getAttribute('data-id');
          const newStatus = e.target.value;
          updateOrderStatus(orderId, newStatus);
        });
      });
    })
    .catch((err) => {
      list.innerHTML = "<p>অর্ডার লোড করতে সমস্যা হয়েছে।</p>";
      console.error("Firestore load error:", err);
    });
}

function updateOrderStatus(orderId, newStatus) {
  db.collection("orders").doc(orderId).update({
    status: newStatus
  })
  .then(() => {
    console.log("Status updated:", orderId, newStatus);
  })
  .catch((err) => {
    alert("Status আপডেট করতে সমস্যা হয়েছে।");
    console.error("Status update error:", err);
  });
}


// ============================================================
// Products — Add / Edit / Delete
// ============================================================

function loadProducts() {
  const list = document.getElementById("productsList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("products").orderBy("order", "asc").get()
    .then((snapshot) => {
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

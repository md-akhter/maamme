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
    loadComplaints();
    loadPosts();
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
  { key: 'cancelled', icon: '❌', label: 'Cancelled' },
  { key: 'returned',  icon: '↩️', label: 'Returned' }
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
          <div class="order-top"><b>#${escapeHtml(o.orderId)}</b><span>${escapeHtml(o.date)}</span></div>
          <div>${escapeHtml(o.name)} — ${escapeHtml(o.phone)}</div>
          <div>${escapeHtml(o.product)} × ${escapeHtml(o.quantity)}</div>
          <div>${escapeHtml(o.address)}</div>
          ${o.note ? `<div class="order-note">মন্তব্য: ${escapeHtml(o.note)}</div>` : ''}
          <div class="order-total">৳ ${escapeHtml(total)}</div>
          <div class="status-row">
            <label>স্ট্যাটাস: </label>
            <select class="status-select" data-id="${escapeHtml(o.id)}">
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
// Complaints — লোড, স্ট্যাটাস আপডেট
// ============================================================

// অভিযোগ-এর নাম/মোবাইল/জেলা/মেসেজ কাস্টমার নিজে টাইপ করে (কোনো লগইন ছাড়াই),
// তাই innerHTML-এ বসানোর আগে escape করা হচ্ছে — নাহলে কেউ HTML/script ঢুকিয়ে দিলে
// admin panel-এ সেটা চালু হয়ে যেতে পারে।
function escapeHtml(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const COMPLAINT_STATUSES = [
  { key: 'new',      icon: '🆕', label: 'নতুন' },
  { key: 'progress',  icon: '⏳', label: 'দেখা হচ্ছে' },
  { key: 'resolved', icon: '✅', label: 'সমাধান হয়েছে' }
];

let allComplaints = [];

function loadComplaints() {
  const list = document.getElementById("complaintsList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("complaints").orderBy("createdAt", "desc").get()
    .then((snapshot) => {
      allComplaints = [];
      snapshot.forEach((doc) => allComplaints.push({ id: doc.id, ...doc.data() }));
      const newCount = allComplaints.filter(c => (c.status || 'new') === 'new').length;
      document.getElementById('complaintsCount').textContent = newCount ? newCount : '';
      renderComplaints();
    })
    .catch((err) => {
      list.innerHTML = "<p>অভিযোগ লোড করতে সমস্যা হয়েছে।</p>";
      console.error("Complaints load error:", err);
    });
}

function complaintStatusMeta(key) {
  return COMPLAINT_STATUSES.find(s => s.key === key) || COMPLAINT_STATUSES[0];
}

function renderComplaints() {
  const list = document.getElementById("complaintsList");

  if (allComplaints.length === 0) {
    list.innerHTML = "<p>এখনো কোনো অভিযোগ নেই।</p>";
    return;
  }

  let html = '';
  allComplaints.forEach((c) => {
    const status = c.status || 'new';
    html += `
      <div class="order-item status-${status === 'resolved' ? 'delivered' : (status === 'new' ? 'cancelled' : '')}">
        <div class="order-top"><b>অর্ডার #${escapeHtml(c.orderId)}</b></div>
        <div>${escapeHtml(c.name)} — ${escapeHtml(c.mobile)}</div>
        <div>জেলা: ${escapeHtml(c.district)}</div>
        <div class="order-note">${escapeHtml(c.message)}</div>
        <div class="status-row">
          <label>স্ট্যাটাস: </label>
          <select class="complaint-status-select" data-id="${c.id}">
            ${COMPLAINT_STATUSES.map(s => `<option value="${s.key}" ${status === s.key ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
      </div>`;
  });

  list.innerHTML = html;

  document.querySelectorAll('.complaint-status-select').forEach(select => {
    select.addEventListener('change', (e) => {
      updateComplaintStatus(e.target.getAttribute('data-id'), e.target.value);
    });
  });
}

function updateComplaintStatus(id, newStatus) {
  db.collection("complaints").doc(id).update({ status: newStatus })
    .then(() => {
      const c = allComplaints.find(x => x.id === id);
      if (c) c.status = newStatus;
      renderComplaints();
    })
    .catch((err) => {
      alert("Status আপডেট করতে সমস্যা হয়েছে।");
      console.error("Complaint status update error:", err);
    });
}


// ============================================================
// Products — Add / Edit / Delete
// ============================================================

let allProducts = [];

// Category dropdown বদলালে সেই অনুযায়ী সঠিক Sub-category dropdown দেখায়/লুকায়
function onProductCategoryChange() {
  const category = document.getElementById("pCategory").value;
  document.getElementById("furnitureSubWrap").style.display = (category === "Furniture") ? "block" : "none";
  document.getElementById("fashionSubWrap").style.display = (category === "Fashion") ? "block" : "none";
}

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
      const total = snapshot.size;
      snapshot.forEach((doc, index) => {
        const p = doc.data();
        const price = p.price ? Number(p.price).toLocaleString('en-IN') : '—';
        const position = index + 1;
        html += `
          <div class="order-item">
            <div class="order-top"><b>#${position}/${total} — ${escapeHtml(p.name)}</b><span>৳ ${escapeHtml(price)}</span></div>
            <div>${escapeHtml(p.fullName)}</div>
            <div class="order-note">${escapeHtml(p.tag)} · ${escapeHtml(p.category || 'Home')}${p.subCategory ? ' - ' + escapeHtml(p.subCategory) : ''} · slug: ${escapeHtml(p.slug || doc.id)} · ক্রম: ${escapeHtml(p.order ?? '—')}</div>
            <div class="status-row">
              <button class="small-btn edit-btn" data-id="${escapeHtml(doc.id)}">✏️ এডিট</button>
              <button class="small-btn delete-btn" data-id="${escapeHtml(doc.id)}">🗑️ ডিলিট</button>
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

  const category = document.getElementById("pCategory").value;
  let subCategory = "";
  if (category === "Furniture") subCategory = document.getElementById("pFurnitureSub").value;
  else if (category === "Fashion") subCategory = document.getElementById("pFashionSub").value;

  if (!name || !fullName || !price || !image || !slug) {
    msg.style.color = "#c0533e";
    msg.textContent = "নাম, পুরো নাম, দাম, ছবি ও slug — এই ৫টা অবশ্যই দিতে হবে।";
    return;
  }

  const productData = { name, fullName, tag, description, price, image, slug, order, category, subCategory };

  // slug-কেই doc ID হিসেবে ব্যবহার করা হচ্ছে — যাতে link/anchor মেলে।
  // এডিট মোডে slug বদলে গেলে batch ব্যবহার করা হচ্ছে যাতে নতুন doc তৈরি ও পুরনো doc
  // ডিলিট — দুটোই একসাথে (atomically) হয়, মাঝপথে নেটওয়ার্ক এরর হলেও ডুপ্লিকেট প্রোডাক্ট
  // থেকে যাওয়ার সুযোগ থাকে না।
  const batch = db.batch();
  batch.set(db.collection("products").doc(slug), productData);
  if (editingId && editingId !== slug) {
    batch.delete(db.collection("products").doc(editingId));
  }
  batch.commit()
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

    document.getElementById("pCategory").value = p.category || 'Home';
    onProductCategoryChange();
    if (p.category === 'Furniture') document.getElementById("pFurnitureSub").value = p.subCategory || 'steel-chair';
    if (p.category === 'Fashion') document.getElementById("pFashionSub").value = p.subCategory || 'three-piece';

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

  document.getElementById("pCategory").value = 'Home';
  onProductCategoryChange();

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
// Posts (products/index.html পেজের SEO প্রোডাক্ট পোস্ট) — Add / Edit / Delete
// + প্রতিটা পোস্টের জন্য আলাদা SEO-friendly স্ট্যাটিক HTML ফাইল জেনারেট করে ডাউনলোড
// ============================================================

let allPosts = [];

function loadPosts() {
  const list = document.getElementById("postsList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("posts").orderBy("order", "asc").get()
    .then((snapshot) => {
      allPosts = [];
      snapshot.forEach((doc) => allPosts.push({ id: doc.id, ...doc.data() }));
      document.getElementById('postsCount').textContent = snapshot.size ? snapshot.size : '';
      if (snapshot.empty) {
        list.innerHTML = "<p>এখনো কোনো পোস্ট নেই।</p>";
        return;
      }
      let html = "";
      const total = snapshot.size;
      allPosts.forEach((p, index) => {
        const position = index + 1;
        html += `
          <div class="order-item">
            <div class="order-top"><b>#${position}/${total} — ${escapeHtml(p.name)}</b><span>${formatTakaBn(p.price)}</span></div>
            <div class="order-note">${escapeHtml(p.tag || '')} · slug: ${escapeHtml(p.slug || p.id)} · ক্রম: ${escapeHtml(p.order ?? '—')}</div>
            <div class="status-row">
              <button class="small-btn edit-btn" data-id="${escapeHtml(p.id)}">✏️ এডিট</button>
              <button class="small-btn" data-id="${escapeHtml(p.id)}" data-action="download">📥 HTML</button>
              <button class="small-btn delete-btn" data-id="${escapeHtml(p.id)}">🗑️ ডিলিট</button>
            </div>
          </div>`;
      });
      list.innerHTML = html;

      document.querySelectorAll('#postsList .edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editPost(btn.getAttribute('data-id')));
      });
      document.querySelectorAll('#postsList .delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deletePost(btn.getAttribute('data-id')));
      });
      document.querySelectorAll('#postsList [data-action="download"]').forEach(btn => {
        btn.addEventListener('click', () => downloadExistingPostHtml(btn.getAttribute('data-id')));
      });
    })
    .catch((err) => {
      list.innerHTML = "<p>পোস্ট লোড করতে সমস্যা হয়েছে।</p>";
      console.error("Posts load error:", err);
    });
}

// টেক্সটএরিয়াতে "লেবেল: মান" আকারে প্রতি লাইনে লেখা স্পেক লিস্টকে array-তে পার্স করে
function parseSpecs(text) {
  return text.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return { label: line, value: '' };
      return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    });
}

function specsToText(specs) {
  if (!Array.isArray(specs)) return '';
  return specs.map(s => `${s.label}: ${s.value}`).join('\n');
}

// খালি লাইন দিয়ে আলাদা করা প্যারাগ্রাফগুলোকে array-তে ভাগ করে
function parseParagraphs(text) {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
}

function toBanglaNumber(num) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => bn[d]);
}

function formatTakaBn(amount) {
  const grouped = Number(amount || 0).toLocaleString('en-IN');
  return '৳ ' + toBanglaNumber(grouped);
}

function readPostForm() {
  return {
    name: document.getElementById("postName").value.trim(),
    tag: document.getElementById("postTag").value.trim(),
    price: Number(document.getElementById("postPrice").value) || 0,
    priceUnit: document.getElementById("postPriceUnit").value.trim() || 'প্রতি পিস',
    image: document.getElementById("postImage").value.trim(),
    slug: document.getElementById("postSlug").value.trim(),
    metaDesc: document.getElementById("postMetaDesc").value.trim(),
    specs: parseSpecs(document.getElementById("postSpecs").value),
    description: parseParagraphs(document.getElementById("postDescription").value),
    order: Number(document.getElementById("postOrder").value) || 0
  };
}

function savePost() {
  const msg = document.getElementById("postFormMsg");
  const editingId = document.getElementById("editingPostId").value;
  const post = readPostForm();

  if (!post.name || !post.price || !post.image || !post.slug || post.description.length === 0) {
    msg.style.color = "#c0533e";
    msg.textContent = "নাম, দাম, ছবি, slug ও বিবরণ — এগুলো অবশ্যই দিতে হবে।";
    return;
  }

  // slug-কেই doc ID হিসেবে ব্যবহার করা হচ্ছে (products ট্যাবের প্যাটার্নেই) — যাতে
  // Firestore doc ID আর আসল .html ফাইলের নাম সবসময় এক থাকে। batch ব্যবহার করা হচ্ছে
  // যাতে slug বদলানোর সময় নতুন doc তৈরি ও পুরনো doc ডিলিট একসাথে (atomically) হয়।
  const batch = db.batch();
  batch.set(db.collection("posts").doc(post.slug), post);
  if (editingId && editingId !== post.slug) {
    batch.delete(db.collection("posts").doc(editingId));
  }
  batch.commit()
    .then(() => {
      msg.style.color = "#2e7d32";
      msg.textContent = editingId ? "✅ পোস্ট আপডেট হয়েছে। এখন চাইলে HTML ফাইলও নতুন করে ডাউনলোড করে আপলোড করুন।" : "✅ পোস্ট যোগ হয়েছে। এখন \"HTML ফাইল ডাউনলোড করুন\" বাটনে ক্লিক করে ফাইলটা GitHub-এ আপলোড করুন।";
      cancelPostEdit();
      loadPosts();
    })
    .catch((err) => {
      msg.style.color = "#c0533e";
      msg.textContent = "সেভ করতে সমস্যা হয়েছে: " + err.message;
      console.error("Post save error:", err);
    });
}

function editPost(id) {
  db.collection("posts").doc(id).get().then((doc) => {
    if (!doc.exists) return;
    const p = doc.data();
    document.getElementById("editingPostId").value = id;
    document.getElementById("postName").value = p.name || '';
    document.getElementById("postTag").value = p.tag || '';
    document.getElementById("postPrice").value = p.price || '';
    document.getElementById("postPriceUnit").value = p.priceUnit || 'প্রতি পিস';
    document.getElementById("postImage").value = p.image || '';
    document.getElementById("postSlug").value = p.slug || id;
    document.getElementById("postMetaDesc").value = p.metaDesc || '';
    document.getElementById("postSpecs").value = specsToText(p.specs);
    document.getElementById("postDescription").value = (p.description || []).join('\n\n');
    document.getElementById("postOrder").value = p.order || '';

    document.getElementById("postFormTitle").textContent = "✏️ পোস্ট এডিট করুন";
    document.getElementById("savePostBtn").textContent = "আপডেট করুন";
    document.getElementById("cancelPostEditBtn").style.display = "block";
    document.getElementById("postFormTitle").scrollIntoView({ behavior: "smooth" });
  });
}

function cancelPostEdit() {
  document.getElementById("editingPostId").value = "";
  document.getElementById("postName").value = '';
  document.getElementById("postTag").value = '';
  document.getElementById("postPrice").value = '';
  document.getElementById("postPriceUnit").value = 'প্রতি পিস';
  document.getElementById("postImage").value = '';
  document.getElementById("postSlug").value = '';
  document.getElementById("postMetaDesc").value = '';
  document.getElementById("postSpecs").value = '';
  document.getElementById("postDescription").value = '';
  document.getElementById("postOrder").value = '';

  document.getElementById("postFormTitle").textContent = "➕ নতুন পোস্ট যোগ করুন";
  document.getElementById("savePostBtn").textContent = "পোস্ট সেভ করুন";
  document.getElementById("cancelPostEditBtn").style.display = "none";
}

function deletePost(id) {
  if (!confirm("আপনি কি নিশ্চিত এই পোস্টটি ডিলিট করতে চান? (মনে রাখবেন: এটা শুধু লিস্টিং গ্রিড থেকে সরাবে — GitHub-এ থাকা আসল .html ফাইলটা আলাদাভাবে ম্যানুয়ালি ডিলিট করতে হবে, নাহলে পুরনো লিংকে পেজটা তখনও খোলা থাকবে)")) return;

  db.collection("posts").doc(id).delete()
    .then(() => {
      loadPosts();
    })
    .catch((err) => {
      alert("ডিলিট করতে সমস্যা হয়েছে।");
      console.error("Post delete error:", err);
    });
}

// ============================================================
// পোস্টের জন্য SEO সহ পূর্ণাঙ্গ স্ট্যাটিক HTML ফাইল জেনারেট করা
// (kaunter-chair-*.html ফাইলগুলোর ঠিক একই টেমপ্লেট অনুসরণ করে)
// ============================================================

const SITE_ORIGIN = 'https://maamme.com';

function buildRelatedLinksHtml(currentSlug) {
  const others = allPosts.filter(p => p.slug !== currentSlug).slice(0, 3);
  let html = `<a href="index.html">সব প্রোডাক্ট দেখুন</a>`;
  others.forEach(p => {
    html += `\n        <a href="${escapeHtml(p.slug)}.html">${escapeHtml(p.name)}</a>`;
  });
  return html;
}

function buildPostHtml(post) {
  const priceDisplay = formatTakaBn(post.price);
  const specListHtml = post.specs.map(s =>
    `          <li><span>${escapeHtml(s.label)}</span><span>${escapeHtml(s.value)}</span></li>`
  ).join('\n');
  const descHtml = post.description.map(p => `      <p>\n        ${escapeHtml(p)}\n      </p>`).join('\n');
  const relatedHtml = buildRelatedLinksHtml(post.slug);
  const jsonLdDesc = (post.metaDesc || post.description[0] || '').replace(/"/g, '\\"');
  const title = `${post.name} — দাম ও বৈশিষ্ট্য | Maamme.com`;
  const pageUrl = `${SITE_ORIGIN}/products/${post.slug}.html`;
  const imageUrl = `${SITE_ORIGIN}/images/${post.image}`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(post.metaDesc)}">
<link rel="canonical" href="${pageUrl}">

<meta property="og:type" content="product">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(post.metaDesc)}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:locale" content="bn_BD">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(post.metaDesc)}">
<meta name="twitter:image" content="${imageUrl}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" type="text/css" href="../style.css?v=6">
<style>
  .product-section{padding:44px 0 64px;}
  .breadcrumb{font-size:13px; color:#6b7690; margin-bottom:22px;}
  .breadcrumb a{color:var(--brass); text-decoration:none;}
  .breadcrumb a:hover{text-decoration:underline;}

  .product-layout{display:grid; grid-template-columns:1fr 1fr; gap:44px; align-items:start;}
  .product-photo-wrap{border-radius:14px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.18);}
  .product-photo-wrap img{width:100%; aspect-ratio:4/5; object-fit:cover;}

  .product-info .eyebrow{margin-bottom:10px;}
  .product-info h1{font-size:clamp(26px,3.5vw,36px); font-weight:500; line-height:1.15; margin:0 0 14px;}
  .product-price{font-family:'Fraunces',serif; font-weight:600; font-size:26px; color:var(--walnut-950); margin-bottom:18px;}
  .product-price span{font-family:'Hind Siliguri',sans-serif; font-size:13px; font-weight:400; color:#6b7690; margin-left:6px;}

  .product-order-btn{display:inline-block; text-align:center; text-decoration:none;}

  .spec-list{list-style:none; padding:0; margin:22px 0; font-size:14.5px; color:#3d4a63;}
  .spec-list li{padding:8px 0; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:12px;}
  .spec-list li span:first-child{color:#6b7690;}

  .product-desc{margin-top:36px; max-width:760px;}
  .product-desc h2{font-size:22px; font-weight:500; margin-bottom:14px;}
  .product-desc p{font-size:15.5px; line-height:1.85; color:#3d4a63; margin-bottom:16px;}

  .related-section{margin-top:48px; padding-top:36px; border-top:1px solid var(--line);}
  .related-section h2{font-size:20px; font-weight:500; margin-bottom:18px;}
  .related-links{display:flex; flex-wrap:wrap; gap:12px;}
  .related-links a{
    display:inline-block; padding:9px 16px; border:1px solid var(--line); border-radius:20px;
    text-decoration:none; color:var(--text-dark); font-size:13.5px; transition:all .15s ease;
  }
  .related-links a:hover{border-color:var(--brass); color:var(--brass);}

  @media (max-width:800px){
    .product-layout{grid-template-columns:1fr; gap:26px;}
  }
  @media (max-width:560px){
    .wrap{padding:0 10px;}
    .product-section{padding:26px 0 40px;}
    .product-info h1{font-size:24px;}
    .product-price{font-size:22px;}
  }
</style>

<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "${escapeHtml(post.name).replace(/"/g, '\\"')}",
  "image": "${imageUrl}",
  "description": "${jsonLdDesc}",
  "sku": "${post.slug}",
  "brand": {
    "@type": "Brand",
    "name": "Maamme.com"
  },
  "offers": {
    "@type": "Offer",
    "url": "${pageUrl}",
    "priceCurrency": "BDT",
    "price": "${post.price}",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition"
  }
}
</script>
</head>
<body>

<header>
  <div class="nav">
    <div class="logo"><a href="../index.html"><img src="../images/logo_pic.jpeg" alt="MAAMME.COM"><span class="logo-text">Maamme<span>.com</span></span></a></div>
    <ul class="nav-links">
      <li><a href="../index.html">হোম</a></li>
      <li><a href="index.html">প্রোডাক্ট</a></li>
      <li><a href="../about-us.html">আমাদের সম্পর্কে</a></li>
    </ul>
    <div class="nav-actions" id="navActions">
      <div class="mobile-nav-links">
        <a href="../index.html">হোম</a>
        <a href="index.html">প্রোডাক্ট</a>
        <a href="../about-us.html">আমাদের সম্পর্কে</a>
      </div>
      <a href="../track.html" class="nav-cta-outline">ট্র্যাক করুন</a>
      <a href="../index.html#order" class="nav-cta">অর্ডার করুন</a>
    </div>
    <button class="mobile-menu-toggle" id="mobileMenuToggle" onclick="toggleMobileMenu()" aria-label="মেনু" aria-haspopup="true" aria-expanded="false">☰</button>
  </div>
</header>

<section class="product-section">
  <div class="wrap">

    <nav class="breadcrumb" aria-label="breadcrumb">
      <a href="../index.html">Home</a> &raquo; <a href="index.html">Products</a> &raquo; <span>${escapeHtml(post.name)}</span>
    </nav>

    <div class="product-layout">

      <div class="product-photo-wrap">
        <img src="../images/${escapeHtml(post.image)}" alt="${escapeHtml(post.name)}">
      </div>

      <div class="product-info">
        <div class="eyebrow">${escapeHtml(post.tag || '')}</div>
        <h1>${escapeHtml(post.name)}</h1>
        <div class="product-price">${priceDisplay}<span>${escapeHtml(post.priceUnit)}</span></div>

        <a href="../index.html#order" class="submit-btn product-order-btn" style="width:auto; padding:14px 32px;">অর্ডার করুন</a>

        <ul class="spec-list">
${specListHtml}
        </ul>
      </div>

    </div>

    <div class="product-desc">
      <h2>বিস্তারিত বিবরণ</h2>
${descHtml}
    </div>

    <div class="related-section">
      <h2>একই কালেকশনের অন্যান্য প্রোডাক্ট</h2>
      <div class="related-links">
        ${relatedHtml}
      </div>
    </div>

  </div>
</section>

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">MAAMME.COM</div>
      <ul class="foot-links">
        <li><a href="../index.html#products">সংগ্রহ</a></li>
        <li><a href="../index.html#about">কারুকাজ</a></li>
        <li><a href="../index.html#process">প্রক্রিয়া</a></li>
        <li><a href="../index.html#order">অর্ডার</a></li>
        <li><a href="../track.html">অর্ডার ট্র্যাক করুন</a></li>
        <li><a href="../complain.html">অভিযোগ জানান</a></li>
        <li><a href="https://www.facebook.com/maammebd/" target="_blank" rel="noopener">ফেসবুক পেজ</a></li>
      </ul>
    </div>
    <div class="foot-bottom">
      <span>© ২০২৬ MAAMME.COM — হস্তনির্মিত চেয়ার। সর্বস্বত্ব সংরক্ষিত।</span>
      <span>ঢাকা, বাংলাদেশ</span>
    </div>
  </div>
</footer>

<script>
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navActionsMenu = document.getElementById('navActions');

  function toggleMobileMenu() {
    if (!navActionsMenu) return;
    const isOpen = navActionsMenu.classList.toggle('open');
    if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function closeMobileMenu() {
    if (!navActionsMenu) return;
    navActionsMenu.classList.remove('open');
    if (mobileMenuToggle) mobileMenuToggle.setAttribute('aria-expanded', 'false');
  }

  if (navActionsMenu) {
    navActionsMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMobileMenu);
    });
  }

  document.addEventListener('click', (e) => {
    if (!navActionsMenu || !navActionsMenu.classList.contains('open')) return;
    if (navActionsMenu.contains(e.target) || (mobileMenuToggle && mobileMenuToggle.contains(e.target))) return;
    closeMobileMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 560) closeMobileMenu();
  });
</script>

</body>
</html>
`;
}

function downloadHtmlFile(filename, content) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ফর্মে যা আছে তা দিয়েই সরাসরি HTML জেনারেট করে ডাউনলোড দেয় (সেভ করা লাগে না)
function downloadPostHtml() {
  const post = readPostForm();
  if (!post.name || !post.price || !post.image || !post.slug || post.description.length === 0) {
    alert("নাম, দাম, ছবি, slug ও বিবরণ — এগুলো আগে পূরণ করুন।");
    return;
  }
  const html = buildPostHtml(post);
  downloadHtmlFile(`${post.slug}.html`, html);
}

// লিস্টে থাকা কোনো পোস্টের জন্য (Firestore-এ যা সেভ করা আছে সেটা দিয়ে) HTML ডাউনলোড করে
function downloadExistingPostHtml(id) {
  const p = allPosts.find(x => x.id === id);
  if (!p) return;
  const html = buildPostHtml(p);
  downloadHtmlFile(`${p.slug || id}.html`, html);
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

// ফোন নম্বরের মতো ভ্যালু (শুরুতে 0 থাকা সংখ্যা) CSV-তে সাধারণভাবে লিখলে
// Excel সেটাকে নিজের মতো number ধরে নিয়ে শুরুর "0" বাদ দিয়ে দেয় (01712345678 → 1712345678)।
// এটা ঠেকাতে Excel-এর নিজস্ব ট্রিক ব্যবহার করা হচ্ছে: ="01712345678" — এভাবে লিখলে
// Excel এটাকে ফর্মুলা হিসেবে ধরে, কিন্তু ফলাফল দেখায় ঠিক টেক্সট আকারে, শুরুর 0 সহ।
// (Google Sheets-ও এটাকে টেক্সট হিসেবেই দেখায়, তাই ওখানেও সমস্যা হয় না।)
function excelSafeText(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  return '="' + str.replace(/"/g, '""') + '"';
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
    excelSafeText(o.date || ''),
    o.name || '',
    excelSafeText(o.phone || ''),
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

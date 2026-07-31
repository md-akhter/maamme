// firebaseConfig ও firebase.initializeApp() এখন firebase-init.js এ আছে (শেয়ার্ড),


const auth = firebase.auth();
const db = firebase.firestore();

// Login Function
function login() {
  let email = document.getElementById("email").value;
  let pass = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, pass)
    .catch((error) => {
      alert("লগইন ব্যর্থ হয়েছে: " + error.message);
    });
  // সফল হলে onAuthStateChanged (নিচে) নিজে থেকেই ড্যাশবোর্ড দেখিয়ে দেবে।
}

// Logout Function
function logout() {
  auth.signOut();
}

// লগইন অবস্থা মনে রাখে — পেজ রিফ্রেশ করলেও বারবার লগইন করতে হবে না,
// আবার লগইন ছাড়া কেউ ড্যাশবোর্ড দেখতে পারবে না।
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("login").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadOrders();
  } else {
    document.getElementById("login").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});

// Firestore থেকে সব কাস্টমার অর্ডার লোড করে দেখায়
function loadOrders() {
  const list = document.getElementById("ordersList");
  list.innerHTML = "লোড হচ্ছে...";

  db.collection("orders").orderBy("createdAt", "desc").get()
    .then((snapshot) => {
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

      // প্রতিটা dropdown-এ change event লাগানো হচ্ছে
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

// Firestore-এ order status আপডেট করে
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

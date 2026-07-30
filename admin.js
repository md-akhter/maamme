// firebaseConfig ও firebase.initializeApp() এখন firebase-init.js এ আছে (শেয়ার্ড),
// তাই এখানে আলাদা করে আবার করার দরকার নেই।

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
        const total = o.total ? Number(o.total).toLocaleString('en-IN') : '—';
        html += `
          <div class="order-item">
            <div class="order-top"><b>#${o.orderId || ''}</b><span>${o.date || ''}</span></div>
            <div>${o.name || ''} — ${o.phone || ''}</div>
            <div>${o.product || ''} × ${o.quantity || ''}</div>
            <div>${o.address || ''}</div>
            ${o.note ? `<div class="order-note">মন্তব্য: ${o.note}</div>` : ''}
            <div class="order-total">৳ ${total}</div>
          </div>`;
      });
      list.innerHTML = html;
    })
    .catch((err) => {
      list.innerHTML = "<p>অর্ডার লোড করতে সমস্যা হয়েছে।</p>";
      console.error("Firestore load error:", err);
    });
}

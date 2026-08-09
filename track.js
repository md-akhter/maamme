// ============================================================
// অর্ডার ট্র্যাকিং — কাস্টমার নিজে Order ID বা ফোন নম্বর দিয়ে
// তার অর্ডারের স্ট্যাটাস দেখতে পারে। শুধু READ করে, কোনো এডিট/ডিলিট নেই।
// ============================================================

const db = firebase.firestore();

let searchMode = 'orderId'; // 'orderId' | 'phone'

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const trackMsg = document.getElementById('trackMsg');
const resultsEl = document.getElementById('results');

const STATUS_STEPS = [
  { key: 'pending',   label: 'Pending',   icon: '⏳' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'delivered', label: 'Delivered', icon: '📦' }
];

function switchMethod(mode) {
  searchMode = mode;
  document.getElementById('tabOrderId').classList.toggle('active', mode === 'orderId');
  document.getElementById('tabPhone').classList.toggle('active', mode === 'phone');
  searchInput.placeholder = mode === 'orderId' ? 'যেমন: AS-123456' : 'যেমন: 01712345678';
  searchInput.value = '';
  hideMsg();
  resultsEl.innerHTML = '';
}

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

function showMsg(text, isError) {
  trackMsg.textContent = text;
  trackMsg.className = 'track-msg show' + (isError ? ' error' : '');
}
function hideMsg() {
  trackMsg.className = 'track-msg';
}

function formatTaka(n) {
  return '৳ ' + Number(n || 0).toLocaleString('en-IN');
}

function doSearch() {
  const raw = searchInput.value.trim();
  if (!raw) {
    showMsg('দয়া করে ' + (searchMode === 'orderId' ? 'অর্ডার আইডি' : 'ফোন নম্বর') + ' লিখুন।', true);
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = 'খোঁজা হচ্ছে...';
  hideMsg();
  resultsEl.innerHTML = '';

  const field = searchMode === 'orderId' ? 'orderId' : 'phone';
  const value = searchMode === 'orderId' ? raw.toUpperCase() : raw;

  db.collection('orders').where(field, '==', value).get()
    .then((snapshot) => {
      searchBtn.disabled = false;
      searchBtn.textContent = 'খুঁজুন';

      if (snapshot.empty) {
        showMsg('এই ' + (searchMode === 'orderId' ? 'অর্ডার আইডি' : 'ফোন নম্বর') + ' দিয়ে কোনো অর্ডার পাওয়া যায়নি। বানান/নম্বর আবার চেক করুন, অথবা আমাদের ফোনে যোগাযোগ করুন।', true);
        return;
      }

      // সবচেয়ে নতুন অর্ডার আগে দেখানো হচ্ছে
      const orders = [];
      snapshot.forEach(doc => orders.push(doc.data()));
      orders.sort((a, b) => {
        const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });

      resultsEl.innerHTML = orders.map(renderOrderCard).join('');
    })
    .catch((err) => {
      searchBtn.disabled = false;
      searchBtn.textContent = 'খুঁজুন';
      showMsg('দুঃখিত, এখন খুঁজতে সমস্যা হচ্ছে। একটু পর আবার চেষ্টা করুন।', true);
      console.error('Track search error:', err);
    });
}

function renderOrderCard(o) {
  const status = o.status || 'pending';
  const currentIndex = STATUS_STEPS.findIndex(s => s.key === status);

  const stepsHtml = STATUS_STEPS.map((s, i) => {
    let cls = 'status-step';
    if (i < currentIndex) cls += ' done';
    else if (i === currentIndex) cls += ' current';
    return `
      <div class="${cls}">
        <div class="dot">${i <= currentIndex ? s.icon : ''}</div>
        <div class="lbl">${s.label}</div>
      </div>`;
  }).join('');

  return `
    <div class="order-card">
      <div class="receipt-id">#${o.orderId || ''}</div>
      <div class="status-track">${stepsHtml}</div>
      <div class="receipt-rows">
        <div class="receipt-row"><span>প্রোডাক্ট</span><b>${o.product || ''}</b></div>
        <div class="receipt-row"><span>পরিমাণ</span><b>${o.quantity || ''}</b></div>
        <div class="receipt-row"><span>এলাকা</span><b>${o.address || ''}</b></div>
        <div class="receipt-row"><span>তারিখ</span><b>${o.date || ''}</b></div>
      </div>
      <div class="receipt-total">
        <span>সর্বমোট</span>
        <b>${formatTaka(o.total)}</b>
      </div>
    </div>`;
}

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

const COMPLAINT_STATUS_LABELS = {
  new:      { icon: '🆕', label: 'অভিযোগ জমা হয়েছে', cls: 'new' },
  progress: { icon: '⏳', label: 'অভিযোগ দেখা হচ্ছে', cls: 'progress' },
  resolved: { icon: '✅', label: 'অভিযোগ সমাধান হয়েছে', cls: 'resolved' }
};

function switchMethod(mode) {
  searchMode = mode;
  document.getElementById('tabOrderId').classList.toggle('active', mode === 'orderId');
  document.getElementById('tabPhone').classList.toggle('active', mode === 'phone');
  searchInput.placeholder = mode === 'orderId' ? 'যেমন: AS-123456' : 'যেমন: 01712345678';
  searchInput.value = '';
  hideMsg();
  resultsEl.innerHTML = '';
}

// ট্যাব দুটো <div> — কীবোর্ড/স্ক্রিন-রিডারেও যেন কাজ করে (Tab দিয়ে ফোকাস, Enter/Space দিয়ে বাছাই)
['tabOrderId', 'tabPhone'].forEach((id) => {
  const el = document.getElementById(id);
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
});

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

// অর্ডারের নাম/ঠিকানা/মন্তব্য কাস্টমার নিজে টাইপ করে, আর এই পেজটা পাবলিক —
// তাই innerHTML-এ বসানোর আগে escape করা হচ্ছে, নাহলে কেউ HTML/script ঢুকিয়ে
// অর্ডার করলে এই ট্র্যাকিং পেজে সেটা চালু হয়ে যেতে পারে।
function escapeHtml(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// রিসিটে Order ID দেখানো হয় "#AS-123456" আকারে — কাস্টমার সেখান থেকে কপি করলে
// "#" চিহ্নটাও চলে আসতে পারে, যেটা Firestore-এ সংরক্ষিত আসল ID-র সাথে মিলবে না।
// তাই এখানে "#", অতিরিক্ত স্পেস বাদ দেওয়া হচ্ছে, আর case-ও ঠিক করে দেওয়া হচ্ছে।
// শুধু সংখ্যা টাইপ করলে (AS- ছাড়া) সেটাও সামলে নেওয়া হচ্ছে।
// কাস্টমার অনেক সময় বাংলা সংখ্যায় (০১৭১২…) টাইপ করে — ডেটাবেসে সবই ইংরেজি সংখ্যায় আছে,
// তাই খোঁজার/জমা দেওয়ার আগে বাংলা সংখ্যা ইংরেজিতে বদলে নেওয়া হয়।
function toEnglishDigits(str) {
  return String(str).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
}

function normalizeOrderId(raw) {
  let v = toEnglishDigits(raw).trim().toUpperCase().replace(/^#+/, '').replace(/\s+/g, '');
  // "AS123456" বা "AS-123456" — দুইভাবেই লিখলে আসল ফরম্যাট "AS-123456" হিসেবে ধরা হয়
  const m = v.match(/^AS-?(\d+)$/);
  if (m) return 'AS-' + m[1];
  if (/^\d+$/.test(v)) {
    v = 'AS-' + v;
  }
  return v;
}

// অর্ডার ফর্মে ফোন নম্বর কাস্টমার যেভাবে টাইপ করেছিল সেভাবেই সেভ হয় (01712345678, +8801712345678,
// 01712-345678 ইত্যাদি) — তাই এখানে একই নম্বরের সবচেয়ে প্রচলিত লেখার ধরনগুলো একসাথে খোঁজা হয়,
// নাহলে অন্য ফরম্যাটে খুঁজলে অর্ডার থাকলেও "পাওয়া যায়নি" দেখাত। কোনো ডেটা বদলানো হয় না।
function phoneVariants(raw) {
  const typed = raw.trim();
  let digits = toEnglishDigits(typed).replace(/\D/g, '');
  if (digits.startsWith('880')) digits = '0' + digits.slice(3);
  else if (/^1[3-9]\d{8}$/.test(digits)) digits = '0' + digits;
  if (!/^01[3-9]\d{8}$/.test(digits)) return [typed];          // বাংলাদেশি নম্বরের ধরন না হলে যেমন আছে তেমনই খোঁজা
  const rest = digits.slice(1);                                   // 1712345678
  const list = [
    typed,
    digits,                                                       // 01712345678
    '880' + rest,                                                 // 8801712345678
    '+880' + rest,                                                // +8801712345678
    digits.slice(0, 5) + '-' + digits.slice(5),                   // 01712-345678
    digits.slice(0, 5) + ' ' + digits.slice(5),                   // 01712 345678
    '+880 ' + rest.slice(0, 4) + '-' + rest.slice(4),             // +880 1712-345678
  ];
  return [...new Set(list)];
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

  let query;
  if (searchMode === 'orderId') {
    query = db.collection('orders').where('orderId', '==', normalizeOrderId(raw));
  } else {
    const variants = phoneVariants(raw);
    query = variants.length > 1
      ? db.collection('orders').where('phone', 'in', variants)
      : db.collection('orders').where('phone', '==', variants[0]);
  }

  query.get()
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

      // এই অর্ডারগুলোর কোনোটাতে অভিযোগ থাকলে সেটাও একসাথে এনে card-এ দেখানো হচ্ছে,
      // যাতে কাস্টমারকে আলাদা করে অভিযোগ ট্র্যাক করতে না হয়
      const orderIds = [...new Set(orders.map(o => o.orderId).filter(Boolean))];
      if (orderIds.length === 0) {
        resultsEl.innerHTML = orders.map(o => renderOrderCard(o, null)).join('');
        return;
      }

      return db.collection('complaints').where('orderId', 'in', orderIds.slice(0, 10)).get()
        .then((complaintSnap) => {
          // একই order-এ একাধিক অভিযোগ থাকলে সবচেয়ে নতুনটা দেখানো হচ্ছে
          const complaintMap = {};
          complaintSnap.forEach(doc => {
            const c = doc.data();
            const existing = complaintMap[c.orderId];
            const ct = c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : 0;
            const et = existing && existing.createdAt && existing.createdAt.toMillis ? existing.createdAt.toMillis() : -1;
            if (!existing || ct > et) complaintMap[c.orderId] = c;
          });

          resultsEl.innerHTML = orders.map(o => renderOrderCard(o, complaintMap[o.orderId] || null)).join('');
        });
    })
    .catch((err) => {
      searchBtn.disabled = false;
      searchBtn.textContent = 'খুঁজুন';
      showMsg('দুঃখিত, এখন খুঁজতে সমস্যা হচ্ছে। একটু পর আবার চেষ্টা করুন।', true);
      console.error('Track search error:', err);
    });
}

function renderOrderCard(o, complaint) {
  const status = o.status || 'pending';
  const complaintBadgeHtml = renderComplaintBadge(complaint);

  // বাতিল বা রিটার্ন হলে ধাপে-ধাপে stepper না দেখিয়ে স্পষ্ট একটা ব্যানার দেখানো হচ্ছে —
  // এই দুটো "লিনিয়ার" progress-এর অংশ না, তাই স্টেপার দেখালে বিভ্রান্তিকর হবে।
  if (status === 'cancelled' || status === 'returned') {
    const isCancelled = status === 'cancelled';
    const bannerClass = isCancelled ? 'cancelled' : 'returned';
    const bannerText = isCancelled ? '❌ এই অর্ডারটি বাতিল করা হয়েছে' : '↩️ এই অর্ডারটি রিটার্ন করা হয়েছে';

    return `
      <div class="order-card">
        <div class="receipt-id">#${escapeHtml(o.orderId)}</div>
        <div class="status-banner ${bannerClass}">${bannerText}</div>
        <div class="receipt-rows">
          <div class="receipt-row"><span>প্রোডাক্ট</span><b>${escapeHtml(o.product)}</b></div>
          <div class="receipt-row"><span>পরিমাণ</span><b>${escapeHtml(o.quantity)}</b></div>
          <div class="receipt-row"><span>এলাকা</span><b>${escapeHtml(o.address)}</b></div>
          <div class="receipt-row"><span>তারিখ</span><b>${escapeHtml(o.date)}</b></div>
        </div>
        <div class="receipt-total">
          <span>সর্বমোট</span>
          <b>${formatTaka(o.total)}</b>
        </div>
        ${complaintBadgeHtml}
      </div>`;
  }

  // স্ট্যাটাস অজানা হলে (যেমন ভবিষ্যতে নতুন কোনো স্ট্যাটাস যোগ হলে) ধাপগুলো খালি না দেখিয়ে প্রথম ধাপে ধরা হয়
  const currentIndex = Math.max(0, STATUS_STEPS.findIndex(s => s.key === status));

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
      <div class="receipt-id">#${escapeHtml(o.orderId)}</div>
      <div class="status-track">${stepsHtml}</div>
      <div class="receipt-rows">
        <div class="receipt-row"><span>প্রোডাক্ট</span><b>${escapeHtml(o.product)}</b></div>
        <div class="receipt-row"><span>পরিমাণ</span><b>${escapeHtml(o.quantity)}</b></div>
        <div class="receipt-row"><span>এলাকা</span><b>${escapeHtml(o.address)}</b></div>
        <div class="receipt-row"><span>তারিখ</span><b>${escapeHtml(o.date)}</b></div>
      </div>
      <div class="receipt-total">
        <span>সর্বমোট</span>
        <b>${formatTaka(o.total)}</b>
      </div>
      ${complaintBadgeHtml}
    </div>`;
}

// এই order-এ কোনো অভিযোগ থাকলে সেটার status ছোট একটা badge আকারে দেখায়
function renderComplaintBadge(complaint) {
  if (!complaint) return '';
  const meta = COMPLAINT_STATUS_LABELS[complaint.status] || COMPLAINT_STATUS_LABELS.new;
  return `
    <div class="complaint-badge-row">
      <span class="complaint-badge ${meta.cls}">${meta.icon} ${meta.label}</span>
    </div>`;
}

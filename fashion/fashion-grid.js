// ============================================================
// fashion/index.html-এর প্রোডাক্ট গ্রিড — Firestore posts কালেকশন থেকে
// শুধু category == "fashion" পোস্টগুলো এনে, উপরের চিপ দিয়ে সাব-ক্যাটাগরি
// (ওয়ান পিস/টু পিস/থ্রি পিস) অনুযায়ী ফিল্টার করে দেখায়।
// URL-এ ?cat=steel-chair থাকলে সেই ফিল্টার auto-select হয় (nav dropdown-এর লিংক থেকে আসলে)।
// প্রতিটা কার্ড ../products/slug.html-এ লিংক করে — SEO ডিটেইল পেজ এখনো products/
// ফোল্ডারেই থাকে (admin panel-এর "HTML ফাইল ডাউনলোড করুন" দিয়ে জেনারেট করা)।
// ============================================================

const db = firebase.firestore();
const grid = document.getElementById('postsGrid');
const chipsWrap = document.getElementById('categoryChips');

const SUB_CATEGORIES = [
  { key: 'all', label: 'সব' },
  { key: 'three-piece', label: 'Three Piece' },
  { key: 'one-piece', label: 'One Piece' },
  { key: 'two-piece', label: 'Two Piece' },
  { key: 'panjabi', label: 'Panjabi' },
  { key: 'shirt', label: 'Shirt' },
  { key: 't-shirt', label: 'T-Shirt' },
  { key: 'pant', label: 'Pant' },
  { key: 'shoe', label: 'Shoe' },
  { key: 'other-fashion', label: 'Other Fashion' }
];

let allPosts = [];

function toBanglaNumber(num) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => bn[d]);
}

function formatTakaBn(amount) {
  const grouped = Number(amount || 0).toLocaleString('en-IN');
  return '৳ ' + toBanglaNumber(grouped);
}

// পোস্টের নাম/ট্যাগ Firestore থেকে আসে (এডমিন প্যানেল দিয়ে লেখা), তাই
// innerHTML-এ বসানোর আগে escape করা হচ্ছে
function escapeHtml(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getUrlCategory() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('cat');
  return SUB_CATEGORIES.some(c => c.key === key) ? key : 'all';
}

function renderChips(activeKey) {
  chipsWrap.innerHTML = SUB_CATEGORIES.map(c =>
    `<button type="button" class="cat-chip ${c.key === activeKey ? 'active' : ''}" data-key="${c.key}">${escapeHtml(c.label)}</button>`
  ).join('');

  chipsWrap.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      const url = new URL(window.location);
      if (key === 'all') url.searchParams.delete('cat');
      else url.searchParams.set('cat', key);
      history.replaceState(null, '', url);
      renderGrid(key);
    });
  });
}

function renderGrid(activeKey) {
  renderChips(activeKey);

  const filtered = activeKey === 'all' ? allPosts : allPosts.filter(p => p.subCategory === activeKey);

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;">এই ক্যাটাগরিতে এখনো কোনো প্রোডাক্ট নেই।</p>';
    return;
  }

  let html = '';
  filtered.forEach((p) => {
    const slug = p.slug || p.id;
    html += `
      <a href="../products/${escapeHtml(slug)}.html" class="product-card-link">
        <div class="card">
          <div class="card-art"><img class="card-photo" src="../images/${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"></div>
          <div class="card-body">
            <div class="eyebrow" style="color:var(--brass);">${escapeHtml(p.tag || '')}</div>
            <h2>${escapeHtml(p.name)}</h2>
            <div class="price-line">${formatTakaBn(p.price)}<span>${escapeHtml(p.priceUnit || 'প্রতি পিস')}</span></div>
          </div>
        </div>
      </a>`;
  });
  grid.innerHTML = html;
}

db.collection('posts').where('category', '==', 'fashion').orderBy('order', 'asc').get()
  .then((snapshot) => {
    allPosts = [];
    snapshot.forEach((doc) => allPosts.push({ id: doc.id, ...doc.data() }));

    if (allPosts.length === 0) {
      chipsWrap.innerHTML = '';
      grid.innerHTML = '<p style="grid-column:1/-1;">এখনো কোনো ফ্যাশন প্রোডাক্ট যোগ করা হয়নি।</p>';
      return;
    }

    renderGrid(getUrlCategory());
  })
  .catch((err) => {
    grid.innerHTML = '<p style="grid-column:1/-1;">প্রোডাক্ট লোড করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</p>';
    console.error('Fashion grid load error:', err);
  });

// ============================================================
// furniture/index.html-এর প্রোডাক্ট গ্রিড — Firestore products কালেকশন থেকে
// শুধু category == "Furniture" প্রোডাক্টগুলো এনে, উপরের চিপ দিয়ে সাব-ক্যাটাগরি
// (স্টিল চেয়ার/অফিস চেয়ার/ডাইনিং চেয়ার/ফোল্ডেবল বেড) অনুযায়ী ফিল্টার করে দেখায়।
// URL-এ ?cat=steel-chair থাকলে সেই ফিল্টার auto-select হয় (nav dropdown-এর লিংক থেকে আসলে)।
// প্রতিটা কার্ড ../products/slug.html-এ লিংক করে — এই SEO ডিটেইল পেজটা এখনো posts
// কালেকশন থেকে আলাদাভাবে জেনারেট হয় (admin panel-এর "HTML ফাইল ডাউনলোড করুন" দিয়ে),
// তাই লিংক কাজ করার জন্য একই slug-এ একটা পোস্ট HTML ফাইল আপলোড করা থাকতে হবে।
// ============================================================

const db = firebase.firestore();
const grid = document.getElementById('postsGrid');
const chipsWrap = document.getElementById('categoryChips');

const SUB_CATEGORIES = [
  { key: 'all', label: 'সব' },
  { key: 'steel-chair', label: 'স্টিল চেয়ার' },
  { key: 'office-chair', label: 'অফিস চেয়ার' },
  { key: 'dining-chair', label: 'ডাইনিং চেয়ার' },
  { key: 'foldable-bed', label: 'ফোল্ডেবল বেড' }
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
    const detailUrl = `../products/${escapeHtml(slug)}.html`;
    html += `
      <div class="card reveal in">
        <a href="${detailUrl}" style="display:block; text-decoration:none; color:inherit;">
          <div class="card-art"><img class="card-photo" src="../${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"></div>
        </a>
        <div class="card-body">
          <div class="tag">${escapeHtml(p.tag || '')}</div>
          <a href="${detailUrl}" style="text-decoration:none; color:inherit;"><h3>${escapeHtml(p.name)}</h3></a>
          <div class="card-foot">
            <div class="price">${formatTakaBn(p.price)}<small>${escapeHtml(p.priceUnit || 'প্রতি পিস')}</small></div>
            <a class="pick-btn" style="display:inline-block; text-decoration:none;" href="/?product=${encodeURIComponent(slug)}#order">অর্ডার করুন</a>
          </div>
          <button class="copy-link-btn" type="button" data-slug="${escapeHtml(slug)}">🔗 লিংক কপি করুন</button>
        </div>
      </div>`;
  });
  grid.innerHTML = html;
}

// "লিংক কপি করুন" বাটনে ক্লিক — প্রোডাক্ট ডিটেইল পেজের লিংক কপি হয়।
// grid-এর উপর event delegation ব্যবহার করা হয়েছে, কারণ renderGrid() প্রতিবার
// innerHTML রিপ্লেস করে, তাই কার্ডের উপর সরাসরি addEventListener বসালে সেটা
// ক্যাটাগরি চিপ পাল্টানোর পর হারিয়ে যেত।
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-link-btn');
  if (!btn) return;
  const slug = btn.getAttribute('data-slug');
  const url = location.origin + '/products/' + slug + '.html';
  const original = btn.textContent;
  const showCopied = () => {
    btn.textContent = '✓ লিংক কপি হয়েছে';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(showCopied).catch(() => window.prompt('লিংকটি কপি করুন:', url));
  } else {
    window.prompt('লিংকটি কপি করুন:', url);
  }
});

db.collection('products').where('category', '==', 'Furniture').orderBy('order', 'asc').get()
  .then((snapshot) => {
    allPosts = [];
    snapshot.forEach((doc) => allPosts.push({ id: doc.id, ...doc.data() }));

    if (allPosts.length === 0) {
      chipsWrap.innerHTML = '';
      grid.innerHTML = '<p style="grid-column:1/-1;">এখনো কোনো ফার্নিচার প্রোডাক্ট যোগ করা হয়নি।</p>';
      return;
    }

    renderGrid(getUrlCategory());
  })
  .catch((err) => {
    grid.innerHTML = '<p style="grid-column:1/-1;">প্রোডাক্ট লোড করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</p>';
    console.error('Furniture grid load error:', err);
  });

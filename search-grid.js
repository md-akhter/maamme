// ============================================================
// search.html-এর প্রোডাক্ট গ্রিড — Firestore products কালেকশনের
// সবগুলো ক্যাটাগরি (Home/Furniture/Fashion) জুড়ে একসাথে সার্চ করে।
// URL-এর ?q= থেকে সার্চ টার্ম নেওয়া হয় (nav বারের সার্চ বক্স বা এই
// পেজের নিজের সার্চ বক্স থেকে আসে), প্রোডাক্টের নামের সাথে মিলিয়ে
// ফলাফল দেখানো হয়।
// প্রতিটা কার্ড products/slug.html-এ লিংক করে — এই SEO ডিটেইল পেজটা
// এখনো আলাদাভাবে জেনারেট হয় (admin panel-এর "HTML ফাইল ডাউনলোড
// করুন" দিয়ে), তাই লিংক কাজ করার জন্য একই slug-এ একটা HTML ফাইল
// আপলোড করা থাকতে হবে।
// ============================================================

const db = firebase.firestore();
const grid = document.getElementById('postsGrid');
const pageSearchInput = document.getElementById('pageSearchInput');
const searchHeading = document.getElementById('searchHeading');
const searchSubtext = document.getElementById('searchSubtext');

let allProducts = [];

function toBanglaNumber(num) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => bn[d]);
}

function formatTakaBn(amount) {
  const grouped = Number(amount || 0).toLocaleString('en-IN');
  return '৳ ' + toBanglaNumber(grouped);
}

// প্রোডাক্টের নাম/ট্যাগ/বিবরণ Firestore থেকে আসে, তাই innerHTML-এ বসানোর আগে escape করা হচ্ছে
function escapeHtml(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// বিবরণ একাধিক লাইনে (বুলেট আকারে) লেখা থাকলে escape করার পর \n কে <br> এ বদলে
// কার্ডে প্রতিটা লাইন আলাদা করে দেখায়
function formatDescription(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function getUrlQuery() {
  return new URLSearchParams(window.location.search).get('q') || '';
}

function renderGrid(query) {
  const q = query.trim().toLowerCase();

  searchHeading.textContent = q ? `"${query.trim()}" এর জন্য ফলাফল` : 'প্রোডাক্ট খুঁজুন';
  searchSubtext.textContent = q
    ? 'নিচের প্রোডাক্টগুলো আপনার সার্চের সাথে মিলেছে।'
    : 'নাম লিখে Maamme.com-এর সবগুলো প্রোডাক্ট (ফার্নিচার, ফ্যাশন — সব ক্যাটাগরি) জুড়ে একসাথে খুঁজুন।';

  if (!q) {
    grid.innerHTML = '<p style="grid-column:1/-1; color:#6b7690;">সার্চ বক্সে প্রোডাক্টের নাম লিখুন।</p>';
    return;
  }

  // একাধিক শব্দ লিখলে (যেমন "স্টিল চেয়ার") শব্দগুলো নামে/পুরো নামে/ট্যাগে যেকোনো ক্রমে থাকলেই মেলে —
  // আগে পুরো বাক্যটা হুবহু পরপর থাকতে হতো, তাই "চেয়ার স্টিল" বা মাঝে শব্দ থাকলে কিছু পাওয়া যেত না
  const words = q.split(/\s+/).filter(Boolean);
  const filtered = allProducts.filter(p => {
    const haystack = ((p.name || '') + ' ' + (p.fullName || '') + ' ' + (p.tag || '')).toLowerCase();
    return words.every(w => haystack.includes(w));
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1; color:#6b7690;">এই নামে কোনো প্রোডাক্ট পাওয়া যায়নি।</p>';
    return;
  }

  searchSubtext.textContent = toBanglaNumber(filtered.length) + 'টি প্রোডাক্ট আপনার সার্চের সাথে মিলেছে।';

  let html = '';
  filtered.forEach((p) => {
    const slug = p.slug || p.id;
    const detailUrl = `products/${escapeHtml(slug)}.html`;
    html += `
      <div class="card reveal in">
        <a href="${detailUrl}" style="display:block; text-decoration:none; color:inherit;">
          <div class="card-art"><img class="card-photo" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.style.display='none';"></div>
        </a>
        <div class="card-body">
          <div class="tag">${escapeHtml(p.tag || '')}</div>
          <a href="${detailUrl}" style="text-decoration:none; color:inherit;"><h3>${escapeHtml(p.name)}</h3></a>
          <div class="details-price-row">
            <button type="button" class="item-details-toggle">আইটেম বিবরণ</button>
            <div class="price-inline">${formatTakaBn(p.price)}<span>${escapeHtml(p.priceUnit || 'প্রতি পিস')}</span></div>
          </div>
          <p>${formatDescription(p.description)}</p>
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

// "আইটেম বিবরণ" বাটন — কার্ডের বিবরণ দেখায়/লুকায়
grid.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('.item-details-toggle');
  if (toggleBtn) {
    const cardBody = toggleBtn.closest('.card-body');
    const descEl = cardBody ? cardBody.querySelector('p') : null;
    if (descEl) {
      const isOpen = descEl.classList.toggle('open');
      toggleBtn.textContent = isOpen ? 'বিবরণ লুকান' : 'আইটেম বিবরণ';
    }
    return;
  }
});

// "লিংক কপি করুন" বাটনে ক্লিক — প্রোডাক্ট ডিটেইল পেজের লিংক কপি হয়
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

// পেজের নিজের সার্চ বক্সটা URL-এর বর্তমান ?q= দিয়ে প্রি-ফিল করা হচ্ছে
const initialQuery = getUrlQuery();
if (pageSearchInput) pageSearchInput.value = initialQuery;

db.collection('products').get()
  .then((snapshot) => {
    allProducts = [];
    snapshot.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() }));
    // ফলাফল ক্রম নম্বর (order) অনুযায়ী; order না থাকলে সবার শেষে
    allProducts.sort((a, b) => (Number.isFinite(a.order) ? a.order : 1e9) - (Number.isFinite(b.order) ? b.order : 1e9));
    renderGrid(initialQuery);
  })
  .catch((err) => {
    grid.innerHTML = '<p style="grid-column:1/-1;">প্রোডাক্ট লোড করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</p>';
    console.error('Search grid load error:', err);
  });

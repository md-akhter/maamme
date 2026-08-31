// ============================================================
// products/index.html-এর প্রোডাক্ট গ্রিড — এডমিন প্যানেলের "পোস্ট" ট্যাব থেকে
// ম্যানেজ করা Firestore-এর posts কালেকশন থেকে ডাইনামিকভাবে কার্ড বানায়।
// প্রতিটা কার্ড slug.html-এ লিংক করে — সেই স্ট্যাটিক পেজটা এডমিন থেকে
// "HTML ডাউনলোড করুন" বাটন দিয়ে জেনারেট করে আলাদাভাবে আপলোড করতে হয়,
// যাতে প্রতিটা প্রোডাক্টের নিজস্ব SEO (meta/JSON-LD) ঠিক থাকে।
// ============================================================

const db = firebase.firestore();
const postsGrid = document.getElementById('postsGrid');

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

db.collection('posts').orderBy('order', 'asc').get()
  .then((snapshot) => {
    if (snapshot.empty) {
      postsGrid.innerHTML = '<p style="grid-column:1/-1;">এখনো কোনো প্রোডাক্ট পোস্ট নেই।</p>';
      return;
    }

    let html = '';
    snapshot.forEach((doc) => {
      const p = doc.data();

      // Status = "draft" পোস্ট এখনো লাইভ না, তাই গ্রিডে দেখানো হবে না। পুরনো পোস্ট
      // (Status ফিল্ড যোগ হওয়ার আগে তৈরি) ব্যাকওয়ার্ড-কম্প্যাটিবিলিটির জন্য Published
      // হিসেবেই ধরা হচ্ছে।
      if (p.status === 'draft') return;

      const slug = p.slug || doc.id;
      html += `
      <a href="${escapeHtml(slug)}.html" class="product-card-link">
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

    postsGrid.innerHTML = html || '<p style="grid-column:1/-1;">এখনো কোনো প্রোডাক্ট পোস্ট নেই।</p>';
  })
  .catch((err) => {
    postsGrid.innerHTML = '<p style="grid-column:1/-1;">প্রোডাক্ট লোড করতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।</p>';
    console.error('Posts grid load error:', err);
  });

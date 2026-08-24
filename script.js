// ============================================================
// প্রোডাক্ট Firestore থেকে লোড করা (আগে index.html-এ hardcoded ছিল)
// ============================================================

const productSelect = document.getElementById('product');
const qtyInput = document.getElementById('qty');
const productsGrid = document.getElementById('productsGrid');

// একটা generic fallback আইকন — ছবি লোড না হলে সবার জন্য একই আইকন দেখাবে
const FALLBACK_SVG = `
  <svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#D3A85F" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M30 20 L170 20 L160 100 L40 100 Z"/>
      <path d="M40 100 L34 200"/><path d="M160 100 L166 200"/>
      <path d="M55 100 L50 200"/><path d="M145 100 L150 200"/>
      <path d="M32 140 L168 140"/>
    </g>
  </svg>`;

function formatTaka(n) {
  return '৳ ' + n.toLocaleString('en-IN');
}

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

function toBengaliDigits(n) {
  return String(n).split('').map(ch => (ch >= '0' && ch <= '9') ? BN_DIGITS[ch] : ch).join('');
}

// টাইমজোন 'Asia/Dhaka'-তে দিন/মাস/বছর বের করে (কিছু ডিভাইস/ব্রাউজারে, বিশেষ করে
// Facebook/Messenger-এর in-app browser-এ, সিস্টেম টাইমজোন ভুলভাবে UTC ধরে, যার ফলে
// মধ্যরাতের কাছাকাছি অর্ডার করলে তারিখ ১ দিন পিছিয়ে সেভ হয়ে যেত) — তারপর নিজেরাই বাংলা
// সংখ্যা ও মাসের নাম দিয়ে তারিখ বানানো হচ্ছে, কারণ toLocaleDateString('bn-BD', ...) কিছু
// ব্রাউজারে ভাঙা/অসম্পূর্ণ সংখ্যা-গ্লিফ রেন্ডার করে।
function formatBengaliDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Dhaka'
  }).formatToParts(date);
  const get = (type) => Number(parts.find(p => p.type === type).value);
  const day = get('day');
  const month = get('month');
  const year = get('year');
  return toBengaliDigits(day) + ' ' + BN_MONTHS[month - 1] + ', ' + toBengaliDigits(year);
}

function loadProducts() {
  if (!window.firebase || !firebase.firestore) return;

  firebase.firestore().collection('products').orderBy('order', 'asc').get()
    .then((snapshot) => {
      if (snapshot.empty) {
        productsGrid.innerHTML = '<p style="padding:20px;">এখনো কোনো প্রোডাক্ট যোগ করা হয়নি।</p>';
        return;
      }

      let gridHtml = '';
      let optionsHtml = '';

      snapshot.forEach((doc) => {
        const p = doc.data();
        const priceFormatted = Number(p.price).toLocaleString('en-IN');

        gridHtml += `
          <div class="card reveal in" id="${p.slug}" data-product="${p.fullName}">
            <div class="card-art">
              <img class="card-photo" src="${p.image}" alt="${p.fullName}" onerror="this.style.display='none';">
              <div class="card-fallback">${FALLBACK_SVG}</div>
            </div>
            <div class="card-body">
              <div class="tag">${p.tag || ''}</div>
              <h3>${p.name}</h3>
              <button type="button" class="item-details-toggle">আইটেম বিবরণ</button>
              <p>${p.description || ''}</p>
              <div class="card-foot">
                <div class="price">৳ ${priceFormatted} <small>প্রতি পিস</small></div>
                <button class="pick-btn" type="button" data-select="${p.fullName} — ৳${priceFormatted}" data-name="${p.fullName}" data-price="${p.price}">অর্ডার করুন</button>
              </div>
              <button class="copy-link-btn" type="button" data-slug="${p.slug}">🔗 লিংক কপি করুন</button>
            </div>
          </div>`;

        optionsHtml += `<option data-price="${p.price}">${p.fullName} — ৳${priceFormatted}</option>`;
      });

      productsGrid.innerHTML = gridHtml;

      // dropdown-এ "কাস্টম অর্ডার" এর ঠিক আগে প্রোডাক্টগুলো বসানো হচ্ছে
      const customOption = productSelect.querySelector('option[data-price="0"]');
      customOption.insertAdjacentHTML('beforebegin', optionsHtml);

      initProductInteractions();

      // URL-এ যদি #slug থাকে (কেউ শেয়ার করা লিংকে ঢুকেছে), সেই প্রোডাক্টে স্ক্রল করা
      if (location.hash) {
        const target = document.querySelector(location.hash);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
    })
    .catch((err) => {
      console.error('Products load error:', err);
      productsGrid.innerHTML = '<p style="padding:20px;">প্রোডাক্ট লোড করতে সমস্যা হয়েছে।</p>';
    });
}

// প্রোডাক্ট কার্ড আর dropdown রেন্ডার হওয়ার পর এই ফাংশন সব বাটন/ইভেন্ট সচল করে
function initProductInteractions() {

  // "আইটেম বিবরণ" বাটন — মোবাইলে ট্যাপ করলে ঐ কার্ডের পুরো বিবরণ (description) দেখায়/লুকায়
  // (ডেস্কটপে এই বাটন CSS দিয়ে লুকানো থাকে, description এমনিতেই দেখা যায়)
  document.querySelectorAll('.item-details-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const descEl = btn.nextElementSibling;
      if (!descEl) return;
      const isOpen = descEl.classList.toggle('open');
      btn.textContent = isOpen ? 'বিবরণ লুকান' : 'আইটেম বিবরণ';
    });
  });

  // Per-product "copy link" বাটন
  document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = btn.getAttribute('data-slug');
      const url = location.origin + location.pathname + '#' + slug;
      const original = btn.textContent;
      const showCopied = () => {
        btn.textContent = '✓ লিংক কপি হয়েছে';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showCopied).catch(() => {
          window.prompt('লিংকটি কপি করুন:', url);
        });
      } else {
        window.prompt('লিংকটি কপি করুন:', url);
      }
    });
  });

  // প্রোডাক্ট কার্ডের "অর্ডার করুন" বাটন — ফর্মে প্রোডাক্ট বসিয়ে অর্ডার সেকশনে স্ক্রল করে
  document.querySelectorAll('.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const value = btn.getAttribute('data-select');
      for (const opt of productSelect.options) {
        if (opt.value === value) { productSelect.value = value; break; }
      }
      updateTotal();
      document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
    });
  });

  productSelect.addEventListener('change', updateTotal);
}

// Live total price = unit price × quantity
const totalLine = document.getElementById('totalLine');
const totalAmount = document.getElementById('totalAmount');
function currentUnitPrice() {
  const opt = productSelect.options[productSelect.selectedIndex];
  return opt ? Number(opt.getAttribute('data-price') || 0) : 0;
}
function updateTotal() {
  const price = currentUnitPrice();
  const qty = Math.max(1, Number(qtyInput.value || 1));
  if (price > 0) {
    totalLine.style.display = 'flex';
    totalAmount.textContent = formatTaka(price * qty);
  } else {
    totalLine.style.display = 'none';
  }
}
qtyInput.addEventListener('input', updateTotal);

// প্রথমবার পেজ লোড হওয়ার সাথে সাথে প্রোডাক্ট আনা শুরু হয়
loadProducts();


// ============================================================
// বাকি সব — hero carousel, reveal on scroll, অর্ডার ফর্ম — অপরিবর্তিত
// ============================================================

// Hero carousel — auto-advance left to right through the slides
const heroCarouselEl = document.getElementById('heroCarousel');
const heroSlides = document.querySelectorAll('#heroCarousel .hero-slide');

function matchHeroAspect(slide) {
  const img = slide.querySelector('.hero-photo');
  if (img && img.style.display !== 'none' && img.naturalWidth > 0) {
    heroCarouselEl.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
  }
}
heroSlides.forEach(slide => {
  const img = slide.querySelector('.hero-photo');
  if (img) {
    if (img.complete && img.naturalWidth > 0) matchHeroAspect(slide);
    img.addEventListener('load', () => { if (slide.classList.contains('active')) matchHeroAspect(slide); });
  }
});

if (heroSlides.length > 1) {
  let heroIndex = 0;
  setInterval(() => {
    heroSlides[heroIndex].classList.remove('active');
    heroIndex = (heroIndex + 1) % heroSlides.length;
    heroSlides[heroIndex].classList.add('active');
    matchHeroAspect(heroSlides[heroIndex]);
  }, 4000);
}

// Reveal on scroll (পেজ লোডের সময় যা যা static এলিমেন্ট আছে তাদের জন্য)
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// বাংলাদেশি মোবাইল নম্বর যাচাই — 01 দিয়ে শুরু, ৩য় ডিজিট ৩-৯, মোট ১১ ডিজিট
// (+880 দিয়ে শুরু হলেও গ্রহণযোগ্য, স্পেস/ড্যাশ থাকলেও চলবে)
function isValidBdPhone(value) {
  const cleaned = value.replace(/[\s-]/g, '');
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(cleaned);
}

// Step 1 → Step 2: submitting the form generates the order details / receipt
const form = document.getElementById('orderForm');
const receiptView = document.getElementById('receiptView');
let lastOrder = null;

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const formError = document.getElementById('formError');
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const product = productSelect.value;
  const qty = Math.max(1, Number(qtyInput.value || 1));
  const address = document.getElementById('address').value.trim();
  const note = document.getElementById('note').value.trim();

  let missing = [];
  if (!name) missing.push('নাম');
  if (!phone) {
    missing.push('ফোন নম্বর');
  } else if (!isValidBdPhone(phone)) {
    formError.textContent = 'সঠিক ফোন নম্বর দিন — যেমন: 01712345678 (১১ ডিজিট, 01 দিয়ে শুরু)';
    formError.style.display = 'block';
    return;
  }
  if (!product) missing.push('চেয়ার বাছাই');
  if (!address) missing.push('ঠিকানা');

  if (missing.length > 0) {
    formError.textContent = 'দয়া করে পূরণ করুন: ' + missing.join(', ');
    formError.style.display = 'block';
    return;
  }
  formError.style.display = 'none';

  const unitPrice = currentUnitPrice();
  const total = unitPrice * qty;
  const orderId = 'AS-' + Date.now().toString().slice(-6);
  // toLocaleDateString('bn-BD', ...) কিছু ব্রাউজার/ডিভাইসে ভুল/অসম্পূর্ণ সংখ্যা রেন্ডার করে
  // (যেমন "১৭" এর জায়গায় ভাঙা গ্লিফ দেখায়) — তাই নিজেরাই বাংলা সংখ্যা ও মাসের নাম দিয়ে
  // তারিখ বানানো হচ্ছে, timeZone 'Asia/Dhaka' আগের মতোই ধরে রেখে (মধ্যরাতের কাছাকাছি
  // অর্ডারে তারিখ ভুল হওয়া ঠেকাতে)।
  const dateStr = formatBengaliDate(new Date());

  lastOrder = { name, phone, product, qty, address, note, total, orderId, dateStr };
  document.getElementById('orderIdField').value = orderId;

  document.getElementById('receiptId').textContent = '#' + orderId;
  document.getElementById('rcName').textContent = name;
  document.getElementById('rcPhone').textContent = phone;
  document.getElementById('rcProduct').textContent = product;
  document.getElementById('rcQty').textContent = qty;
  document.getElementById('rcAddress').textContent = address;
  document.getElementById('rcDate').textContent = dateStr;
  const noteRow = document.getElementById('rcNoteRow');
  if (note) { noteRow.style.display = 'flex'; document.getElementById('rcNote').textContent = note; }
  else { noteRow.style.display = 'none'; }
  document.getElementById('rcTotal').textContent = total > 0 ? formatTaka(total) : 'যোগাযোগ সাপেক্ষে';

  const confirmBtn = document.getElementById('confirmOrderBtn');
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'কনফার্ম করুন';
  document.getElementById('confirmNote').textContent = 'অর্ডার ডিটেইলস পর্যালোচনা করে "কনফার্ম করুন"-এ চাপুন — তাহলে অর্ডারটি আমাদের কাছে জমা হয়ে যাবে।';

  form.style.display = 'none';
  receiptView.style.display = 'block';
  receiptView.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Confirm — Firestore-এ অর্ডার সেভ করে (+ Netlify Forms ব্যাকআপ, Vercel-এ silently fail করবে)
document.getElementById('confirmOrderBtn').addEventListener('click', (e) => {
  if (!lastOrder) return;
  const btn = e.currentTarget;
  const note = document.getElementById('confirmNote');

  btn.disabled = true;
  btn.textContent = 'পাঠানো হচ্ছে...';

  if (window.firebase && firebase.firestore) {
    firebase.firestore().collection('orders').add({
      orderId: lastOrder.orderId,
      name: lastOrder.name,
      phone: lastOrder.phone,
      product: lastOrder.product,
      quantity: lastOrder.qty,
      address: lastOrder.address,
      note: lastOrder.note,
      total: lastOrder.total,
      date: lastOrder.dateStr,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      btn.textContent = '✓ অর্ডার কনফার্ম হয়েছে';
      note.textContent = 'ধন্যবাদ! আপনার অর্ডারটি জমা হয়ে গেছে — আমরা শীঘ্রই ফোনে যোগাযোগ করব।';
      document.getElementById('trackHint').style.display = 'block';
    })
    .catch((err) => {
      console.error('Firestore save failed:', err);
      btn.disabled = false;
      btn.textContent = 'আবার চেষ্টা করুন';
      note.textContent = 'দুঃখিত, পাঠাতে সমস্যা হয়েছে — একটু পর আবার চেষ্টা করুন।';
    });
  }
});

// Start a new order — resets back to Step 1
document.getElementById('newOrderBtn').addEventListener('click', () => {
  form.reset();
  updateTotal();
  document.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('formError').style.display = 'none';
  receiptView.style.display = 'none';
  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ============================================================
// মোবাইল হেডার — ☰ আইকনে ট্যাপ করলে "ট্র্যাক করুন" ও "অর্ডার করুন"
// dropdown আকারে দেখা যায়। বাইরে ক্লিক করলে বা কোনো লিংকে ক্লিক করলে বন্ধ হয়ে যায়।
// এটা শুধু ছোট স্ক্রিনে দেখা যায় (style.css-এর @media (max-width:560px) দ্রষ্টব্য) —
// বড় স্ক্রিনে আগের মতোই দুটো বাটন পাশাপাশি দেখা যাবে, এই মেনু কাজ করবে না।
// ============================================================
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

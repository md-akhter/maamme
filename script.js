// Per-product "copy link" buttons — one click, link on the clipboard
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

  // Direct product links (e.g. #segun-dining) — the browser's native jump-to-anchor
  // often lands in the wrong place because it fires before images/fonts finish
  // loading and the page height settles. Re-scroll once everything is ready.
  if (location.hash) {
    const jumpToHash = () => {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
    };
    if (document.readyState === 'complete') {
      jumpToHash();
    } else {
      window.addEventListener('load', jumpToHash);
    }
  }

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Hero carousel — auto-advance left to right through the slides
  const heroCarouselEl = document.getElementById('heroCarousel');
  const heroSlides = document.querySelectorAll('#heroCarousel .hero-slide');

  // Match the box's aspect ratio to whichever real photo is showing, so there's
  // no empty top/bottom margin — falls back to the default box if no photo loaded.
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

  // Product card "order" buttons feed the order form and jump straight to checkout
  const productSelect = document.getElementById('product');
  const qtyInput = document.getElementById('qty');

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

  // Live total price = unit price × quantity
  const totalLine = document.getElementById('totalLine');
  const totalAmount = document.getElementById('totalAmount');
  function currentUnitPrice() {
    const opt = productSelect.options[productSelect.selectedIndex];
    return opt ? Number(opt.getAttribute('data-price') || 0) : 0;
  }
  function formatTaka(n) {
    return '৳ ' + n.toLocaleString('en-IN');
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
  productSelect.addEventListener('change', updateTotal);
  qtyInput.addEventListener('input', updateTotal);

  // Step 1 → Step 2: submitting the form generates the order details / receipt
  // (nothing is sent to the server yet — that happens when the customer confirms)
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

    // Manual validation with a visible message — some mobile/in-app browsers
    // silently block native "required" validation without showing anything.
    let missing = [];
    if (!name) missing.push('নাম');
    if (!phone) missing.push('ফোন নম্বর');
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
    const dateStr = new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

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

    // Reset the confirm button in case this is a repeat order
    const confirmBtn = document.getElementById('confirmOrderBtn');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'কনফার্ম করুন';
    document.getElementById('confirmNote').textContent = 'অর্ডার ডিটেইলস পর্যালোচনা করে "কনফার্ম করুন"-এ চাপুন — তাহলে অর্ডারটি আমাদের কাছে জমা হয়ে যাবে।';

    form.style.display = 'none';
    receiptView.style.display = 'block';
    receiptView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Confirm — this is the step that actually saves the order to the
  // website's Netlify Forms dashboard.
  document.getElementById('confirmOrderBtn').addEventListener('click', (e) => {
    if (!lastOrder) return;
    const btn = e.currentTarget;
    const note = document.getElementById('confirmNote');

    btn.disabled = true;
    btn.textContent = 'পাঠানো হচ্ছে...';

    // Save to Firestore ("orders" collection) — this is what the admin panel reads.
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
      }).catch((err) => console.error('Firestore save failed:', err));
    }

    // Also keep saving to Netlify Forms as a backup record.
    const formData = new URLSearchParams();
    formData.append('form-name', 'order');
    formData.append('order_id', lastOrder.orderId);
    formData.append('name', lastOrder.name);
    formData.append('phone', lastOrder.phone);
    formData.append('product', lastOrder.product);
    formData.append('quantity', String(lastOrder.qty));
    formData.append('address', lastOrder.address);
    formData.append('note', lastOrder.note);

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })
      .then(() => {
        btn.textContent = '✓ অর্ডার কনফার্ম হয়েছে';
        note.textContent = 'ধন্যবাদ! আপনার অর্ডারটি জমা হয়ে গেছে — আমরা শীঘ্রই ফোনে যোগাযোগ করব।';
      })
      .catch(() => {
        btn.disabled = false;
        btn.textContent = 'আবার চেষ্টা করুন';
        note.textContent = 'দুঃখিত, পাঠাতে সমস্যা হয়েছে — একটু পর আবার চেষ্টা করুন।';
      });
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
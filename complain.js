// ============================================================
// অভিযোগ ফর্ম — order ID বাধ্যতামূলক, এবং সেই order ID দিয়ে সত্যিই
// কোনো অর্ডার আছে কিনা যাচাই করেই তবে অভিযোগ জমা হয় (ভুল/ভুয়া আইডি ঠেকাতে)
// ============================================================

const db = firebase.firestore();

const form = document.getElementById('complainForm');
const submitBtn = document.getElementById('complainSubmitBtn');
const msgEl = document.getElementById('complainMsg');

// track.js-এর normalizeOrderId-এর মতোই — "#", স্পেস বাদ, case ঠিক, শুধু সংখ্যা দিলে AS- জোড়া লাগানো
function normalizeOrderId(raw) {
  let v = raw.trim().toUpperCase().replace(/^#+/, '').replace(/\s+/g, '');
  if (/^\d+$/.test(v)) {
    v = 'AS-' + v;
  }
  return v;
}

function showMsg(text, isError) {
  msgEl.textContent = text;
  msgEl.className = 'complain-msg show' + (isError ? ' error' : '');
}
function hideMsg() {
  msgEl.className = 'complain-msg';
}

// ভুল/খালি ফিল্ড লাল বর্ডার দিয়ে দেখানো হয়, আর ইউজার আবার টাইপ করা শুরু করলে
// সেই ফিল্ড থেকে লাল অবস্থা সরে যায়
function markInvalid(el, invalid) {
  el.classList.toggle('invalid', !!invalid);
}
function clearAllInvalid() {
  [cOrderId, cName, cMobile, cDistrict, cMessage].forEach(el => markInvalid(el, false));
}

const cOrderId = document.getElementById('cOrderId');
const cName = document.getElementById('cName');
const cMobile = document.getElementById('cMobile');
const cDistrict = document.getElementById('cDistrict');
const cMessage = document.getElementById('cMessage');

[cOrderId, cName, cMobile, cDistrict, cMessage].forEach(el => {
  el.addEventListener('input', () => markInvalid(el, false));
});

// script.js-এ ব্যবহৃত বাংলাদেশি মোবাইল নম্বর যাচাইয়ের একই নিয়ম
function isValidBdPhone(value) {
  const cleaned = value.replace(/[\s-]/g, '');
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(cleaned);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  hideMsg();
  clearAllInvalid();

  const orderIdRaw = cOrderId.value.trim();
  const name = cName.value.trim();
  const mobile = cMobile.value.trim();
  const district = cDistrict.value.trim();
  const message = cMessage.value.trim();

  if (!orderIdRaw) {
    markInvalid(cOrderId, true);
    showMsg('অর্ডার আইডি ছাড়া অভিযোগ জমা দেওয়া যাবে না।', true);
    return;
  }

  if (mobile && !isValidBdPhone(mobile)) {
    markInvalid(cMobile, true);
    showMsg('সঠিক মোবাইল নম্বর দিন — যেমন: 01712345678', true);
    return;
  }

  let missingAny = false;
  if (!name) { markInvalid(cName, true); missingAny = true; }
  if (!mobile) { markInvalid(cMobile, true); missingAny = true; }
  if (!district) { markInvalid(cDistrict, true); missingAny = true; }
  if (!message) { markInvalid(cMessage, true); missingAny = true; }
  if (missingAny) {
    showMsg('দয়া করে সব ঘর পূরণ করুন।', true);
    return;
  }

  const orderId = normalizeOrderId(orderIdRaw);

  submitBtn.disabled = true;
  submitBtn.textContent = 'যাচাই করা হচ্ছে...';

  // প্রথমে চেক করা হচ্ছে এই order ID দিয়ে আসলেই কোনো অর্ডার আছে কিনা
  db.collection('orders').where('orderId', '==', orderId).limit(1).get()
    .then((snapshot) => {
      if (snapshot.empty) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'অভিযোগ জমা দিন';
        markInvalid(cOrderId, true);
        showMsg('এই অর্ডার আইডি দিয়ে কোনো অর্ডার পাওয়া যায়নি। সঠিক আইডি দিয়ে আবার চেষ্টা করুন।', true);
        return;
      }

      submitBtn.textContent = 'জমা হচ্ছে...';

      return db.collection('complaints').add({
        orderId,
        name,
        mobile,
        district,
        message,
        status: 'new',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'অভিযোগ জমা দিন';
        showMsg('ধন্যবাদ! আপনার অভিযোগ জমা হয়েছে — আমরা শীঘ্রই যোগাযোগ করব।', false);
      });
    })
    .catch((err) => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'অভিযোগ জমা দিন';
      showMsg('দুঃখিত, জমা দিতে সমস্যা হয়েছে। একটু পর আবার চেষ্টা করুন।', true);
      console.error('Complaint submit error:', err);
    });
});

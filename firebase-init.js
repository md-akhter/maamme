// একবার এখানে কনফিগ করা থাকলে সব পেজ (index, track, complain, search, admin, furniture/fashion/products
// ফোল্ডারের পেজ) এটা শেয়ার করে — আলাদা আলাদা ফাইলে firebaseConfig কপি-পেস্ট করার দরকার নেই।
// (এই apiKey পাবলিক থাকাই স্বাভাবিক — ডেটার সুরক্ষা firestore.rules-এর ওপর নির্ভর করে, এই কী লুকিয়ে নয়।)
const firebaseConfig = {
  apiKey: "AIzaSyAB9n2iK6wNdvugRNynR9S7yUP_E1Kl_Xg",
  authDomain: "maamme.firebaseapp.com",
  projectId: "maamme",
  storageBucket: "maamme.firebasestorage.app",
  messagingSenderId: "962319743416",
  appId: "1:962319743416:web:83ce97db81775d06c7b74d",
  measurementId: "G-2PWZ2WBMB2"
};

// একই পেজে ভুলক্রমে স্ক্রিপ্টটা দুইবার লোড হলে "Firebase App already exists" এরর এড়াতে
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

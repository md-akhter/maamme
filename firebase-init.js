// একবার এখানে কনফিগ করা থাকলে index.html ও admin.html দুটোই এটা শেয়ার করে —
// আলাদা আলাদা ফাইলে firebaseConfig কপি-পেস্ট করার দরকার নেই।
const firebaseConfig = {
  apiKey: "AIzaSyAB9n2iK6wNdvugRNynR9S7yUP_E1Kl_Xg",
  authDomain: "maamme.firebaseapp.com",
  projectId: "maamme",
  storageBucket: "maamme.firebasestorage.app",
  messagingSenderId: "962319743416",
  appId: "1:962319743416:web:83ce97db81775d06c7b74d",
  measurementId: "G-2PWZ2WBMB2"
};

firebase.initializeApp(firebaseConfig);

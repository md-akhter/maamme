import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAB9n2iK6wNdvugRNynR9S7yUP_E1Kl_Xg",
  authDomain: "maamme.firebaseapp.com",
  projectId: "maamme",
  storageBucket: "maamme.firebasestorage.app",
  messagingSenderId: "962319743416",
  appId: "1:962319743416:web:83ce97db81775d06c7b74d",
  measurementId: "G-2PWZ2WBMB2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      document.getElementById("login").style.display = "none";
      document.getElementById("dashboard").style.display = "block";
    })
    .catch(() => {
      alert("Wrong Email or Password");
    });
};

window.logout = function () {
  signOut(auth).then(() => {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login").style.display = "block";
  });
};
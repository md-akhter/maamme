// Firebase Config এখানে বসাবেন
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAB9n2iK6wNdvugRNynR9S7yUP_E1Kl_Xg",
  authDomain: "maamme.firebaseapp.com",
  projectId: "maamme",
  storageBucket: "maamme.firebasestorage.app",
  messagingSenderId: "962319743416",
  appId: "1:962319743416:web:83ce97db81775d06c7b74d",
  measurementId: "G-2PWZ2WBMB2"

};

// Firebase Initialize
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();


// Login Function
function login() {
  let email = document.getElementById("email").value;
  let pass = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      document.getElementById("login").style.display = "none";
      document.getElementById("dashboard").style.display = "block";
    })
    .catch((error) => {
      alert("Wrong Email or Password");
    });
}


// Logout Function
function logout() {
  auth.signOut().then(() => {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login").style.display = "block";
  });
}
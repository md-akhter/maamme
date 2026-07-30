function login(){

let email=document.getElementById("email").value;

let pass=document.getElementById("password").value;

if(email=="md.akhterhossain5051@gmail.com" && pass=="123456"){

document.getElementById("login").style.display="none";

document.getElementById("dashboard").style.display="block";

}else{

alert("Wrong Email or Password");

}

}

function logout(){

document.getElementById("dashboard").style.display="none";

document.getElementById("login").style.display="block";

}
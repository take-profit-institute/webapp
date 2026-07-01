// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAf6a4Z6eyjt4svQDgCglP_xdCtUsozV2w",
    authDomain: "candle-bfce9.firebaseapp.com",
    projectId: "candle-bfce9",
    storageBucket: "candle-bfce9.firebasestorage.app",
    messagingSenderId: "712132485233",
    appId: "1:712132485233:web:1d160ba1748475bd103bd0",
    measurementId: "G-Z9E5649TY7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);
getToken(messaging, { vapidKey: "BDviTHHrHk_L_UaMyfCrlvBr1aUG18XWx98IDociuUDaNmAxNqNrVgDqaNQ67SqVBMuZOjukMwcuwf6SVn4sQhA" });
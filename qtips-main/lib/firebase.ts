import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxPyVZfocbQPzwnAr4xgjDWxwcSJzp37E",
  authDomain: "qtips-edcc2.firebaseapp.com",
  projectId: "qtips-edcc2",
  storageBucket: "qtips-edcc2.appspot.com",
  messagingSenderId: "672740899833",
  appId: "1:672740899833:web:afd5a06ad975bfe504db28",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

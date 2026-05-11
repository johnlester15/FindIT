import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC9fgGJSlIREKsNujNB_dHhwx7n296rGlg",
  authDomain: "lost-found-53cde.firebaseapp.com",
  projectId: "lost-found-53cde",
  storageBucket: "lost-found-53cde.firebasestorage.app",
  messagingSenderId: "1093449637481",
  appId: "1:1093449637481:web:245a8ce4ff97ddbdbeccf8",
  measurementId: "G-HXBNNJ8NX5",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);

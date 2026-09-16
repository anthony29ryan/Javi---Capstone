import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../services/firebase';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
  }, []);

  async function signUp(email, password, displayName) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName });
    await setDoc(doc(db, 'users', newUser.uid), {
      email,
      displayName,
      createdAt: serverTimestamp(),
    });
    await sendEmailVerification(newUser);
  }

  function resendVerification() {
    return sendEmailVerification(auth.currentUser);
  }

  /**
   * Pulls the account's current state down from Firebase and returns whether the
   * email is verified yet.
   *
   * This has to be manual: the user verifies by opening a link in their browser,
   * which changes the account on Firebase's side without the app hearing about
   * it. onAuthStateChanged does not fire for that, so without reloading here the
   * app would keep showing the unverified state until the next sign in.
   */
  async function refreshUser() {
    await auth.currentUser.reload();
    // reload() updates auth.currentUser in place, so spread it into a new object
    // for React to see a changed reference and re-render.
    setUser({ ...auth.currentUser });
    return auth.currentUser.emailVerified;
  }

  function logIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logOut() {
    return signOut(auth);
  }

  async function updateDisplayName(displayName) {
    await updateProfile(auth.currentUser, { displayName });
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName });
    // updateProfile mutates auth.currentUser in place; spread it so React sees a new
    // reference and re-renders anything reading user.displayName.
    setUser({ ...auth.currentUser });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        signUp,
        logIn,
        logOut,
        updateDisplayName,
        refreshUser,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

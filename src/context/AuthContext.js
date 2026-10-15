import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { permanentDeletionDate } from '../constants/accountDeletion';
import { auth, db } from '../services/firebase';
import { cancelDailyReminder } from '../services/notifications';
import { clearOfflineData } from '../services/offline';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  // The date this device's account will be purged, set right after the user
  // schedules its deletion so the sign-up screen they land on can say when.
  const [scheduledDeletion, setScheduledDeletion] = useState(null);
  // What the app calls the user, set on Setup. Lives on the profile document,
  // so it is read along with the deletion check below; null until set.
  const [nickname, setNickname] = useState(null);
  // The picked avatar's id (see src/constants/art.js), or null for the letter.
  const [avatar, setAvatar] = useState(null);
  // While logIn() is deciding whether to restore or refuse an account, it
  // owns the signed-in state. The listener below stands aside so the app
  // does not flash open for an account that is about to be signed out again.
  const logInInProgress = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (logInInProgress.current) return;

      // A failed read counts as "not pending" here, so a network blip on
      // launch cannot lock anyone out of an account that is fine.
      const profile = firebaseUser ? await readProfile(firebaseUser.uid).catch(() => null) : null;
      if (profile?.deletionRequestedAt) {
        // A session saved on this device from before the account was deleted
        // on another one. Only typing the password restores an account, so
        // end the session rather than quietly cancelling the deletion. The
        // sign-out calls this listener again with no user.
        await cancelDailyReminder();
        await clearOfflineData();
        await signOut(auth);
        return;
      }

      setNickname(profile?.nickname ?? null);
      setAvatar(profile?.avatar ?? null);
      setUser(firebaseUser);
      setInitializing(false);
    });
  }, []);

  // displayName is the first name (what the app calls you); lastName is kept
  // only on the profile document. termsVersion: the version of the Terms and
  // Privacy text accepted in the sign-up popup, recorded with the server's
  // time as proof of consent.
  async function signUp(email, password, displayName, lastName, termsVersion) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName });
    await setDoc(doc(db, 'users', newUser.uid), {
      email,
      displayName,
      lastName,
      createdAt: serverTimestamp(),
      termsAcceptedAt: serverTimestamp(),
      termsVersion,
    });
    await sendEmailVerification(newUser);
    setScheduledDeletion(null);
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

  /**
   * Signs in, and settles a pending account deletion on the way.
   *
   * Inside the 30-day window, logging in cancels the deletion and nothing is
   * lost; the result says so, so the screen can tell the user. After the
   * window the account is treated as gone even if the purge script has not
   * run yet, so the sign-in is undone and this throws.
   */
  async function logIn(email, password) {
    logInInProgress.current = true;
    try {
      const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);

      let restored = false;
      try {
        const {
          deletionRequestedAt: requestedAt,
          nickname: savedNickname,
          avatar: savedAvatar,
        } = await readProfile(signedInUser.uid);
        setNickname(savedNickname);
        setAvatar(savedAvatar);
        if (requestedAt && permanentDeletionDate(requestedAt) <= new Date()) {
          const err = new Error('This account has been deleted.');
          err.code = 'account/deleted';
          throw err;
        }
        if (requestedAt) {
          await updateDoc(doc(db, 'users', signedInUser.uid), { deletionRequestedAt: deleteField() });
          restored = true;
        }
      } catch (err) {
        // Whatever went wrong, do not leave a half-finished sign-in behind:
        // the account either opens fully restored or not at all.
        await signOut(auth);
        throw err;
      }

      setScheduledDeletion(null);
      setUser(signedInUser);
      return { restored };
    } finally {
      logInInProgress.current = false;
    }
  }

  /**
   * Asks Firebase to email a password reset link.
   *
   * An unknown address resolves rather than throwing: letting `auth/user-not-
   * found` reach the screen would turn this into an account-existence oracle,
   * where anyone could probe which emails have signed up. The caller reports
   * the same "link sent" outcome either way.
   */
  async function sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      if (err.code !== 'auth/user-not-found' && err.code !== 'auth/invalid-email') throw err;
    }
  }

  // The reminder and offline copies live on the phone, not the account, so they
  // are cleared here or they carry over to whoever signs in next.
  async function logOut() {
    await cancelDailyReminder();
    await clearOfflineData();
    await signOut(auth);
  }

  /**
   * Firebase refuses to change a password or delete an account on a session
   * that has been signed in for a while, so both flows prove the password
   * again first. That is also what stops someone changing the password on an
   * unlocked phone they picked up.
   */
  function reauthenticate(password) {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return reauthenticateWithCredential(auth.currentUser, credential);
  }

  async function changePassword(currentPassword, newPassword) {
    await reauthenticate(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
  }

  /**
   * Schedules the account for permanent deletion in 30 days and signs out.
   *
   * Nothing is removed yet: the profile is only stamped with the time of the
   * request, and scripts/purgeDeletedAccounts.js deletes the account and all
   * of its data once the window has passed. Until then, logging in restores
   * everything (see logIn). The purge runs with admin rights because the app
   * cannot delete an account on a day the user is not signed in.
   */
  async function scheduleAccountDeletion(password) {
    await reauthenticate(password);
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { deletionRequestedAt: serverTimestamp() },
      { merge: true }
    );
    setScheduledDeletion(permanentDeletionDate(new Date()));
    await cancelDailyReminder();
    await clearOfflineData();
    await signOut(auth);
  }

  async function updateNickname(value) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), { nickname: value }, { merge: true });
    setNickname(value);
  }

  async function updateAvatar(id) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), { avatar: id }, { merge: true });
    setAvatar(id);
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
        nickname,
        updateNickname,
        avatar,
        updateAvatar,
        // The name to greet the user by: nickname, else first name, else the
        // start of their email.
        callName: nickname || user?.displayName || user?.email?.split('@')[0] || 'there',
        refreshUser,
        resendVerification,
        sendPasswordReset,
        changePassword,
        scheduleAccountDeletion,
        scheduledDeletion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * The profile fields needed at sign-in, from one read: when the user asked for
 * the account to be deleted, their nickname and their avatar (each null if unset).
 */
async function readProfile(userId) {
  const data = (await getDoc(doc(db, 'users', userId))).data();
  return {
    deletionRequestedAt: data?.deletionRequestedAt?.toDate() ?? null,
    nickname: data?.nickname ?? null,
    avatar: data?.avatar ?? null,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

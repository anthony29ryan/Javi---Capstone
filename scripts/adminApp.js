// Shared admin connection for the scripts in this folder.
//
// Scripts sign in with a service-account key rather than a user account. That
// is what lets firestore.rules keep the app itself read-only for content: the
// Admin SDK bypasses security rules, so these scripts can write what no app
// user can. The key is effectively the project's master password, so it lives
// outside the repo and is only ever pointed to from .env.
//
// One-time setup (see .env.example):
//   Firebase console -> Project settings -> Service accounts ->
//   "Generate new private key", save the file outside this folder, and set
//   GOOGLE_APPLICATION_CREDENTIALS in .env to its full path.

const fs = require('fs');

const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function connectAsAdmin() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  if (!keyPath) {
    throw new Error(
      'Set GOOGLE_APPLICATION_CREDENTIALS in .env to the path of your service-account key. ' +
        'See .env.example for how to download one.'
    );
  }
  if (!fs.existsSync(keyPath)) {
    throw new Error(`No service-account key at ${keyPath}. Check GOOGLE_APPLICATION_CREDENTIALS in .env.`);
  }
  if (!projectId) {
    throw new Error('Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID. Did you run with --env-file=.env?');
  }

  const app = initializeApp({ credential: applicationDefault(), projectId });
  return { db: getFirestore(app), auth: getAuth(app) };
}

module.exports = { connectAsAdmin };

// The email-link page's logic. Firebase adds mode, oobCode and apiKey to every
// action link, so the page needs no project config of its own. The SDK is
// Firebase's own build from gstatic, pinned to the app's version (package.json).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  applyActionCode,
  confirmPasswordReset,
  getAuth,
  verifyPasswordResetCode,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { PASSWORD_RULES, passwordProblems } from './passwordRules.js';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const oobCode = params.get('oobCode');
const apiKey = params.get('apiKey');

const byId = (id) => document.getElementById(id);

function show(view) {
  for (const section of document.querySelectorAll('[data-view]')) {
    section.hidden = section.dataset.view !== view;
  }
}

// textContent throughout, so nothing from the URL or Firebase becomes markup.
function showDone(title, body) {
  byId('done-title').textContent = title;
  byId('done-body').textContent = body;
  show('done');
}

const isOffline = (err) => !navigator.onLine || err?.code === 'auth/network-request-failed';

function setFieldError(field, message) {
  const error = byId(`${field}-error`);
  error.textContent = message ?? '';
  error.hidden = !message;
  byId(field).setAttribute('aria-invalid', message ? 'true' : 'false');
}

function setBanner(title, lines = []) {
  const banner = byId('banner');
  banner.replaceChildren();
  banner.hidden = !title;
  if (!title) return;
  const strong = document.createElement('strong');
  strong.textContent = title;
  banner.append(strong);
  if (lines.length) {
    const list = document.createElement('ul');
    for (const line of lines) {
      const item = document.createElement('li');
      item.textContent = line;
      list.append(item);
    }
    banner.append(list);
  }
}

function setUpResetForm(auth) {
  const password = byId('password');
  const repeat = byId('repeat');
  const rules = byId('rules');

  for (const rule of PASSWORD_RULES) {
    const item = document.createElement('li');
    item.dataset.rule = rule.key;
    item.textContent = rule.label;
    rules.append(item);
  }
  const tickRules = () => {
    for (const rule of PASSWORD_RULES) {
      rules.querySelector(`[data-rule="${rule.key}"]`).classList.toggle('met', rule.test(password.value));
    }
  };
  password.addEventListener('input', tickRules);

  for (const toggle of document.querySelectorAll('.toggle')) {
    toggle.addEventListener('click', () => {
      const input = byId(toggle.dataset.for);
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.textContent = showing ? 'Show' : 'Hide';
      toggle.setAttribute('aria-pressed', String(!showing));
    });
  }

  byId('reset-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const problems = passwordProblems(password.value, repeat.value);
    setFieldError('password', problems.password);
    setFieldError('repeat', problems.repeat);
    const messages = Object.values(problems);
    setBanner(messages.length >= 2 ? `Fix ${messages.length} fields to continue` : '', messages);
    if (messages.length) return;

    const save = byId('save');
    save.disabled = true;
    save.textContent = 'Saving…';
    try {
      await confirmPasswordReset(auth, oobCode, password.value);
      showDone('Password updated', 'Go back to Javi and log in with your new password.');
    } catch (err) {
      if (isOffline(err)) {
        setBanner('No internet connection', ['Check Wi-Fi or mobile data, then try again. What you typed is kept.']);
      } else if (err?.code === 'auth/weak-password' || err?.code === 'auth/password-does-not-meet-requirements') {
        setFieldError('password', 'Use at least 8 characters with an uppercase letter, a lowercase letter and a symbol.');
      } else if (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code') {
        show('expired');
      } else {
        setBanner('Could not save your password', ['Try again in a moment.']);
      }
    } finally {
      save.disabled = false;
      save.textContent = 'Save new password';
    }
  });
}

async function start() {
  if (!oobCode || !apiKey) return show('expired');
  const auth = getAuth(initializeApp({ apiKey }));
  try {
    if (mode === 'resetPassword') {
      byId('reset-email').textContent = await verifyPasswordResetCode(auth, oobCode);
      setUpResetForm(auth);
      show('reset');
    } else if (mode === 'verifyEmail') {
      await applyActionCode(auth, oobCode);
      showDone('Email verified', 'Go back to Javi and tap I opened the link.');
    } else {
      // recoverEmail and the like: the app never sends those links.
      show('expired');
    }
  } catch (err) {
    if (isOffline(err)) showDone('No internet connection', 'Check Wi-Fi or mobile data, then open the link again.');
    // Used, expired, or a newer link was sent: Firebase reports all of them as an invalid code.
    else show('expired');
  }
}

start();

// ═══════════════════════════════════════════
// AUTH — Firebase persistence + 3-hour revalidation
// ═══════════════════════════════════════════

// Set persistence to LOCAL so login survives browser restart
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e=>console.warn('Persistence:', e));

let _revalidateTimer = null;

function _startRevalidateTimer() {
  clearInterval(_revalidateTimer);
  // Every 3 hours, silently re-check the token (Firebase auto-refreshes internally)
  _revalidateTimer = setInterval(async () => {
    const user = auth.currentUser;
    if(user) {
      try {
        await user.getIdToken(true); // force refresh
        console.log('[NEXUS] Token revalidated');
      } catch(e) {
        console.warn('[NEXUS] Revalidation failed, logging out:', e.message);
        auth.signOut();
      }
    }
  }, 3 * 60 * 60 * 1000); // 3 hours
}

auth.onAuthStateChanged(user => {
  const loginOverlay = document.getElementById('login-overlay');
  if (user) {
    if (loginOverlay) loginOverlay.style.display = 'none';
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.style.display = 'none';
    currentUserId = user.uid;
    docRef = firestore.collection('users').doc(user.uid);
    _startRevalidateTimer();

    DB.initLocal();
    if (typeof refreshAll === 'function') refreshAll();

    let _fbFirstLoad = true;
    if (_unsubSnapshot) _unsubSnapshot();

    _unsubSnapshot = docRef.onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        Object.keys(data).forEach(k => {
          DB._state[k] = data[k];
          try{ localStorage.setItem(`${currentUserId}_${k}`,JSON.stringify(data[k])); }catch(e){}
        });
        if (!_fbFirstLoad && typeof refreshAll === 'function') refreshAll();
        else if (_fbFirstLoad && typeof refreshAll === 'function') refreshAll();
      } else if (_fbFirstLoad) {
        docRef.set(DB._state).catch(e => console.error("Initial push failed", e));
      }
      _fbFirstLoad = false;
      seedMyCustomTasks();
      if (typeof refreshAll === 'function') refreshAll();
    });
  } else {
    currentUserId = null;
    docRef = null;
    clearInterval(_revalidateTimer);
    if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null; }
    DB.clearState();
    if (loginOverlay) loginOverlay.style.display = 'flex';
  }
});

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if(el) { el.textContent = msg; el.style.display = 'block'; }
}

function _authSetLoading(loading) {
  const si = document.getElementById('btn-signin'), su = document.getElementById('btn-signup');
  if(!si||!su) return;
  if(loading){
    si.innerHTML='<span class="spinner"></span> Signing in...'; su.innerHTML='<span class="spinner"></span>';
    si.classList.add('btn-loading'); su.classList.add('btn-loading');
  } else {
    si.innerHTML='Sign In'; su.innerHTML='Sign Up';
    si.classList.remove('btn-loading'); su.classList.remove('btn-loading');
  }
}

function _friendlyError(err) {
  const code=err.code||'';
  if(code==='auth/user-not-found')        return '❌ No account with this email. Click Sign Up to create one.';
  if(code==='auth/wrong-password')         return '❌ Wrong password. Please try again.';
  if(code==='auth/invalid-email')          return '❌ Invalid email address format.';
  if(code==='auth/email-already-in-use')   return '❌ Email already registered. Click Sign In instead.';
  if(code==='auth/weak-password')          return '❌ Password too weak — minimum 6 characters.';
  if(code==='auth/too-many-requests')      return '❌ Too many attempts. Please wait a few minutes.';
  if(code==='auth/network-request-failed') return '❌ Network error. Check your internet connection.';
  if(code==='auth/invalid-credential')     return '❌ Wrong email or password.';
  if(code==='auth/operation-not-allowed')  return '❌ Email/Password sign-in is not enabled.';
  return '❌ '+(err.message||'Unknown error occurred.');
}

function loginWithEmail() {
  const e=document.getElementById('auth-email').value.trim(), p=document.getElementById('auth-pass').value;
  const errEl=document.getElementById('auth-error'); if(errEl) errEl.style.display='none';
  if(!e||!p){showAuthError('⚠️ Please enter your email and password.');return;}
  _authSetLoading(true);
  auth.signInWithEmailAndPassword(e,p).catch(err=>{showAuthError(_friendlyError(err));_authSetLoading(false);});
}

function signupWithEmail() {
  const e=document.getElementById('auth-email').value.trim(), p=document.getElementById('auth-pass').value;
  const errEl=document.getElementById('auth-error'); if(errEl) errEl.style.display='none';
  if(!e||!p){showAuthError('⚠️ Please enter your email and password.');return;}
  if(p.length<6){showAuthError('⚠️ Password must be at least 6 characters.');return;}
  _authSetLoading(true);
  auth.createUserWithEmailAndPassword(e,p).catch(err=>{showAuthError(_friendlyError(err));_authSetLoading(false);});
}

function loginWithGoogle() {
  const errEl=document.getElementById('auth-error'); if(errEl) errEl.style.display='none';
  auth.signInWithPopup(googleProvider).catch(error=>showAuthError(_friendlyError(error)));
}

function logout() {
  auth.signOut().then(()=>{ if(typeof toast==='function') toast('Logged out successfully','s'); })
    .catch(error=>{ if(typeof toast==='function') toast('Logout failed: '+error.message,'e'); });
}

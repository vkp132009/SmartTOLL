import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react'
import { auth, db } from '../services/firebase'

const AUTH_ALIAS_DOMAIN = 'smarttoll-2e57b.web.app'

function authEmailForUsername(username) {
  return `${username.trim().toLowerCase()}@${AUTH_ALIAS_DOMAIN}`
}

function describeAuthError(error) {
  if (error.code === 'auth/email-already-in-use') return 'That username is already registered.'
  if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') return 'Username or password is incorrect.'
  if (error.code === 'auth/weak-password') return 'Choose a password with at least 6 characters.'
  if (error.code === 'auth/operation-not-allowed') return 'Email and password sign-in is not enabled in Firebase Authentication.'
  if (error.code === 'permission-denied' || error.code === 'firestore/permission-denied') return 'Firestore rejected the profile request. Check the deployed Firestore rules.'
  if (error.code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.'
  return 'Could not complete the request. Check Firebase Authentication and Firestore configuration.'
}

export default function AuthPage({ onAccountCreated }) {
  const [mode, setMode] = useState('login')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState('operator')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  async function submit(event) {
    event.preventDefault()
    setError('')

    const normalizedUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{1,29}$/.test(normalizedUsername)) {
      setError('Username must be 2–30 characters using letters, numbers, underscores, or hyphens.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (isSignup && password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (isSignup && !displayName.trim()) {
      setError('Enter a toll display name, such as TOLL 1.')
      return
    }

    setBusy(true)
    try {
      const emailAlias = authEmailForUsername(normalizedUsername)
      if (!isSignup) {
        await signInWithEmailAndPassword(auth, emailAlias, password)
        return
      }

      const credential = await createUserWithEmailAndPassword(auth, emailAlias, password)
      const profile = {
        uid: credential.user.uid,
        username: normalizedUsername,
        displayName: displayName.trim().toUpperCase(),
        requestedRole,
        role: 'operator',
        accessStatus: requestedRole === 'manager' ? 'pending' : 'active',
        plazaId: requestedRole === 'operator' ? 'toll-1' : null,
        createdAt: serverTimestamp(),
      }

      await setDoc(doc(db, 'users', credential.user.uid), profile)
      onAccountCreated(credential.user, profile)
    } catch (authError) {
      setError(describeAuthError(authError))
    } finally {
      setBusy(false)
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="auth-brand" href="/" aria-label="SmartTOLL home">
          <img src="/smarttoll-icon.svg" alt="" />
          <span>SmartTOLL</span>
        </a>

        <div className="auth-intro">
          <h1>{isSignup ? 'Create an account' : 'Welcome back'}</h1>
          <p>{isSignup ? 'Set up a toll operator or request manager access.' : 'Sign in to your toll workspace.'}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? 'selected' : ''} onClick={() => changeMode('login')}>Log in</button>
          <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? 'selected' : ''} onClick={() => changeMode('signup')}>Sign up</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <>
              <label className="auth-label" htmlFor="display-name">Toll display name</label>
              <input className="auth-input" id="display-name" autoComplete="organization" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="TOLL 1" maxLength={40} />

              <label className="auth-label" htmlFor="account-role">Account type</label>
              <select className="auth-input auth-select" id="account-role" value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)}>
                <option value="operator">Operator</option>
                <option value="manager">Manager</option>
              </select>
            </>
          )}

          <label className="auth-label" htmlFor="username">Username</label>
          <input className="auth-input" id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="t1" maxLength={30} required />

          <label className="auth-label" htmlFor="password">Password</label>
          <input className="auth-input" id="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />

          {isSignup && (
            <>
              <label className="auth-label" htmlFor="confirm-password">Confirm password</label>
              <input className="auth-input" id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
              {requestedRole === 'manager' && <p className="manager-note"><ShieldCheck size={16} />Manager access requires approval before the Admin Page opens.</p>}
            </>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="auth-spinner" size={18} /> : <>{isSignup ? 'Create account' : 'Log in'}<ArrowRight size={17} /></>}
          </button>
        </form>

        <p className="auth-footnote">Use a password with at least 6 characters.</p>
      </section>
    </main>
  )
}
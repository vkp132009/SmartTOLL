import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { LogOut } from 'lucide-react'
import { auth, db } from './services/firebase'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './Dashboard.jsx'
import './styles/auth.css'

function AccessMessage({ title, message, profile, onLogout }) {
  return (
    <main className="access-shell">
      <section className="access-card">
        <a className="auth-brand" href="/" aria-label="SmartTOLL home">
          <img src="/smarttoll-icon.svg" alt="" />
          <span>SmartTOLL</span>
        </a>
        <p className="access-kicker">{profile?.displayName || profile?.username || 'SmartTOLL'}</p>
        <h1>{title}</h1>
        <p className="access-copy">{message}</p>
        <button className="auth-secondary-button" type="button" onClick={onLogout}>
          <LogOut size={17} />Sign out
        </button>
      </section>
    </main>
  )
}

export default function AuthApp() {
  const [session, setSession] = useState({ loading: true, user: null, profile: null, error: '' })

  useEffect(() => {
    let requestId = 0
    let active = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentRequest = ++requestId
      if (!user) {
        if (active) setSession({ loading: false, user: null, profile: null, error: '' })
        return
      }

      if (active) setSession({ loading: true, user, profile: null, error: '' })
      try {
        const profileSnapshot = await getDoc(doc(db, 'users', user.uid))
        if (!active || currentRequest !== requestId) return
        if (!profileSnapshot.exists()) {
          setSession({ loading: false, user, profile: null, error: 'This account does not have a SmartTOLL profile yet.' })
          return
        }
        setSession({ loading: false, user, profile: profileSnapshot.data(), error: '' })
      } catch {
        if (active && currentRequest === requestId) {
          setSession({ loading: false, user, profile: null, error: 'Could not load your account profile. Check Firestore setup and security rules.' })
        }
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await signOut(auth)
  }

  function handleAccountCreated(user, profile) {
    setSession({ loading: false, user, profile, error: '' })
  }

  if (session.loading) {
    return <main className="auth-loading" aria-label="Loading account"><span /></main>
  }

  if (!session.user) {
    return <AuthPage onAccountCreated={handleAccountCreated} />
  }

  if (session.error) {
    return <AccessMessage title="Account setup needed" message={session.error} profile={session.profile} onLogout={handleLogout} />
  }

  if (session.profile?.requestedRole === 'manager' && session.profile.accessStatus === 'pending') {
    return <AccessMessage title="Manager access pending" message="Your manager request has been created. A project administrator must approve it before you can open the Admin Page." profile={session.profile} onLogout={handleLogout} />
  }

  if (session.profile?.role === 'manager' && session.profile.accessStatus === 'active') {
    return <AccessMessage title="Admin Page is currently tolled" message="Manager account access is active." profile={session.profile} onLogout={handleLogout} />
  }

  if (session.profile?.role === 'operator' && session.profile.accessStatus === 'active') {
    return <Dashboard user={session.user} profile={session.profile} onLogout={handleLogout} />
  }

  return <AccessMessage title="Account unavailable" message="This account does not currently have an active SmartTOLL role." profile={session.profile} onLogout={handleLogout} />
}
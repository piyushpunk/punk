import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext'

// /logout — clears mock auth and bounces home with a toast.
import { useSeo } from '../lib/seo'

export default function LogoutPage() {
  useSeo({ title: 'Logged Out', path: '/logout', noindex: true })
  const { logout, toast, user } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      Promise.resolve(logout()).then(() => toast("You've been logged out"))
    }
    navigate('/', { replace: true })
  }, [user, logout, toast, navigate])

  return null
}

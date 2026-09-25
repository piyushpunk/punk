import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ToastStack from './components/ToastStack'
import ScrollToTop from './components/ScrollToTop'
import { useStore } from './context/StoreContext'

import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LogoutPage from './pages/LogoutPage'
import WishlistPage from './pages/WishlistPage'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import SearchPage from './pages/SearchPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  // Kick the catalog load once at boot — direct visits to /product/:id
  // and /category routes need the catalog before first render resolves.
  const { boot, apiLive } = useStore()
  useEffect(() => {
    boot()
  }, [boot])

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />

          {/* one reusable listing page drives every collection route */}
          <Route path="/new-arrivals" element={<CategoryPage mode="collection" id="new-arrivals" apiLive={apiLive} />} />
          <Route path="/basics" element={<CategoryPage mode="collection" id="basics" apiLive={apiLive} />} />
          <Route path="/sale" element={<CategoryPage mode="collection" id="sale" apiLive={apiLive} />} />
          <Route path="/tops" element={<CategoryPage mode="category" id="tops" apiLive={apiLive} />} />
          <Route path="/tops/:subcategory" element={<CategoryPage mode="subcategory" id="tops" apiLive={apiLive} />} />
          <Route path="/bottoms" element={<CategoryPage mode="category" id="bottoms" apiLive={apiLive} />} />
          <Route path="/bottoms/:subcategory" element={<CategoryPage mode="subcategory" id="bottoms" apiLive={apiLive} />} />
          <Route path="/accessories" element={<CategoryPage mode="category" id="accessories" apiLive={apiLive} />} />

          <Route path="/product/:productId" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refund" element={<RefundPolicyPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <ToastStack />
    </div>
  )
}

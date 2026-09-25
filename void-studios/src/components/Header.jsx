import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import SearchOverlay from './SearchOverlay'
import {
  SearchIcon, UserIcon, HeartIcon, BagIcon, MenuIcon, CloseIcon, ChevronDownIcon,
} from './Icons'
import { NAV_LINKS } from '../content/content'
import { useStore } from '../context/StoreContext'

const iconBtnBase =
  'relative inline-flex h-10 w-9 items-center justify-center transition-opacity hover:opacity-60 lg:w-10'

// Header bar flips dark on hover (genrage-style) — icons follow via currentColor.
const iconBtn = (dark) => `${iconBtnBase} ${dark ? 'text-bg-primary' : 'text-ink'}`

function CountBadge({ count, dark = false }) {
  if (!count) return null
  return (
    <span
      className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-bold leading-none ${
        dark ? 'bg-bg-primary text-ink' : 'bg-accent text-white'
      }`}
    >
      {count}
    </span>
  )
}

export default function Header() {
  const { user, cartCount, wishlist, setCartOpen } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [headHover, setHeadHover] = useState(false) // genrage-style: header goes black while the cursor is over it
  const [searchOpen, setSearchOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState(null) // mobile accordion: which dropdown is expanded
  const navigate = useNavigate()
  const headerRef = useRef(null)

  // close overlays on navigation
  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
    setOpenGroup(null)
  }, [navigate])

  // lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header ref={headerRef} className="sticky top-0 z-50">
      {/* announcement strip removed by owner request — main header starts directly */}

      {/* ---- main bar — light normally, black while hovered ---- */}
      <div
        className={`group/head relative border-b transition-colors duration-200 ${
          headHover ? 'border-transparent bg-ink' : 'border-line-soft bg-bg-primary'
        }`}
        onMouseEnter={() => setHeadHover(true)}
        onMouseLeave={() => setHeadHover(false)}
      >
        {/* genrage-style gradient bleed — the black bar melts downward and
            fades into the pastel page below. pointer-events-none so it never
            blocks clicks, opacity-toggled for the hover ease. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-full h-44 bg-gradient-to-b from-ink via-ink/50 to-transparent transition-opacity duration-300 ${
            headHover ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div className="ak-shell flex h-16 items-center justify-between gap-4">
          {/* LEFT: wordmark + nav (hamburger takes over on mobile) */}
          <div className="flex items-center gap-4 lg:gap-8">
            <button
              type="button"
              className={iconBtn(headHover) + ' -ml-2 nav:hidden'}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>

            <Logo className="shrink-0" inverted={headHover} />

            <nav className="hidden nav:block">
            <ul className="flex items-center gap-3 lg:gap-7">
              {NAV_LINKS.map((item) =>
                item.children ? (
                  <li key={item.label} className="nav-group group flex items-stretch">
                    <button
                      type="button"
                      className={`flex h-full items-center gap-1 whitespace-nowrap px-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 lg:px-3 ${
                        headHover ? 'text-bg-primary' : 'text-ink group-hover/head:text-accent'
                      }`}
                    >
                      {item.label}
                      <ChevronDownIcon size={13} className="transition-transform duration-200 group-hover:rotate-180" />
                    </button>

                    {/* full-width mega-menu — opens under the whole bar on hover */}
                    <div
                      className={`invisible absolute left-0 top-full w-full translate-y-1 border-b opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${
                        headHover ? 'border-ink bg-ink' : 'border-line-soft bg-bg-primary'
                      }`}
                    >
                      <div className="ak-shell grid grid-cols-[1fr_280px] gap-10 py-8">
                        {/* links */}
                        <div>
                          <ul className="grid max-w-md grid-cols-2 gap-x-8 gap-y-1">
                            {item.children.map((child) => (
                              <li key={child.to}>
                                <Link
                                  to={child.to}
                                  className={`group/link flex items-center justify-between border-b py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                                    headHover
                                      ? 'border-white/15 text-bg-primary hover:text-white'
                                      : 'border-line-soft/60 text-ink hover:text-accent'
                                  }`}
                                >
                                  {child.label}
                                  <span className="text-accent opacity-0 transition-opacity group-hover/link:opacity-100">→</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {item.viewAll && (
                            <Link
                              to={item.viewAll}
                              className={`mt-5 inline-block text-[11px] font-bold uppercase tracking-[0.22em] underline underline-offset-8 transition-opacity hover:opacity-70 ${
                                headHover ? 'text-white' : 'text-accent'
                              }`}
                            >
                              View All
                            </Link>
                          )}
                        </div>

                        {/* promo tile — swap img when campaign art is ready */}
                        {item.promo && (
                          <Link to={item.viewAll ?? '/new-arrivals'} className="group/promo block">
                            <div className="aspect-[4/3] overflow-hidden bg-bg-secondary">
                              <img
                                src={item.promo.img}
                                alt=""
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover/promo:scale-105"
                              />
                            </div>
                            <p
                              className={`mt-3 text-[11px] font-bold uppercase tracking-[0.2em] ${
                                headHover
                                  ? 'text-bg-primary group-hover/promo:text-white'
                                  : 'text-ink group-hover/promo:text-accent'
                              }`}
                            >
                              {item.promo.title}
                            </p>
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={item.label} className="flex items-center">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                          item.pill
                            ? headHover
                              ? 'rounded-full border border-white/50 bg-white/15 px-3 py-1.5 text-white hover:bg-white/25'
                              : 'rounded-full border border-accent/60 bg-accent/10 px-3 py-1.5 text-accent hover:bg-accent/20'
                            : item.dot
                              ? headHover
                                ? 'flex items-center gap-2 text-bg-primary'
                                : 'flex items-center gap-2 text-ink hover:text-accent'
                              : isActive
                                ? headHover
                                  ? 'underline decoration-bg-primary underline-offset-8 text-bg-primary'
                                  : 'underline decoration-accent underline-offset-8 text-ink'
                                : headHover
                                  ? 'text-bg-primary'
                                  : 'text-ink hover:text-accent'
                        }`
                      }
                    >
                      {item.dot && (
                        <span
                          className={`h-2 w-2 rounded-full ${headHover ? 'bg-bg-primary' : 'bg-accent'}`}
                          aria-hidden="true"
                        />
                      )}
                      {item.label}
                    </NavLink>
                  </li>
                ),
              )}
            </ul>
            </nav>
          </div>

          {/* RIGHT: icon group */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button type="button" className={iconBtn(headHover)} onClick={() => setSearchOpen(true)} aria-label="Search">
              <SearchIcon />
            </button>
            <Link
              to={user ? '/account' : '/login'}
              className={iconBtn(headHover)}
              aria-label={user ? 'Account' : 'Login'}
              title={user ? `Hi, ${user.name}` : 'Login'}
            >
              <UserIcon />
            </Link>
            <Link to="/wishlist" className={iconBtn(headHover)} aria-label="Wishlist">
              <HeartIcon />
              <CountBadge count={wishlist.length} dark={headHover} />
            </Link>
            <button type="button" className={iconBtn(headHover)} onClick={() => setCartOpen(true)} aria-label="Bag">
              <BagIcon />
              <CountBadge count={cartCount} dark={headHover} />
            </button>
          </div>
        </div>
      </div>

      {/* page dim behind the mega-menu — fades in when any nav group is hovered */}
      <div className="ak-nav-overlay pointer-events-none absolute inset-x-0 top-full hidden h-screen bg-ink/25 opacity-0 transition-opacity duration-300 nav:block" aria-hidden="true" />

      {/* ---- mobile drawer ---- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] nav:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-bg-primary shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <Logo />
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1">
                <CloseIcon />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="divide-y divide-line-soft">
                {NAV_LINKS.map((item) =>
                  item.children ? (
                    <li key={item.label} className="py-1">
                      <button
                        type="button"
                        onClick={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                        className="flex w-full items-center justify-between py-3 text-[12px] font-semibold uppercase tracking-[0.2em]"
                        aria-expanded={openGroup === item.label}
                      >
                        {item.label}
                        <ChevronDownIcon
                          size={15}
                          className={`transition-transform ${openGroup === item.label ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {openGroup === item.label && (
                        <ul className="pb-3 pl-3">
                          {item.children.map((child) => (
                            <li key={child.to}>
                              <Link
                                to={child.to}
                                className="block py-2 text-[12px] uppercase tracking-[0.14em] text-ink-soft"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ) : (
                    <li key={item.label} className="py-1">
                      <Link
                        to={item.to}
                        className={`flex items-center gap-2 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] ${
                          item.pill ? 'text-accent' : 'text-ink'
                        }`}
                      >
                        {item.dot && <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
                        {item.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <div className="border-t border-line-soft px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              {user ? (
                <Link to="/account" className="block py-1">
                  Hi, {user.name} — Account
                </Link>
              ) : (
                <div className="flex gap-5">
                  <Link to="/login" className="py-1">Sign In</Link>
                  <Link to="/register" className="py-1">Create Account</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}

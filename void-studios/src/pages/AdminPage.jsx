import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { api } from '../lib/api'
import { compressImage } from '../lib/imageUpload'
import ProductImage from '../components/ProductImage'

// ==================================================================
// Admin dashboard — product push/management for role:"admin" users.
// Guard is client-side (friendly messages); the API re-checks the
// role server-side on every mutation, so this is UX, not security.
// ==================================================================

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const COLLECTION_OPTIONS = ['new-arrivals', 'top-picks', 'basics', 'sale']
const MAX_IMAGES = 3

const emptyForm = {
  name: '',
  description: '',
  categoryId: '',
  brandId: '',
  basePrice: '',
  collections: [],
  isFeatured: false,
  variants: [],
}

const labelCls = 'block text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft'
const inputCls =
  'mt-1.5 w-full border border-line-soft bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none'

import { useSeo } from '../lib/seo'

export default function AdminPage() {
  useSeo({ title: 'Admin', path: '/admin', noindex: true })
  const { user, apiLive, boot, toast } = useStore()

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [products, setProducts] = useState([])
  const [categoryTree, setCategoryTree] = useState([])
  const [brands, setBrands] = useState([])

  // editing === null → dashboard; 'new' → create; product doc → edit
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState(null)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)

  // Cap enforcement across current + queued images (max 3 per product)
  const totalImages = (editing !== 'new' && editing?.images?.length ? editing.images.length : 0) + files.length

  // quick variant-matrix generator inputs
  const [gen, setGen] = useState({ sizes: 'S, M, L', colors: 'Black', stock: 8, price: '' })
  const keyRef = useRef(1)
  const nextKey = () => `v${keyRef.current++}`

  const isAdmin = user?.role === 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [prodData, catData, brandData] = await Promise.all([
        api.products({ limit: 60 }),
        api.categories(),
        api.brands(),
      ])
      setProducts(prodData.products || [])
      setCategoryTree(catData.tree || [])
      setBrands(brandData.brands || [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (apiLive && isAdmin) load()
  }, [apiLive, isAdmin, load])

  const categoryOptions = useMemo(() => {
    const opts = []
    for (const root of categoryTree) {
      if (root.children?.length) {
        for (const child of root.children) {
          opts.push({ id: child._id, label: `${root.name} / ${child.name}` })
        }
      } else {
        opts.push({ id: root._id, label: root.name })
      }
    }
    return opts
  }, [categoryTree])

  const categoryLabel = (p) => {
    const cat = p.category
    if (!cat) return '—'
    return cat.parentCategory ? `${cat.parentCategory.name} / ${cat.name}` : cat.name
  }

  const totalStock = (p) => (p.variants || []).reduce((n, v) => n + (v.stock || 0), 0)

  // ── form helpers ────────────────────────────────────────────────
  const openNew = () => {
    setForm({ ...emptyForm, variants: [{ key: nextKey(), size: '', color: '', stock: 8, priceOverride: '' }] })
    setFiles([])
    setFormError(null)
    setEditing('new')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEdit = (p) => {
    setForm({
      name: p.name,
      description: p.description || '',
      categoryId: p.category?._id || '',
      brandId: p.brand?._id || '',
      basePrice: String(p.basePrice ?? ''),
      collections: p.collections || [],
      isFeatured: !!p.isFeatured,
      variants: (p.variants || []).map((v) => ({
        key: nextKey(),
        size: String(v.size ?? ''),
        color: v.color || '',
        stock: v.stock ?? 0,
        priceOverride: v.priceOverride ?? '',
      })),
    })
    setFiles([])
    setFormError(null)
    setEditing(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const setField = (patch) => setForm((f) => ({ ...f, ...patch }))

  const updateRow = (key, patch) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }))

  const removeRow = (key) =>
    setForm((f) => ({ ...f, variants: f.variants.filter((r) => r.key !== key) }))

  const addRow = () =>
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { key: nextKey(), size: '', color: '', stock: 8, priceOverride: '' }],
    }))

  const toggleCollection = (c) =>
    setForm((f) => ({
      ...f,
      collections: f.collections.includes(c)
        ? f.collections.filter((x) => x !== c)
        : [...f.collections, c],
    }))

  /** Cross-product sizes × colors → variant rows (duplicates skipped). */
  const generateVariants = () => {
    const sizes = gen.sizes.split(',').map((s) => s.trim()).filter(Boolean)
    const colors = gen.colors.split(',').map((c) => c.trim()).filter(Boolean)
    if (!sizes.length || !colors.length) {
      setFormError('Enter at least one size and one color to generate the variant matrix')
      return
    }
    setFormError(null)
    setForm((f) => {
      const rows = f.variants.filter((r) => r.size.trim() && r.color.trim())
      const seen = new Set(rows.map((r) => `${r.size}|${r.color}`.toLowerCase()))
      for (const size of sizes) {
        for (const color of colors) {
          const k = `${size}|${color}`.toLowerCase()
          if (seen.has(k)) continue
          seen.add(k)
          rows.push({
            key: nextKey(),
            size,
            color,
            stock: Number(gen.stock) > 0 ? Math.round(Number(gen.stock)) : 0,
            priceOverride: gen.price === '' ? '' : Number(gen.price),
          })
        }
      }
      return { ...f, variants: rows }
    })
  }

  // ── mutations ───────────────────────────────────────────────────
  const save = async (e) => {
    e.preventDefault()

    if (form.name.trim().length < 2) return setFormError('Name must be at least 2 characters')
    if (!form.categoryId) return setFormError('Pick a category')
    if (!form.brandId) return setFormError('Pick a brand')
    const basePrice = Number(form.basePrice)
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return setFormError('Base price must be a number ≥ 0')
    }

    const variants = form.variants
      .filter((v) => v.size.trim() && v.color.trim())
      .map((v) => ({
        size: v.size.trim(),
        color: v.color.trim(),
        stock: Number.isFinite(Number(v.stock)) ? Math.max(0, Math.round(Number(v.stock))) : 0,
        priceOverride: v.priceOverride === '' || v.priceOverride === null ? null : Number(v.priceOverride),
      }))
    if (!variants.length) return setFormError('Add at least one variant (size + color)')

    const seen = new Set()
    for (const v of variants) {
      const k = `${v.size}|${v.color}`.toLowerCase()
      if (seen.has(k)) return setFormError(`Duplicate variant: ${v.size} / ${v.color}`)
      seen.add(k)
    }

    setBusy(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.categoryId,
        brand: form.brandId,
        basePrice,
        isFeatured: form.isFeatured,
        collections: form.collections,
        variants,
      }

      let productId
      if (editing === 'new') {
        const data = await api.adminCreateProduct(payload)
        productId = data.product?._id
        toast(`"${payload.name}" created`)
      } else {
        await api.adminUpdateProduct(editing._id, payload)
        productId = editing._id // edit path must also be able to upload images
        toast(`"${payload.name}" updated`)
      }

      if (files.length && productId) {
        try {
          await api.adminUploadImages(productId, files)
          toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`)
        } catch (err) {
          // product saved — don't fail the whole flow, but say why images didn't stick
          toast(`Saved — but image upload failed: ${err.message}`)
        }
      }

      setEditing(null)
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      await Promise.all([load(), boot()]) // refresh admin table + storefront catalog
    } catch (err) {
      const detail = err.errors?.map((x) => x.message).join(' · ')
      setFormError(detail || err.message)
    } finally {
      setBusy(false)
    }
  }

  const uploadImagesOnly = async () => {
    if (editing === 'new' || !files.length) return
    setBusy(true)
    try {
      await api.adminUploadImages(editing._id, files)
      const fresh = await api.products({ limit: 60 })
      setProducts(fresh.products)
      const updated = fresh.products.find((p) => p._id === editing._id)
      if (updated) setEditing(updated)
      setFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`)
      await Promise.all([load(), boot()])
    } catch (err) {
      toast(`Image upload failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const removeImage = async (p, url) => {
    setBusy(true)
    try {
      const data = await api.adminRemoveImage(p._id, url)
      setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, images: data.images } : x)))
      if (editing !== 'new' && editing?._id === p._id) setEditing({ ...editing, images: data.images })
      toast('Image removed')
      await boot() // storefront catalog refresh
    } catch (err) {
      toast(`Remove failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const destroy = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? It will be hidden from the storefront (order history is preserved).`)) return
    setBusy(true)
    try {
      await api.adminDeleteProduct(p._id)
      toast(`"${p.name}" deleted`)
      await Promise.all([load(), boot()])
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  // ── guard states ────────────────────────────────────────────────
  if (apiLive === false) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Admin</h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            The dashboard manages live catalog data, so it needs the backend API — which isn&apos;t
            reachable right now. Start the Express server and reload.
          </p>
          <Link to="/" className="ak-btn-dark mt-8">Back to Store</Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Admin</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in with an admin account to manage products.</p>
          <div className="mt-8 flex gap-3">
            <Link to="/login" className="ak-btn-dark">Log In</Link>
            <Link to="/" className="ak-btn-outline">Back to Store</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Admin access required</h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            You&apos;re signed in as <span className="font-medium text-ink">{user.email}</span>, which
            isn&apos;t an admin account. Ask a store owner to promote your role.
          </p>
          <Link to="/account" className="ak-btn-outline mt-8">Back to Account</Link>
        </div>
      </div>
    )
  }

  // ── dashboard ───────────────────────────────────────────────────
  const stockSum = products.reduce((n, p) => n + totalStock(p), 0)
  const lowStock = products.filter((p) => totalStock(p) > 0 && totalStock(p) <= 10).length
  const soldOut = products.filter((p) => totalStock(p) === 0).length

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Dashboard</p>
            <h1 className="ak-section-title mt-1">Product Admin</h1>
          </div>
          <button type="button" onClick={openNew} className="ak-btn-dark" disabled={busy}>
            + New Product
          </button>
        </div>

        {/* stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ['Products', products.length],
            ['Units in stock', stockSum],
            ['Low stock (≤10)', lowStock],
            ['Sold out', soldOut],
          ].map(([label, value]) => (
            <div key={label} className="border border-line-soft bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {/* create / edit form */}
        {editing && (
          <form onSubmit={save} className="mt-8 border border-ink bg-white p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold uppercase tracking-[0.14em]">
                {editing === 'new' ? 'New Product' : `Editing — ${editing.name}`}
              </h2>
              <button
                type="button"
                onClick={() => { setEditing(null); setFormError(null) }}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft hover:text-ink"
              >
                Close ✕
              </button>
            </div>

            {formError && (
              <p className="mt-4 border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">
                {formError}
              </p>
            )}

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="p-name">Name *</label>
                <input
                  id="p-name"
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setField({ name: e.target.value })}
                  placeholder="Oni Mask Hoodie"
                  required
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="p-price">Base price (₹) *</label>
                <input
                  id="p-price"
                  className={inputCls}
                  type="number"
                  min="0"
                  step="1"
                  value={form.basePrice}
                  onChange={(e) => setField({ basePrice: e.target.value })}
                  placeholder="5990"
                  required
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="p-category">Category *</label>
                <select
                  id="p-category"
                  className={inputCls}
                  value={form.categoryId}
                  onChange={(e) => setField({ categoryId: e.target.value })}
                  required
                >
                  <option value="">Select category…</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="p-brand">Brand *</label>
                <select
                  id="p-brand"
                  className={inputCls}
                  value={form.brandId}
                  onChange={(e) => setField({ brandId: e.target.value })}
                  required
                >
                  <option value="">Select brand…</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className={labelCls} htmlFor="p-desc">Description</label>
                <textarea
                  id="p-desc"
                  className={inputCls}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField({ description: e.target.value })}
                  placeholder="Heavyweight 460 GSM brushed-back fleece…"
                />
              </div>
            </div>

            {/* collections + featured */}
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line-soft pt-6">
              <div>
                <p className={labelCls}>Collections</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLLECTION_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCollection(c)}
                      className={`border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        form.collections.includes(c)
                          ? 'border-ink bg-ink text-bg-primary'
                          : 'border-line-soft bg-white text-ink-soft hover:border-ink hover:text-ink'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelCls}>Featured</p>
                <button
                  type="button"
                  onClick={() => setField({ isFeatured: !form.isFeatured })}
                  className={`mt-2 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    form.isFeatured
                      ? 'border-accent bg-accent text-white'
                      : 'border-line-soft bg-white text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {form.isFeatured ? '★ Featured' : '☆ Not featured'}
                </button>
              </div>
            </div>

            {/* variants */}
            <div className="mt-6 border-t border-line-soft pt-6">
              <p className={labelCls}>Variants — size × color with per-variant stock & sale price</p>

              {/* generator */}
              <div className="mt-3 flex flex-wrap items-end gap-3 border border-line-soft bg-bg-primary p-4">
                <div className="w-40">
                  <label className={labelCls} htmlFor="gen-sizes">Sizes (comma sep.)</label>
                  <input
                    id="gen-sizes"
                    className={inputCls}
                    value={gen.sizes}
                    onChange={(e) => setGen((g) => ({ ...g, sizes: e.target.value }))}
                  />
                </div>
                <div className="w-40">
                  <label className={labelCls} htmlFor="gen-colors">Colors (comma sep.)</label>
                  <input
                    id="gen-colors"
                    className={inputCls}
                    value={gen.colors}
                    onChange={(e) => setGen((g) => ({ ...g, colors: e.target.value }))}
                  />
                </div>
                <div className="w-24">
                  <label className={labelCls} htmlFor="gen-stock">Stock each</label>
                  <input
                    id="gen-stock"
                    className={inputCls}
                    type="number"
                    min="0"
                    value={gen.stock}
                    onChange={(e) => setGen((g) => ({ ...g, stock: e.target.value }))}
                  />
                </div>
                <div className="w-28">
                  <label className={labelCls} htmlFor="gen-price">Sale ₹ (opt.)</label>
                  <input
                    id="gen-price"
                    className={inputCls}
                    type="number"
                    min="0"
                    placeholder="—"
                    value={gen.price}
                    onChange={(e) => setGen((g) => ({ ...g, price: e.target.value }))}
                  />
                </div>
                <button type="button" onClick={generateVariants} className="ak-btn-outline !mt-0">
                  Generate Matrix
                </button>
              </div>

              {/* rows */}
              <div className="mt-4 space-y-2">
                {form.variants.length === 0 && (
                  <p className="text-sm text-ink-soft">No variants yet — generate a matrix above or add rows manually.</p>
                )}
                {form.variants.map((r) => (
                  <div key={r.key} className="flex flex-wrap items-center gap-2">
                    <input
                      aria-label="Size"
                      className={`${inputCls} !mt-0 w-20`}
                      placeholder="Size"
                      value={r.size}
                      onChange={(e) => updateRow(r.key, { size: e.target.value })}
                    />
                    <input
                      aria-label="Color"
                      className={`${inputCls} !mt-0 w-32`}
                      placeholder="Color"
                      value={r.color}
                      onChange={(e) => updateRow(r.key, { color: e.target.value })}
                    />
                    <input
                      aria-label="Stock"
                      className={`${inputCls} !mt-0 w-24`}
                      type="number"
                      min="0"
                      placeholder="Stock"
                      value={r.stock}
                      onChange={(e) => updateRow(r.key, { stock: e.target.value })}
                    />
                    <input
                      aria-label="Sale price override"
                      className={`${inputCls} !mt-0 w-32`}
                      type="number"
                      min="0"
                      placeholder="Sale ₹"
                      value={r.priceOverride}
                      onChange={(e) => updateRow(r.key, { priceOverride: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      aria-label="Remove variant"
                      className="px-2 py-2 text-ink-soft transition-colors hover:text-accent"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addRow} className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft hover:text-ink">
                + Add row manually
              </button>
            </div>

            {/* images — max 3, live previews, per-image remove */}
            <div className="mt-6 border-t border-line-soft pt-6">
              <p className={labelCls}>
                Images ({totalImages}/{MAX_IMAGES})
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                {editing !== 'new' &&
                  (editing?.images || []).map((src) => (
                    <div key={src} className="relative">
                      <ProductImage src={src} alt="" className="h-16 w-16 border border-line-soft object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(editing, src)}
                        disabled={busy}
                        aria-label="Remove image"
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center bg-ink text-[10px] text-bg-primary hover:bg-accent"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 border border-dashed border-line-soft object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      aria-label="Remove selected file"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center bg-ink-soft text-[10px] text-bg-primary hover:bg-accent"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {totalImages < MAX_IMAGES && (
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 border border-dashed border-line-soft text-[9px] uppercase tracking-[0.15em] text-ink-soft transition-colors hover:border-ink hover:text-ink">
                    <span className="text-base leading-none">+</span>
                    Add
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const picked = [...e.target.files]
                        const room = MAX_IMAGES - totalImages
                        const accepted = picked.length > room ? picked.slice(0, Math.max(0, room)) : picked
                        if (picked.length > room) {
                          setFormError(`Max ${MAX_IMAGES} images per product — picked ${picked.length}, room for ${room}`)
                        } else {
                          setFormError(null)
                        }
                        // Compress each image client-side first — phone photos are 3–8MB
                        // and anything over ~2.85MB 502s at the Vercel proxy before it
                        // reaches the backend. Compressed files render the same preview
                        // and upload the same way; see lib/imageUpload.js.
                        const compressed = await Promise.all(accepted.map(compressImage))
                        setFiles((prev) => [...prev, ...compressed])
                        e.target.value = ''
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                Up to {MAX_IMAGES} images per product. Large photos are compressed automatically in your browser before upload. “Add” queues files; they upload to Cloudinary when you save (new products) or via “Upload now” (existing).
              </p>
            </div>

            {/* actions */}
            <div className="mt-8 flex gap-3">
              <button type="submit" className="ak-btn-dark" disabled={busy}>
                {busy ? 'Saving…' : editing === 'new' ? 'Create Product' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => { setEditing(null); setFormError(null) }} className="ak-btn-outline" disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* table */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em]">Catalog ({products.length})</h2>
            <button type="button" onClick={load} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft hover:text-ink" disabled={loading}>
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>

          {loadError && (
            <p className="mt-4 border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">{loadError}</p>
          )}

          <div className="mt-4 overflow-x-auto border border-line-soft bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Collections</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = totalStock(p)
                  return (
                    <tr key={p._id} className="border-b border-line-soft last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage src={p.images?.[0]} alt={p.name} className="h-12 w-12 shrink-0 border border-line-soft object-cover" />
                          <div>
                            <p className="font-medium">
                              {p.name}
                              {p.isFeatured && <span className="ml-2 text-accent">★</span>}
                            </p>
                            <p className="text-xs text-ink-soft">{p.slug} · {(p.variants || []).length} variants</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{categoryLabel(p)}</td>
                      <td className="px-4 py-3">{fmt(p.basePrice)}</td>
                      <td className={`px-4 py-3 ${stock === 0 ? 'font-semibold text-accent' : stock <= 10 ? 'text-accent' : ''}`}>
                        {stock}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.collections || []).map((c) => (
                            <span key={c} className="border border-line-soft px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-ink-soft">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEdit(p)} className="border border-line-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] hover:border-ink" disabled={busy}>
                            Edit
                          </button>
                          <button type="button" onClick={() => destroy(p)} className="border border-line-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent hover:border-accent" disabled={busy}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && !loadError && products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                      No products yet — hit <span className="font-medium text-ink">+ New Product</span> to push the first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

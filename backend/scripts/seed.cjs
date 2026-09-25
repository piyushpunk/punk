/**
 * Seeds the AKUMA catalog into MongoDB. IDEMPOTENT — brand, categories and
 * products are keyed by slug (created only when missing), so it can run on
 * every boot / be re-run safely. Prints the seeded admin credentials once.
 *
 * Two ways to run:
 *   CLI:      node scripts/seed.cjs                    (connects, seeds, disconnects)
 *   In-app:   import { seed } — used by index.js when SEED_ON_BOOT=true,
 *             sharing the already-open mongoose connection.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");

const BRAND = { name: "AKUMA", slug: "akuma", logoUrl: "" };

const CATEGORIES = [
  { name: "Tops", slug: "tops", parent: null },
  { name: "Bottoms", slug: "bottoms", parent: null },
  { name: "Accessories", slug: "accessories", parent: null },
  { name: "T-Shirts", slug: "tshirts", parent: "tops" },
  { name: "Hoodies", slug: "hoodies", parent: "tops" },
  { name: "Jackets", slug: "jackets", parent: "tops" },
  { name: "Pants", slug: "pants", parent: "bottoms" },
  { name: "Jeans", slug: "jeans", parent: "bottoms" },
  { name: "Shorts", slug: "shorts", parent: "bottoms" },
];

// [name, categorySlug, basePrice, salePrice, sizes, colors, collections, description]
const PRODUCTS = [
  ["Oni Blank Tee", "tshirts", 2490, null, ["S","M","L","XL","XXL"], ["White","Black"], ["new-arrivals","basics"], "Heavyweight 260 GSM boxy tee with tonal back-neck embroidery."],
  ["Kanji Logo Tee", "tshirts", 2790, 1990, ["S","M","L","XL","XXL"], ["White","Olive Green"], ["new-arrivals","sale"], "Oversized tee with the AKUMA wordmark across the chest in puff print."],
  ["Temple Wash Tee", "tshirts", 2590, null, ["S","M","L","XL"], ["Brown"], ["basics"], "Garment-dyed heavyweight tee with a lived-in wash and dropped shoulders."],
  ["Shinigami Hoodie", "hoodies", 5490, null, ["S","M","L","XL","XXL"], ["Black","White"], ["new-arrivals","top-picks"], "460 GSM brushed-back fleece hoodie, double-layered hood, ribbed cuffs."],
  ["Oni Mask Hoodie", "hoodies", 5990, 4490, ["S","M","L","XL"], ["Black"], ["top-picks","sale"], "Premium heavyweight hoodie with puff-print oni mask artwork."],
  ["Kaido Work Jacket", "jackets", 8490, null, ["S","M","L","XL"], ["Black","Brown"], ["top-picks"], "12oz duck canvas work jacket with corduroy collar and utility pockets."],
  ["Ronin Cargo Pant", "pants", 5290, null, ["28","30","32","34","36"], ["Black","Olive Green"], ["new-arrivals"], "Wide-leg cargo pants with bellowed pockets and adjustable hem."],
  ["Kuro Straight Jean", "jeans", 5990, null, ["28","30","32","34","36"], ["Raw Indigo"], ["new-arrivals"], "14oz raw selvedge straight jean, unwashed and rigid."],
  ["Ash Baggy Jean", "jeans", 5490, null, ["30","32","34"], ["Washed Grey"], ["sale"], "Baggy-fit jean in washed grey denim with stacked hem."],
  ["Studio Short", "shorts", 3290, null, ["S","M","L","XL"], ["White","Black"], ["basics"], "Heavyweight fleece short with elastic waist and side pockets."],
  ["Kanji Socks (3-Pack)", "accessories", 1190, null, ["Free"], ["White"], ["basics"], "Three pairs of cushioned cotton socks with tonal kanji weave."],
];

const ADMIN = {
  name: "AKUMA Admin",
  email: process.env.SEED_ADMIN_EMAIL || "admin@akuma.test",
  password: process.env.SEED_ADMIN_PASSWORD || "akuma-admin-123",
};

/**
 * Runs the seed against the CURRENT mongoose connection — does not
 * connect or disconnect (caller owns the connection lifecycle).
 * @returns {Promise<{productsCreated: number, adminEmail: string}>}
 */
async function seed() {
  // ESM models can't be require()d — load via dynamic import instead.
  const { Brand: BrandModel } = await import("../src/models/brand.model.js");
  const { Category: CategoryModel } = await import("../src/models/category.model.js");
  const { Product: ProductModel } = await import("../src/models/product.model.js");
  const { User: UserModel } = await import("../src/models/user.model.js");

  // brand
  let brand = await BrandModel.findOne({ slug: BRAND.slug });
  if (!brand) brand = await BrandModel.create(BRAND);

  // categories (parents before children by declaration order)
  const catBySlug = {};
  for (const c of CATEGORIES) {
    let doc = await CategoryModel.findOne({ slug: c.slug });
    if (!doc) {
      doc = await CategoryModel.create({
        name: c.name,
        slug: c.slug,
        parentCategory: c.parent ? catBySlug[c.parent]._id : null,
      });
    }
    catBySlug[c.slug] = doc;
  }

  // products
  let created = 0;
  for (const [name, catSlug, basePrice, salePrice, sizes, colors, collections, description] of PRODUCTS) {
    const exists = await ProductModel.exists({
      name,
      category: catBySlug[catSlug]._id,
    });
    if (exists) continue;

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let slug = slugBase;
    let n = 2;
    while (await ProductModel.exists({ slug })) slug = `${slugBase}-${n++}`;

    const variants = [];
    for (const size of sizes) {
      for (const color of colors) {
        variants.push({
          sku: `AK-${slugBase.slice(0, 12).toUpperCase()}-${String(size).toUpperCase()}-${String(color).replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 3)}`,
          size: String(size),
          color,
          stock: 8,
          priceOverride: salePrice,
          isActive: true,
        });
      }
    }

    await ProductModel.create({
      name,
      slug,
      description,
      category: catBySlug[catSlug]._id,
      brand: brand._id,
      basePrice,
      variants,
      collections,
      isFeatured: collections.includes("top-picks"),
    });
    created += 1;
  }
  console.log(`products: ${created} created, ${PRODUCTS.length - created} already present`);

  // admin
  let admin = await UserModel.findOne({ email: ADMIN.email });
  if (!admin) {
    admin = await UserModel.create({ ...ADMIN, role: "admin" });
    console.log(`admin created — email: ${ADMIN.email}  password: ${ADMIN.password}`);
  } else {
    console.log(`admin already present — email: ${ADMIN.email}`);
  }

  return { productsCreated: created, adminEmail: ADMIN.email };
}

module.exports = { seed };

// CLI entry: `node scripts/seed.cjs` — owns the connection when run directly.
if (require.main === module) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing — set it in backend/.env");
    process.exit(1);
  }
  (async () => {
    await mongoose.connect(uri);
    console.log("connected to", mongoose.connection.name);
    await seed();
    await mongoose.disconnect();
    console.log("seed done ✓");
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// Datos mínimos para arrancar en local. Idempotente: cada entidad hace upsert
// por su clave natural (email, código, slug, nombre).
//   pnpm db:seed
import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL en .env");
  process.exit(1);
}

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@buchito.local";
const password = process.env.SEED_ADMIN_PASSWORD ?? "cambiar-en-local";

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: DATABASE_URL }) });

function dec(value: number | string) {
  return new Prisma.Decimal(value);
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  // Una tienda ya configurada (hay fila de configuración) conserva sus
  // monedas, tasas, zonas y métodos de pago: el seed solo los crea la primera
  // vez. Los datos de demostración (productos, combos, cuentas) se aplican siempre.
  const fresh = (await db.storeSetting.findUnique({ where: { id: 1 } })) == null;

  // ----- Monedas y moneda base -----
  const cup = await db.currency.upsert({
    where: { code: "CUP" },
    create: { code: "CUP", name: "Peso cubano", symbol: "$", decimalPlaces: 0, sortOrder: 0 },
    update: {},
  });
  const usd = await db.currency.upsert({
    where: { code: "USD" },
    create: { code: "USD", name: "Dólar estadounidense", symbol: "$", decimalPlaces: 2, sortOrder: 1 },
    update: {},
  });
  const mlc = fresh
    ? await db.currency.upsert({
        where: { code: "MLC" },
        create: { code: "MLC", name: "Moneda libremente convertible", symbol: "MLC", decimalPlaces: 2, sortOrder: 2 },
        update: {},
      })
    : null;

  await db.storeSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      storeName: "Buchito",
      baseCurrencyId: cup.currencyId,
      orderPrefix: "PED-",
      defaultShippingFee: dec(500),
      freeShippingThreshold: dec(20000),
      lowStockThreshold: 5,
      allowPickup: true,
    },
    // Una tienda ya configurada conserva su moneda base: el seed solo la fija
    // la primera vez.
    update: {},
  });

  // ----- Tasas (X → CUP): rate = CUP por 1 unidad de X -----
  const seedRates: [typeof usd, number][] = fresh && mlc ? [[usd, 400], [mlc, 320]] : [];
  for (const [currency, rate] of seedRates) {
    const existing = await db.exchangeRate.findUnique({
      where: {
        baseCurrencyId_quoteCurrencyId: {
          baseCurrencyId: currency.currencyId,
          quoteCurrencyId: cup.currencyId,
        },
      },
    });
    if (!existing) {
      const created = await db.exchangeRate.create({
        data: { baseCurrencyId: currency.currencyId, quoteCurrencyId: cup.currencyId, rate: dec(rate) },
      });
      await db.exchangeRateHistory.create({
        data: { exchangeRateId: created.exchangeRateId, oldRate: null, newRate: dec(rate), note: "Tasa inicial (seed)" },
      });
    }
  }

  // ----- Métodos de pago -----
  const paymentMethods = [
    { code: "cash-cup", name: "Efectivo CUP", kind: "cash_on_delivery", currencyId: cup.currencyId, requiresReference: false, instructions: "Pagas en efectivo al recibir el pedido.", sortOrder: 0 },
    { code: "cash-usd", name: "Efectivo USD", kind: "cash_on_delivery", currencyId: usd.currencyId, requiresReference: false, instructions: "Pagas en dólares al recibir el pedido, a la tasa del día.", sortOrder: 1 },
    { code: "transfer-cup", name: "Transferencia CUP", kind: "transfer", currencyId: cup.currencyId, requiresReference: true, instructions: "Transfiere a la cuenta 1234-5678-9012-3456 y escribe el número de transacción.", sortOrder: 2 },
  ] as const;
  for (const pm of fresh ? paymentMethods : []) {
    await db.paymentMethod.upsert({
      where: { code: pm.code },
      create: { ...pm },
      update: {},
    });
  }

  // ----- Usuarios -----
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash, fullName: "Administrador", role: "admin" },
    update: { role: "admin", isActive: true },
  });
  const courierUser = await db.user.upsert({
    where: { email: "mensajero@buchito.local" },
    create: { email: "mensajero@buchito.local", passwordHash, fullName: "Mensajero Demo", role: "courier" },
    update: { role: "courier", isActive: true },
  });
  const customerUser = await db.user.upsert({
    where: { email: "cliente@buchito.local" },
    create: { email: "cliente@buchito.local", passwordHash, fullName: "Cliente Demo", role: "customer" },
    update: { role: "customer", isActive: true },
  });

  // deliveryFee: lo que la tienda paga al mensajero por entrega (en CUP).
  await db.courier.upsert({
    where: { userId: courierUser.userId },
    create: { userId: courierUser.userId, phone: "+53 5 000 0001", vehicle: "motorcycle", deliveryFee: dec(300) },
    update: { deliveryFee: dec(300) },
  });

  // ----- Zonas -----
  const zones = [
    { name: "Centro", fee: 500, etaLabel: "Mismo día", sortOrder: 0 },
    { name: "Periferia", fee: 1000, etaLabel: "24-48 h", sortOrder: 1 },
  ];
  const zoneRows = [];
  for (const z of zones) {
    const existing = await db.deliveryZone.findUnique({ where: { name: z.name } });
    if (existing) zoneRows.push(existing);
    else if (fresh) {
      zoneRows.push(
        await db.deliveryZone.create({
          data: { name: z.name, fee: dec(z.fee), etaLabel: z.etaLabel, sortOrder: z.sortOrder },
        })
      );
    }
  }

  const customer = await db.customer.upsert({
    where: { userId: customerUser.userId },
    create: {
      userId: customerUser.userId,
      name: customerUser.fullName,
      phone: "+53 5 000 0002",
      normalizedPhone: "5350000002",
      email: customerUser.email,
    },
    update: {},
  });
  const hasAddress = await db.customerAddress.findFirst({ where: { customerId: customer.customerId } });
  if (!hasAddress && zoneRows[0]) {
    await db.customerAddress.create({
      data: {
        customerId: customer.customerId,
        label: "Casa",
        line1: "Calle 23 #456, apto 3",
        neighborhood: "Vedado",
        reference: "Edificio azul, timbre 3",
        zoneId: zoneRows[0].zoneId,
        isDefault: true,
      },
    });
  }

  // ----- Tipos de producto -----
  const generalType = await db.productType.upsert({
    where: { slug: "general" },
    create: { name: "General", slug: "general", attributeSchema: [] },
    update: {},
  });
  const clothingType = await db.productType.upsert({
    where: { slug: "ropa" },
    create: {
      name: "Ropa",
      slug: "ropa",
      attributeSchema: [
        { key: "talla", label: "Talla", kind: "select", options: ["S", "M", "L", "XL"], required: true, scope: "variant" },
        { key: "color", label: "Color", kind: "select", options: ["Negro", "Blanco", "Azul"], required: true, scope: "variant" },
        { key: "material", label: "Material", kind: "text", required: false, scope: "product" },
      ],
    },
    update: {},
  });

  // ----- Categorías -----
  const food = await db.category.upsert({
    where: { slug: "alimentos" },
    create: { name: "Alimentos", slug: "alimentos", sortOrder: 0 },
    update: {},
  });
  const clothing = await db.category.upsert({
    where: { slug: "ropa" },
    create: { name: "Ropa", slug: "ropa", sortOrder: 1 },
    update: {},
  });
  await db.category.upsert({
    where: { slug: "ropa-hombre" },
    create: { name: "Hombre", slug: "ropa-hombre", parentId: clothing.categoryId, sortOrder: 0 },
    update: {},
  });

  // ----- Productos -----
  const rice = await db.product.upsert({
    where: { slug: "arroz-blanco-1kg" },
    create: {
      typeId: generalType.typeId,
      categoryId: food.categoryId,
      slug: "arroz-blanco-1kg",
      name: "Arroz blanco 1 kg",
      description: "Arroz de grano largo, paquete de 1 kg.",
      status: "active",
      featured: true,
    },
    update: {},
  });
  // cost: precio de compra por unidad, para calcular la ganancia.
  const riceVariant = await db.productVariant.upsert({
    where: { sku: "ARZ-1KG" },
    create: {
      productId: rice.productId,
      sku: "ARZ-1KG",
      price: dec(850),
      priceCurrencyId: cup.currencyId,
      cost: dec(600),
      costCurrencyId: cup.currencyId,
      stock: 40,
      isDefault: true,
    },
    update: { cost: dec(600), costCurrencyId: cup.currencyId },
  });

  const oil = await db.product.upsert({
    where: { slug: "aceite-vegetal-1l" },
    create: {
      typeId: generalType.typeId,
      categoryId: food.categoryId,
      slug: "aceite-vegetal-1l",
      name: "Aceite vegetal 1 L",
      description: "Aceite vegetal de girasol, botella de 1 litro.",
      status: "active",
      featured: false,
    },
    update: {},
  });
  const oilVariant = await db.productVariant.upsert({
    where: { sku: "ACE-1L" },
    create: {
      productId: oil.productId,
      sku: "ACE-1L",
      price: dec(1300),
      compareAtPrice: dec(1500),
      priceCurrencyId: cup.currencyId,
      cost: dec(950),
      costCurrencyId: cup.currencyId,
      stock: 25,
      isDefault: true,
    },
    update: { cost: dec(950), costCurrencyId: cup.currencyId },
  });

  // Venta por peso: precio por kg, de cuarto en cuarto de kilo.
  const beans = await db.product.upsert({
    where: { slug: "frijol-negro" },
    create: {
      typeId: generalType.typeId,
      categoryId: food.categoryId,
      slug: "frijol-negro",
      name: "Frijol negro",
      description: "Frijol negro a granel. Se vende por kilogramo.",
      status: "active",
      featured: true,
    },
    update: {},
  });
  await db.productVariant.upsert({
    where: { sku: "FRI-NEG-KG" },
    create: {
      productId: beans.productId,
      sku: "FRI-NEG-KG",
      price: dec(1800),
      priceCurrencyId: cup.currencyId,
      cost: dec(1300),
      costCurrencyId: cup.currencyId,
      unit: "kg",
      qtyStep: dec("0.25"),
      stock: dec(30),
      isDefault: true,
    },
    update: { unit: "kg", qtyStep: dec("0.25") },
  });

  const shirt = await db.product.upsert({
    where: { slug: "camiseta-basica" },
    create: {
      typeId: clothingType.typeId,
      categoryId: clothing.categoryId,
      slug: "camiseta-basica",
      name: "Camiseta básica",
      description: "Camiseta de algodón, corte regular.",
      attributes: { material: "Algodón 100%" },
      status: "active",
      featured: true,
    },
    update: {},
  });
  // Precio en USD a propósito: prueba la conversión a CUP en el catálogo.
  const shirtVariants = [
    { sku: "CAM-NEG-M", name: "Negro / M", attributes: { talla: "M", color: "Negro" }, stock: 8, isDefault: true },
    { sku: "CAM-NEG-L", name: "Negro / L", attributes: { talla: "L", color: "Negro" }, stock: 3, isDefault: false },
    { sku: "CAM-BLA-M", name: "Blanco / M", attributes: { talla: "M", color: "Blanco" }, stock: 0, isDefault: false },
  ];
  for (const [i, v] of shirtVariants.entries()) {
    await db.productVariant.upsert({
      where: { sku: v.sku },
      create: {
        productId: shirt.productId,
        sku: v.sku,
        name: v.name,
        attributes: v.attributes,
        price: dec("12.50"),
        compareAtPrice: dec("15.00"),
        priceCurrencyId: usd.currencyId,
        cost: dec("7.80"),
        costCurrencyId: usd.currencyId,
        stock: v.stock,
        isDefault: v.isDefault,
        sortOrder: i,
      },
      update: { cost: dec("7.80"), costCurrencyId: usd.currencyId },
    });
  }

  // ----- Combos -----
  // 2 × arroz + 1 × aceite: por separado 3 000 CUP; el combo sale a 2 700.
  const basicCombo = await db.combo.upsert({
    where: { slug: "combo-basico" },
    create: {
      slug: "combo-basico",
      name: "Combo básico",
      description: "Dos paquetes de arroz y una botella de aceite para la semana.",
      price: dec(2700),
      priceCurrencyId: cup.currencyId,
      status: "active",
      featured: true,
    },
    update: {},
  });
  for (const [i, item] of [
    { variantId: riceVariant.variantId, qty: 2 },
    { variantId: oilVariant.variantId, qty: 1 },
  ].entries()) {
    await db.comboItem.upsert({
      where: { comboId_variantId: { comboId: basicCombo.comboId, variantId: item.variantId } },
      create: { comboId: basicCombo.comboId, variantId: item.variantId, qty: item.qty, sortOrder: i },
      update: { qty: item.qty, sortOrder: i },
    });
  }

  await db.documentSequence.upsert({
    where: { docType: "ORDER" },
    create: { docType: "ORDER", prefix: "PED-", lastNumber: 0, padLength: 5 },
    update: {},
  });

  console.log("Seed aplicado.");
  console.log(`  admin:     ${admin.email}`);
  console.log(`  mensajero: ${courierUser.email}`);
  console.log(`  cliente:   ${customerUser.email}`);
  console.log("  contraseña: la de SEED_ADMIN_PASSWORD para los tres");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

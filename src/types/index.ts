export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type {
  User,
  UserRole,
  Customer,
  Recipient,
  Currency,
  ExchangeRate,
  PaymentMethod,
  PaymentKind,
  PaymentStatus,
  OrderPayment,
  ProductType,
  Category,
  Product,
  ProductVariant,
  ProductStatus,
  Order,
  OrderLine,
  OrderStatus,
  FulfillmentType,
  DeliveryZone,
  Courier,
  Delivery,
  DeliveryStatus,
  DeliveryEvent,
  VehicleType,
} from "@/generated/prisma";

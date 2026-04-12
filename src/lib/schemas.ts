import { z } from "zod";

// Shared enums
const MarketplaceEnum = z.enum([
  "vinted", "ebay", "depop", "vestiaire", "wallapop", "subito", "facebook",
]);
const ConditionEnum = z.enum(["nwt", "nwot", "excellent", "good", "fair", "poor"]);
const ItemStatusEnum = z.enum(["draft", "listed", "sold"]);
const LocaleEnum = z.enum(["it", "en"]);

// /api/recognize POST
export const RecognizeBodySchema = z.object({
  imagePath: z.string().min(1, "imagePath required"),
});

// /api/items POST
export const CreateItemSchema = z.object({
  lot_id: z.string().uuid().nullable().optional(),
  item_type: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  era: z.string().nullable().optional(),
  era_style: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  condition: ConditionEnum.nullable().optional(),
  cogs: z.number().nullable().optional(),
  sale_price: z.number().nullable().optional(),
  shipping_cost: z.number().optional().default(0),
  marketplace: MarketplaceEnum.nullable().optional(),
  status: ItemStatusEnum.optional().default("draft"),
  description_it: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  recognition_raw: z.unknown().nullable().optional(),
  image_paths: z.array(z.string()).optional().default([]),
  tags: z.array(z.object({
    category: z.string(),
    value: z.string(),
  })).optional(),
});

// /api/items/[id] PUT
export const UpdateItemSchema = z.object({
  lot_id: z.string().uuid().nullable().optional(),
  item_type: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  era: z.string().nullable().optional(),
  era_style: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  condition: ConditionEnum.nullable().optional(),
  cogs: z.number().nullable().optional(),
  sale_price: z.number().nullable().optional(),
  sold_price: z.number().nullable().optional(),
  shipping_cost: z.number().optional(),
  marketplace: MarketplaceEnum.nullable().optional(),
  status: ItemStatusEnum.optional(),
  sold_at: z.string().nullable().optional(),
  description_it: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  image_paths: z.array(z.string()).optional(),
  tags: z.array(z.object({
    category: z.string(),
    value: z.string(),
  })).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

// /api/items/[id]/description POST
export const DescriptionBodySchema = z.object({
  marketplace: MarketplaceEnum.optional().default("vinted"),
  locale: LocaleEnum.optional().default("it"),
});

// /api/items/[id]/suggest-price POST
export const SuggestPriceBodySchema = z.object({
  marketplace: MarketplaceEnum.optional().default("vinted"),
});

// /api/lots POST
export const CreateLotSchema = z.object({
  name: z.string().min(1, "Lot name is required"),
  total_cogs: z.number().min(0),
  notes: z.string().nullable().optional(),
});

// /api/lots/[id] PUT
export const UpdateLotSchema = z.object({
  name: z.string().min(1, "Lot name is required"),
  total_cogs: z.number().min(0),
  notes: z.string().nullable().optional(),
  auto_split_cogs: z.boolean().optional(),
});

/** Helper: validate body with a zod schema; returns parsed data or a 400 NextResponse */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}

# VintageAgent Positioning Brief

## Value Proposition

One-liner: **AI-powered sales assistant that turns a pile of vintage clothes into priced, described, ready-to-list inventory in under 60 seconds per item.**

## Target User

Vintage resellers doing 20-200 items/month across European marketplaces (Vinted, eBay, Depop, Vestiaire, Wallapop, Subito, Facebook). Typically solo operators or micro-teams who source at flea markets, thrift stores, and wholesale lots. Their bottleneck is not sourcing -- it is cataloging, pricing, and writing compelling listings for each item.

## Competitive Differentiation

| Feature | VintageAgent | Vendoo | Crosslist | ListPerfectly |
|---------|-------------|--------|-----------|---------------|
| AI image recognition (type, brand, era, material, condition) | Yes (Claude Vision) | No | No | No |
| Era-specific copywriting (grunge, Y2K, mod, etc.) | Yes, per-marketplace | No | No | No |
| COGS / margin tracking per item and per lot | Yes, built-in | No | No | Basic |
| Cross-listing | Planned v1.0 | Core feature | Core feature | Core feature |
| Marketplace-optimized descriptions (IT + EN) | Yes, 7 marketplaces | Generic templates | No | No |

**Key differentiator:** Vendoo/Crosslist/ListPerfectly are cross-listing tools -- they assume you already have titles, descriptions, and prices. VintageAgent handles the upstream step: turning a photo into a complete, priced, marketplace-ready listing. They are complementary, not competing.

## Unit Economics

- Claude API cost per item: ~$0.03-0.06 (one Vision call for recognition + one text call for description + one text call for pricing)
- At $9/month SaaS price with 50 items/month usage: API cost ~$2.50, gross margin ~72%
- At $19/month SaaS price with 150 items/month usage: API cost ~$7.50, gross margin ~61%
- Break-even: any SaaS price above ~$5/month is profitable at typical usage

## Positioning Statement

For vintage clothing resellers who spend hours cataloging and pricing inventory, VintageAgent is the AI sales assistant that recognizes garments from photos, writes marketplace-optimized listings, and tracks margins -- so you can spend time sourcing, not typing.

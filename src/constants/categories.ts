export const CATEGORIES = [
  { id: "ids", name: "IDs" },
  { id: "wallets", name: "Wallets" },
  { id: "bags", name: "Bags" },
  { id: "electronics", name: "Electronics" },
  { id: "documents", name: "Documents" },
  { id: "keys", name: "Keys" },
  { id: "clothing", name: "Clothing" },
  { id: "others", name: "Others" },
];

export function getCategoryName(id: string) {
  return CATEGORIES.find((category) => category.id === id)?.name ?? "Others";
}

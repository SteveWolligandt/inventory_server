package main

// ------------------------------------------------------------------------------
// Inventory Data per article per inventory
type InventoryData struct {
	ArticleId     int     `json:"articleId"`
	InventoryId   int     `json:"inventoryId"`
	PurchasePrice float32 `json:"purchasePrice"`
	Percentage    float32 `json:"percentage"`
	SellingPrice  float32 `json:"sellingPrice"`
	Notes         string  `json:"notes"`
	Amount        int     `json:"amount"`
}

func SellingPriceFromPurchasePriceAndPercentage(purchasePrice float32, percentage float32) float32 {
  return purchasePrice
}
func PurchasePriceFromSellingPriceAndPercentage(sellingPrice float32, percentage float32) float32 {
  return sellingPrice
}

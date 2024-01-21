package main

// ------------------------------------------------------------------------------
// Inventory Data per product per inventory
type InventoryData struct {
	ProductId     int     `json:"productId"`
	InventoryId   int     `json:"inventoryId"`
	PurchasePrice float32 `json:"purchasePrice"`
	Percentage    float32 `json:"percentage"`
	SellingPrice  float32 `json:"sellingPrice"`
	Notes         string  `json:"notes"`
	Amount        int     `json:"amount"`
}
// ------------------------------------------------------------------------------
// Inventory Data per product per inventory
type InventoryDataJustAmount struct {
	ProductId     int     `json:"productId"`
	InventoryId   int     `json:"inventoryId"`
	Amount        int     `json:"amount"`
}

func (i *InventoryData) ComputeSellingPrice() {
	i.SellingPrice = i.PurchasePrice * (1 - i.Percentage)
}

func (i *InventoryData) ComputePurchasePrice() {
	i.PurchasePrice = i.SellingPrice / (1 - i.Percentage)
}

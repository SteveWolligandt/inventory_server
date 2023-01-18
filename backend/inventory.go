package main

// -----------------------------------------------------------------------------
type Inventory struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

// -----------------------------------------------------------------------------
type InventoryWithValue struct {
	Inventory
	Value float32 `json:"value"`
}

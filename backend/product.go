package main

// ------------------------------------------------------------------------------
type Product struct {
	Id            int     `json:"id"`
	CompanyId     int     `json:"companyId"`
	Name          string  `json:"name"`
	ImagePath     string  `json:"-"`
	Barcode       *string `json:"barcode"`
	ProductNumber string  `json:"productNumber"`
}

// ------------------------------------------------------------------------------
type ProductWithBarcodeOnly struct {
	Id      int    `json:"id"`
	Barcode string `json:"barcode"`
}

// ------------------------------------------------------------------------------
type ProductWithCompanyName struct {
	Product

	CompanyName string `json:"companyName"`
}

// ------------------------------------------------------------------------------
type ProductWithCompanyNameAndAmount struct {
	ProductWithCompanyName

	Amount int `json:"amount"`
}

// ------------------------------------------------------------------------------
type ProductWithInventoryData struct {
	Product

	PurchasePrice float32 `json:"purchasePrice"`
	Percentage    float32 `json:"percentage"`
	SellingPrice  float32 `json:"sellingPrice"`
	Notes         string  `json:"notes"`
	Amount        int     `json:"amount"`
}

func (a *ProductWithInventoryData) ComputeSellingPrice() {
	a.SellingPrice = a.PurchasePrice / (1 - a.Percentage/float32(100))
}

func (a *ProductWithInventoryData) ComputePurchasePrice() {
	a.PurchasePrice = a.SellingPrice * (1 - a.Percentage/float32(100))
}

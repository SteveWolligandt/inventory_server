package main

// ------------------------------------------------------------------------------
type Article struct {
	Id            int     `json:"id"`
	CompanyId     int     `json:"companyId"`
	Name          string  `json:"name"`
	ImagePath     string  `json:"-"`
	Barcode       *string `json:"barcode"`
	ArticleNumber string  `json:"articleNumber"`
}

// ------------------------------------------------------------------------------
type ArticleWithBarcodeOnly struct {
	Id      int    `json:"id"`
	Barcode string `json:"barcode"`
}

// ------------------------------------------------------------------------------
type ArticleWithCompanyName struct {
	Article

	CompanyName string `json:"companyName"`
}

// ------------------------------------------------------------------------------
type ArticleWithCompanyNameAndAmount struct {
	ArticleWithCompanyName

	Amount int `json:"amount"`
}

// ------------------------------------------------------------------------------
type ArticleWithInventoryData struct {
	Article

	PurchasePrice float32 `json:"purchasePrice"`
	Percentage    float32 `json:"percentage"`
	SellingPrice  float32 `json:"sellingPrice"`
	Notes         string  `json:"notes"`
	Amount        int     `json:"amount"`
}

func (a *ArticleWithInventoryData) ComputeSellingPrice() {
	a.SellingPrice = a.PurchasePrice / (1 - a.Percentage/float32(100))
}

func (a *ArticleWithInventoryData) ComputePurchasePrice() {
	a.PurchasePrice = a.SellingPrice * (1 - a.Percentage/float32(100))
}

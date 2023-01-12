package main

// ------------------------------------------------------------------------------
// Article
type Article struct {
	Id            int    `json:"id"`
	CompanyId     int    `json:"companyId"`
	Name          string `json:"name"`
	ImagePath     string `json:"-"`
	Barcode       *int   `json:"barcode"`
	ArticleNumber string `json:"articleNumber"`
}

// ------------------------------------------------------------------------------
// Article
type ArticleWithInventoryData struct {
	Id            int     `json:"id"`
	CompanyId     int     `json:"companyId"`
	Name          string  `json:"name"`
	ImagePath     string  `json:"-"`
	Barcode       *int    `json:"barcode"`
	ArticleNumber string  `json:"articleNumber"`
	PurchasePrice float32 `json:"purchasePrice"`
	Percentage    float32 `json:"percentage"`
	SellingPrice  float32 `json:"sellingPrice"`
	Notes         string  `json:"notes"`
	Amount        int     `json:"amount"`
}

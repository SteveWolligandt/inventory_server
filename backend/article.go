package main
//------------------------------------------------------------------------------
// Article - Our struct for all articles
type Article struct {
  Id             int     `json:"id"`
  CompanyId      int     `json:"companyId"`
  Name           string  `json:"name"`
  ImagePath      string  `json:"-"`
  Barcode       *int     `json:"barcode"`
  PurchasePrice  float32 `json:"purchasePrice"`
  Percentage     float32 `json:"percentage"`
  SellingPrice   float32 `json:"sellingPrice"`
}
//------------------------------------------------------------------------------
// Article - Our struct for all articles
type ArticleWithAmount struct {
  Id             int     `json:"id"`
  CompanyId      int     `json:"companyId"`
  Name           string  `json:"name"`
  ImagePath      string  `json:"-"`
  Barcode       *int     `json:"barcode"`
  PurchasePrice  float32 `json:"purchasePrice"`
  Percentage     float32 `json:"percentage"`
  SellingPrice   float32 `json:"sellingPrice"`
  Amount         int     `json:"amount"`
}

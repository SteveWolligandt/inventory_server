package main
//------------------------------------------------------------------------------
// Company - Our struct for all articles
type Amount struct {
  ArticleId   int `json:"articleId"`
  InventoryId int `json:"inventoryId"`
  Amount      int `json:"amount"`
}

package main
//------------------------------------------------------------------------------
// Article - Our struct for all articles
type Article struct {
  Id   int `json:"id"`
  Name string `json:"name"`
  CompanyId int `json:"companyId"`
}

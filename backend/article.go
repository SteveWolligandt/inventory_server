package main
//------------------------------------------------------------------------------
// Article - Our struct for all articles
type Article struct {
  Id   int `json:"id"`
  Name string `json:"name"`
}
//------------------------------------------------------------------------------
// Article - Our struct for all articles
type ArticleWithCompany struct {
  Id        int `json:"id"`
  CompanyId int `json:"companyId"`
  Name      string `json:"name"`
}


package main
//------------------------------------------------------------------------------
// Company - Our struct for all articles
type Company struct {
  Id   int `json:"id"`
  Name string `json:"name"`
  Articles [] Article `json:"articles"`
}

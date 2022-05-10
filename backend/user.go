package main
//------------------------------------------------------------------------------
// Article - Our struct for all articles
type User struct {
  Id   int `json:"id"`
  Name string `json:"name"`
  HashedPassword string `json:"-"`
  Salt string `json:"-"`
}

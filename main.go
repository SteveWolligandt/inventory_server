package main

import (
  "encoding/json"
  "fmt"
  "log"
  "io/ioutil"
  "net/http"
  "database/sql"

  _ "github.com/go-sql-driver/mysql"
  "github.com/gorilla/mux"
)

var db *sql.DB // Database connection pool.

// Article - Our struct for all articles
type Article struct {
  Id      string `json:"id"`
  Name   string `json:"name"`
}
//------------------------------------------------------------------------------
func homePage(w http.ResponseWriter, r *http.Request) {
  fmt.Fprintf(w, "<html><body>")
  fmt.Fprintf(w, "<table><tr><th>Id</th><th>Name</th></tr>")


  rows, err := db.Query("SELECT * FROM articles")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    err = rows.Scan(&article.Id, &article.Name)
    if err != nil {
        panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    fmt.Fprintf(w, "<tr>")
    fmt.Fprintf(w, "<td>")
    fmt.Fprintf(w, article.Id)
    fmt.Fprintf(w, "</td>")
    fmt.Fprintf(w, "<td>")
    fmt.Fprintf(w, article.Name)
    fmt.Fprintf(w, "</td>")
    fmt.Fprintf(w, "</tr>")
  }

  fmt.Fprintf(w, "</table>")
  fmt.Fprintf(w, "</body></html>")
  fmt.Println("Endpoint Hit: homePage")

}
//------------------------------------------------------------------------------
func sendPdf(w http.ResponseWriter, r *http.Request) {
  filename := buildPdf(db)
  fileBytes, err := ioutil.ReadFile(filename)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  w.Write(fileBytes)
  w.Header().Set("Content-Type", "application/pdf")
}
//------------------------------------------------------------------------------
func returnAllArticles(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: returnAllArticles")
  // Execute the query
  rows, err := db.Query("SELECT * FROM articles")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  var articles [] Article
  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    err = rows.Scan(&article.Id, &article.Name)
    if err != nil {
        panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    articles = append(articles, article)
  }
  json.NewEncoder(w).Encode(articles)
}
//------------------------------------------------------------------------------
func returnSingleArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  key := vars["id"]

  q := fmt.Sprintf("SELECT * FROM articles WHERE id = %v", key)
  fmt.Println(q)

  rows, err := db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    err = rows.Scan(&article.Id, &article.Name)
    if err != nil {
        panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    json.NewEncoder(w).Encode(article)
  }
}
//------------------------------------------------------------------------------
func createNewArticle(w http.ResponseWriter, r *http.Request) {
  // get the body of our POST request
  // unmarshal this into a new Article struct
  // append this to our Articles array.    
  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)
  // update our global Articles array to include
  // our new Article

  q := fmt.Sprintf("INSERT INTO articles (Name) VALUES ('%v')", article.Name)
  fmt.Println(q)

  _, err := db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func deleteArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  id := vars["id"]

  q := fmt.Sprintf("DELETE FROM articles WHERE id =%v", id)
  fmt.Println(q)

  _, err := db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func handleRequests() {
  router := mux.NewRouter().StrictSlash(true)
  router.HandleFunc("/", homePage)
  router.HandleFunc("/pdf", sendPdf)
  router.HandleFunc("/articles", returnAllArticles)
  router.HandleFunc("/article", createNewArticle).Methods("POST")
  router.HandleFunc("/article/{id}", deleteArticle).Methods("DELETE")
  router.HandleFunc("/article/{id}", returnSingleArticle)
  log.Fatal(http.ListenAndServe(":3000", router))
}
//------------------------------------------------------------------------------
func main() {
  var err error
  db, err = sql.Open("mysql", "inventory:@tcp(127.0.0.1:3306)/inventory")
  // if there is an error opening the connection, handle it
  if err != nil {
      panic(err.Error())
  }
  // defer the close till after the main function has finished
  // executing
  defer db.Close()

  handleRequests()
}

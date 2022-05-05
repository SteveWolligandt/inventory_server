package main

import (
  "encoding/json"
  "fmt"
  "log"
  "io/ioutil"
  "net/http"
  "database/sql"
  "html/template"

  _ "github.com/go-sql-driver/mysql"
  "github.com/gorilla/mux"
)

var db *sql.DB // Database connection pool.

//------------------------------------------------------------------------------
// Company - Our struct for all articles
type Company struct {
  Id   int `json:"id"`
  Name string `json:"name"`
}
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
//------------------------------------------------------------------------------
func homePage(w http.ResponseWriter, r *http.Request) {
  t, err := template.ParseFiles("public/index.html")
  if err != nil {
    fmt.Println(err)
  }
  t.Execute(w, nil)
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
  rows, err := db.Query("SELECT id, name FROM articles")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  var articles [] Article
  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    if err = rows.Scan(&article.Id, &article.Name); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    articles = append(articles, article)
  }
  json.NewEncoder(w).Encode(articles)
}
//------------------------------------------------------------------------------
func returnAllCompanies(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: returnAllCompanies")
  // Execute the query
  rows, err := db.Query("SELECT id, name FROM companies")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  var companies [] Company
  for rows.Next() {
    var company Company
    // for each row, scan the result into our tag composite object
    if err = rows.Scan(&company.Id, &company.Name); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    companies = append(companies, company)
  }
  json.NewEncoder(w).Encode(companies)
}
//------------------------------------------------------------------------------
func returnArticlesOfCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  key := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM articles WHERE companyId = %v", key)
  fmt.Println(q)

  rows, err := db.Query(q)
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

  q := fmt.Sprintf("SELECT id, name FROM articles WHERE id = %v", key)
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
  var article ArticleWithCompany 
  json.Unmarshal(reqBody, &article)

  // update our global Articles array to include
  // our new Article
  var q string
  if article.CompanyId != 0 {
    q = fmt.Sprintf("INSERT INTO articles (name, companyId) VALUES ('%v', %v)",
                    article.Name, article.CompanyId)
  } else {
    q = fmt.Sprintf("INSERT INTO articles (name) VALUES ('%v')", article.Name)
  }

  fmt.Println(q)

  _, err := db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func createNewCompany(w http.ResponseWriter, r *http.Request) {
  // get the body of our POST request
  // unmarshal this into a new Company struct
  // append this to our Articles array.    
  reqBody, _ := ioutil.ReadAll(r.Body)
  var company Company 
  json.Unmarshal(reqBody, &company)
  // update our global Articles array to include
  // our new Company

  q := fmt.Sprintf("INSERT INTO companies (Name) VALUES ('%v')", company.Name)
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
  router.PathPrefix("/").Handler(http.FileServer(http.Dir("./public")))
  router.HandleFunc("/pdf", sendPdf)
  router.HandleFunc("/rest/companies", returnAllCompanies)
  router.HandleFunc("/rest/articles", returnAllArticles)
  router.HandleFunc("/rest/article", createNewArticle).Methods("POST")
  router.HandleFunc("/rest/company", createNewCompany).Methods("POST")
  router.HandleFunc("/rest/company/{id}/articles", returnArticlesOfCompany)
  router.HandleFunc("/rest/article/{id}", deleteArticle).Methods("DELETE")
  router.HandleFunc("/rest/article/{id}", returnSingleArticle)
  log.Fatal(http.ListenAndServe(":8080", router))
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

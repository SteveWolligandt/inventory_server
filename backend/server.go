package main

import (
  "encoding/json"
  "fmt"
  "log"
  "io/ioutil"
  "strconv"
  "net/http"
  "database/sql"
  "html/template"
  
  "github.com/gorilla/websocket"
  "github.com/gorilla/mux"

  _ "github.com/go-sql-driver/mysql"
)
//------------------------------------------------------------------------------
type Server struct {
  db      *sql.DB
  router  *mux.Router
  clients map[*websocket.Conn]bool
}
//------------------------------------------------------------------------------
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // Accepting all requests
    },
}
//------------------------------------------------------------------------------
func (s *Server) homePage(w http.ResponseWriter, r *http.Request) {
  t, err := template.ParseFiles("public/index.html")
  if err != nil {
    fmt.Println(err)
  }
  t.Execute(w, nil)
}
//------------------------------------------------------------------------------
func (s *Server) sendPdf(w http.ResponseWriter, r *http.Request) {
  filename := buildPdf(s.db)
  fileBytes, err := ioutil.ReadFile(filename)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  w.Write(fileBytes)
  w.Header().Set("Content-Type", "application/pdf")
}
//------------------------------------------------------------------------------
func (s *Server) returnAllArticles(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: returnAllArticles")
  // Execute the query
  rows, err := s.db.Query("SELECT id, name, purchasePrice, percentage, barcode FROM articles")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  var articles [] Article
  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    if err = rows.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
    article.SellingPrice = article.PurchasePrice * (article.Percentage/100 + 1)
            // and then print out the tag's Name attribute
    articles = append(articles, article)
  }
  fmt.Println(articles)
  json.NewEncoder(w).Encode(articles)
}
//------------------------------------------------------------------------------
func (s *Server) returnSingleArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  articleId := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM articles WHERE id = %v", articleId)
  fmt.Println(q)

  rows, err := s.db.Query(q)
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
func (s *Server) createNewArticle(w http.ResponseWriter, r *http.Request) {
  // extract article from json response
  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)

  fmt.Println(article)

  // create new article in database
  dbErr := s.db.QueryRow(
    fmt.Sprintf("INSERT INTO articles (name, companyId, purchasePrice, percentage) VALUES ('%v', %v, %v, %v) RETURNING id",
                article.Name, article.CompanyId, article.PurchasePrice, article.Percentage)).Scan(&article.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }
  // create new amount for new articles in database
  _, dbErr = s.db.Query("INSERT INTO amounts (articleId, inventoryId) SELECT ? as articleId, id as inventoryId FROM inventories", article.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }

  article.SellingPrice = article.PurchasePrice * (article.Percentage/100 + 1)
  marshaledArticle, marshalErr := json.Marshal(article)
  if marshalErr != nil {
    panic(marshalErr.Error()) // proper error handling instead of panic in your app
  }
  fmt.Println(string(marshaledArticle))
  action := fmt.Sprintf("{\"action\":\"newArticle\", \"data\":%v}", string(marshaledArticle))
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) updateArticle(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: updateArticle")
  vars := mux.Vars(r)

  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)
 var strConvErr error
  article.Id, strConvErr = strconv.Atoi(vars["id"])
  if (strConvErr != nil) {
    panic(strConvErr.Error())
  }

  q := fmt.Sprintf("UPDATE articles SET name = '%v', purchasePrice = %v, percentage = %v WHERE id = %v", article.Name, article.PurchasePrice, article.Percentage, article.Id)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  article.SellingPrice = article.PurchasePrice * (article.Percentage/100 + 1)
  marshaledArticle, marshalErr := json.Marshal(article)
  if marshalErr != nil {
    panic(marshalErr.Error()) // proper error handling instead of panic in your app
  }
  fmt.Println(string(marshaledArticle))
  action := fmt.Sprintf("{\"action\":\"updateArticle\", \"data\":%v}", string(marshaledArticle))
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server)deleteArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  articleId := vars["id"]

  // delete amounts of article
  _, deleteAmountsErr := s.db.Query("DELETE FROM amounts WHERE articleId =?", articleId)
  if deleteAmountsErr != nil {
    panic(deleteAmountsErr.Error()) // proper error handling instead of panic in your app
  }
  _, deleteArticlesErr := s.db.Query("DELETE FROM articles WHERE id =?", articleId)
  if deleteArticlesErr != nil {
    panic(deleteArticlesErr.Error()) // proper error handling instead of panic in your app
  }


  action := fmt.Sprintf("{\"action\":\"deleteArticle\", \"data\":{\"id\":%v}}", articleId)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) returnAllCompanies(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: returnAllCompanies")
  // Execute the query
  rows, err := s.db.Query("SELECT id, name FROM companies")
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
func (s *Server) returnArticlesOfCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  companyId := vars["id"]

  q := fmt.Sprintf("SELECT id, name, purchasePrice, percentage, barcode FROM articles WHERE companyId = %v", companyId)
  fmt.Println(q)
  rows, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  var articles [] Article
  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    err := rows.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode)
    if err != nil {
        panic(err.Error()) // proper error handling instead of panic in your app
    }
    article.SellingPrice = article.PurchasePrice * (article.Percentage/100 + 1)
    // and then print out the tag's Name attribute
    articles = append(articles, article)
  }
    json.NewEncoder(w).Encode(articles)
}
//------------------------------------------------------------------------------
func (s *Server) returnSingleCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  companyId := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM companies WHERE id = %v", companyId)
  fmt.Println(q)

  rows, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  for rows.Next() {
    var company Company
    // for each row, scan the result into our tag composite object
    err = rows.Scan(&company.Id, &company.Name)
    if err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    json.NewEncoder(w).Encode(company)
  }
}
//------------------------------------------------------------------------------
func (s *Server) createNewCompany(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: createNewCompany")
  // get the body of our POST request
  // unmarshal this into a new Company struct
  // append this to our Articles array.    
  reqBody, _ := ioutil.ReadAll(r.Body)
  var company Company 
  json.Unmarshal(reqBody, &company)
  // update our global Articles array to include
  // our new Company

  q := fmt.Sprintf("INSERT INTO companies (Name) VALUES ('%v') RETURNING id", company.Name)
  fmt.Println(q)

  id := 0
  dbErr := s.db.QueryRow(q).Scan(&id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"newCompany\", \"data\":{\"id\":%v, \"name\":\"%v\"}}", id, company.Name)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) updateCompany(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: updateCompany")
  vars := mux.Vars(r)
  id := vars["id"]

  reqBody, _ := ioutil.ReadAll(r.Body)
  var company Company 
  json.Unmarshal(reqBody, &company)

  q := fmt.Sprintf("UPDATE companies SET name = '%v' WHERE id = %v", company.Name, id)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"updateCompany\", \"data\":{\"id\":%v, \"name\":\"%v\"}}", id, company.Name)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
// server-related
//------------------------------------------------------------------------------
func (s *Server)deleteCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  companyId := vars["id"]
  // delete all amounts of all articles of company
  _, amountsDeleteErr := s.db.Query("DELETE amounts FROM articles JOIN amounts ON amounts.articleId = articles.id WHERE companyId = ?", companyId)
  if amountsDeleteErr != nil {
    panic(amountsDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  _, articlesDeleteErr := s.db.Query("DELETE FROM articles WHERE companyId =%?", companyId)
  if articlesDeleteErr != nil {
    panic(articlesDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  _, companiesDeleteErr := s.db.Query("DELETE FROM companies WHERE id =?", companyId)
  if companiesDeleteErr != nil {
    panic(companiesDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"deleteCompany\", \"data\":{\"id\":%v}}", companyId)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
// server-related
//------------------------------------------------------------------------------
func (s *Server)returnAllInventories(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: returnAllInventories")
  // Execute the query
  rows, err := s.db.Query("SELECT id, name FROM inventories")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  var inventories [] Inventory
  for rows.Next() {
    var inventory Inventory
    // for each row, scan the result into our tag composite object
    if err = rows.Scan(&inventory.Id, &inventory.Name); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    inventories = append(inventories, inventory)
  }
  json.NewEncoder(w).Encode(inventories)
}
//------------------------------------------------------------------------------
func (s *Server)returnSingleInventory(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryId := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM inventories WHERE id = %v", inventoryId)
  fmt.Println(q)

  rows, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  for rows.Next() {
    var inventory Inventory
    // for each row, scan the result into our tag composite object
    err = rows.Scan(&inventory.Id, &inventory.Name)
    if err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    json.NewEncoder(w).Encode(inventory)
  }
}
//------------------------------------------------------------------------------
func (s *Server) createNewInventory (w http.ResponseWriter, r *http.Request) {
  reqBody, _ := ioutil.ReadAll(r.Body)
  var inventory Inventory 
  json.Unmarshal(reqBody, &inventory)

  
  dbErr := s.db.QueryRow(fmt.Sprintf("INSERT INTO inventories (name) VALUES ('%v') RETURNING id", inventory.Name)).Scan(&inventory.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }

  // create new amount for new articles in database
  _, dbErr = s.db.Query("INSERT INTO amounts (articleId, inventoryId) SELECT id as articleId, ? as inventoryId FROM articles", inventory.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }

  action := fmt.Sprintf(
    "{\"action\":\"newInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
    inventory.Id, inventory.Name)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server)updateInventory(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: updateInventory")
  vars := mux.Vars(r)
  id := vars["id"]

  reqBody, _ := ioutil.ReadAll(r.Body)
  var inventory Inventory 
  json.Unmarshal(reqBody, &inventory)

  q := fmt.Sprintf(
    "UPDATE inventories SET name = '%v' WHERE id = %v",
    inventory.Name, id)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf(
    "{\"action\":\"updateInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
    id, inventory.Name)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server)deleteInventory(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryId := vars["id"]


  // delete amounts of inventory
  _, amountsDeleteErr := s.db.Query("DELETE FROM amounts WHERE articleId =?", inventoryId)
  if amountsDeleteErr != nil {
    panic(amountsDeleteErr.Error()) // proper error handling instead of panic in your app
  }

  _, inventoryDeleteErr := s.db.Query("DELETE FROM inventories WHERE id =?", inventoryId)
  if inventoryDeleteErr != nil {
    panic(inventoryDeleteErr.Error()) // proper error handling instead of panic in your app
  }

  // handle websocket
  action := fmt.Sprintf("{\"action\":\"deleteInventory\", \"data\":{\"id\":%v}}", inventoryId)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server)returnInventoryAmounts(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  id := vars["id"]

  q := fmt.Sprintf("SELECT * FROM amounts WHERE inventoryId =%v", id)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func (s *Server)returnInventoryAmountOfArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryId := vars["inventoryId"]
  articleId := vars["articleId"]

  q := fmt.Sprintf(
    "SELECT * FROM amounts WHERE inventoryId =%v AND articleId =%v ",
    inventoryId, articleId)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func (s *Server)returnInventoryOfCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryId := vars["inventoryId"]
  companyId := vars["companyId"]

  q := fmt.Sprintf(
    "SELECT articles.id, articles.name, articles.purchasePrice, articles.percentage, articles.barcode, amounts.amount FROM amounts JOIN articles ON amounts.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = amounts.inventoryId WHERE inventories.id = %v AND companies.id = %v",
    inventoryId, companyId)

  amountsPerArticle, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  var articlesWithAmount [] ArticleWithAmount
  for amountsPerArticle.Next() {
    var articleWithAmount ArticleWithAmount
    // for each row, scan the result into our tag composite object
    if err = amountsPerArticle.Scan(&articleWithAmount.Id, &articleWithAmount.Name, &articleWithAmount.PurchasePrice, &articleWithAmount.Percentage, &articleWithAmount.Barcode, &articleWithAmount.Amount); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
    articlesWithAmount = append(articlesWithAmount, articleWithAmount)
  }
  json.NewEncoder(w).Encode(articlesWithAmount)
}
//------------------------------------------------------------------------------
func (s* Server) handleRequests() {
  s.router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "../frontend/build/index.html")
  })

  // frontend
  s.router.HandleFunc("/ws", s.handleWebsocket)

  s.router.PathPrefix("/static").Handler(
    http.StripPrefix(
      "/static",
      http.FileServer(
        http.Dir("../frontend/build/static"))))

  // pdf
  s.router.HandleFunc(
      "/pdf",
      s.sendPdf).
    Methods("GET")

  // company-related
  s.router.HandleFunc(
      "/api/companies",
      s.returnAllCompanies).
    Methods("GET")

  s.router.HandleFunc(
      "/api/company",
      s.createNewCompany).
    Methods("POST")

  s.router.HandleFunc(
      "/api/company/{id}",
      s.returnSingleCompany).
    Methods("GET")

  s.router.HandleFunc(
      "/api/company/{id}",
      s.updateCompany).
    Methods("PUT")

  s.router.HandleFunc(
      "/api/company/{id}",
      s.deleteCompany).
    Methods("DELETE")

  // article-related
  s.router.HandleFunc(
      "/api/articles",
      s.returnAllArticles).
    Methods("GET")

  s.router.HandleFunc(
      "/api/article",
      s.createNewArticle).
    Methods("POST")

  s.router.HandleFunc(
      "/api/company/{id}/articles",
      s.returnArticlesOfCompany).
    Methods("GET")

  s.router.HandleFunc(
      "/api/article/{id}",
      s.updateArticle).
    Methods("PUT")

  s.router.HandleFunc(
      "/api/article/{id}",
      s.deleteArticle).
    Methods("DELETE")

  s.router.HandleFunc(
      "/api/article/{id}",
      s.returnSingleArticle).
    Methods("GET")

  // inventory-related
  s.router.HandleFunc(
      "/api/inventories",
      s.returnAllInventories).
    Methods("GET")

  s.router.HandleFunc(
      "/api/inventory",
      s.createNewInventory).
    Methods("POST")

  s.router.HandleFunc(
      "/api/inventory/{id}",
      s.updateInventory).
    Methods("PUT")

  s.router.HandleFunc(
      "/api/inventory/{id}",
      s.deleteInventory).
    Methods("DELETE")

  s.router.HandleFunc(
      "/api/inventory/{id}",
      s.returnSingleInventory).
    Methods("GET")

  s.router.HandleFunc(
      "/api/inventory/{id}/amounts",
      s.returnInventoryAmounts).
    Methods("GET")

  s.router.HandleFunc(
      "/api/inventory/{inventoryId}/amounts/{articleId}",
      s.returnInventoryAmountOfArticle).
    Methods("GET")

  s.router.HandleFunc(
      "/api/company/{companyId}/inventory/{inventoryId}",
      s.returnInventoryOfCompany).
    Methods("GET")
}
//------------------------------------------------------------------------------
func (s *Server) handleWebsocket(w http.ResponseWriter, r *http.Request) {
  connection, _ := upgrader.Upgrade(w, r, nil)

  s.clients[connection] = true // Save the connection using it as a key

  for {
    mt, _, err := connection.ReadMessage()

    if err != nil || mt == websocket.CloseMessage {
      break // Exit the loop if the client tries to close the connection or the connection is interrupted
    }
  }

  delete(s.clients, connection) // Removing the connection
  connection.Close()
}
//------------------------------------------------------------------------------
func (s *Server) writeMessage(message []byte) {
  for conn := range s.clients {
    conn.WriteMessage(websocket.TextMessage, message)
  }
}
//------------------------------------------------------------------------------
func (s *Server) Start() {
  log.Fatal(http.ListenAndServe(":8080", s.router))
}
//------------------------------------------------------------------------------
func (s *Server) Close() {
  s.db.Close()
}
//------------------------------------------------------------------------------
func NewServer() *Server {
  db, dbErr := sql.Open("mysql", "inventory:@tcp(127.0.0.1:3306)/inventory")
  
  // if there is an error opening the connection, handle it
  if dbErr != nil {
    panic(dbErr.Error())
  }

  s := new (Server)
  s.db = db
  s.router = mux.NewRouter().StrictSlash(true)
  s.clients = make(map[*websocket.Conn]bool)
  s.handleRequests()
  return s
}

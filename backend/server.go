package main

import (
  "encoding/json"
  "fmt"
  "log"
  "io/ioutil"
  "strconv"
  "net/http"
  "html/template"
  
  "github.com/gorilla/websocket"
  "github.com/gorilla/mux"

  _ "github.com/go-sql-driver/mysql"
)
//------------------------------------------------------------------------------
type Server struct {
  db      *Database
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
    panic(err.Error())
  }
  t.Execute(w, nil)
}
//------------------------------------------------------------------------------
func (s *Server) pdf(w http.ResponseWriter, r *http.Request) {
  filename := buildPdf(s.db)
  fileBytes, err := ioutil.ReadFile(filename)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  w.Write(fileBytes)
  w.Header().Set("Content-Type", "application/pdf")
}
//------------------------------------------------------------------------------
func (s *Server) articles(w http.ResponseWriter, r *http.Request) {
  articles := s.db.articles()
  json.NewEncoder(w).Encode(articles)
}
//------------------------------------------------------------------------------
func (s *Server) article(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  articleIdStr := vars["id"]
  articleId, err := strconv.Atoi(articleIdStr)
  if err != nil { panic(err.Error()) }
  article := s.db.article(articleId)
  json.NewEncoder(w).Encode(article)
}
//------------------------------------------------------------------------------
func (s *Server) createArticle(w http.ResponseWriter, r *http.Request) {
  // extract article from json response
  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)

  // create new article in database
  article = s.db.createArticle(article.Name, article.CompanyId, article.PurchasePrice, article.Percentage, article.ArticleNumber)
  marshaledArticle, marshalErr := json.Marshal(article)
  if marshalErr != nil {
    panic(marshalErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"newArticle\", \"data\":%v}", string(marshaledArticle))
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) updateArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)

  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)
  var strConvErr error
  article.Id, strConvErr = strconv.Atoi(vars["id"])
  if (strConvErr != nil) {
    panic(strConvErr.Error())
  }

  s.db.updateArticle(article)
  marshaledArticle, marshalErr := json.Marshal(article)
  if marshalErr != nil {
    panic(marshalErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"updateArticle\", \"data\":%v}", string(marshaledArticle))
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) deleteArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  articleIdStr := vars["id"]
  articleId, err := strconv.Atoi(articleIdStr)
  if err != nil { panic(err.Error()) }
  s.db.deleteArticle(articleId)
  action := fmt.Sprintf("{\"action\":\"deleteArticle\", \"data\":{\"id\":%v}}", articleId)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) companies(w http.ResponseWriter, r *http.Request) {
  // Execute the query
  companies := s.db.companies()
  json.NewEncoder(w).Encode(companies)
}
//------------------------------------------------------------------------------
func (s *Server) articlesOfCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  companyIdStr := vars["id"]
  companyId, err := strconv.Atoi(companyIdStr)
  if err != nil { panic(err.Error()) }
  articles := s.db.articlesOfCompany(companyId)
  json.NewEncoder(w).Encode(articles)
}
//------------------------------------------------------------------------------
func (s *Server) company(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  companyIdStr := vars["id"]
  companyId, err := strconv.Atoi(companyIdStr)
  if err != nil { panic(err.Error()) }

  company := s.db.company(companyId)
  json.NewEncoder(w).Encode(company)
}
//------------------------------------------------------------------------------
func (s *Server) createCompany(w http.ResponseWriter, r *http.Request) {
  // get the body of our POST request
  // unmarshal this into a new Company struct
  // append this to our Articles array.    
  reqBody, _ := ioutil.ReadAll(r.Body)
  var company Company 
  json.Unmarshal(reqBody, &company)

  s.db.createCompany(company.Name)
  action := fmt.Sprintf("{\"action\":\"newCompany\", \"data\":{\"id\":%v, \"name\":\"%v\"}}", company.Id, company.Name)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) updateCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)

  reqBody, _ := ioutil.ReadAll(r.Body)
  var company Company 
  json.Unmarshal(reqBody, &company)
  companyIdStr := vars["id"]
  var err error
  company.Id, err = strconv.Atoi(companyIdStr)
  if err != nil { panic(err.Error()) }

  s.db.updateCompany(company)
  action := fmt.Sprintf("{\"action\":\"updateCompany\", \"data\":{\"id\":%v, \"name\":\"%v\"}}", company.Id, company.Name)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
// server-related
//------------------------------------------------------------------------------
func (s *Server) deleteCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  companyIdStr := vars["id"]
  companyId, err := strconv.Atoi(companyIdStr)
  if err != nil { panic(err.Error()) }
  s.db.deleteCompany(companyId)
  action := fmt.Sprintf("{\"action\":\"deleteCompany\", \"data\":{\"id\":%v}}", companyId)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
// amount-related
//------------------------------------------------------------------------------
func (s *Server) updateAmount(w http.ResponseWriter, r *http.Request)  {
  reqBody, _ := ioutil.ReadAll(r.Body)
  var amount Amount 
  json.Unmarshal(reqBody, &amount)

  s.db.updateAmount(amount)
  marshaledAmount, marshalErr := json.Marshal(amount)
  if marshalErr != nil {
    panic(marshalErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"updateAmount\", \"data\":%v}", string(marshaledAmount))
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
// inventory-related
//------------------------------------------------------------------------------
func (s *Server) inventories(w http.ResponseWriter, r *http.Request) {
  inventories := s.db.inventories()
  json.NewEncoder(w).Encode(inventories)
}
//------------------------------------------------------------------------------
func (s *Server) singleInventory(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryIdStr := vars["id"]
  inventoryId, err := strconv.Atoi(inventoryIdStr)
  if err != nil { panic(err.Error()) }
  inventory := s.db.inventory(inventoryId)
  json.NewEncoder(w).Encode(inventory)
}
//------------------------------------------------------------------------------
func (s *Server) createInventory (w http.ResponseWriter, r *http.Request) {
  reqBody, _ := ioutil.ReadAll(r.Body)
  var inventory Inventory 
  json.Unmarshal(reqBody, &inventory)
  
  s.db.createInventory(inventory.Name)
  json.NewEncoder(w).Encode(inventory)

  action := fmt.Sprintf(
    "{\"action\":\"newInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
    inventory.Id, inventory.Name)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) updateInventory(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  idStr := vars["id"]
  var err error

  reqBody, _ := ioutil.ReadAll(r.Body)
  var inventory Inventory 
  json.Unmarshal(reqBody, &inventory)
  inventory.Id, err = strconv.Atoi(idStr)
  if err != nil { panic(err.Error()) }

  s.db.updateInventory(inventory)

  action := fmt.Sprintf(
    "{\"action\":\"updateInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
    inventory.Id, inventory.Name)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) deleteInventory(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryIdStr := vars["id"]
  inventoryId, err := strconv.Atoi(inventoryIdStr)
  if err != nil { panic(err.Error()) }

  s.db.deleteInventory(inventoryId)

  // handle websocket
  action := fmt.Sprintf("{\"action\":\"deleteInventory\", \"data\":{\"id\":%v}}", inventoryId)
  s.sendToWebSockets([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server) inventoryAmounts(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  idStr := vars["id"]
  id, err := strconv.Atoi(idStr)
  if err != nil { panic(err.Error()) }

  amounts := s.db.inventoryAmounts(id)
  json.NewEncoder(w).Encode(amounts)
}
//------------------------------------------------------------------------------
func (s *Server) inventoryAmountOfArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryIdStr := vars["inventoryId"]
  inventoryId, inventoryErr := strconv.Atoi(inventoryIdStr)
  if inventoryErr != nil { panic(inventoryErr.Error()) }

  articleIdStr := vars["articleId"]
  articleId, articleErr := strconv.Atoi(articleIdStr)
  if articleErr != nil { panic(articleErr.Error()) }

  amount := s.db.amountOfArticle(inventoryId, articleId)
  json.NewEncoder(w).Encode(amount)
}
//------------------------------------------------------------------------------
func (s *Server) inventoryOfCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  inventoryIdStr := vars["inventoryId"]
  inventoryId, inventoryErr := strconv.Atoi(inventoryIdStr)
  if inventoryErr != nil { panic(inventoryErr.Error()) }

  companyIdStr := vars["companyId"]
  companyId, companyErr := strconv.Atoi(companyIdStr)
  if companyErr != nil { panic(companyErr.Error()) }

  articles := s.db.inventoryOfCompany(inventoryId, companyId)
  json.NewEncoder(w).Encode(articles)
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
      s.pdf).
    Methods("GET")

  // company-related
  s.router.HandleFunc(
      "/api/companies",
      s.companies).
    Methods("GET")

  s.router.HandleFunc(
      "/api/company",
      s.createCompany).
    Methods("POST")

  s.router.HandleFunc(
      "/api/company/{id}",
      s.company).
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
      s.articles).
    Methods("GET")

  s.router.HandleFunc(
      "/api/article",
      s.createArticle).
    Methods("POST")

  s.router.HandleFunc(
      "/api/company/{id}/articles",
      s.articlesOfCompany).
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
      s.article).
    Methods("GET")

  // amount-related
  s.router.HandleFunc(
      "/api/amount",
      s.updateAmount).
    Methods("PUT")

  // inventory-related
  s.router.HandleFunc(
      "/api/inventories",
      s.inventories).
    Methods("GET")

  s.router.HandleFunc(
      "/api/inventory",
      s.createInventory).
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
      s.singleInventory).
    Methods("GET")

  s.router.HandleFunc(
      "/api/inventory/{id}/amounts",
      s.inventoryAmounts).
    Methods("GET")

  s.router.HandleFunc(
      "/api/inventory/{inventoryId}/amounts/{articleId}",
      s.inventoryAmountOfArticle).
    Methods("GET")

  s.router.HandleFunc(
      "/api/company/{companyId}/inventory/{inventoryId}",
      s.inventoryOfCompany).
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
func (s *Server) sendToWebSockets(message []byte) {
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
  fmt.Println("Creating Server...")
  s := new (Server)
  s.db = NewDatabase()
  fmt.Println("Creating Router...")
  s.router = mux.NewRouter().StrictSlash(true)
  fmt.Println("Creating Router... done!")
  s.clients = make(map[*websocket.Conn]bool)
  fmt.Println("Creating REST API...")
  s.handleRequests()
  fmt.Println("Creating REST API... done!")
  fmt.Println("Creating Server... done!")
  return s
}

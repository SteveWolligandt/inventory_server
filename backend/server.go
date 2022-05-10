package main

import (
  "encoding/json"
  "fmt"
  "log"
  "io/ioutil"
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
  rows, err := s.db.Query("SELECT id, name FROM articles")
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
  key := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM articles WHERE companyId = %v", key)
  fmt.Println(q)

  rows, err := s.db.Query(q)
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
func (s *Server) returnSingleCompany(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  key := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM companies WHERE id = %v", key)
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
func (s *Server) returnSingleArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  key := vars["id"]

  q := fmt.Sprintf("SELECT id, name FROM articles WHERE id = %v", key)
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
  // get the body of our POST request
  // unmarshal this into a new Article struct
  // append this to our Articles array.    
  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)

  // update our global Articles array to include
  // our new Article
  q := fmt.Sprintf("INSERT INTO articles (name, companyId) VALUES ('%v', %v) RETURNING id",
                  article.Name, article.CompanyId)

  id := 0
  dbErr := s.db.QueryRow(q).Scan(&id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"newArticle\", \"data\":{\"id\":%v, \"companyId\":%v, \"name\":\"%v\"}}", id, article.CompanyId, article.Name)
  s.writeMessage([]byte(action))
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
func (s *Server) updateArticle(w http.ResponseWriter, r *http.Request) {
  fmt.Println("Endpoint Hit: updateArticle")
  vars := mux.Vars(r)
  id := vars["id"]

  reqBody, _ := ioutil.ReadAll(r.Body)
  var article Article 
  json.Unmarshal(reqBody, &article)

  q := fmt.Sprintf("UPDATE articles SET name = '%v' WHERE id = %v", article.Name, id)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"updateArticle\", \"data\":{\"id\":%v, \"companyId\":%v, \"name\":\"%v\"}}", id, article.CompanyId, article.Name)
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
func (s *Server)deleteCompanyAndItsArticles(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  id := vars["id"]

  q := fmt.Sprintf("DELETE FROM articles WHERE companyId =%v", id)
  _, dbArtDeleteErr := s.db.Query(q)
  if dbArtDeleteErr != nil {
    panic(dbArtDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  q = fmt.Sprintf("DELETE FROM companies WHERE id =%v", id)
  fmt.Println(q)
  _, dbCompDeleteErr := s.db.Query(q)
  if dbCompDeleteErr != nil {
    panic(dbCompDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"deleteCompany\", \"data\":{\"id\":%v}}", id)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s *Server)deleteArticle(w http.ResponseWriter, r *http.Request) {
  vars := mux.Vars(r)
  id := vars["id"]

  q := fmt.Sprintf("DELETE FROM articles WHERE id =%v", id)
  fmt.Println(q)

  _, err := s.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  action := fmt.Sprintf("{\"action\":\"deleteArticle\", \"data\":{\"id\":%v}}", id)
  s.writeMessage([]byte(action))
}
//------------------------------------------------------------------------------
func (s* Server) handleRequests() {
  s.router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "../frontend/build/index.html")
  })

  // frontend
  s.router.HandleFunc("/ws", s.echo)

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

  // company related
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
      s.deleteCompanyAndItsArticles).
    Methods("DELETE")

  // article related
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

}
//------------------------------------------------------------------------------
func (s *Server) echo(w http.ResponseWriter, r *http.Request) {
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

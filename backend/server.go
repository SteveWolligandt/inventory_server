package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"

	_ "github.com/go-sql-driver/mysql"
)

// ------------------------------------------------------------------------------
type Server struct {
	db      *Database
	router  *mux.Router
	clients map[*websocket.Conn]bool
}

// ------------------------------------------------------------------------------
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Accepting all requests
	},
}

// ------------------------------------------------------------------------------
func (s *Server) homePage(w http.ResponseWriter, r *http.Request) {
	t, err := template.ParseFiles("public/index.html")
	if err != nil {
		panic(err.Error())
	}
	t.Execute(w, nil)
}

// ------------------------------------------------------------------------------
func (s *Server) pdf(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	inventoryIdStr := vars["id"]
	inventoryId, err := strconv.Atoi(inventoryIdStr)
	filename := buildPdf(s.db, inventoryId)
	fileBytes, err := ioutil.ReadFile(filename)
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	w.Write(fileBytes)
	w.Header().Set("Content-Type", "application/pdf")
}

// ------------------------------------------------------------------------------
func (s *Server) Articles(w http.ResponseWriter, r *http.Request) {
	articles := s.db.Articles()
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) Article(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	articleIdStr := vars["id"]
	articleId, err := strconv.Atoi(articleIdStr)
	if err != nil {
		panic(err.Error())
	}
	article := s.db.Article(articleId)
	json.NewEncoder(w).Encode(article)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateArticle(w http.ResponseWriter, r *http.Request) {
	// extract article from json response
	reqBody, _ := ioutil.ReadAll(r.Body)
	var article Article
	json.Unmarshal(reqBody, &article)

	// create new article in database
	article = s.db.CreateArticle(article.Name, article.CompanyId, article.ArticleNumber)
	marshaledArticle, marshalErr := json.Marshal(article)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"newArticle\", \"data\":%v}", string(marshaledArticle))
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	reqBody, _ := ioutil.ReadAll(r.Body)
	var article Article
	json.Unmarshal(reqBody, &article)
	var strConvErr error
	article.Id, strConvErr = strconv.Atoi(vars["id"])
	if strConvErr != nil {
		panic(strConvErr.Error())
	}

	s.db.UpdateArticle(article)
	marshaledArticle, marshalErr := json.Marshal(article)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"updateArticle\", \"data\":%v}", string(marshaledArticle))
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	articleIdStr := vars["id"]
	articleId, err := strconv.Atoi(articleIdStr)
	if err != nil {
		panic(err.Error())
	}
	s.db.DeleteArticle(articleId)
	action := fmt.Sprintf("{\"action\":\"deleteArticle\", \"data\":{\"id\":%v}}", articleId)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) Companies(w http.ResponseWriter, r *http.Request) {
	// Execute the query
	companies := s.db.Companies()
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) ArticlesOfCompany(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	companyIdStr := vars["id"]
	companyId, err := strconv.Atoi(companyIdStr)
	if err != nil {
		panic(err.Error())
	}
	articles := s.db.ArticlesOfCompany(companyId)
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) Company(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	companyIdStr := vars["id"]
	companyId, err := strconv.Atoi(companyIdStr)
	if err != nil {
		panic(err.Error())
	}

	company := s.db.Company(companyId)
	json.NewEncoder(w).Encode(company)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateCompany(w http.ResponseWriter, r *http.Request) {
	// get the body of our POST request
	// unmarshal this into a new Company struct
	// append this to our Articles array.
	reqBody, _ := ioutil.ReadAll(r.Body)
	var company Company
	json.Unmarshal(reqBody, &company)

	company = s.db.CreateCompany(company.Name)
	marshaledCompany, marshalErr := json.Marshal(company)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"newCompany\", \"data\":%v}", string(marshaledCompany))
  fmt.Println(action)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateCompany(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	reqBody, _ := ioutil.ReadAll(r.Body)
	var company Company
	json.Unmarshal(reqBody, &company)
	companyIdStr := vars["id"]
	var err error
	company.Id, err = strconv.Atoi(companyIdStr)
	if err != nil {
		panic(err.Error())
	}

	s.db.UpdateCompany(company)
	action := fmt.Sprintf("{\"action\":\"updateCompany\", \"data\":{\"id\":%v, \"name\":\"%v\"}}", company.Id, company.Name)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
// server-related
// ------------------------------------------------------------------------------
func (s *Server) DeleteCompany(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	companyIdStr := vars["id"]
	companyId, err := strconv.Atoi(companyIdStr)
	if err != nil {
		panic(err.Error())
	}
	s.db.DeleteCompany(companyId)
	action := fmt.Sprintf("{\"action\":\"deleteCompany\", \"data\":{\"id\":%v}}", companyId)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
// inventoryData-related
// ------------------------------------------------------------------------------
func (s *Server) UpdateInventoryData(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	var inventoryData InventoryData
	json.Unmarshal(reqBody, &inventoryData)
	fmt.Println(inventoryData)

	s.db.UpdateInventoryData(inventoryData)
	marshaledInventoryData, marshalErr := json.Marshal(inventoryData)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"updateInventoryData\", \"data\":%v}", string(marshaledInventoryData))

	fmt.Println(action)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
// inventory-related
// ------------------------------------------------------------------------------
func (s *Server) Inventories(w http.ResponseWriter, r *http.Request) {
	inventories := s.db.Inventories()
	json.NewEncoder(w).Encode(inventories)
}

// ------------------------------------------------------------------------------
func (s *Server) SingleInventory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	inventoryIdStr := vars["id"]
	inventoryId, err := strconv.Atoi(inventoryIdStr)
	if err != nil {
		panic(err.Error())
	}
	inventory := s.db.Inventory(inventoryId)
	json.NewEncoder(w).Encode(inventory)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateInventory(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	var inventory Inventory
	json.Unmarshal(reqBody, &inventory)

	s.db.CreateInventory(inventory.Name)
	json.NewEncoder(w).Encode(inventory)

	action := fmt.Sprintf(
		"{\"action\":\"newInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
		inventory.Id, inventory.Name)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateInventory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	var err error

	reqBody, _ := ioutil.ReadAll(r.Body)
	var inventory Inventory
	json.Unmarshal(reqBody, &inventory)
	inventory.Id, err = strconv.Atoi(idStr)
	if err != nil {
		panic(err.Error())
	}

	s.db.UpdateInventory(inventory)

	action := fmt.Sprintf(
		"{\"action\":\"updateInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
		inventory.Id, inventory.Name)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) DeleteInventory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	inventoryIdStr := vars["id"]
	inventoryId, err := strconv.Atoi(inventoryIdStr)
	if err != nil {
		panic(err.Error())
	}

	s.db.DeleteInventory(inventoryId)

	// handle websocket
	action := fmt.Sprintf("{\"action\":\"deleteInventory\", \"data\":{\"id\":%v}}", inventoryId)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) InventoryDataOfArticle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	inventoryIdStr := vars["inventoryId"]
	inventoryId, inventoryErr := strconv.Atoi(inventoryIdStr)
	if inventoryErr != nil {
		panic(inventoryErr.Error())
	}

	articleIdStr := vars["articleId"]
	articleId, articleErr := strconv.Atoi(articleIdStr)
	if articleErr != nil {
		panic(articleErr.Error())
	}

	inventoryData := s.db.InventoryDataOfArticle(inventoryId, articleId)
	json.NewEncoder(w).Encode(inventoryData)
}

// ------------------------------------------------------------------------------
func (s *Server) InventoryOfCompany(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	companyIdStr := vars["companyId"]
	companyId, companyErr := strconv.Atoi(companyIdStr)
	if companyErr != nil {
		panic(companyErr.Error())
	}

	inventoryIdStr := vars["inventoryId"]
	inventoryId, inventoryErr := strconv.Atoi(inventoryIdStr)
	if inventoryErr != nil {
		panic(inventoryErr.Error())
	}

	articles := s.db.InventoryOfCompany(inventoryId, companyId)
	fmt.Println(articles)
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateUser(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)

	type UserPW struct {
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	var userClear UserPW
	json.Unmarshal(reqBody, &userClear)

	s.db.CreateUser(userClear.Name, userClear.Password)
}

// ------------------------------------------------------------------------------
func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	type UserPW struct {
		Name     string `json:"username"`
		Password string `json:"password"`
	}
	var userClear UserPW
	type Response struct {
		Success bool `json:"success"`
	}
	reqBody, _ := ioutil.ReadAll(r.Body)
	json.Unmarshal(reqBody, &userClear)
	userHashed := s.db.User(userClear.Name)
	success := VerifyPassword(userHashed.HashedPassword, userClear.Password)

	w.Header().Set("Content-Type", "application/json")
	var res = Response{Success: success}
	resstring, _ := json.Marshal(res)
	w.Write(resstring)
}

// ------------------------------------------------------------------------------
func (s *Server) handleRequests() {
	s.router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../frontend/build/index.html")
	})

	// frontend
	s.router.PathPrefix("/static").Handler(
		http.StripPrefix(
			"/static",
			http.FileServer(
				http.Dir("../frontend/build/static"))))

	// websockets
	s.router.HandleFunc("/ws", s.handleWebsocket)

	// pdf
	s.router.HandleFunc(
		"/pdf/{id}",
		s.pdf).
		Methods("GET")

	// company-related
	s.router.HandleFunc(
		"/api/companies",
		s.Companies).
		Methods("GET")

	s.router.HandleFunc(
		"/api/company",
		s.CreateCompany).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{id}",
		s.Company).
		Methods("GET")

	s.router.HandleFunc(
		"/api/company/{id}",
		s.UpdateCompany).
		Methods("PUT")

	s.router.HandleFunc(
		"/api/company/{id}",
		s.DeleteCompany).
		Methods("DELETE")

	// article-related
	s.router.HandleFunc(
		"/api/articles",
		s.Articles).
		Methods("GET")

	s.router.HandleFunc(
		"/api/article",
		s.CreateArticle).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{id}/articles",
		s.ArticlesOfCompany).
		Methods("GET")

	s.router.HandleFunc(
		"/api/article/{id}",
		s.UpdateArticle).
		Methods("PUT")

	s.router.HandleFunc(
		"/api/article/{id}",
		s.DeleteArticle).
		Methods("DELETE")

	s.router.HandleFunc(
		"/api/article/{id}",
		s.Article).
		Methods("GET")

	// inventoryData-related
	s.router.HandleFunc(
		"/api/inventorydata",
		s.UpdateInventoryData).
		Methods("PUT")

	// inventory-related
	s.router.HandleFunc(
		"/api/inventories",
		s.Inventories).
		Methods("GET")

	s.router.HandleFunc(
		"/api/inventory",
		s.CreateInventory).
		Methods("POST")

	s.router.HandleFunc(
		"/api/inventory/{id}",
		s.UpdateInventory).
		Methods("PUT")

	s.router.HandleFunc(
		"/api/inventory/{id}",
		s.DeleteInventory).
		Methods("DELETE")

	s.router.HandleFunc(
		"/api/inventory/{id}",
		s.SingleInventory).
		Methods("GET")

	s.router.HandleFunc(
		"/api/inventory/{inventoryId}/inventorydata/{articleId}",
		s.InventoryDataOfArticle).
		Methods("GET")

	s.router.HandleFunc(
		"/api/company/{companyId}/inventory/{inventoryId}",
		s.InventoryOfCompany).
		Methods("GET")

	s.router.HandleFunc(
		"/api/user", s.CreateUser).
		Methods("POST")

	s.router.HandleFunc(
		"/api/login", s.Login).
		Methods("POST")
}

// ------------------------------------------------------------------------------
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

// ------------------------------------------------------------------------------
func (s *Server) SendToWebSockets(message []byte) {
	for conn := range s.clients {
		conn.WriteMessage(websocket.TextMessage, message)
	}
}

// ------------------------------------------------------------------------------
func (s *Server) Start() {
	log.Fatal(http.ListenAndServe(":8080", s.router))
}

// ------------------------------------------------------------------------------
func (s *Server) Close() {
	s.db.Close()
}

// ------------------------------------------------------------------------------
func NewServer() *Server {
	fmt.Println("Creating Server...")
	s := new(Server)
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

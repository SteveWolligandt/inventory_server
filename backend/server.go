package main

import (
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"io/ioutil"

	"log"
	"net"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/acme/autocert"

	_ "github.com/go-sql-driver/mysql"
)

var (
	domain string
)

func getSelfSignedOrLetsEncryptCert(certManager *autocert.Manager) func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	return func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
		dirCache, ok := certManager.Cache.(autocert.DirCache)
		if !ok {
			dirCache = "certs"
		}

		keyFile := filepath.Join(string(dirCache), hello.ServerName+".key")
		crtFile := filepath.Join(string(dirCache), hello.ServerName+".crt")
		certificate, err := tls.LoadX509KeyPair(crtFile, keyFile)
		if err != nil {
			//fmt.Printf("%s\nFalling back to Letsencrypt\n", err)
			return certManager.GetCertificate(hello)
		}
		//fmt.Println("Loaded selfsigned certificate.")
		return &certificate, err
	}
}

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
func (s *Server) CheckAuthorizedFromRequest(w *http.ResponseWriter, r *http.Request) bool {
	type ReqBody struct {
		Token string `json:"token"`
	}
	reqBodyString, _ := ioutil.ReadAll(r.Body)
	var reqBody ReqBody
	json.Unmarshal(reqBodyString, &reqBody)
	return s.CheckAuthorized(w, reqBody.Token)
}

// ------------------------------------------------------------------------------
func WriteUnauthorizedToResponse(w *http.ResponseWriter) {
	(*w).WriteHeader(http.StatusUnauthorized)
	(*w).Header().Set("Content-Type", "application/json")
	resp := make(map[string]string)
	resp["message"] = "Unauthorized"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		log.Fatalf("Error happened in JSON marshal. Err: %s", err)
	}
	(*w).Write(jsonResp)
}

// ------------------------------------------------------------------------------
func (s *Server) CheckAuthorizedAdmin(w *http.ResponseWriter, token string) bool {
	isValid, user := s.db.UserOfToken(token)
	authorized := isValid && user.IsAdmin
	if !authorized {
		WriteUnauthorizedToResponse(w)
	}
	return authorized
}

// ------------------------------------------------------------------------------
func (s *Server) CheckAuthorized(w *http.ResponseWriter, token string) bool {
	isAuthorized, _ := s.db.UserOfToken(token)
	if !isAuthorized {
		WriteUnauthorizedToResponse(w)
	}
	return isAuthorized
}

// ------------------------------------------------------------------------------
func (s *Server) Pdf(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
	articles := s.db.Articles()
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) Article(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	type ArticleWithToken struct {
		Article
		Token string `json:"token"`
	}
	var articleWithToken ArticleWithToken
	json.Unmarshal(reqBody, &articleWithToken)
	if !s.CheckAuthorized(&w, articleWithToken.Token) {
		return
	}

	// create new article in database
	article := s.db.CreateArticle(articleWithToken.Name, articleWithToken.CompanyId, articleWithToken.ArticleNumber)
	marshaledArticle, marshalErr := json.Marshal(article)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"newArticle\", \"data\":%v}", string(marshaledArticle))
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	type ArticleWithToken struct {
		Article
		Token string `json:"token"`
	}
	var articleWithToken ArticleWithToken
	json.Unmarshal(reqBody, &articleWithToken)
	if !s.CheckAuthorized(&w, articleWithToken.Token) {
		return
	}
	vars := mux.Vars(r)

	var strConvErr error
	articleWithToken.Id, strConvErr = strconv.Atoi(vars["id"])
	if strConvErr != nil {
		panic(strConvErr.Error())
	}

	s.db.UpdateArticle(articleWithToken.Article)
	marshaledArticle, marshalErr := json.Marshal(articleWithToken.Article)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"updateArticle\", \"data\":%v}", string(marshaledArticle))
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
	companies := s.db.Companies()
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) ArticlesOfCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	type CompanyWithToken struct {
		Id        int    `json:"id"`
		Name      string `json:"name"`
		ImagePath string `json:"-"`
		Token     string `json:"token"`
	}
	var companyWithToken CompanyWithToken
	json.Unmarshal(reqBody, &companyWithToken)
	if !s.CheckAuthorized(&w, companyWithToken.Token) {
		return
	}

	company := s.db.CreateCompany(companyWithToken.Name)
	marshaledCompany, marshalErr := json.Marshal(company)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"newCompany\", \"data\":%v}", string(marshaledCompany))
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	type InventoryDataWithToken struct {
		InventoryData
		Token string `json:"token"`
	}
	var inventoryDataWithToken InventoryDataWithToken
	json.Unmarshal(reqBody, &inventoryDataWithToken)
	if !s.CheckAuthorized(&w, inventoryDataWithToken.Token) {
		return
	}

	s.db.UpdateInventoryData(inventoryDataWithToken.InventoryData)
	marshaledInventoryData, marshalErr := json.Marshal(inventoryDataWithToken.InventoryData)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"updateInventoryData\", \"data\":%v}", string(marshaledInventoryData))

	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
// inventory-related
// ------------------------------------------------------------------------------
func (s *Server) Inventories(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
	inventories := s.db.Inventories()
	json.NewEncoder(w).Encode(inventories)
}

// ------------------------------------------------------------------------------
func (s *Server) SingleInventory(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	type InventoryWithToken struct {
		Id    int    `json:"id"`
		Name  string `json:"name"`
		Token string `json:"token"`
	}
	var inventoryWithToken InventoryWithToken
	json.Unmarshal(reqBody, &inventoryWithToken)
	if !s.CheckAuthorized(&w, inventoryWithToken.Token) {
		return
	}

	inventory := s.db.CreateInventory(inventoryWithToken.Name)
	json.NewEncoder(w).Encode(inventory)

	action := fmt.Sprintf(
		"{\"action\":\"newInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
		inventory.Id, inventory.Name)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateInventory(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	if !s.CheckAuthorizedFromRequest(&w, r) {
		return
	}
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
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) InventoryPrice(w http.ResponseWriter, r *http.Request) {
	//if !s.CheckAuthorizedFromRequest(&w, r) {
	//	return
	//}
	type CompanyPrice struct {
		Id    int     `json:"id"`
		Name  string  `json:"name"`
		Price float32 `json:"price"`
	}
	type Return struct {
		CompanyPrices []CompanyPrice `json:"companies"`
		Price         float32        `json:"price"`
	}
	var ret Return
	vars := mux.Vars(r)

	idStr := vars["id"]
	id, idErr := strconv.Atoi(idStr)
	if idErr != nil {
		panic(idErr.Error())
	}

	var fullPrice float32
	companies := s.db.Companies()

	for _, company := range companies {
		var fullPriceCompany float32
		articles := s.db.InventoryOfCompany(id, company.Id)
		for _, article := range articles {
			fullPriceCompany += float32(article.Amount) * article.PurchasePrice
		}

		ret.CompanyPrices = append(ret.CompanyPrices, CompanyPrice{Id: company.Id, Name: company.Name, Price: fullPriceCompany})
		fullPrice += fullPriceCompany
	}

	ret.Price = fullPrice
	json.NewEncoder(w).Encode(ret)
}

// ------------------------------------------------------------------------------
func (s *Server) InventoryPriceOfCompany(w http.ResponseWriter, r *http.Request) {
	//if !s.CheckAuthorizedFromRequest(&w, r) {
	//	return
	//}
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

	var fullPrice float32
	articles := s.db.InventoryOfCompany(inventoryId, companyId)
	for _, article := range articles {
		fullPrice += float32(article.Amount) * article.PurchasePrice
	}

	type Return struct {
		Name  string  `json:"name"`
		Price float32 `json:"price"`
	}
	ret := Return{Name: "foo", Price: fullPrice}
	json.NewEncoder(w).Encode(ret)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateUser(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)

	type UserPW struct {
		Name     string `json:"name"`
		Password string `json:"password"`
		Token    string `json:"token"`
	}
	var userClear UserPW
	json.Unmarshal(reqBody, &userClear)
	if !s.CheckAuthorizedAdmin(&w, userClear.Token) {
		return
	}

	s.db.CreateUser(userClear.Name, userClear.Password, false)
}

// ------------------------------------------------------------------------------
func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	type UserPW struct {
		Name     string `json:"username"`
		Password string `json:"password"`
	}
	var userClear UserPW
	reqBody, _ := ioutil.ReadAll(r.Body)
	json.Unmarshal(reqBody, &userClear)
	userHashed := s.db.User(userClear.Name)
	success := VerifyPassword(userHashed.HashedPassword, userClear.Password)

	if success {
		type Response struct {
			Success bool   `json:"success"`
			Token   string `json:"token"`
		}
		var token = s.db.CreateUserToken(userClear.Name)
		w.Header().Set("Content-Type", "application/json")
		var res = Response{Success: success, Token: token}
		resstring, _ := json.Marshal(res)
		w.Write(resstring)
	} else {
		type Response struct {
			Success bool `json:"success"`
		}
		w.Header().Set("Content-Type", "application/json")
		var res = Response{Success: success}
		resstring, _ := json.Marshal(res)
		w.Write(resstring)
	}
}

// ------------------------------------------------------------------------------
func (s *Server) TokenValid(w http.ResponseWriter, r *http.Request) {
	type ReqBody struct {
		Token string `json:"token"`
	}
	var reqBody ReqBody
	reqBodyString, _ := ioutil.ReadAll(r.Body)
	json.Unmarshal(reqBodyString, &reqBody)
	isValid, user := s.db.UserOfToken(reqBody.Token)

	w.Header().Set("Content-Type", "application/json")
	if isValid {
		type ResponseValid struct {
			Success bool   `json:"success"`
			User    string `json:"user"`
			IsAdmin bool   `json:"isAdmin"`
		}
		var res = ResponseValid{Success: isValid, User: user.Name, IsAdmin: user.IsAdmin}
		resstring, _ := json.Marshal(res)
		w.Write(resstring)
	} else {
		type ResponseInvalid struct {
			Success bool `json:"success"`
		}
		var res = ResponseInvalid{Success: isValid}
		resstring, _ := json.Marshal(res)
		w.Write(resstring)
	}
}

// ------------------------------------------------------------------------------
func (s *Server) HandleRequests() {
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
	s.router.HandleFunc("/ws", s.HandleWebsocket)

	// pdf
	s.router.HandleFunc(
		"/pdf/{id}", s.Pdf).
		Methods("POST")

	// company-related
	s.router.HandleFunc(
		"/api/companies",
		s.Companies).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company",
		s.CreateCompany).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{id}",
		s.Company).
		Methods("POST")

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
		Methods("POST")

	s.router.HandleFunc(
		"/api/article",
		s.CreateArticle).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{id}/articles",
		s.ArticlesOfCompany).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{companyId}/inventory/{inventoryId}",
		s.InventoryOfCompany).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{companyId}/inventory-price/{inventoryId}",
		s.InventoryPriceOfCompany).
		Methods("POST")

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
		Methods("POST")

	// inventoryData-related
	s.router.HandleFunc(
		"/api/inventorydata",
		s.UpdateInventoryData).
		Methods("PUT")

	// inventory-related
	s.router.HandleFunc(
		"/api/inventories",
		s.Inventories).
		Methods("POST")

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
		Methods("POST")

	s.router.HandleFunc(
		"/api/inventory/{id}/price",
		s.InventoryPrice).
		Methods("POST")

	s.router.HandleFunc(
		"/api/inventory/{inventoryId}/inventorydata/{articleId}",
		s.InventoryDataOfArticle).
		Methods("POST")

	s.router.HandleFunc(
		"/api/user", s.CreateUser).
		Methods("POST")

	s.router.HandleFunc(
		"/api/login", s.Login).
		Methods("POST")

	s.router.HandleFunc(
		"/api/tokenvalid", s.TokenValid).
		Methods("POST")
}

// ------------------------------------------------------------------------------
func (s *Server) HandleWebsocket(w http.ResponseWriter, r *http.Request) {
	//if !s.CheckAuthorizedFromRequest(&w, r) { return }
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

func redirectHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" && r.Method != "HEAD" {
		http.Error(w, "Use HTTPS", http.StatusBadRequest)
		return
	}
	target := "https://" + stripPort(r.Host) + r.URL.RequestURI()
	http.Redirect(w, r, target, http.StatusFound)
}

// ------------------------------------------------------------------------------
func stripPort(hostport string) string {
	host, _, err := net.SplitHostPort(hostport)
	if err != nil {
		return hostport
	}
	return net.JoinHostPort(host, "443")
}

// ------------------------------------------------------------------------------
func (s *Server) Start() {
	fmt.Println("TLS domain", domain)

	certManager := autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(domain),
		Cache:      autocert.DirCache("certs"),
	}

	tlsConfig := certManager.TLSConfig()
	tlsConfig.GetCertificate = getSelfSignedOrLetsEncryptCert(&certManager)
	server := http.Server{
		Addr:      ":443",
		Handler:   s.router,
		TLSConfig: tlsConfig,
	}
	go http.ListenAndServe(":80", http.HandlerFunc(redirectHTTP))
	fmt.Println("Server listening on", server.Addr)
	if err := server.ListenAndServeTLS("", ""); err != nil {
		fmt.Println(err)
	}
}

// ------------------------------------------------------------------------------
func (s *Server) Close() {
	s.db.Close()
}

// ------------------------------------------------------------------------------
func NewServer() *Server {
	flag.StringVar(&domain, "domain", "", "domain name to request your certificate")
	flag.Parse()

	fmt.Println("Creating Server...")
	s := new(Server)
	s.db = NewDatabase()
	fmt.Println("Creating Router...")
	s.router = mux.NewRouter().StrictSlash(true)

	fmt.Println("Creating Router... done!")
	s.clients = make(map[*websocket.Conn]bool)
	fmt.Println("Creating REST API...")
	s.HandleRequests()
	fmt.Println("Creating REST API... done!")
	fmt.Println("Creating Server... done!")
	return s
}

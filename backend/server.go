package main

import (
	"crypto/tls"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/golang-jwt/jwt/v4"
	"html/template"
	"io/ioutil"
	"time"

	"log"
	"math/rand"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/acme/autocert"

	_ "github.com/go-sql-driver/mysql"
)

var (
	domain    string
	jwtSecret []byte
)

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

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
			return certManager.GetCertificate(hello)
		}
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
func (s *Server) CheckAuthorized(w http.ResponseWriter, r *http.Request) bool {
	tokenString := r.Header.Get("token")
	claims := &Claims{}

	// Parse the JWT string and store the result in `claims`.
	// Note that we are passing the key in this method as well. This method will return an error
	// if the token is invalid (if it has expired according to the expiry time we set on sign in),
	// or if the signature does not match
	tkn, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		if err == jwt.ErrSignatureInvalid {
			w.WriteHeader(http.StatusUnauthorized)
			return false
		}
		w.WriteHeader(http.StatusBadRequest)
		return false
	}
	if !tkn.Valid {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	return true
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
func (s *Server) CheckAuthorizedAdmin(w *http.ResponseWriter, r *http.Request) bool {
	//isValid, user := s.db.UserOfToken(r.Header.Get("token"))
	//authorized := isValid && user.IsAdmin
	//if !authorized {
	//	WriteUnauthorizedToResponse(w)
	//}
	//return authorized
	return false
}

// ------------------------------------------------------------------------------
func (s *Server) GetPdf(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetArticles(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	articles := s.db.Articles()
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) GetArticle(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
	if !s.CheckAuthorized(w, r) {
		return
	}
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
	if !s.CheckAuthorized(w, r) {
		return
	}
	reqBody, _ := ioutil.ReadAll(r.Body)
	var article Article
	json.Unmarshal(reqBody, &article)
	vars := mux.Vars(r)

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
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetCompanies(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	companies := s.db.Companies()
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompaniesWithValue(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	inventoryIdStr := vars["inventoryId"]
	inventoryId, err := strconv.Atoi(inventoryIdStr)
	if err != nil {
		panic(err.Error())
	}
	companies := s.db.CompaniesWithValue(inventoryId)
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompaniesWithInventory(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	companies := s.db.Companies()
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) GetArticlesOfCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetCompanyWithValue(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	companyIdStr := vars["companyId"]
	companyId, err := strconv.Atoi(companyIdStr)
	if err != nil {
		panic(err.Error())
	}
	inventoryIdStr := vars["inventoryId"]
	inventoryId, err := strconv.Atoi(inventoryIdStr)
	if err != nil {
		panic(err.Error())
	}

	company := s.db.CompanyWithValue(companyId, inventoryId)
	json.NewEncoder(w).Encode(company)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	reqBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		panic(err)
	}
	fmt.Printf("client: response body: %s\n", reqBody)
	var company Company
	json.Unmarshal(reqBody, &company)
	fmt.Println(company)

	company = s.db.CreateCompany(company.Name)
	marshaledCompany, marshalErr := json.Marshal(company)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"newCompany\", \"data\":%v}", string(marshaledCompany))
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	reqBody, _ := ioutil.ReadAll(r.Body)
	var company Company
	json.Unmarshal(reqBody, &company)

	vars := mux.Vars(r)
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
	if !s.CheckAuthorized(w, r) {
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
	var inventoryData InventoryData
	json.Unmarshal(reqBody, &inventoryData)
	if !s.CheckAuthorized(w, r) {
		return
	}

	s.db.UpdateInventoryData(inventoryData)
	marshaledInventoryData, marshalErr := json.Marshal(inventoryData)
	if marshalErr != nil {
		panic(marshalErr.Error()) // proper error handling instead of panic in your app
	}
	action := fmt.Sprintf("{\"action\":\"updateInventoryData\", \"data\":%v}", string(marshaledInventoryData))

	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
// inventory-related
// ------------------------------------------------------------------------------
func (s *Server) GetInventories(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	inventories := s.db.Inventories()
	json.NewEncoder(w).Encode(inventories)
}

// ------------------------------------------------------------------------------
func (s *Server) GetInventory(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
	var inventory Inventory
	json.Unmarshal(reqBody, &inventory)
	if !s.CheckAuthorized(w, r) {
		return
	}

	inventory = s.db.CreateInventory(inventory.Name)
	json.NewEncoder(w).Encode(inventory)

	action := fmt.Sprintf(
		"{\"action\":\"newInventory\", \"data\":{\"id\":%v, \"name\":\"%v\"}}",
		inventory.Id, inventory.Name)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateInventory(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetInventoryDataOfArticle(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetInventoryOfCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
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
func (s *Server) GetInventoryWithValue(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	type Return struct {
		CompaniesWithValue []CompanyWithValue `json:"companies"`
		Value              float32            `json:"value"`
	}
	var ret Return
	vars := mux.Vars(r)

	idStr := vars["id"]
	inventoryId, idErr := strconv.Atoi(idStr)
	if idErr != nil {
		panic(idErr.Error())
	}

	var totalValue float32
	companies := s.db.Companies()

	for _, company := range companies {
		value := s.db.ValueOfCompany(company.Id, inventoryId)
		var companyWithValue CompanyWithValue
		companyWithValue.Company = company
		companyWithValue.Value = value
		ret.CompaniesWithValue = append(ret.CompaniesWithValue, companyWithValue)
		totalValue += value
	}

	ret.Value = totalValue
	json.NewEncoder(w).Encode(ret)
}

// ------------------------------------------------------------------------------
func (s *Server) GetInventoriesWithValue(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	json.NewEncoder(w).Encode(s.db.InventoriesWithValue())
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
	if !s.CheckAuthorizedAdmin(&w, r) {
		return
	}

	s.db.CreateUser(userClear.Name, userClear.Password, false)
}

// ------------------------------------------------------------------------------
func (s *Server) GenerateJWT(username string) (string, error) {
	expirationTime := time.Now().Add(15 * time.Minute)
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			// In JWT, the expiry time is expressed as unix milliseconds
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ------------------------------------------------------------------------------
func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	username, password, ok := r.BasicAuth()
	if !ok {
		WriteUnauthorizedToResponse(&w)
		return
	}
	userHashed := s.db.User(username)
	success := VerifyPassword(userHashed.HashedPassword, password)

	if success {
		var token, errToken = s.GenerateJWT(username)
		if errToken != nil {
			type Response struct {
				Success bool   `json:"success"`
				Message string `json:"message"`
			}
			w.Header().Set("Content-Type", "application/json")
			var res = Response{Success: false, Message: errToken.Error()}
			resstring, _ := json.Marshal(res)
			w.Write(resstring)
		} else {
			type Response struct {
				Success bool   `json:"success"`
				Token   string `json:"token"`
			}
			w.Header().Set("Content-Type", "application/json")
			var res = Response{Success: success, Token: token}
			resstring, _ := json.Marshal(res)
			w.Write(resstring)
		}
	} else {
		type Response struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
		}
		w.Header().Set("Content-Type", "application/json")
		var res = Response{Success: success, Message: "could not login"}
		resstring, _ := json.Marshal(res)
		w.Write(resstring)
	}
}

// ------------------------------------------------------------------------------
func (s *Server) Renew(w http.ResponseWriter, r *http.Request) {
	tokenString := r.Header.Get("token")
	claims := &Claims{}

	// Parse the JWT string and store the result in `claims`.
	// Note that we are passing the key in this method as well. This method will return an error
	// if the token is invalid (if it has expired according to the expiry time we set on sign in),
	// or if the signature does not match
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte("SecretYouShouldHide"), nil
	})
	if err != nil && !token.Valid {
		if err == jwt.ErrSignatureInvalid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
	}

	if time.Until(claims.ExpiresAt.Time) < -time.Second*60 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var renewedToken, errToken = s.GenerateJWT(claims.Username)
	if errToken != nil {
		w.WriteHeader(http.StatusInternalServerError)
	} else {
		type Response struct {
			Token string `json:"token"`
		}
		w.Header().Set("Content-Type", "application/json")
		var res = Response{Token: renewedToken}
		resstring, _ := json.Marshal(res)
		w.Write(resstring)
	}
}

// ------------------------------------------------------------------------------
//func (s *Server) TokenValid(w http.ResponseWriter, r *http.Request) {
//	if !s.CheckAuthorized(w, r) {
//		return
//	}
//	isValid, user := s.db.UserOfToken(r.Header.Get("token"))
//	w.Header().Set("Content-Type", "application/json")
//	type ResponseValid struct {
//		Success bool   `json:"success"`
//		User    string `json:"user"`
//		IsAdmin bool   `json:"isAdmin"`
//	}
//	var res = ResponseValid{Success: isValid, User: user.Name, IsAdmin: user.IsAdmin}
//	resstring, _ := json.Marshal(res)
//	w.Write(resstring)
//}

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
		"/pdf/{id}", s.GetPdf).
		Methods("GET")

	// company-related
	s.router.HandleFunc(
		"/api/companies",
		s.GetCompanies).
		Methods("GET")

	s.router.HandleFunc(
		"/api/companies/value/{inventoryId}",
		s.GetCompaniesWithValue).
		Methods("GET")

	// company-related
	s.router.HandleFunc(
		"/api/companies/inventory/{inventoryId}",
		s.GetCompaniesWithInventory).
		Methods("GET")

	s.router.HandleFunc(
		"/api/company",
		s.CreateCompany).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{id}",
		s.GetCompany).
		Methods("GET")

	s.router.HandleFunc(
		"/api/company/{companyId}/value/{inventoryId}",
		s.GetCompanyWithValue).
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
		s.GetArticles).
		Methods("GET")

	s.router.HandleFunc(
		"/api/article",
		s.CreateArticle).
		Methods("POST")

	s.router.HandleFunc(
		"/api/company/{id}/articles",
		s.GetArticlesOfCompany).
		Methods("GET")

	s.router.HandleFunc(
		"/api/company/{companyId}/inventory/{inventoryId}",
		s.GetInventoryOfCompany).
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
		s.GetArticle).
		Methods("GET")

	// inventoryData-related
	s.router.HandleFunc(
		"/api/inventorydata",
		s.UpdateInventoryData).
		Methods("PUT")

	// inventory-related
	s.router.HandleFunc(
		"/api/inventories",
		s.GetInventories).
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
		s.GetInventory).
		Methods("GET")

	s.router.HandleFunc(
		"/api/inventory/{id}/value",
		s.GetInventoryWithValue).
		Methods("GET")

	s.router.HandleFunc(
		"/api/inventories/value",
		s.GetInventoriesWithValue).
		Methods("GET")

	s.router.HandleFunc(
		"/api/inventory/{inventoryId}/inventorydata/{articleId}",
		s.GetInventoryDataOfArticle).
		Methods("GET")

	s.router.HandleFunc(
		"/api/user", s.CreateUser).
		Methods("POST")

	s.router.HandleFunc(
		"/api/login", s.Login).
		Methods("GET")

	s.router.HandleFunc(
		"/api/renew", s.Renew).
		Methods("GET")
}

// ------------------------------------------------------------------------------
func (s *Server) HandleWebsocket(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
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

func CreateOrReadJWTSecret(n int, path string) {
	jwtSecret = make([]byte, n)
	if _, statErr := os.Stat(path); statErr == nil {
		var e error
		jwtSecret, e = os.ReadFile(path)
		if e != nil {
			panic(e)
		}
	} else {
		// create random string
		rand.Seed(time.Now().UnixNano())
		const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

		for i := range letterBytes {
			jwtSecret[i] = letterBytes[rand.Intn(len(letterBytes))]
		}
		err := os.WriteFile(path, jwtSecret, 0644)
		if err != nil {
			panic(err)
		}
	}
}

// ------------------------------------------------------------------------------
func NewServer() *Server {
	CreateOrReadJWTSecret(128, "jwtsecret")

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

package main

import (
	"crypto/tls"
	"database/sql"
	b64 "encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"

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
  port      int
  useSSL    bool
	jwtSecret []byte
)

type Claims struct {
	Username string `json:"username"`
	IsAdmin  bool   `json:"isAdmin"`
	jwt.RegisteredClaims
}

func getSelfSignedOrLetsEncryptCert(certManager *autocert.Manager) func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	return func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
		dirCache, ok := certManager.Cache.(autocert.DirCache)
		if !ok {
			dirCache = autocert.DirCache("/etc/letsencrypt/live/" + domain)
		}

		crtFile := filepath.Join(string(dirCache), "fullchain.pem")
		keyFile := filepath.Join(string(dirCache), "privkey.pem")
		certificate, err := tls.LoadX509KeyPair(crtFile, keyFile)
		if err != nil {
			return certManager.GetCertificate(hello)
		}
		return &certificate, err
	}
}

// ------------------------------------------------------------------------------
type Server struct {
	Db           *Database
	Router       *mux.Router
	Clients      map[*websocket.Conn]bool
	ClientsMutex sync.Mutex
}

// ------------------------------------------------------------------------------
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Accepting all requests
	},
}

// ------------------------------------------------------------------------------
func (s *Server) CheckAuthorized(w http.ResponseWriter, r *http.Request) bool {
	tokenString := r.Header.Get("token")
	claims := &Claims{}

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
func (s *Server) CheckAuthorizedAdmin(w http.ResponseWriter, r *http.Request) bool {
	tokenString := r.Header.Get("token")
	claims := &Claims{}

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
	if !claims.IsAdmin {
		w.WriteHeader(http.StatusUnauthorized)
		return false
	}
	return true
}

// ------------------------------------------------------------------------------
func (s *Server) GetPdf(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	inventoryIdStr := vars["id"]
	inventoryId, err := strconv.Atoi(inventoryIdStr)
	filename, buildErr := buildPdf(s.Db, inventoryId)
	if buildErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	fileBytes, err := ioutil.ReadFile(filename)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(fileBytes)
	w.Header().Set("Content-Type", "application/pdf")
}

// ------------------------------------------------------------------------------
func (s *Server) GetArticles(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	articles, err := s.Db.Articles()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) GetArticle(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	articleIdStr := vars["id"]
	articleId, strconvErr := strconv.Atoi(articleIdStr)
	if strconvErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	article, err := s.Db.Article(articleId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(article)
}

// ------------------------------------------------------------------------------
func (s *Server) GetArticleFromBarcode(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	articleBarcode := vars["barcode"]
	inventoryIdStr := r.Header.Get("inventoryId")
	inventoryId, strconvErr := strconv.Atoi(inventoryIdStr)
	if strconvErr != nil {
    fmt.Println(strconvErr.Error())
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
  fmt.Println("inventoryId: " + inventoryIdStr)
	article, err := s.Db.ArticleFromBarcode(articleBarcode, inventoryId)
	if err != nil {
    if err == sql.ErrNoRows {
      type Response struct {
        Success bool `json:"success"`
      }
      response := Response{Success: false}
      json.NewEncoder(w).Encode(response)
    } else {
      fmt.Println("Database.ArticleFromBarcode got an error:"  + err.Error())
      // TODO send message with error
      w.WriteHeader(http.StatusInternalServerError)
    }
		return
	}
	if article == nil {
		type Response struct {
			Success bool `json:"success"`
		}
		response := Response{Success: false}
		json.NewEncoder(w).Encode(response)
    return
	}
  type Response struct {
    Success bool                            `json:"success"`
    Article ArticleWithCompanyNameAndAmount `json:"article"`
  }
  response := Response{Success: true, Article: *article}
  json.NewEncoder(w).Encode(response)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateArticle(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	// extract article from json response
	reqBody, _ := ioutil.ReadAll(r.Body)
	var unmarshaledArticle Article
	json.Unmarshal(reqBody, &unmarshaledArticle)

	// create new article in database
	article, err := s.Db.CreateArticle(unmarshaledArticle.Name, unmarshaledArticle.CompanyId, unmarshaledArticle.ArticleNumber, unmarshaledArticle.Barcode)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	marshaledArticle, marshalErr := json.Marshal(article)
	if marshalErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	articlestring, _ := json.Marshal(article)
	w.Write(articlestring)
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	_, err := s.Db.UpdateArticle(article)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	marshaledArticle, marshalErr := json.Marshal(article)
	if marshalErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	err = s.Db.DeleteArticle(articleId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	action := fmt.Sprintf("{\"action\":\"deleteArticle\", \"data\":{\"id\":%v}}", articleId)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompanies(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	companies, err := s.Db.Companies()
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	companies, companiesErr := s.Db.CompaniesWithValue(inventoryId)
	if companiesErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompaniesWithInventory(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	companies, err := s.Db.Companies()
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(companies)
}

// ------------------------------------------------------------------------------
func (s *Server) GetArticlesOfCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	companyIdStr := vars["id"]
	companyId, strconvErr := strconv.Atoi(companyIdStr)
	if strconvErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	articles, err := s.Db.ArticlesOfCompany(companyId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(articles)
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	companyIdStr := vars["id"]
	companyId, strconvErr := strconv.Atoi(companyIdStr)
	if strconvErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	company, err := s.Db.Company(companyId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(company)
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompanyLogo(w http.ResponseWriter, r *http.Request) {
	//if !s.CheckAuthorized(w, r) {
	//	return
	//}
	vars := mux.Vars(r)
  companyIdStr := vars["id"]
	companyId, strconvErr := strconv.Atoi(companyIdStr)
	if strconvErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
  logo, err := s.Db.GetCompanyLogo(companyId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
  sDec, _ := b64.StdEncoding.DecodeString(string(logo))
  w.Header().Set("Content-Type", "image/jpeg")
  w.Write(sDec)
}
// ------------------------------------------------------------------------------
func (s *Server) SetCompanyLogo(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}

	vars := mux.Vars(r)
  companyIdStr := vars["id"]
	companyId, strconvErr := strconv.Atoi(companyIdStr)
	if strconvErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
  
	type Img struct {
		Data string `json:"data"`
	}
	reqBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	var img Img
	json.Unmarshal(reqBody, &img)
  s.Db.AddCompanyLogo(companyId, []byte(img.Data))
}

// ------------------------------------------------------------------------------
func (s *Server) GetCompanyWithValue(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	vars := mux.Vars(r)
	companyIdStr := vars["companyId"]
	companyId, strconvCompanyErr := strconv.Atoi(companyIdStr)
	if strconvCompanyErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	inventoryIdStr := vars["inventoryId"]
	inventoryId, strconvInventoryErr := strconv.Atoi(inventoryIdStr)
	if strconvInventoryErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	company, err := s.Db.CompanyWithValue(companyId, inventoryId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(company)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateCompany(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	reqBody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	fmt.Printf("client: response body: %s\n", reqBody)
	var unmarshaledCompany Company
	json.Unmarshal(reqBody, &unmarshaledCompany)

	company, err := s.Db.CreateCompany(unmarshaledCompany.Name)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	marshaledCompany, marshalErr := json.Marshal(company)
	if marshalErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	s.Db.UpdateCompany(company)
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	s.Db.DeleteCompany(companyId)
	action := fmt.Sprintf("{\"action\":\"deleteCompany\", \"data\":{\"id\":%v}}", companyId)
	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
// inventoryData-related
// ------------------------------------------------------------------------------
func (s *Server) UpdateInventoryData(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	if !s.CheckAuthorized(w, r) {
		return
	}

	var inventoryData InventoryData
	json.Unmarshal(reqBody, &inventoryData)
  err := s.Db.UpdateInventoryData(inventoryData)
  if (err != nil) {
    fmt.Println(err.Error())
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
  }
	marshaledInventoryData, marshalErr := json.Marshal(inventoryData)
	if marshalErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	action := fmt.Sprintf("{\"action\":\"updateInventoryData\", \"data\":%v}", string(marshaledInventoryData))

	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateAmount(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	if !s.CheckAuthorized(w, r) {
		return
	}

	var amount InventoryDataJustAmount
	json.Unmarshal(reqBody, &amount)
	inventoryData, err := s.Db.UpdateAmount(amount)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	marshaledInventoryData, marshalErr := json.Marshal(inventoryData)
	if marshalErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	action := fmt.Sprintf("{\"action\":\"updateInventoryData\", \"data\":%v}", string(marshaledInventoryData))

	s.SendToWebSockets([]byte(action))
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateBarcode(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}

	vars := mux.Vars(r)
	articleIdStr := vars["id"]
	articleId, err := strconv.Atoi(articleIdStr)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var article ArticleWithBarcodeOnly
	article.Id = articleId
	article.Barcode = r.Header.Get("barcode")
	err = s.Db.UpdateBarcode(article)

	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// ------------------------------------------------------------------------------
func (s *Server) GetInventories(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorized(w, r) {
		return
	}
	inventories, err := s.Db.Inventories()
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	inventory, err := s.Db.Inventory(inventoryId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(inventory)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateInventory(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	var unmarshaledInventory Inventory
	json.Unmarshal(reqBody, &unmarshaledInventory)
	if !s.CheckAuthorized(w, r) {
		return
	}

	inventory, err := s.Db.CreateInventory(unmarshaledInventory.Name)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	s.Db.UpdateInventory(inventory)

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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	s.Db.DeleteInventory(inventoryId)

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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	articleIdStr := vars["articleId"]
	articleId, articleErr := strconv.Atoi(articleIdStr)
	if articleErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	inventoryData, err := s.Db.InventoryDataOfArticle(inventoryId, articleId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	inventoryIdStr := vars["inventoryId"]
	inventoryId, inventoryErr := strconv.Atoi(inventoryIdStr)
	if inventoryErr != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	articles, err := s.Db.InventoryOfCompany(inventoryId, companyId)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
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
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var totalValue float32
	companies, err := s.Db.Companies()
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	for _, company := range companies {
		value, err := s.Db.ValueOfCompany(company.Id, inventoryId)
		if err != nil {
      fmt.Println("Error when getting value of company")
      fmt.Println(err.Error())
			// TODO send message with error
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
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
	inventories, err := s.Db.InventoriesWithValue()
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(inventories)
}

// ------------------------------------------------------------------------------
func (s *Server) CreateUser(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedAdmin(w, r) {
		return
	}
	username, password, ok := r.BasicAuth()
	if !ok {
		WriteUnauthorizedToResponse(&w)
		return
	}

	isAdmin, parseErr := strconv.ParseBool(r.Header.Get("isAdmin"))
	if parseErr != nil {
		isAdmin = false
	}
	user := UserWithPassword{User: User{Name: username, IsAdmin: isAdmin}, Password: password}

	_, err := s.Db.CreateUser(user.Name, user.Password, user.IsAdmin)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

// ------------------------------------------------------------------------------
func (s *Server) UpdateUser(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedAdmin(w, r) {
		return
	}

	oldUserName := r.Header.Get("user")
	fmt.Println(oldUserName)

	password := r.Header.Get("password")
	if password != "" {
		fmt.Println(password)
		err := s.Db.UpdateUserPassword(oldUserName, password)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
		}
	}

	isAdmin, isAdminErr := strconv.ParseBool(r.Header.Get("isAdmin"))
	if isAdminErr == nil {
		fmt.Println(isAdmin)
		err := s.Db.UpdateUserIsAdmin(oldUserName, isAdmin)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Println(err)
		}
	}

	newUserName := r.Header.Get("newUser")
	if newUserName != "" {
		fmt.Println(newUserName)
		err := s.Db.UpdateUserName(oldUserName, newUserName)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
		}
	}
}

// ------------------------------------------------------------------------------
func (s *Server) GetUsers(w http.ResponseWriter, r *http.Request) {
	if !s.CheckAuthorizedAdmin(w, r) {
		return
	}
	users, err := s.Db.Users()
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(users)
}

// ------------------------------------------------------------------------------
func (s *Server) GenerateJWT(username string, isAdmin bool) (string, error) {
	expirationTime := time.Now().Add(30 * time.Minute)
	claims := &Claims{
		Username: username,
		IsAdmin:  isAdmin,
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
	user, err := s.Db.UserWithHashedPassword(username)
	if err != nil {
		// TODO send message with error
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	success := VerifyPassword(user.HashedPassword, password)

	if success {
		var token, errToken = s.GenerateJWT(username, user.IsAdmin)
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
				IsAdmin bool   `json:"isAdmin"`
			}
			w.Header().Set("Content-Type", "application/json")
			var res = Response{Success: true, Token: token, IsAdmin: user.IsAdmin}
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
		return jwtSecret, nil
	})
	if err != nil && !token.Valid {
		if err == jwt.ErrSignatureInvalid {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
	}

	if time.Until(claims.ExpiresAt.Time) < -time.Minute*15 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var renewedToken, errToken = s.GenerateJWT(claims.Username, claims.IsAdmin)
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
func (s *Server) HandleRequests() {
	s.Router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../frontend/build/index.html")
	})

	// frontend
	s.Router.PathPrefix("/static").Handler(
		http.StripPrefix(
			"/static",
			http.FileServer(
				http.Dir("../frontend/build/static"))))

	// websockets
	s.Router.HandleFunc("/ws", s.HandleWebsocket)

	// pdf
	s.Router.HandleFunc(
		"/api/pdf/{id}", s.GetPdf).
		Methods("GET")

	// company-related
	s.Router.HandleFunc(
		"/api/companies",
		s.GetCompanies).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/companies/value/{inventoryId}",
		s.GetCompaniesWithValue).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/companies/inventory/{inventoryId}",
		s.GetCompaniesWithInventory).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/company",
		s.CreateCompany).
		Methods("POST")

	s.Router.HandleFunc(
		"/api/company/{id}",
		s.GetCompany).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/company/{id}/logo",
		s.GetCompanyLogo).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/company/{id}/logo",
		s.SetCompanyLogo).
		Methods("POST")

	s.Router.HandleFunc(
		"/api/company/{companyId}/value/{inventoryId}",
		s.GetCompanyWithValue).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/company/{id}",
		s.UpdateCompany).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/company/{id}",
		s.DeleteCompany).
		Methods("DELETE")

	// article-related
	s.Router.HandleFunc(
		"/api/articles",
		s.GetArticles).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/article",
		s.CreateArticle).
		Methods("POST")

	s.Router.HandleFunc(
		"/api/company/{id}/articles",
		s.GetArticlesOfCompany).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/company/{companyId}/inventory/{inventoryId}",
		s.GetInventoryOfCompany).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/article/{id}",
		s.UpdateArticle).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/article/{id}/barcode",
		s.UpdateBarcode).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/article/{id}",
		s.DeleteArticle).
		Methods("DELETE")

	s.Router.HandleFunc(
		"/api/article/{id}",
		s.GetArticle).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/article/from-barcode/{barcode}",
		s.GetArticleFromBarcode).
		Methods("GET")

	// inventoryData-related
	s.Router.HandleFunc(
		"/api/inventorydata",
		s.UpdateInventoryData).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/amount",
		s.UpdateAmount).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/inventories",
		s.GetInventories).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/inventory",
		s.CreateInventory).
		Methods("POST")

	s.Router.HandleFunc(
		"/api/inventory/{id}",
		s.UpdateInventory).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/inventory/{id}",
		s.DeleteInventory).
		Methods("DELETE")

	s.Router.HandleFunc(
		"/api/inventory/{id}",
		s.GetInventory).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/inventory/{id}/value",
		s.GetInventoryWithValue).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/inventories/value",
		s.GetInventoriesWithValue).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/inventory/{inventoryId}/inventorydata/{articleId}",
		s.GetInventoryDataOfArticle).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/users", s.GetUsers).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/user", s.CreateUser).
		Methods("POST")

	s.Router.HandleFunc(
		"/api/user", s.UpdateUser).
		Methods("PUT")

	s.Router.HandleFunc(
		"/api/login", s.Login).
		Methods("GET")

	s.Router.HandleFunc(
		"/api/renew", s.Renew).
		Methods("GET")
}

// ------------------------------------------------------------------------------
func (s *Server) HandleWebsocket(w http.ResponseWriter, r *http.Request) {
	type Token struct {
		Token string `json:"token"`
	}
	conn, _ := upgrader.Upgrade(w, r, nil)
	fmt.Println("new connection")

	s.ClientsMutex.Lock()
	// initally set this to false which marks the connection unauthorized
	s.Clients[conn] = false
	s.ClientsMutex.Unlock()

	for {
		mt, bytes, err := conn.ReadMessage()

		// if not already authorized
		s.ClientsMutex.Lock()
		if !s.Clients[conn] {
			var token Token
			parseErr := json.Unmarshal(bytes, &token)
			if parseErr == nil {
				claims := &Claims{}

				tkn, err := jwt.ParseWithClaims(token.Token, claims, func(token *jwt.Token) (interface{}, error) {
					return jwtSecret, nil
				})
				if err != nil {
					if err == jwt.ErrSignatureInvalid {
						w.WriteHeader(http.StatusUnauthorized)
						s.Clients[conn] = false
						conn.WriteMessage(websocket.TextMessage, []byte("{\"action\":\"authorization\", \"authorized\":false}"))
					}
					w.WriteHeader(http.StatusBadRequest)
					s.Clients[conn] = false
					conn.WriteMessage(websocket.TextMessage, []byte("{\"action\":\"authorization\", \"authorized\":false}"))
				} else if !tkn.Valid {
					w.WriteHeader(http.StatusUnauthorized)
					s.Clients[conn] = false
					conn.WriteMessage(websocket.TextMessage, []byte("{\"action\":\"authorization\", \"authorized\":false}"))
				} else {
					s.Clients[conn] = true
					conn.WriteMessage(websocket.TextMessage, []byte("{\"action\":\"authorization\", \"authorized\":true}"))
				}
			}
		}
		s.ClientsMutex.Unlock()

		if err != nil || mt == websocket.CloseMessage {
			break // Exit the loop if the client tries to close the connection or the connection is interrupted
		}
	}

	s.ClientsMutex.Lock()
	delete(s.Clients, conn) // Removing the connection
	s.ClientsMutex.Unlock()
	fmt.Println("connection closed")
	conn.Close()
}

// ------------------------------------------------------------------------------
func (s *Server) SendToWebSockets(message []byte) {
	s.ClientsMutex.Lock()
	for conn := range s.Clients {
		if s.Clients[conn] {
			conn.WriteMessage(websocket.TextMessage, message)
		}
	}
	s.ClientsMutex.Unlock()
}

// ------------------------------------------------------------------------------
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
  if useSSL {
    fmt.Println("TLS domain", domain)
    certManager := autocert.Manager{
      Prompt:     autocert.AcceptTOS,
      HostPolicy: autocert.HostWhitelist(domain),
      Cache:      autocert.DirCache("certs"),
    }
    tlsConfig := certManager.TLSConfig()
    tlsConfig.GetCertificate = getSelfSignedOrLetsEncryptCert(&certManager)
    server := http.Server{
    	Addr:      ":" + strconv.Itoa(port),
    	Handler:   s.Router,
    	TLSConfig: tlsConfig,
    }
    if err := server.ListenAndServeTLS("", ""); err != nil {
      fmt.Println(err)
    }
  } else {
    server := http.Server{
    	Addr:      ":" + strconv.Itoa(port),
    	Handler:   s.Router,
    }
    server.ListenAndServe()
  }
}

// ------------------------------------------------------------------------------
func (s *Server) Close() {
	s.Db.Close()
}

func CreateOrReadJWTSecret(n int, path string) error {
	jwtSecret = make([]byte, n)
	if _, statErr := os.Stat(path); statErr == nil {
		var e error
		jwtSecret, e = os.ReadFile(path)
		if e != nil {
			return e
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
			return err
		}
	}
  return nil
}

// ------------------------------------------------------------------------------
func NewServer() (*Server, error) {
	CreateOrReadJWTSecret(128, "jwtsecret")

	flag.StringVar(&domain, "domain", "", "domain name to request your certificate")
	flag.IntVar(&port, "port", 8080, "port to request your certificate")
  flag.BoolVar(&useSSL, "useSSL", false, "")
	flag.Parse()

	fmt.Println("Creating Server...")
	s := new(Server)
  db, err := NewDatabase()

  if (err != nil) {
    return nil, err
  }
	s.Db = db
	fmt.Println("Creating Router...")
	s.Router = mux.NewRouter().StrictSlash(true)

	fmt.Println("Creating Router... done!")
	s.Clients = make(map[*websocket.Conn]bool)
	fmt.Println("Creating REST API...")
	s.HandleRequests()
	fmt.Println("Creating REST API... done!")
	fmt.Println("Creating Server... done!")
	return s, nil
}

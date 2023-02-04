// in MySQL this needs to be executed:
//
// CREATE DATABASE inventory;
// CREATE USER inventory IDENTIFIED BY '';
// GRANT ALL PRIVILEGES ON inventory.* TO inventory;
// FLUSH PRIVILEGES;
// USE inventory;

package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"os"
)

// -----------------------------------------------------------------------------
type Database struct {
	db *sql.DB
}

// -----------------------------------------------------------------------------
func (db *Database) Articles() []Article {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name, articleNumber FROM articles")
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}

	var articles []Article
	for rows.Next() {
		var article Article
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&article.Id, &article.Name, &article.ArticleNumber); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		// and then print out the tag's Name attribute
		articles = append(articles, article)
	}
	rows.Close()
	return articles
}

// -----------------------------------------------------------------------------
func (db *Database) Article(id int) *Article {
	q := fmt.Sprintf("SELECT id, name, articleNumber FROM articles WHERE id = %v", id)

	rows, err := db.db.Query(q)
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	for rows.Next() {
		var article Article
		// for each row, scan the result into our tag composite object
		err = rows.Scan(&article.Id, &article.Name, &article.ArticleNumber)
		if err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		rows.Close()
		return &article
	}
	rows.Close()
	return nil
}

// -----------------------------------------------------------------------------
func (db *Database) User(name string) User {
	user := User{Name: name}
	q := fmt.Sprintf("SELECT isAdmin FROM users WHERE name = '%s'", name)
	err := db.db.QueryRow(q).Scan(&user.IsAdmin)
	if err != nil {
          panic(err)
	}
	return user
}

// -----------------------------------------------------------------------------
func (db *Database) UserWithHashedPassword(name string) UserWithHashedPassword {
	var user UserWithHashedPassword
        user.Name = name
	q := fmt.Sprintf("SELECT hashedPassword, isAdmin FROM users WHERE name = '%s'", name)
	err := db.db.QueryRow(q).Scan(&user.HashedPassword, &user.IsAdmin)
	if err != nil {
          panic(err)
	}
	return user
}

// -----------------------------------------------------------------------------
func (db *Database) Users() []User {
	rows, err := db.db.Query("SELECT name, isAdmin FROM users")
	if err != nil {
          panic(err)
	}
	var users []User
	for rows.Next() {
		var user User
		if err = rows.Scan(&user.Name, &user.IsAdmin); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		users = append(users, user)
	}
	rows.Close()
	return users
}

// -----------------------------------------------------------------------------
func (db *Database) UsersWithHashedPassword() []UserWithHashedPassword {
	rows, err := db.db.Query("SELECT hashedPassword, name, isAdmin FROM users")
	if err != nil {
          panic(err)
	}
	var users []UserWithHashedPassword
	for rows.Next() {
		var user UserWithHashedPassword
		if err = rows.Scan(&user.HashedPassword, &user.Name, &user.IsAdmin); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		users = append(users, user)
	}
	rows.Close()
	return users
}

// -----------------------------------------------------------------------------
func (db *Database) CreateUser(name string, password string, isAdmin bool) UserWithHashedPassword {
	hashedPassword, hashErr := HashPassword(password)
	if hashErr != nil {
		panic(hashErr.Error()) // proper error handling instead of panic in your app
	}
        user := UserWithHashedPassword{User:User{Name: name, IsAdmin: isAdmin}, HashedPassword: hashedPassword}
	// create new article in database
	q := fmt.Sprintf("INSERT INTO users (name, hashedPassword, isAdmin) VALUES ('%v','%v', %v)",
		name, hashedPassword, isAdmin)
	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		panic(err)
	}
	return user
}

// -----------------------------------------------------------------------------
func (db *Database) CreateArticle(name string, companyId int, articleNumber string) Article {
	var article Article
	// create new article in database
	dbErr := db.db.QueryRow(
		fmt.Sprintf("INSERT INTO articles (name, companyId, articleNumber) VALUES ('%v', %v, '%v') RETURNING id",
			name, companyId, articleNumber)).Scan(&article.Id)
	if dbErr != nil {
		panic(dbErr.Error()) // proper error handling instead of panic in your app
	}
	// create new inventory data for new articles in database
	rows, dbErr := db.db.Query("INSERT INTO inventoryData (articleId, inventoryId) SELECT ? as articleId, id as inventoryId FROM inventories", article.Id)
	rows.Close()
	if dbErr != nil {
		panic(dbErr.Error()) // proper error handling instead of panic in your app
	}

	article.Name = name
	article.CompanyId = companyId
	article.ArticleNumber = articleNumber
	return article
}

// ------------------------------------------------------------------------------
func (db *Database) UpdateArticle(article Article) Article {
	q := fmt.Sprintf("UPDATE articles SET name = '%v', articleNumber = '%v' WHERE id = %v", article.Name, article.ArticleNumber, article.Id)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	return article
}

// ------------------------------------------------------------------------------
func (db *Database) DeleteArticle(id int) {
	// delete inventory data of article
	rows, deleteInventoryDataErr := db.db.Query("DELETE FROM inventoryData WHERE articleId =?", id)
	rows.Close()
	if deleteInventoryDataErr != nil {
		panic(deleteInventoryDataErr.Error()) // proper error handling instead of panic in your app
	}
	rows2, deleteArticlesErr := db.db.Query("DELETE FROM articles WHERE id =?", id)
	rows2.Close()
	if deleteArticlesErr != nil {
		panic(deleteArticlesErr.Error()) // proper error handling instead of panic in your app
	}
}

// ------------------------------------------------------------------------------
func (db *Database) Companies() []Company {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name FROM companies")
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}

	var companies []Company
	for rows.Next() {
		var company Company
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&company.Id, &company.Name); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		// and then print out the tag's Name attribute
		companies = append(companies, company)
	}
	rows.Close()
	return companies
}

// ------------------------------------------------------------------------------
func (db *Database) CompaniesWithValue(inventoryId int) []CompanyWithValue {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name FROM companies")
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}

	var companies []CompanyWithValue
	for rows.Next() {
		var company CompanyWithValue
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&company.Id, &company.Name); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		company.Value = db.ValueOfCompany(company.Id, inventoryId)
		// and then print out the tag's Name attribute
		companies = append(companies, company)
	}
	rows.Close()
	return companies
}

// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
func (db *Database) ArticlesOfCompany(companyId int) []Article {
	q := fmt.Sprintf("SELECT id, name, articleNumber FROM articles WHERE companyId = %v", companyId)
	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	var articles []Article
	for rows.Next() {
		var article Article
		// for each row, scan the result into our tag composite object
		err := rows.Scan(&article.Id, &article.Name, &article.ArticleNumber)
		if err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		articles = append(articles, article)
	}
	rows.Close()
	return articles
}

// ------------------------------------------------------------------------------
func (db *Database) Company(id int) *Company {
	q := fmt.Sprintf("SELECT id, name FROM companies WHERE id = %v", id)
	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
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
		rows.Close()
		return &company
	}
	rows.Close()
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) CompanyWithValue(companyId int, inventoryId int) *CompanyWithValue {
	rawCompany := db.Company(companyId)
	if rawCompany == nil {
		return nil
	}
	var company CompanyWithValue
	company.Company = *rawCompany
	company.Value = db.ValueOfCompany(companyId, inventoryId)
	return &company
}

// -----------------------------------------------------------------------------
func (db *Database) ValueOfCompany(companyId int, inventoryId int) float32 {
	q := fmt.Sprintf("SELECT SUM(amount * purchasePrice) FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id WHERE inventoryId=%v AND companyId=%v", inventoryId, companyId)
        var value sql.NullFloat64
	err := db.db.QueryRow(q).Scan(&value)
	if err != nil {
		panic(err) // proper error handling instead of panic in your app
	}
        if value.Valid == false {
          return 0
        }
        return float32(value.Float64)
}
//func (db *Database) ValueOfCompany(companyId int, inventoryId int) float32 {
//	type Mem struct {
//		PurchasePrice float32
//		Amount        int
//	}
//	var valueOfGoods float32
//	q := fmt.Sprintf(
//		"SELECT inventoryData.purchasePrice, inventoryData.amount FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = inventoryData.inventoryId WHERE inventories.id = %v AND companies.id = %v",
//		inventoryId, companyId)
//
//	rows, err := db.db.Query(q)
//	if err != nil {
//		panic(err.Error()) // proper error handling instead of panic in your app
//	}
//	var articles []Mem
//	for rows.Next() {
//		var article Mem
//		// for each row, scan the result into our tag composite object
//		err = rows.Scan(&article.PurchasePrice, &article.Amount)
//		if err != nil {
//			panic(err.Error()) // proper error handling instead of panic in your app
//		}
//		articles = append(articles, article)
//	}
//	for _, article := range articles {
//		valueOfGoods += float32(article.Amount) * article.PurchasePrice
//	}
//	return valueOfGoods
//}

// ------------------------------------------------------------------------------
func (db *Database) CreateCompany(name string) Company {
	var company Company
	company.Name = name

	q := fmt.Sprintf("INSERT INTO companies (Name) VALUES ('%v') RETURNING id", name)

	dbErr := db.db.QueryRow(q).Scan(&company.Id)
	if dbErr != nil {
		panic(dbErr.Error()) // proper error handling instead of panic in your app
	}
	return company
}

// ------------------------------------------------------------------------------
func (db *Database) UpdateCompany(company Company) {
	q := fmt.Sprintf("UPDATE companies SET name = '%v' WHERE id = %v", company.Name, company.Id)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
}

// ------------------------------------------------------------------------------
func (db *Database) DeleteCompany(id int) {
	// delete all inventory data of all articles of company
	rows0, inventoryDataDeleteErr := db.db.Query(
		fmt.Sprintf(
			"DELETE inventoryData FROM articles JOIN inventoryData ON inventoryData.articleId = articles.id WHERE companyId = %v",
			id))
	rows0.Close()
	if inventoryDataDeleteErr != nil {
		panic(inventoryDataDeleteErr.Error()) // proper error handling instead of panic in your app
	}
	rows1, articlesDeleteErr := db.db.Query(
		fmt.Sprintf("DELETE FROM articles WHERE companyId =%v", id))
	rows1.Close()
	if articlesDeleteErr != nil {
		panic(articlesDeleteErr.Error()) // proper error handling instead of panic in your app
	}
	rows2, companiesDeleteErr := db.db.Query(
		fmt.Sprintf("DELETE FROM companies WHERE id = %v", id))
	rows2.Close()
	if companiesDeleteErr != nil {
		panic(companiesDeleteErr.Error()) // proper error handling instead of panic in your app
	}
}

// ------------------------------------------------------------------------------
// Updates amount of an article
func (db *Database) UpdateInventoryData(inventoryData InventoryData) {
	q := fmt.Sprintf("UPDATE inventoryData SET amount = %v, purchasePrice = %v, percentage = %v, notes = '%v' WHERE articleId = %v AND inventoryId = %v", inventoryData.Amount, inventoryData.PurchasePrice, inventoryData.Percentage, inventoryData.Notes, inventoryData.ArticleId, inventoryData.InventoryId)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
}

// ------------------------------------------------------------------------------
// Returns list of all inventories
func (db *Database) Inventories() []Inventory {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name FROM inventories")
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}

	var inventories []Inventory
	for rows.Next() {
		var inventory Inventory
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&inventory.Id, &inventory.Name); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		// and then print out the tag's Name attribute
		inventories = append(inventories, inventory)
	}
	rows.Close()
	return inventories
}

// ------------------------------------------------------------------------------
func (db *Database) Inventory(id int) *Inventory {
	q := fmt.Sprintf("SELECT id, name FROM inventories WHERE id = %v", id)

	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	for rows.Next() {
		var inventory Inventory
		// for each row, scan the result into our tag composite object
		err = rows.Scan(&inventory.Id, &inventory.Name)
		if err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		rows.Close()
		return &inventory
	}
	rows.Close()
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryWithValue(id int) *InventoryWithValue {
	var inventory InventoryWithValue
	rawInventory := db.Inventory(id)
	if rawInventory == nil {
		return nil
	}
	inventory.Inventory = *rawInventory
	inventory.Value = db.ValueOfInventory(rawInventory.Id)
	return &inventory

}

// ------------------------------------------------------------------------------
func (db *Database) InventoriesWithValue() []InventoryWithValue {
	var inventoriesWithValue []InventoryWithValue
	for _, inv := range db.Inventories() {
		inventoriesWithValue = append(inventoriesWithValue, *db.InventoryWithValue(inv.Id))
	}
	return inventoriesWithValue
}

// ------------------------------------------------------------------------------
func (db *Database) ValueOfInventory(id int) float32 {
  value := float32(0)
  if db.NumberOfArticles() == 0 { return value; }
	q := fmt.Sprintf("SELECT SUM(amount * purchasePrice) FROM inventoryData WHERE inventoryId=%v", id)
	err := db.db.QueryRow(q).Scan(&value)
	if err != nil {
		panic(err) // proper error handling instead of panic in your app
	}
	return value
}

// ------------------------------------------------------------------------------
func (db *Database) CreateInventory(name string) Inventory {
	var inventory Inventory
	inventory.Name = name
	dbErr := db.db.QueryRow(fmt.Sprintf(
		"INSERT INTO inventories (name) VALUES ('%v') RETURNING id",
		name)).Scan(&inventory.Id)
	if dbErr != nil {
		panic(dbErr.Error()) // proper error handling instead of panic in your app
	}

	// create new inventory data for present articles in database
	rows, dbErr := db.db.Query("INSERT INTO inventoryData (articleId, inventoryId) SELECT id as articleId, ? as inventoryId FROM articles", inventory.Id)
	rows.Close()
	if dbErr != nil {
		panic(dbErr.Error()) // proper error handling instead of panic in your app
	}
	return inventory
}

// ------------------------------------------------------------------------------
func (db *Database) UpdateInventory(inventory Inventory) {
	q := fmt.Sprintf(
		"UPDATE inventories SET name = '%v' WHERE id = %v",
		inventory.Name, inventory.Id)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
}

// ------------------------------------------------------------------------------
func (db *Database) DeleteInventory(id int) {
	// delete inventoryData of inventory
	rows0, inventoryDataDeleteErr := db.db.Query("DELETE FROM inventoryData WHERE articleId =?", id)
	rows0.Close()
	if inventoryDataDeleteErr != nil {
		panic(inventoryDataDeleteErr.Error()) // proper error handling instead of panic in your app
	}

	rows1, inventoryDeleteErr := db.db.Query("DELETE FROM inventories WHERE id =?", id)
	rows1.Close()
	if inventoryDeleteErr != nil {
		panic(inventoryDeleteErr.Error()) // proper error handling instead of panic in your app
	}
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryData(id int) []InventoryData {
	q := fmt.Sprintf("SELECT * FROM inventoryData WHERE inventoryId =%v", id)

	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	var inventoryData []InventoryData
	for rows.Next() {
		var inventoryDate InventoryData
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&inventoryDate.ArticleId, &inventoryDate.InventoryId, &inventoryDate.Amount); err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		// and then print out the tag's Name attribute
		inventoryData = append(inventoryData, inventoryDate)
	}
	rows.Close()
	return inventoryData
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryDataOfArticle(inventoryId int, articleId int) InventoryData {
	var data InventoryData
	data.ArticleId = articleId
	data.InventoryId = inventoryId
	q := fmt.Sprintf(
		"SELECT amount, purchasePrice, percentage, notes FROM inventoryData WHERE inventoryId=%v AND articleId=%v",
		inventoryId, articleId)
	err := db.db.QueryRow(q).Scan(&data.Amount, &data.PurchasePrice, &data.Percentage, &data.Notes)
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	data.ComputeSellingPrice()
	return data
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryOfArticle(inventoryId int, articleId int) ArticleWithInventoryData {
	q := fmt.Sprintf(
		"SELECT articles.id, articles.name, inventoryData.purchasePrice, inventoryData.percentage, articles.barcode, articles.articleNumber, inventoryData.amount FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = inventoryData.inventoryId WHERE inventories.id = %v AND article.id = %v",
		inventoryId, articleId)

	var article ArticleWithInventoryData
	err := db.db.QueryRow(q).Scan(&article.Id, article.Name, article.PurchasePrice, article.Percentage, article.Barcode, article.ArticleNumber, article.Amount)
	if err != nil {
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	return article
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryOfCompany(inventoryId int, companyId int) []ArticleWithInventoryData {
	q := fmt.Sprintf(
		"SELECT articles.id, articles.name, inventoryData.purchasePrice, inventoryData.percentage, articles.barcode, articles.articleNumber, inventoryData.amount, inventoryData.notes FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = inventoryData.inventoryId WHERE inventories.id = %v AND companies.id = %v",
		inventoryId, companyId)

	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		panic(err.Error()) // proper error handling instead of panic in your app
	}
	var articles []ArticleWithInventoryData
	for rows.Next() {
		var article ArticleWithInventoryData
		// for each row, scan the result into our tag composite object
		err = rows.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode, &article.ArticleNumber, &article.Amount, &article.Notes)
		if err != nil {
			panic(err.Error()) // proper error handling instead of panic in your app
		}
		article.ComputeSellingPrice()
		articles = append(articles, article)
	}
	rows.Close()
	return articles
}

// ------------------------------------------------------------------------------
func (db *Database) Close() {
	db.db.Close()
}

// ------------------------------------------------------------------------------
func (db *Database) Initialize() {
	if !db.CompaniesTableCreated() {
		db.CreateCompaniesTable()
	}
	if !db.ArticlesTableCreated() {
		db.CreateArticlesTable()
	}
	if !db.InventoriesTableCreated() {
		db.CreateInventoriesTable()
	}
	if !db.InventoryDataTableCreated() {
		db.CreateInventoryDataTable()
	}
	if !db.UsersTableCreated() {
		db.CreateUsersTable()
	}
	var count int
	err := db.db.QueryRow("SELECT COUNT(*) as count FROM users").Scan(&count)
	if err != nil {
		panic(err)
	} else if count == 0 {
		db.CreateAdminUser()
	}
}

// ------------------------------------------------------------------------------
func (db *Database) NumberOfCompanies() int {
  var count int
	err := db.db.QueryRow("SELECT COUNT(*) as count FROM companies").Scan(&count)
  if err != nil {
    return 0
  }
  return count
}
// ------------------------------------------------------------------------------
func (db *Database) CompaniesTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM companies")
  if err == nil {
    rows.Close()
  }
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateCompaniesTable() {
	rows, err := db.db.Query("CREATE TABLE companies(id int NOT NULL AUTO_INCREMENT, name varchar(255) NOT NULL, imagePath varchar(255), primary key (id))")
	if err == nil {
    rows.Close()
  } else {
		panic(err.Error())
	}
}

// ------------------------------------------------------------------------------
func (db *Database) UsersTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM users")
  if err == nil {
    rows.Close()
  }
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateAdminUser() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("---------------------")
	fmt.Println("Create Admin Account")
	fmt.Println("---------------------")

	fmt.Print("name of admin account -> ")
	name, _ := reader.ReadString('\n')
	name = name[:len(name)-len("\n")] // remove \n
	passwordsMatch := false
	for ok := true; ok; ok = !passwordsMatch {
		fmt.Print("password -> ")
		pw1, _ := reader.ReadString('\n')
		fmt.Print("confirm password -> ")
		pw2, _ := reader.ReadString('\n')
		passwordsMatch = pw1 == pw2
		if !passwordsMatch {
			fmt.Println("Passwords do not match. Try again.")
		} else {
			pw1 = pw1[:len(pw1)-len("\n")] // remove \n
			db.CreateUser(name, pw1, true)
			fmt.Printf("User %v created\n", name)
		}
	}
}

// ------------------------------------------------------------------------------
func (db *Database) CreateUsersTable() {
	rows, err := db.db.Query("CREATE TABLE users (name varchar(255) NOT NULL, hashedPassword varchar(255) NOT NULL, isAdmin BOOLEAN NOT NULL, PRIMARY KEY (name), UNIQUE(name))")
	if err == nil {
    rows.Close()
  } else {
		panic(err.Error())
	}
}


// ------------------------------------------------------------------------------
func (db *Database) InventoriesTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM inventories")
  if err == nil {
    rows.Close()
  }
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateInventoriesTable() {
	rows, err := db.db.Query("CREATE TABLE inventories (id int NOT NULL AUTO_INCREMENT, name varchar(255) NOT NULL, PRIMARY KEY (id))")
	if err == nil {
    rows.Close()
  } else {
		panic(err.Error())
	}
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryDataTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM inventoryData")
  if err == nil {
    rows.Close()
  }
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateInventoryDataTable() {
	rows, err := db.db.Query("CREATE TABLE inventoryData (articleId int NOT NULL,inventoryId int NOT NULL,amount int DEFAULT 0,purchasePrice float DEFAULT 0,percentage float DEFAULT 0,notes varchar(255) DEFAULT '', FOREIGN KEY (articleId) REFERENCES articles(id),FOREIGN KEY (inventoryId) REFERENCES inventories(id))")
	if err == nil {
    rows.Close()
  } else {
		panic(err.Error())
	}
}

// ------------------------------------------------------------------------------
func (db *Database) NumberOfArticles() int {
  var count int
	err := db.db.QueryRow("SELECT COUNT(*) as count FROM articles").Scan(&count)
  if err != nil {
    return 0
  }
  return count
}

// ------------------------------------------------------------------------------
func (db *Database) ArticlesTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM articles")
  if err == nil {
    rows.Close()
  }
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateArticlesTable() {
	rows, err := db.db.Query("CREATE TABLE articles (id int NOT NULL AUTO_INCREMENT,companyId int NOT NULL,name varchar(255) NOT NULL,articleNumber varchar(255) NOT NULL,imagePath varchar(255),barcode int,FOREIGN KEY (companyId) REFERENCES companies(id),primary key (id))")
	if err == nil {
    rows.Close()
  } else {
		panic(err.Error())
  }
}

// ------------------------------------------------------------------------------
func NewDatabase() *Database {
	fmt.Println("Creating Database...")
	dbPack := new(Database)
	db, dbErr := sql.Open("mysql", "inventory:@tcp(127.0.0.1:3306)/inventory")
	if dbErr != nil {
		panic(dbErr.Error())
	}
	fmt.Println("Creating Database... done!")
	dbPack.db = db
	dbPack.Initialize()
	return dbPack
}

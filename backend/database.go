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
func (db *Database) Articles() ([]Article, error) {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name, articleNumber FROM articles")
	if err != nil {
		return nil, err
	}

	var articles []Article
	for rows.Next() {
		var article Article
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&article.Id, &article.Name, &article.ArticleNumber); err != nil {
			return nil, err
		}
		// and then print out the tag's Name attribute
		articles = append(articles, article)
	}
	rows.Close()
	return articles, nil
}

// -----------------------------------------------------------------------------
func (db *Database) Article(id int) (*Article, error) {
	q := fmt.Sprintf("SELECT id, name, articleNumber FROM articles WHERE id = %v", id)

	var article Article
	err := db.db.QueryRow(q).Scan(&article.Id, &article.Name, &article.ArticleNumber, article.Barcode)
	if err != nil {
		return nil, err
	}
	return &article, nil
}

// -----------------------------------------------------------------------------
func (db *Database) ArticleFromBarcode(barcode string, inventoryId int) (*ArticleWithCompanyNameAndAmount, error) {
	q := fmt.Sprintf("SELECT articles.id, articles.name, articles.articleNumber, companies.name, inventoryData.amount FROM articles JOIN companies ON articles.companyId = companies.id JOIN inventoryData ON inventoryData.articleId = articles.id WHERE barcode = %v", barcode)

	var article ArticleWithCompanyNameAndAmount
	article.Barcode = &barcode
	err := db.db.QueryRow(q).Scan(&article.Id, &article.Name, &article.ArticleNumber, &article.CompanyName, &article.Amount)
	if err != nil {
		return nil, err
	}
	return &article, nil
}

// ------------------------------------------------------------------------------
// Updates amount of an article
func (db *Database) UpdateBarcode(article ArticleWithBarcodeOnly) error {
	fmt.Println(article)
	rows, err := db.db.Query("UPDATE articles SET barcode = ? WHERE id = ?", article.Barcode, article.Id)
	if err != nil {
		panic(err)
	} else {
		rows.Close()
	}
	return err
}

// -----------------------------------------------------------------------------
func (db *Database) User(name string) (*User, error) {
	user := User{Name: name}
	q := fmt.Sprintf("SELECT isAdmin FROM users WHERE name = '%s'", name)
	err := db.db.QueryRow(q).Scan(&user.IsAdmin)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// -----------------------------------------------------------------------------
func (db *Database) UserWithHashedPassword(name string) (*UserWithHashedPassword, error) {
	var user UserWithHashedPassword
	user.Name = name
	q := fmt.Sprintf("SELECT hashedPassword, isAdmin FROM users WHERE name = '%s'", name)
	err := db.db.QueryRow(q).Scan(&user.HashedPassword, &user.IsAdmin)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// -----------------------------------------------------------------------------
func (db *Database) Users() ([]User, error) {
	rows, err := db.db.Query("SELECT name, isAdmin FROM users")
	if err != nil {
		return nil, err
	}
	var users []User
	for rows.Next() {
		var user User
		if err = rows.Scan(&user.Name, &user.IsAdmin); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	rows.Close()
	return users, nil
}

// -----------------------------------------------------------------------------
func (db *Database) UsersWithHashedPassword() ([]UserWithHashedPassword, error) {
	rows, err := db.db.Query("SELECT hashedPassword, name, isAdmin FROM users")
	if err != nil {
		return nil, err
	}
	var users []UserWithHashedPassword
	for rows.Next() {
		var user UserWithHashedPassword
		if err = rows.Scan(&user.HashedPassword, &user.Name, &user.IsAdmin); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	rows.Close()
	return users, nil
}

// -----------------------------------------------------------------------------
func (db *Database) CreateUser(name string, password string, isAdmin bool) (*UserWithHashedPassword, error) {
	hashedPassword, hashErr := HashPassword(password)
	if hashErr != nil {
		return nil, hashErr
	}
	user := UserWithHashedPassword{User: User{Name: name, IsAdmin: isAdmin}, HashedPassword: hashedPassword}
	// create new article in database
	q := fmt.Sprintf("INSERT INTO users (name, hashedPassword, isAdmin) VALUES ('%v','%v', %v)",
		name, hashedPassword, isAdmin)
	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// -----------------------------------------------------------------------------
func (db *Database) UpdateUserName(oldName string, name string) error {
	if _, err := db.db.Exec("UPDATE users SET name = ? WHERE name = ?",
		name, oldName); err != nil {
		return err
	}
	return nil
}

// -----------------------------------------------------------------------------
func (db *Database) UpdateUserPassword(oldName string, password string) error {
	hashedPassword, hashErr := HashPassword(password)
	if hashErr != nil {
		return hashErr
	}
	if _, err := db.db.Exec("UPDATE users SET hashedPassword = ? WHERE name = ?",
		hashedPassword, oldName); err != nil {
		return err
	}
	return nil
}

// -----------------------------------------------------------------------------
func (db *Database) UpdateUserIsAdmin(oldName string, isAdmin bool) error {
	if _, err := db.db.Exec("UPDATE users SET isAdmin = ? WHERE name = ?",
		isAdmin, oldName); err != nil {
		return err
	}
	return nil
}

// -----------------------------------------------------------------------------
func (db *Database) CreateArticle(name string, companyId int, articleNumber string, barcode *string) (*Article, error) {
	var article Article
	// create new article in database
	var query string
	if barcode == nil {
		query = fmt.Sprintf("INSERT INTO articles (name, companyId, articleNumber) VALUES ('%v', %v, '%v') RETURNING id", name, companyId, articleNumber)
	} else {
		query = fmt.Sprintf("INSERT INTO articles (name, companyId, articleNumber, barcode) VALUES ('%v',%v,'%v','%v') RETURNING id", name, companyId, articleNumber, *barcode)
	}
	dbErr := db.db.QueryRow(query).Scan(&article.Id)
	if dbErr != nil {
		return nil, dbErr
	}
	// create new inventory data for new articles in database
	rows, dbErr := db.db.Query("INSERT INTO inventoryData (articleId, inventoryId) SELECT ? as articleId, id as inventoryId FROM inventories", article.Id)
	rows.Close()
	if dbErr != nil {
		return nil, dbErr
	}

	article.Name = name
	article.CompanyId = companyId
	article.ArticleNumber = articleNumber
	return &article, nil
}

// ------------------------------------------------------------------------------
func (db *Database) UpdateArticle(article Article) (*Article, error) {
	q := fmt.Sprintf("UPDATE articles SET name = '%v', articleNumber = '%v' WHERE id = %v", article.Name, article.ArticleNumber, article.Id)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		return nil, err
	}
	return &article, nil
}

// ------------------------------------------------------------------------------
func (db *Database) DeleteArticle(id int) error {
	// delete inventory data of article
	rows, deleteInventoryDataErr := db.db.Query("DELETE FROM inventoryData WHERE articleId = ?", id)
	rows.Close()
	if deleteInventoryDataErr != nil {
		return deleteInventoryDataErr
	}
	rows2, deleteArticlesErr := db.db.Query("DELETE FROM articles WHERE id = ?", id)
	rows2.Close()
	if deleteArticlesErr != nil {
		return deleteArticlesErr
	}
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) Companies() ([]Company, error) {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name FROM companies")
	if err != nil {
		rows.Close()
		return nil, err
	}

	var companies []Company
	for rows.Next() {
		var company Company
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&company.Id, &company.Name); err != nil {
			rows.Close()
			return nil, err
		}
		// and then print out the tag's Name attribute
		companies = append(companies, company)
	}
	rows.Close()
	return companies, nil
}

// ------------------------------------------------------------------------------
func (db *Database) CompaniesWithValue(inventoryId int) ([]CompanyWithValue, error) {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name FROM companies")
	if err != nil {
		rows.Close()
		return nil, err
	}

	var companies []CompanyWithValue
	for rows.Next() {
		var company CompanyWithValue
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&company.Id, &company.Name); err != nil {
			return nil, err
		}
		value, err := db.ValueOfCompany(company.Id, inventoryId)
		if err != nil {
			return nil, err
		}
		company.Value = value
		// and then print out the tag's Name attribute
		companies = append(companies, company)
	}
	rows.Close()
	return companies, nil
}

// ------------------------------------------------------------------------------
func (db *Database) ArticlesOfCompany(companyId int) ([]Article, error) {
	q := fmt.Sprintf("SELECT id, name, articleNumber FROM articles WHERE companyId = %v", companyId)
	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		return nil, err
	}
	var articles []Article
	for rows.Next() {
		var article Article
		// for each row, scan the result into our tag composite object
		err := rows.Scan(&article.Id, &article.Name, &article.ArticleNumber)
		if err != nil {
			return nil, err
		}
		articles = append(articles, article)
	}
	rows.Close()
	return articles, nil
}

// ------------------------------------------------------------------------------
func (db *Database) Company(id int) (*Company, error) {
	q := fmt.Sprintf("SELECT id, name FROM companies WHERE id = %v", id)
	var company Company
	err := db.db.QueryRow(q).Scan(&company.Id, &company.Name)
	if err != nil {
		return nil, err
	}
	return &company, nil
}

// ------------------------------------------------------------------------------
func (db *Database) CompanyWithValue(companyId int, inventoryId int) (*CompanyWithValue, error) {
	rawCompany, err := db.Company(companyId)
	if err != nil {
		return nil, err
	}
	var company CompanyWithValue
	company.Company = *rawCompany
	value, valueErr := db.ValueOfCompany(companyId, inventoryId)
	if valueErr != nil {
		return nil, valueErr
	}
	company.Value = value
	return &company, nil
}

// -----------------------------------------------------------------------------
func (db *Database) ValueOfCompany(companyId int, inventoryId int) (float32, error) {
	q := fmt.Sprintf("SELECT SUM(amount * purchasePrice) FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id WHERE inventoryId=%v AND companyId=%v", inventoryId, companyId)
	var value sql.NullFloat64
	err := db.db.QueryRow(q).Scan(&value)
	if err != nil {
		return 0, err
	}
	if value.Valid == false {
		return 0, nil
	}
	return float32(value.Float64), nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateCompany(name string) (*Company, error) {
	var company Company
	company.Name = name

	q := fmt.Sprintf("INSERT INTO companies (Name) VALUES ('%v') RETURNING id", name)

	dbErr := db.db.QueryRow(q).Scan(&company.Id)
	if dbErr != nil {
		return nil, dbErr
	}
	return &company, nil
}

// ------------------------------------------------------------------------------
func (db *Database) UpdateCompany(company Company) error {
	q := fmt.Sprintf("UPDATE companies SET name = '%v' WHERE id = %v", company.Name, company.Id)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		return err
	}
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) DeleteCompany(id int) error {
	// delete all inventory data of all articles of company
	rows0, inventoryDataDeleteErr := db.db.Query(
		fmt.Sprintf(
			"DELETE inventoryData FROM articles JOIN inventoryData ON inventoryData.articleId = articles.id WHERE companyId = %v",
			id))
	rows0.Close()
	if inventoryDataDeleteErr != nil {
		return inventoryDataDeleteErr
	}
	rows1, articlesDeleteErr := db.db.Query(
		fmt.Sprintf("DELETE FROM articles WHERE companyId =%v", id))
	rows1.Close()
	if articlesDeleteErr != nil {
		return articlesDeleteErr
	}
	rows2, companiesDeleteErr := db.db.Query(
		fmt.Sprintf("DELETE FROM companies WHERE id = %v", id))
	rows2.Close()
	if companiesDeleteErr != nil {
		return companiesDeleteErr
	}
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) AddCompanyLogo(id int, logo []byte) error {
	rows, err := db.db.Query("INSERT INTO companyLogos (companyId, img) VALUES (?,?)", id, logo)
  rows.Close()
  if (err != nil) {
    return err
  }
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) GetCompanyLogo(id int) ([]byte, error) {
  var logo []byte
	err := db.db.QueryRow("SELECT img FROM companyLogos WHERE companyId = ?", id).Scan(&logo)
  if (err != nil) {
    return nil, err
  }
	return logo, nil
}

// ------------------------------------------------------------------------------
// Updates amount of an article
func (db *Database) UpdateInventoryData(inventoryData InventoryData) error {
	q := fmt.Sprintf("UPDATE inventoryData SET amount = %v, purchasePrice = %v, percentage = %v, notes = '%v' WHERE articleId = %v AND inventoryId = %v", inventoryData.Amount, inventoryData.PurchasePrice, inventoryData.Percentage, inventoryData.Notes, inventoryData.ArticleId, inventoryData.InventoryId)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		return err
	}
	return nil
}

// ------------------------------------------------------------------------------
// Updates amount of an article
func (db *Database) UpdateAmount(amount InventoryDataJustAmount) (*InventoryData, error) {
	q := fmt.Sprintf("UPDATE inventoryData SET amount = %v WHERE articleId = %v AND inventoryId = %v", amount.Amount, amount.ArticleId, amount.InventoryId)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		return nil, err
	}
	inventoryData, err := db.InventoryDataOfArticle(amount.InventoryId, amount.ArticleId)
	if err != nil {
		return nil, err
	}
	return inventoryData, nil
}

// ------------------------------------------------------------------------------
// Returns list of all inventories
func (db *Database) Inventories() ([]Inventory, error) {
	// Execute the query
	rows, err := db.db.Query("SELECT id, name FROM inventories")
	if err != nil {
		rows.Close()
		return nil, err
	}

	var inventories []Inventory
	for rows.Next() {
		var inventory Inventory
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&inventory.Id, &inventory.Name); err != nil {
			rows.Close()
			return nil, err
		}
		// and then print out the tag's Name attribute
		inventories = append(inventories, inventory)
	}
	rows.Close()
	return inventories, nil
}

// ------------------------------------------------------------------------------
func (db *Database) Inventory(id int) (*Inventory, error) {
	q := fmt.Sprintf("SELECT id, name FROM inventories WHERE id = %v", id)

	var inventory Inventory
	err := db.db.QueryRow(q).Scan(&inventory.Id, &inventory.Name)
	if err != nil {
		return nil, err
	}
	return &inventory, nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryWithValue(id int) (*InventoryWithValue, error) {
	var inventory InventoryWithValue
	rawInventory, err := db.Inventory(id)
	if err != nil {
		return nil, err
	}
	inventory.Inventory = *rawInventory
	value, err := db.ValueOfInventory(rawInventory.Id)
	if err != nil {
		return nil, err
	}
	inventory.Value = value
	return &inventory, nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoriesWithValue() ([]InventoryWithValue, error) {
	var inventoriesWithValue []InventoryWithValue
	inventories, err := db.Inventories()
	if err != nil {
		return nil, err
	}
	for _, inv := range inventories {
		inventory, err := db.InventoryWithValue(inv.Id)
		if err != nil {
			return nil, err
		}
		inventoriesWithValue = append(inventoriesWithValue, *inventory)
	}
	return inventoriesWithValue, nil
}

// ------------------------------------------------------------------------------
func (db *Database) ValueOfInventory(id int) (float32, error) {
	value := float32(0)
	if db.NumberOfArticles() == 0 {
		return value, nil
	}
	q := fmt.Sprintf("SELECT SUM(amount * purchasePrice) FROM inventoryData WHERE inventoryId=%v", id)
	err := db.db.QueryRow(q).Scan(&value)
	if err != nil {
		return 0, err
	}
	return value, nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateInventory(name string) (*Inventory, error) {
	var inventory Inventory
	inventory.Name = name
	dbErr := db.db.QueryRow(fmt.Sprintf(
		"INSERT INTO inventories (name) VALUES ('%v') RETURNING id",
		name)).Scan(&inventory.Id)
	if dbErr != nil {
		return nil, dbErr
	}

	// create new inventory data for present articles in database
	rows, dbErr := db.db.Query("INSERT INTO inventoryData (articleId, inventoryId) SELECT id as articleId, ? as inventoryId FROM articles", inventory.Id)
	rows.Close()
	if dbErr != nil {
		return nil, dbErr
	}
	return &inventory, nil
}

// ------------------------------------------------------------------------------
func (db *Database) UpdateInventory(inventory Inventory) error {
	q := fmt.Sprintf(
		"UPDATE inventories SET name = '%v' WHERE id = %v",
		inventory.Name, inventory.Id)

	rows, err := db.db.Query(q)
	rows.Close()
	if err != nil {
		return err
	}
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) DeleteInventory(id int) error {
	// delete inventoryData of inventory
	rows0, inventoryDataDeleteErr := db.db.Query("DELETE FROM inventoryData WHERE articleId =?", id)
	rows0.Close()
	if inventoryDataDeleteErr != nil {
		return inventoryDataDeleteErr
	}

	rows1, inventoryDeleteErr := db.db.Query("DELETE FROM inventories WHERE id =?", id)
	rows1.Close()
	if inventoryDeleteErr != nil {
		return inventoryDeleteErr
	}
	return nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryData(id int) ([]InventoryData, error) {
	q := fmt.Sprintf("SELECT * FROM inventoryData WHERE inventoryId =%v", id)

	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		return nil, err
	}
	var inventoryData []InventoryData
	for rows.Next() {
		var inventoryDate InventoryData
		// for each row, scan the result into our tag composite object
		if err = rows.Scan(&inventoryDate.ArticleId, &inventoryDate.InventoryId, &inventoryDate.Amount); err != nil {
			return nil, err
		}
		// and then print out the tag's Name attribute
		inventoryData = append(inventoryData, inventoryDate)
	}
	rows.Close()
	return inventoryData, nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryDataOfArticle(inventoryId int, articleId int) (*InventoryData, error) {
	var data InventoryData
	data.ArticleId = articleId
	data.InventoryId = inventoryId
	q := fmt.Sprintf(
		"SELECT amount, purchasePrice, percentage, notes FROM inventoryData WHERE inventoryId=%v AND articleId=%v",
		inventoryId, articleId)
	err := db.db.QueryRow(q).Scan(&data.Amount, &data.PurchasePrice, &data.Percentage, &data.Notes)
	if err != nil {
		return nil, err
	}
	data.ComputeSellingPrice()
	return &data, nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryOfArticle(inventoryId int, articleId int) (*ArticleWithInventoryData, error) {
	q := fmt.Sprintf(
		"SELECT articles.id, articles.name, inventoryData.purchasePrice, inventoryData.percentage, articles.barcode, articles.articleNumber, inventoryData.amount FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = inventoryData.inventoryId WHERE inventories.id = %v AND article.id = %v",
		inventoryId, articleId)

	var article ArticleWithInventoryData
	err := db.db.QueryRow(q).Scan(&article.Id, article.Name, article.PurchasePrice, article.Percentage, article.Barcode, article.ArticleNumber, article.Amount)
	if err != nil {
		return nil, err
	}
	return &article, nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryOfCompany(inventoryId int, companyId int) ([]ArticleWithInventoryData, error) {
	q := fmt.Sprintf(
		"SELECT articles.id, articles.name, inventoryData.purchasePrice, inventoryData.percentage, articles.barcode, articles.articleNumber, inventoryData.amount, inventoryData.notes FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = inventoryData.inventoryId WHERE inventories.id = %v AND companies.id = %v",
		inventoryId, companyId)

	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		return nil, err
	}
	var articles []ArticleWithInventoryData
	for rows.Next() {
		var article ArticleWithInventoryData
		// for each row, scan the result into our tag composite object
		err = rows.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode, &article.ArticleNumber, &article.Amount, &article.Notes)
		if err != nil {
			rows.Close()
			return nil, err
		}
		article.ComputeSellingPrice()
		articles = append(articles, article)
	}
	rows.Close()
	return articles, nil
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryOfCompanyWithAmountCheck(inventoryId int, companyId int) ([]ArticleWithInventoryData, error) {
	q := fmt.Sprintf(
		"SELECT articles.id, articles.name, inventoryData.purchasePrice, inventoryData.percentage, articles.barcode, articles.articleNumber, inventoryData.amount, inventoryData.notes FROM inventoryData JOIN articles ON inventoryData.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = inventoryData.inventoryId WHERE inventories.id = %v AND companies.id = %v AND inventoryData.amount > 0",
		inventoryId, companyId)

	rows, err := db.db.Query(q)
	if err != nil {
		rows.Close()
		return nil, err
	}
	var articles []ArticleWithInventoryData
	for rows.Next() {
		var article ArticleWithInventoryData
		// for each row, scan the result into our tag composite object
		err = rows.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode, &article.ArticleNumber, &article.Amount, &article.Notes)
		if err != nil {
			rows.Close()
			return nil, err
		}
		article.ComputeSellingPrice()
		articles = append(articles, article)
	}
	rows.Close()
	return articles, nil
}

// ------------------------------------------------------------------------------
func (db *Database) Close() {
	db.db.Close()
}

// ------------------------------------------------------------------------------
func (db *Database) Initialize() error {
	if !db.CompaniesTableCreated() {
		db.CreateCompaniesTable()
	}
	if !db.CompanyLogosTableCreated() {
		db.CreateCompanyLogosTable()
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
    return err
	} else if count == 0 {
		db.CreateAdminUser()
	}
  return nil
}

// ------------------------------------------------------------------------------
func (db *Database) NumberOfCompanies() (int, error) {
	var count int
	err := db.db.QueryRow("SELECT COUNT(*) as count FROM companies").Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// ------------------------------------------------------------------------------
func (db *Database) CompaniesTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM companies")
	rows.Close()
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateCompaniesTable() error {
	rows, err := db.db.Query("CREATE TABLE companies(id int NOT NULL AUTO_INCREMENT, name varchar(255) NOT NULL, imagePath varchar(255), primary key (id))")
	rows.Close()
	return err
}

// ------------------------------------------------------------------------------
func (db *Database) CompanyLogosTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM companyLogos")
	rows.Close()
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateCompanyLogosTable() error {
	rows, err := db.db.Query("CREATE TABLE companyLogos(companyId int not null unique, img longblob not null)")
	rows.Close()
	return err
}

// ------------------------------------------------------------------------------
func (db *Database) UsersTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM users")
	rows.Close()
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
			_, err := db.CreateUser(name, pw1, true)
			if err != nil {
				fmt.Printf("Unexpected error creating user")
				passwordsMatch = false
			} else {
				fmt.Printf("User %v created\n", name)
			}
		}
	}
}

// ------------------------------------------------------------------------------
func (db *Database) CreateUsersTable() error {
	rows, err := db.db.Query("CREATE TABLE users (name varchar(255) NOT NULL, hashedPassword varchar(255) NOT NULL, isAdmin BOOLEAN NOT NULL, PRIMARY KEY (name), UNIQUE(name))")
	rows.Close()
	return err
}

// ------------------------------------------------------------------------------
func (db *Database) InventoriesTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM inventories")
	rows.Close()
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateInventoriesTable() error {
	rows, err := db.db.Query("CREATE TABLE inventories (id int NOT NULL AUTO_INCREMENT, name varchar(255) NOT NULL, PRIMARY KEY (id))")
	rows.Close()
	return err
}

// ------------------------------------------------------------------------------
func (db *Database) InventoryDataTableCreated() bool {
	rows, err := db.db.Query("SELECT COUNT(*) as count FROM inventoryData")
	rows.Close()
	return err == nil
}

// ------------------------------------------------------------------------------
func (db *Database) CreateInventoryDataTable() error {
	rows, err := db.db.Query("CREATE TABLE inventoryData (articleId int NOT NULL,inventoryId int NOT NULL,amount int DEFAULT 0,purchasePrice float DEFAULT 0,percentage float DEFAULT 0,notes varchar(255) DEFAULT '', FOREIGN KEY (articleId) REFERENCES articles(id),FOREIGN KEY (inventoryId) REFERENCES inventories(id))")
	rows.Close()
	return err
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
func (db *Database) CreateArticlesTable() error {
	rows, err := db.db.Query("CREATE TABLE articles (id int NOT NULL AUTO_INCREMENT,companyId int NOT NULL,name varchar(255) NOT NULL,articleNumber varchar(255) NOT NULL,barcode varchar(255),FOREIGN KEY (companyId) REFERENCES companies(id),primary key (id), unique(barcode))")
	rows.Close()
	return err
}

// ------------------------------------------------------------------------------
func NewDatabase() (*Database, error) {
	fmt.Println("Creating Database...")
	dbPack := new(Database)
	db, dbErr := sql.Open("mysql", "inventory:@tcp(127.0.0.1:3306)/inventory")
	if dbErr != nil {
		panic(dbErr.Error())
	}
	fmt.Println("Creating Database... done!")
	dbPack.db = db
  err := dbPack.Initialize()
  if err != nil {
    return nil, err
  }
	return dbPack, nil
}

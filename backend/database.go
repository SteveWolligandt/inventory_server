package main

import (
  "fmt"
  "database/sql"
)
//------------------------------------------------------------------------------
type Database struct {
  db *sql.DB
}
//------------------------------------------------------------------------------
func (db *Database) articles() [] Article {
  // Execute the query
  rows, err := db.db.Query("SELECT id, name, purchasePrice, percentage, barcode FROM articles")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }

  var articles [] Article
  for rows.Next() {
    var article Article
    // for each row, scan the result into our tag composite object
    if err = rows.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode, &article.ArticleNumber); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
    article.SellingPrice = article.PurchasePrice * (article.Percentage/100 + 1)
            // and then print out the tag's Name attribute
    articles = append(articles, article)
  }
  return articles
}
//------------------------------------------------------------------------------
func (db *Database) article(id int) *Article {
  q := fmt.Sprintf("SELECT id, name FROM articles WHERE id = %v", id)

  rows, err := db.db.Query(q)
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
    return &article
  }
  return nil
}
//------------------------------------------------------------------------------
func (db *Database) createArticle(name string, companyId int, purchasePrice float32, percentage float32, articleNumber string) Article {
  var article Article
  // create new article in database
  dbErr := db.db.QueryRow(
    fmt.Sprintf("INSERT INTO articles (name, companyId, purchasePrice, percentage, articleNumber) VALUES ('%v', %v, %v, %v, '%v') RETURNING id",
                name, companyId, purchasePrice, percentage, articleNumber)).Scan(&article.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }
  // create new amount for new articles in database
  _, dbErr = db.db.Query("INSERT INTO amounts (articleId, inventoryId) SELECT ? as articleId, id as inventoryId FROM inventories", article.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }

  article.Name          = name
  article.CompanyId     = companyId
  article.PurchasePrice = purchasePrice
  article.Percentage    = percentage
  article.SellingPrice  = article.PurchasePrice * (article.Percentage/100 + 1)
  article.ArticleNumber = articleNumber
  return article
}
//------------------------------------------------------------------------------
func (db *Database) updateArticle(article Article) Article {
  q := fmt.Sprintf("UPDATE articles SET name = '%v', purchasePrice = %v, percentage = %v, articleNumber = '%v' WHERE id = %v", article.Name, article.PurchasePrice, article.Percentage, article.ArticleNumber, article.Id)

  _, err := db.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  article.SellingPrice = article.PurchasePrice * (article.Percentage / 100 + 1)
  return article
}
//------------------------------------------------------------------------------
func (db *Database) deleteArticle(id int) {
  // delete amounts of article
  _, deleteAmountsErr := db.db.Query("DELETE FROM amounts WHERE articleId =?", id)
  if deleteAmountsErr != nil {
    panic(deleteAmountsErr.Error()) // proper error handling instead of panic in your app
  }
  _, deleteArticlesErr := db.db.Query("DELETE FROM articles WHERE id =?", id)
  if deleteArticlesErr != nil {
    panic(deleteArticlesErr.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func (db *Database) companies() [] Company {
  // Execute the query
  rows, err := db.db.Query("SELECT id, name FROM companies")
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
  return companies
}
//------------------------------------------------------------------------------
func (db *Database) articlesOfCompany(companyId int) [] Article {
  q := fmt.Sprintf("SELECT id, name, purchasePrice, percentage, barcode FROM articles WHERE companyId = %v", companyId)
  rows, err := db.db.Query(q)
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
    articles = append(articles, article)
  }
  return articles
}
//------------------------------------------------------------------------------
func (db *Database) company(id int) *Company {
  q := fmt.Sprintf("SELECT id, name FROM companies WHERE id = %v", id)
  rows, err := db.db.Query(q)
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
    return &company
  }
  return nil
}
//------------------------------------------------------------------------------
func (db *Database) createCompany(name string) Company {
  var company Company 
  company.Name = name

  q := fmt.Sprintf("INSERT INTO companies (Name) VALUES ('%v') RETURNING id", name)

  dbErr := db.db.QueryRow(q).Scan(&company.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }
  return company
}
//------------------------------------------------------------------------------
func (db *Database) updateCompany(company Company) {
  q := fmt.Sprintf("UPDATE companies SET name = '%v' WHERE id = %v", company.Name, company.Id)

  _, err := db.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
// server-related
//------------------------------------------------------------------------------
func (db *Database) deleteCompany(id int) {
  // delete all amounts of all articles of company
  _, amountsDeleteErr := db.db.Query(
    fmt.Sprintf(
      "DELETE amounts FROM articles JOIN amounts ON amounts.articleId = articles.id WHERE companyId = %v",
      id))
  if amountsDeleteErr != nil {
    panic(amountsDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  _, articlesDeleteErr := db.db.Query(
    fmt.Sprintf("DELETE FROM articles WHERE companyId =%v", id))
  if articlesDeleteErr != nil {
    panic(articlesDeleteErr.Error()) // proper error handling instead of panic in your app
  }
  _, companiesDeleteErr := db.db.Query(
    fmt.Sprintf("DELETE FROM companies WHERE id = %v", id))
  if companiesDeleteErr != nil {
    panic(companiesDeleteErr.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
// amount-related
//------------------------------------------------------------------------------
func (db *Database) updateAmount(amount Amount) {
  q := fmt.Sprintf("UPDATE amounts SET amount = '%v' WHERE articleId = %v AND inventoryId = %v", amount.Amount, amount.ArticleId, amount.InventoryId)

  _, err := db.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
// inventory-related
//------------------------------------------------------------------------------
func (db *Database) inventories () [] Inventory {
  // Execute the query
  rows, err := db.db.Query("SELECT id, name FROM inventories")
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
  return inventories
}
//------------------------------------------------------------------------------
func (db *Database) inventory(id int) *Inventory {
  q := fmt.Sprintf("SELECT id, name FROM inventories WHERE id = %v", id)

  rows, err := db.db.Query(q)
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
    return &inventory
  }
  return nil
}
//------------------------------------------------------------------------------
func (db *Database) createInventory (name string) Inventory {
  var inventory Inventory 
  inventory.Name = name
  dbErr := db.db.QueryRow(fmt.Sprintf(
      "INSERT INTO inventories (name) VALUES ('%v') RETURNING id", 
      name)).Scan(&inventory.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }

  // create new amount for new articles in database
  _, dbErr = db.db.Query("INSERT INTO amounts (articleId, inventoryId) SELECT id as articleId, ? as inventoryId FROM articles", inventory.Id)
  if dbErr != nil {
    panic(dbErr.Error()) // proper error handling instead of panic in your app
  }
  return inventory
}
//------------------------------------------------------------------------------
func (db *Database) updateInventory(inventory Inventory) {
  q := fmt.Sprintf(
    "UPDATE inventories SET name = '%v' WHERE id = %v",
    inventory.Name, inventory.Id)

  _, err := db.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func (db *Database) deleteInventory(id int) {
  // delete amounts of inventory
  _, amountsDeleteErr := db.db.Query("DELETE FROM amounts WHERE articleId =?", id)
  if amountsDeleteErr != nil {
    panic(amountsDeleteErr.Error()) // proper error handling instead of panic in your app
  }

  _, inventoryDeleteErr := db.db.Query("DELETE FROM inventories WHERE id =?", id)
  if inventoryDeleteErr != nil {
    panic(inventoryDeleteErr.Error()) // proper error handling instead of panic in your app
  }
}
//------------------------------------------------------------------------------
func (db *Database) inventoryAmounts(id int) [] Amount {
  q := fmt.Sprintf("SELECT * FROM amounts WHERE inventoryId =%v", id)

  rows, err := db.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  var amounts [] Amount
  for rows.Next() {
    var amount Amount
    // for each row, scan the result into our tag composite object
    if err = rows.Scan(&amount.ArticleId, &amount.InventoryId, &amount.Amount); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
            // and then print out the tag's Name attribute
    amounts = append(amounts, amount)
  }
  return amounts
}
//------------------------------------------------------------------------------
func (db *Database) amountOfArticle(inventoryId int, articleId int) Amount {
  q := fmt.Sprintf(
    "SELECT * FROM amounts WHERE inventoryId =%v AND articleId =%v ",
    inventoryId, articleId)

  var amount Amount
  err := db.db.QueryRow(q).Scan(&amount.ArticleId, &amount.InventoryId, &amount.Amount)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  return amount
}
//------------------------------------------------------------------------------
func (db *Database) inventoryOfCompany(inventoryId int, companyId int) [] ArticleWithAmount {
  q := fmt.Sprintf(
    "SELECT articles.id, articles.name, articles.purchasePrice, articles.percentage, articles.barcode, articles.articleNumber, amounts.amount FROM amounts JOIN articles ON amounts.articleId = articles.id JOIN companies ON articles.companyId = companies.id JOIN inventories ON inventories.id = amounts.inventoryId WHERE inventories.id = %v AND companies.id = %v",
    inventoryId, companyId)

  amountsPerArticle, err := db.db.Query(q)
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  var articles [] ArticleWithAmount
  for amountsPerArticle.Next() {
    var article ArticleWithAmount
    // for each row, scan the result into our tag composite object
    if err = amountsPerArticle.Scan(&article.Id, &article.Name, &article.PurchasePrice, &article.Percentage, &article.Barcode, &article.ArticleNumber, &article.Amount); err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
    article.SellingPrice = article.PurchasePrice * (article.Percentage / 100 + 1)
    articles = append(articles, article)
  }
  return articles
}
//------------------------------------------------------------------------------
func (db *Database) Close() {
  db.db.Close()
}
//------------------------------------------------------------------------------
func NewDatabase() *Database {
  fmt.Println("Creating Database...")
  dbPack := new (Database)
  db, dbErr := sql.Open("mysql", "inventory:@tcp(127.0.0.1:3306)/inventory")
  if dbErr != nil { panic(dbErr.Error()) }
  fmt.Println("Creating Database... done!")
  dbPack.db = db
  return dbPack
}

# SQL
``` sql
CREATE DATABASE inventory;

CREATE USER inventory IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON inventory.* TO inventory;
FLUSH PRIVILEGES;

USE inventory;
CREATE TABLE companies(
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  imagePath varchar(255),
  primary key (id)
);
CREATE TABLE articles (
  id int NOT NULL AUTO_INCREMENT,
  companyId int NOT NULL,
  name varchar(255) NOT NULL,
  imagePath varchar(255),
  barcode int,
  purchasePrice float,
  percentage float,
  FOREIGN KEY (companyId) REFERENCES companies(id),
  primary key (id)
);
CREATE TABLE inventories (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  primary key (id)
);
CREATE TABLE amountsPerArticle (
  articleId int NOT NULL,
  inventoryId int NOT NULL,
  amount int,
  FOREIGN KEY (articleId) REFERENCES articles(id),
  FOREIGN KEY (inventoryId) REFERENCES inventories(id)
);
CREATE TABLE users (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  hashedPassword varchar(255) NOT NULL,
  salt varchar(255) NOT NULL,
  primary key (id)
);
```

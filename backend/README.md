# SQL
``` sql
CREATE DATABASE inventory;
USE inventory;
CREATE TABLE companies(
  id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  primary key (id)
);
CREATE TABLE articles (
  id int NOT NULL AUTO_INCREMENT,
  companyId int,
  name varchar(255) NOT NULL,
  FOREIGN KEY (companyId) REFERENCES companies(id),
  primary key (id)
);
CREATE USER inventory IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON inventory.* TO inventory;
FLUSH PRIVILEGES;
```

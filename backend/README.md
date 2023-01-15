# SSL

## Create Certificat
``` bash
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout certs/localhost.key -out certs/localhost.crt \
    -subj "/C=DE/ST=Magdeburg/L=Foo/O=Steve Wolligandt/OU=Development/CN=localhost/emailAddress=stevewolligandt@gmail.com"
```

## Start in development
```
go run . -domain localhost
# or
go run . -domain dev.local.io
# or
go build .
./go-web-letsencrypt -domain localhost
# or
./go-web-letsencrypt -domain dev.local.io
```

## Start in production
```
go run . -domain <domain>
# or
go build .
./go-web-letsencrypt -domain <domain>
```

# SQL
``` sql
CREATE DATABASE inventory;

CREATE USER inventory IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON inventory.* TO inventory;
FLUSH PRIVILEGES;
```

package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

// ------------------------------------------------------------------------------
type User struct {
	Name    string `json:"name"`
	IsAdmin bool   `json:"isAdmin"`
}

// ------------------------------------------------------------------------------
type UserWithHashedPassword struct {
	User
	HashedPassword string `json:"hashedPassword"`
}

// ------------------------------------------------------------------------------
type UserWithPassword struct {
	User
	Password string `json:"password"`
}

// ------------------------------------------------------------------------------
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("could not hash password %w", err)
	}
	return string(hashedPassword), nil
}

// ------------------------------------------------------------------------------
func VerifyPassword(hashedPassword string, candidatePassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(candidatePassword))
	return err == nil
}

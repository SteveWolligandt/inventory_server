package main

import (
	"fmt"
)

// ------------------------------------------------------------------------------
func main() {
	s := server.NewServer()
	defer s.Close()
}

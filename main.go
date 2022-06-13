package main
import (
  "fmt"
)
//------------------------------------------------------------------------------
func main() {
  fmt.Println("Starting...")
  s := server.NewServer()
  fmt.Println("Now running!")
  
  defer s.Close()
}

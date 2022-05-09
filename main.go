package main

//------------------------------------------------------------------------------
func main() {
  s := server.NewServer()
  defer s.Close()
}

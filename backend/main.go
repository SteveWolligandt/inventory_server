package main
func main() {
  s := NewServer()
  s.Start()
  defer s.Close()
}

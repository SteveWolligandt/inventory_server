package main
func main() {
  s, err := NewServer()
  if (err != nil) {
    panic(err)
  }
  s.Start()
  defer s.Close()
}

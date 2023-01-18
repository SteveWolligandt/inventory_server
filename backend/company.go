package main
// ------------------------------------------------------------------------------
type Company struct {
	Id        int    `json:"id"`
	Name      string `json:"name"`
	ImagePath string `json:"-"`
}
// ------------------------------------------------------------------------------
type CompanyWithValue struct {
	Company
	Value float32 `json:"value"`
}

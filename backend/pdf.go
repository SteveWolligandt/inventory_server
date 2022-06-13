package main
import (
  "fmt"
  "github.com/johnfercher/maroto/pkg/consts"
  "github.com/johnfercher/maroto/pkg/pdf"
  "github.com/johnfercher/maroto/pkg/props"
)
//------------------------------------------------------------------------------
func buildPdf(db *Database) (filename string) {
  m := pdf.NewMaroto(consts.Portrait, consts.A4)
  //m.SetBorder(true)

  m.Row(60, func() {
    _ = m.FileImage("assets/logo.jpg", props.Rect{
            Center:  false,
            Left:100,
            Percent: 50,
    })
  })

  m.Row(30, func() {
    m.Text("Inventur", props.Text{
      Size: 30,
    })
  })


  companies := db.companies()
  for _, company := range companies {
    m.Row(20, func(){})
    // m.AddPage()

    m.Row(10, func() {
      m.Text(company.Name, props.Text{
        Size: 20,
      })
    })
    m.Line(1)
    articles := db.articlesOfCompany(company.Id)

    for _, article := range articles {
      m.Row(10, func() {
        m.ColSpace(1)
        m.Col(5, func() {
          id := fmt.Sprintf("%v", article.Id)
          m.Text(id, props.Text{
            Size: 10,
            Top: 3,
          })
        })
        m.Col(6, func() {
          m.Text(article.Name, props.Text{
            Size: 15,
            Top: 1,
          })
        })
      })
      m.Line(1)
    }
  }


  m.SetBorder(false)

  filename = "/tmp/1234.pdf";
  err := m.OutputFileAndClose(filename)
  if err != nil {
    fmt.Println("Could not save PDF:", err)
  }
  return
}

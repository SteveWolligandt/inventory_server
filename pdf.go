package main
import (
  "fmt"
  "database/sql"

  //"github.com/johnfercher/maroto/pkg/color"
  "github.com/johnfercher/maroto/pkg/consts"
  "github.com/johnfercher/maroto/pkg/pdf"
  "github.com/johnfercher/maroto/pkg/props"
)
//------------------------------------------------------------------------------
func buildPdf(db *sql.DB) (filename string) {
  m := pdf.NewMaroto(consts.Portrait, consts.A4)
  //m.SetBorder(true)

  m.Row(40, func() {
    m.Col(4, func() {
      _ = m.FileImage("logo.jpg", props.Rect{
              Center:  true,
              Percent: 100,
      })
    })
  })


  companyRows, err := db.Query("SELECT * FROM companies")
  if err != nil {
    panic(err.Error()) // proper error handling instead of panic in your app
  }
  for companyRows.Next() {
    m.Row(20, func(){})
    //m.AddPage()
    var company Company
    // for each row, scan the result into our tag composite object
    err = companyRows.Scan(&company.Id, &company.Name)
    m.Row(20, func() {
      m.Text(company.Name, props.Text{
        Size: 30,
      })
    })
    m.Line(1)
    q := fmt.Sprintf("SELECT id, name FROM articles WHERE companyId = %v",
                     company.Id)
    articleRows, err := db.Query(q)
    if err != nil {
      panic(err.Error()) // proper error handling instead of panic in your app
    }
    for articleRows.Next() {
      var article Article
      // for each row, scan the result into our tag composite object
      if err = articleRows.Scan(&article.Id, &article.Name); err != nil {
        panic(err.Error()) // proper error handling instead of panic in your app
      }

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
  err = m.OutputFileAndClose(filename)
  if err != nil {
    fmt.Println("Could not save PDF:", err)
  }
  return
}

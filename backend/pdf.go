package main

import (
	"fmt"
	"strconv"
  "golang.org/x/text/language"
  "golang.org/x/text/message"
	"github.com/johnfercher/maroto/pkg/consts"
	"github.com/johnfercher/maroto/pkg/pdf"
	"github.com/johnfercher/maroto/pkg/props"
)


// ------------------------------------------------------------------------------
func buildPdfArticlesHeader(m pdf.Maroto) {
	m.Row(8, func() {
		m.Col(3, func() {
			m.Text("Artikelbezeichnung", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
			})
		})
		m.Col(3, func() {
			m.Text("Artikelnummer", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
			})
		})

		m.Col(2, func() {
			m.Text("EK", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
				Align: consts.Right,
			})
		})

		m.Col(2, func() {
			m.Text("Stückzahl", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
				Align: consts.Right,
			})
		})

		m.Col(2, func() {
			m.Text("Gesamtpreis", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
				Align: consts.Right,
			})
		})
	})
}
// ------------------------------------------------------------------------------
func buildPdfCompaniesHeader(m pdf.Maroto) {
	m.Row(8, func() {
		m.Col(6, func() {
			m.Text("Firma", props.Text{
				Style: consts.Bold,
        Align: consts.Left,
				Size:  10,
				Top:   1,
			})
		})
		m.Col(6, func() {
			m.Text("Warenwert", props.Text{
				Style: consts.Bold,
        Align: consts.Right,
				Size:  10,
				Top:   1,
			})
		})
	})
}

// -----------------------------------------------------------------------------
func pdfFillArticlesTable(m pdf.Maroto, db *Database, articles []ArticleWithInventoryData, inventoryId int) float32 {
  p := message.NewPrinter(language.German)
	totalPrice := float32(0)
  for _, article := range articles {
    m.Line(1)
    m.Row(8, func() {
      m.Col(3, func() {
        m.Text(article.Name, props.Text{
          Size: 10,
          Top:  1,
        })
      })

      m.Col(3, func() {
        m.Text(article.ArticleNumber, props.Text{
          Size: 10,
          Top:  1,
        })
      })

      m.Col(2, func() {
        m.Text(p.Sprintf("%.2f €", article.PurchasePrice), props.Text{
          Size:  10,
          Top:   1,
          Align: consts.Right,
        })
      })

      m.Col(2, func() {
        m.Text(fmt.Sprintf("%v", article.Amount), props.Text{
          Size:  10,
          Top:   1,
          Align: consts.Right,
        })
      })

      m.Col(2, func() {
        m.Text(p.Sprintf("%.2f €", float32(article.Amount)*article.PurchasePrice), props.Text{
          Size:  10,
          Top:   1,
          Align: consts.Right,
        })
      })
      totalPrice += float32(article.Amount) * article.PurchasePrice
    })
  }
	m.Line(1)
	return totalPrice
}

// ------------------------------------------------------------------------------
func createTotalPriceRow(m pdf.Maroto, totalPrice float32) {
  p := message.NewPrinter(language.German)
	m.Row(8, func() {
		m.Col(6, func() {
			m.Text("Gesamtwarenwert", props.Text{
				Size:  10,
				Top:   1,
				Align: consts.Left,
        Style: consts.Bold,
			})
		})
		m.Col(6, func() {
			m.Text(p.Sprintf("%.2f €", totalPrice), props.Text{
				Size:  10,
				Top:   1,
				Align: consts.Right,
			})
		})
	})
}
// ------------------------------------------------------------------------------
func buildPdfCompaniesOverview(m pdf.Maroto, db * Database, inventoryId int) {
  p := message.NewPrinter(language.German)
  rowHeight := 20.0
  m.Row(rowHeight, func() {
		m.Col(12, func() {
      m.Text("Firmenübersicht", props.Text{
				Style: consts.Bold,
				Size:  20,
				Top:   1,
			})
		})
	})
  var totalPrice float32
  companies := db.CompaniesWithValue(inventoryId)
  buildPdfCompaniesHeader(m)
  for _, company := range companies {
    if (company.Value == 0) { continue; }
    m.Line(1)
    m.Row(8, func() {
      m.Col(6, func() {
        m.Text(company.Name, props.Text{
          Size: 10,
          Top:  1,
          Align: consts.Left,
        })
      })

      m.Col(6, func() {
        m.Text(p.Sprintf("%.2f €", float32(company.Value)), props.Text{
          Size:  10,
          Top:   1,
          Align: consts.Right,
        })
      })
    })
    totalPrice += company.Value
  }
	m.Line(1)
	m.Row(8, func() {
		m.Col(6, func() {
			m.Text("Gesamtwarenwert", props.Text{
				Size:  10,
				Top:   1,
				Align: consts.Left,
        Style: consts.Bold,
			})
		})
		m.Col(6, func() {
			m.Text(p.Sprintf("%.2f €", totalPrice), props.Text{
				Size:  10,
				Top:   1,
				Align: consts.Right,
			})
		})
	})

  m.AddPage()
}
// ------------------------------------------------------------------------------
func buildPdfCompanyTable(m pdf.Maroto, db * Database, company Company, inventoryId int) {
  articles := db.InventoryOfCompanyWithAmountCheck(inventoryId,company.Id)
  if (len(articles) == 0)  {
    return
  }
  rowHeight := 20.0
  m.Row(rowHeight, func() {
		m.Col(12, func() {
			m.Text(company.Name, props.Text{
				Style: consts.Bold,
				Size:  20,
				Top:   1,
			})
		})
	})
	buildPdfArticlesHeader(m)
	totalPrice := pdfFillArticlesTable(m, db, articles, inventoryId)
	createTotalPriceRow(m, totalPrice)
  m.AddPage()
}

// ------------------------------------------------------------------------------
func buildPdf(db *Database, inventoryId int) string {
	m := pdf.NewMaroto(consts.Portrait, consts.A4)
  m.SetFirstPageNb(1)
  m.RegisterFooter(func() {
		m.Row(10, func() {
      m.Text(strconv.Itoa(m.GetCurrentPage()), props.Text{
        Align: consts.Right,
        Size:  8,
      })
		})
	})

  buildPdfCompaniesOverview(m, db, inventoryId)

  companies := db.Companies()
  for _, c := range companies {
    buildPdfCompanyTable(m, db, c, inventoryId)
  }



	m.SetBorder(false)

  filename := "/tmp/1234.pdf"
	err := m.OutputFileAndClose(filename)
	if err != nil {
		fmt.Println("Could not save PDF:", err)
	}
	return filename
}

package main

import (
	"fmt"
	"github.com/johnfercher/maroto/pkg/consts"
	"github.com/johnfercher/maroto/pkg/pdf"
	"github.com/johnfercher/maroto/pkg/props"
	"golang.org/x/text/language"
	"golang.org/x/text/message"
	"strconv"
)

// ------------------------------------------------------------------------------
func buildPdfProductsHeader(m pdf.Maroto) {
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
func pdfFillProductsTable(m pdf.Maroto, db *Database, products []ProductWithInventoryData, inventoryId int) float32 {
	p := message.NewPrinter(language.German)
	totalPrice := float32(0)
	for _, product := range products {
		m.Line(1)
		m.Row(8, func() {
			m.Col(3, func() {
				m.Text(product.Name, props.Text{
					Size: 10,
					Top:  1,
				})
			})

			m.Col(3, func() {
				m.Text(product.ProductNumber, props.Text{
					Size: 10,
					Top:  1,
				})
			})

			m.Col(2, func() {
				m.Text(p.Sprintf("%.2f €", product.PurchasePrice), props.Text{
					Size:  10,
					Top:   1,
					Align: consts.Right,
				})
			})

			m.Col(2, func() {
				m.Text(fmt.Sprintf("%v", product.Amount), props.Text{
					Size:  10,
					Top:   1,
					Align: consts.Right,
				})
			})

			m.Col(2, func() {
				m.Text(p.Sprintf("%.2f €", float32(product.Amount)*product.PurchasePrice), props.Text{
					Size:  10,
					Top:   1,
					Align: consts.Right,
				})
			})
			totalPrice += float32(product.Amount) * product.PurchasePrice
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
func buildPdfCompaniesOverview(m pdf.Maroto, db *Database, inventoryId int) error {
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
	companies, err := db.CompaniesWithValue(inventoryId)
	if err != nil {
		return err
	}
	buildPdfCompaniesHeader(m)
	for _, company := range companies {
		if company.Value == 0 {
			continue
		}
		m.Line(1)
		m.Row(8, func() {
			m.Col(6, func() {
				m.Text(company.Name, props.Text{
					Size:  10,
					Top:   1,
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
	return nil
}

// ------------------------------------------------------------------------------
func buildPdfCompanyTable(m pdf.Maroto, db *Database, company Company, inventoryId int) error {
	products, err := db.InventoryOfCompanyWithAmountCheck(inventoryId, company.Id)
	if err != nil {
		return err
	}
	if len(products) == 0 {
		return nil
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
	buildPdfProductsHeader(m)
	totalPrice := pdfFillProductsTable(m, db, products, inventoryId)
	createTotalPriceRow(m, totalPrice)
	m.AddPage()
	return nil
}

// ------------------------------------------------------------------------------
func buildPdf(db *Database, inventoryId int) (string, error) {
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

	err := buildPdfCompaniesOverview(m, db, inventoryId)
	if err != nil {
		return "", err
	}

	companies, err := db.Companies()
	if err != nil {
		return "", err
	}
	for _, c := range companies {
		err := buildPdfCompanyTable(m, db, c, inventoryId)
		if err != nil {
			return "", err
		}
	}

	m.SetBorder(false)

	filename := "/tmp/1234.pdf"
	err = m.OutputFileAndClose(filename)
	if err != nil {
		fmt.Println("Could not save PDF:", err)
		return "", err
	}
	return filename, nil
}

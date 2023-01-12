package main

import (
	"fmt"
	"github.com/johnfercher/maroto/pkg/consts"
	"github.com/johnfercher/maroto/pkg/pdf"
	"github.com/johnfercher/maroto/pkg/props"
)

// ------------------------------------------------------------------------------
func buildPdfHeader(m pdf.Maroto) {
	m.Row(8, func() {
		m.Col(2, func() {
			m.Text("Firma", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
			})
		})
		m.Col(2, func() {
			m.Text("Artikelname", props.Text{
				Style: consts.Bold,
				Size:  10,
				Top:   1,
			})
		})

		m.Col(2, func() {
			m.Text("VK", props.Text{
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

// -----------------------------------------------------------------------------
func fillTable(m pdf.Maroto, db *Database, inventoryId int) float32 {
	totalPrice := float32(0)
	companies := db.Companies()
	for _, company := range companies {
		articles := db.InventoryOfCompany(company.Id, inventoryId)
		for _, article := range articles {
			m.Line(1)
			m.Row(8, func() {
				m.Col(2, func() {
					m.Text(company.Name, props.Text{
						Size: 10,
						Top:  1,
					})
				})

				m.Col(2, func() {
					m.Text(article.Name, props.Text{
						Size: 10,
						Top:  1,
					})
				})

				m.Col(2, func() {
					m.Text(fmt.Sprintf("%.2f €", article.SellingPrice), props.Text{
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
					m.Text(fmt.Sprintf("%.2f €", float32(article.Amount)*article.SellingPrice), props.Text{
						Size:  10,
						Top:   1,
						Align: consts.Right,
					})
				})
				totalPrice += float32(article.Amount) * article.SellingPrice
			})
		}
	}
	m.Line(1)
	return totalPrice
}

// ------------------------------------------------------------------------------
func createTotalPriceRow(m pdf.Maroto, totalPrice float32) {
	m.Row(8, func() {
		m.Col(10, func() {
			m.Text(fmt.Sprintf("%.2f €", totalPrice), props.Text{
				Size:  10,
				Top:   1,
				Align: consts.Right,
			})
		})
	})
}

// ------------------------------------------------------------------------------
func buildPdf(db *Database, inventoryId int) string {
	m := pdf.NewMaroto(consts.Portrait, consts.A4)
	buildPdfHeader(m)
	totalPrice := fillTable(m, db, inventoryId)
	createTotalPriceRow(m, totalPrice)

	m.SetBorder(false)

  filename := "/tmp/1234.pdf"
	err := m.OutputFileAndClose(filename)
	if err != nil {
		fmt.Println("Could not save PDF:", err)
	}
	return filename
}

import DeleteIcon from '@mui/icons-material/Delete';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import {DataGrid} from '@mui/x-data-grid';
import React, {useEffect} from 'react';
import useWebSocket from 'react-use-websocket';

function computeMutationAmount(newRow, oldRow) {
  if (newRow.amount !== oldRow.amount) {
    return (<>Anzahl von <i><b>{oldRow.name}</b></i> auf <i><b>{newRow.amount}</b></i> setzen?</>);
  }
  return null;
}
function computeMutationName(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Name von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}
function computeMutationArticleNumber(newRow, oldRow) {
  if (newRow.articleNumber !== oldRow.articleNumber) {
    return (<>Artikelnummer von <i><b>{oldRow.articleNumber}</b></i> zu <i><b>{newRow.articleNumber}</b></i> ändern?</>);
  }
  return null;
}
function computeMutationNotes(newRow, oldRow) {
  if (newRow.notes !== oldRow.notes) {
    return (<>Notizen von <i><b>{oldRow.notes}</b></i> zu <i><b>{newRow.notes}</b></i> ändern?</>);
  }
  return null;
}
function computeMutationPricing(newRow, oldRow) {
  if (newRow.purchasePrice !== oldRow.purchasePrice) {
    return (<><b>Neuer EK Preis: </b>{
      newRow.purchasePrice.toFixed(2).toLocaleString()} €<b><br/>Neuer VK Preis: </b>{(newRow.purchasePrice * (1 + newRow.percentage  /100)).toFixed(2).toLocaleString()
  }
  €</>);
  }
  if (newRow.percentage !== oldRow.percentage) {
    return (<><b>Neuer EK Preis: </b> {
    newRow.purchasePrice.toFixed(2).toLocaleString()
  } €<b><br/>Neuer VK Preis: </b>{(newRow.purchasePrice * (1 + newRow.percentage / 100)).toFixed(2).toLocaleString()
}
€</>);
  }
  if (newRow.sellingPrice !== oldRow.sellingPrice) {
    return (<><b>Neuer EK Preis: </b> {
  (newRow.purchasePrice / (1 + newRow.percentage / 100))
      .toFixed(2)
      .toLocaleString()
} €<b><br/>Neuer VK Preis: </b>{newRow.sellingPrice.toFixed(2).toLocaleString()} €</>);
}
return null;
}

export default function ArticlesTable(params) {
  var company = params.company;
  var inventory = params.inventory;
  var isOpen = params.open;
  var [articles, setArticles] = React.useState([]);
  var loc = window.location, new_uri;
  if (loc.protocol === 'https:') {
    new_uri = 'wss';
  } else {
    new_uri = 'ws';
  }
  new_uri += '://';
  new_uri += loc.hostname;
  new_uri += ':';
  if (loc.port === '3000') {
    new_uri += '8080';
  } else {
    new_uri += loc.port;
  }
  new_uri += loc.pathname + 'ws';

  const websocketAddr = new_uri;
  const lastMessage = useWebSocket(websocketAddr).lastMessage;

  // websocket
  useEffect(() => {
    if (lastMessage !== null && company !== null) {
      let msg = JSON.parse(lastMessage.data);
      let action = msg.action;
      if (action === 'newArticle') {
        let newArticle = msg.data;
        setArticles(articles => {
          if (newArticle.companyId === company.id) {
            return articles.concat(newArticle);
          } else {
            return articles;
          }
        });
      } else if (action === 'updateArticle') {
        let updatedArticle = msg.data;
        console.log(updatedArticle);
        setArticles(articles => articles.map((article, j) => {
          return updatedArticle.id === article.id ? updatedArticle : article;
        }));
      } else if (action === 'deleteArticle') {
        let deletedArticle = msg.data;
        setArticles(articles => articles.filter(article => article.id !==
                                                           deletedArticle.id));
      } else if (action === 'updateInventoryData') {
        let updatedInventoryData = msg.data;
        console.log(updatedInventoryData);
        setArticles(articles => articles.map((article, j) => {
          if (updatedInventoryData.inventoryId === inventory.id &&
              updatedInventoryData.articleId === article.id) {
            article.amount = updatedInventoryData.amount;
            article.purchasePrice = updatedInventoryData.purchasePrice;
            article.percentage = updatedInventoryData.percentage;
            article.sellingPrice = updatedInventoryData.sellingPrice;
            article.notes = updatedInventoryData.notes;
          }
          return article;
        }));
      }
    }
  }, [ company, lastMessage, inventory, setArticles ]);

  // initial get
  useEffect(() => {
    if (company !== null) {
      fetch(inventory
                ? '/api/company/' + company.id + '/inventory/' + inventory.id
                : '/api/company/' + company.id + '/articles')
          .then((response) => response.json())
          .then((articlesJson) => {
            var cs = [];
            console.log(articlesJson);
            for (var article in articlesJson) {
              if (articlesJson.hasOwnProperty(article)) {
                cs.push(articlesJson[article]);
              }
                console.log(articlesJson[article]);
            }
            setArticles(cs);
          })
          .catch((error) => { console.error(error); });
    }
  }, [ company, inventory, setArticles ]);

  const mutateRow = React.useCallback(
      (article) => new Promise(
          (resolve, reject) => setTimeout(
              () => {
                if (article.name?.trim() === '') {
                  reject();
                } else {
                  resolve(article);
                }
              },
              200),
          ),
      [],
  );
  const noButtonRef = React.useRef(null);
  const [changeArguments, setChangeArguments] = React.useState(null);
  const [deleteArguments, setDeleteArguments] = React.useState(null);
  const [snackbar, setSnackbar] = React.useState(null);
  const handleCloseSnackbar = () => setSnackbar(null);

  const processRowUpdate = React.useCallback(
      (newRow, oldRow) => new Promise((resolve, reject) => {
        const mutationName = computeMutationName(newRow, oldRow);
        const mutationArticleNumber =
            computeMutationArticleNumber(newRow, oldRow);
        const mutationPrice =
            computeMutationPricing(newRow, oldRow);
        const mutationAmount =
            computeMutationAmount(newRow, oldRow);
        const mutationNotes =
            computeMutationNotes(newRow, oldRow);
        if (mutationPrice) {
          if (newRow.purchasePrice !== oldRow.purchasePrice) {
            newRow.sellingPrice =
                newRow.purchasePrice * (1 + newRow.percentage / 100);
          }
          if (newRow.percentage !== oldRow.percentage) {
            newRow.sellingPrice =
                newRow.purchasePrice * (1 + newRow.percentage / 100);
          }
          if (newRow.sellingPrice !== oldRow.sellingPrice) {
            newRow.purchasePrice =
                newRow.sellingPrice / (1 + newRow.percentage / 100);
          }
        }
        if (mutationName || mutationArticleNumber) {
          setChangeArguments({resolve, reject, newRow, oldRow});

        } else if (mutationAmount || mutationPrice || mutationNotes) {
          if (inventory) {
            const url = '/api/inventorydata/';
            const body = JSON.stringify({
              articleId : newRow.id,
              inventoryId : inventory.id,
              amount : newRow.amount,
              purchasePrice : newRow.purchasePrice,
              percentage : newRow.percentage,
              sellingPrice : newRow.sellingPrice,
              notes : newRow.notes,
            });
            console.log(body)
            fetch(url, {
              method : 'PUT',
              headers : {'Content-Type' : 'application/json'},
              body : body
            }).then((response) => {
              setSnackbar(
                  {children : 'Stückzahl geändert', severity : 'success'});
              resolve(newRow);
              setChangeArguments(null);
            });
          }
        } else {
          resolve(oldRow); // Nothing was changed
        }
      }),
      [ inventory ],
  );

  const handleChangeNo = () => {
    const {oldRow, resolve} = changeArguments;
    resolve(
        oldRow); // Resolve with the old row to not update the internal state
    setChangeArguments(null);
  };

  const handleChangeYes = async () => {
    const {newRow, oldRow, reject, resolve} = changeArguments;

    try {
      const url = '/api/article/' + newRow.id;
        const body = JSON.stringify({
          articleId : newRow.id,
          name : newRow.name,
          articleNumber : newRow.articleNumber,
        });
      await fetch(url, {
        method : 'PUT',
        headers : {'Content-Type' : 'application/json'},
        body : body
      });

      if (inventory) {
        const url = '/api/inventorydata/';
        const body = JSON.stringify({
          articleId : newRow.id,
          inventoryId : inventory.id,
          amount : newRow.amount,
          purchasePrice : newRow.purchasePrice,
          percentage : newRow.percentage,
          notes : newRow.notes,
        });
        await fetch(url, {
          method : 'PUT',
          headers : {'Content-Type' : 'application/json'},
          body : body
        });
      }

      const response = await mutateRow(newRow);
      setSnackbar(
          {children : 'Artikel in Datenbank geändert', severity : 'success'});
      resolve(response);
      setChangeArguments(null);
    } catch (error) {
      setSnackbar(
          {children : "Name darf nicht leer sein!", severity : 'error'});
      reject(oldRow);
      setChangeArguments(null);
    }
  };

  const handleDeleteNo = () => { setDeleteArguments(null); };

  const handleDeleteYes = async () => {
    try {
      const url = '/api/article/' + deleteArguments.id;
      await fetch(url, {
        method : 'DELETE',
      });

      setSnackbar(
          {children : 'Artikel in Datenbank gelöscht', severity : 'success'});
      setDeleteArguments(null);
    } catch (error) {
      setSnackbar({
        children : "Artikel konnte nicht gelöscht werden!",
        severity : 'error'
      });
      setDeleteArguments(null);
    }
  };

  const handleEntered = () => {
    // The `autoFocus` is not used because, if used, the same Enter that saves
    // the cell triggers "No". Instead, we manually focus the "No" button once
    // the dialog is fully open.
    // noButtonRef.current?.focus();
  };

  const renderConfirmChangeDialog = () => {
    if (!changeArguments) {
      return null;
    }

    const {newRow, oldRow} = changeArguments;
    const mutationName =
        computeMutationName(newRow, oldRow);
    const mutationArticleNumber =
        computeMutationArticleNumber(newRow, oldRow);
    const mutationPrice =
        computeMutationPricing(newRow, oldRow);
    const mutationNotes =
        computeMutationNotes(newRow, oldRow);

    return (
      <Dialog maxWidth = "xs"
              TransitionProps = {
                { onEntered: handleEntered }
              } open = {!!changeArguments}>
      <DialogTitle>Artikel wirklich ändern? </DialogTitle>
        <DialogContent dividers>
          {mutationName}
          {mutationArticleNumber}
          {mutationPrice}
          {mutationNotes}
        </DialogContent>
        <DialogActions>
        <Button ref = {noButtonRef} onClick = {handleChangeNo}>Nein<
            /Button>
          <Button onClick={handleChangeYes}>Ja</Button>
        </DialogActions>
      </Dialog>);
  };
  const renderConfirmDeleteDialog = () => {
    if (!deleteArguments) {
      return null;
    }

    return (
      <Dialog
    maxWidth = "xs"
    TransitionProps =
    {
      { onEntered: handleEntered }
    } open = {!!deleteArguments} > <DialogTitle>Artikel wirklich löschen
        ? </DialogTitle>
        <DialogContent dividers>
          Artikel <i><b>{deleteArguments.name}</b>
        </i> wirlich löschen?
        </DialogContent><DialogActions>
        <Button ref = {noButtonRef} onClick = {handleDeleteNo}>Nein<
            /Button>
          <Button onClick={handleDeleteYes}>Ja</Button>
        </DialogActions>
      </Dialog>);
  };

  if (isOpen) {
    const style = {height : 500, width : '100%'};
    return (
      <div style={style}>
        {renderConfirmChangeDialog()}
        {renderConfirmDeleteDialog()}
        <DataGrid
          rows={articles}
          columns={columns(setDeleteArguments)}
          processRowUpdate={processRowUpdate}
          experimentalFeatures={
      { newEditingApi: true }}
        />
        {!!snackbar && (
          <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
            <Alert {...snackbar} onClose={handleCloseSnackbar} />
          </Snackbar>
        )}
      </div>
    );
  } else {
          return (
              <><
              />);
  }
}

function columns(setDeleteArguments) {
  return [
    { field: 'name',
      flex: 1,
      align:'center',
      headerAlign:'center',
      headerName: 'Name',
      width: 180,
      editable: true },
    { field: 'purchasePrice',
      type: 'number',
      headerAlign:'center',
      headerName: 'Einkaufspreis',
      width: 180,
      editable: true,
      valueFormatter: (params) => {
        if (params.value == null) {
          return '';
        }
        const valueFormatted = params.value.toFixed(2).toLocaleString();
        return `${valueFormatted} €`;
      },
    },
    { field: 'percentage',
      type: 'number',
      headerAlign:'center',
      headerName: '%',
      width: 100,
      editable: true,
      valueFormatter: (params) => {
        if (params.value == null) {
          return '';
        }
        const valueFormatted = Number(params.value).toLocaleString();
        return `${valueFormatted} %`;
      },
    },
    { field: 'sellingPrice',
      type: 'number',
      headerAlign:'center',
      headerName: 'Verkaufspreis',
      width: 180,
      editable: true,
      valueFormatter: (params) => {
        if (params.value == null) {
          return '';
        }

        const valueFormatted = params.value.toFixed(2).toLocaleString();
        return `${valueFormatted} €`;
      },
    },
    { field: 'articleNumber',
      flex: 1,
      align:'center',
      headerAlign:'center',
      headerName: 'Artikelnummer',
      width: 180,
      editable: true },
    { field: 'amount',
      type: 'number',
      headerAlign:'center',
      headerName: 'Stückzahl',
      width: 180,
      editable: true },
    { field: 'notes',
      headerAlign:'center',
      headerName: 'Notizen',
      width: 100,
      sortable: false,
      editable: true },
    { field: 'delete',
      editable: false,
      type: 'action',
      headerName: '',
      align: 'center',
      width: 60,
      sortable: false,
      renderCell: (params) => {
        return <IconButton size="small"
                           aria-label="deleteCompany"
                           onClick={() => { setDeleteArguments(params.row); }}>
                 <DeleteIcon fontSize = "small" />
               </IconButton>;
      }
    },
  ];
}

import { DataGrid } from '@mui/x-data-grid';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import useWebSocket from 'react-use-websocket';

import React, { useState, useEffect } from 'react';

function computeMutationName(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}
function computeMutationPricing(newRow, oldRow) {
  if (newRow.purchasePrice !== oldRow.purchasePrice) {
    return (<>Neuer Preis<br/> <b>Neuer EK Preis: </b>{newRow.purchasePrice}<b><br/>Neuer VK Preis: </b>{newRow.purchasePrice * (1 + newRow.percentage  /100)}</>);
  }
  if (newRow.percentage !== oldRow.percentage) {
    return (<>Neuer Preis<br/> <b>Neuer EK Preis: </b>{newRow.purchasePrice}<b><br/>Neuer VK Preis: </b>{newRow.purchasePrice * (1 + newRow.percentage / 100)}</>);
  }
  if (newRow.sellingPrice !== oldRow.sellingPrice) {
    return (<>Neuer Preis<br/> <b>Neuer EK Preis: </b>{newRow.purchasePrice / (1 + newRow.percentage / 100)}<b><br/>Neuer VK Preis: </b>{newRow.sellingPrice}</>);
  }
  return null;
}

export default function ArticlesTable(params) {
  var company = params.company;
  var isOpen = params.open;
  var [isLoading, setIsLoading] = React.useState(true);
  var [articles, setArticles] = React.useState([]);
  const [messageHistory, setMessageHistory] = useState([]);
  var loc = window.location, new_uri;
  if (loc.protocol === 'https:') {
    new_uri = 'wss';
  } else {
    new_uri = 'ws';
  }
  new_uri += '://';
  if (loc.host === 'localhost:3000') { new_uri += 'localhost:8080'; }
  else { new_uri += loc.host; }
  new_uri += loc.pathname + 'ws';

  const websocketAddr = new_uri;
  const { sendMessage, lastMessage, readyState } = useWebSocket(websocketAddr);

  useEffect(() => {
    if (lastMessage !== null && company !== null) {
      let msg = JSON.parse(lastMessage.data);
      let action = msg.action;
      if (action === 'newArticle') {
        let newArticle = msg.data;
        setArticles(articles => {if (newArticle.companyId === company.id) {
                                   return articles.concat(newArticle);
                                 } else {
                                   return articles;
                                 }});
      } else if (action === 'updateArticle') {
        let updatedArticle = msg.data;
        console.log(updatedArticle);
        setArticles(articles => articles.map((article, j) => {
          return updatedArticle.id === article.id ? updatedArticle : article;
        }));
      } else if (action === 'deleteArticle') {
        let deletedArticle = msg.data;
        setArticles(articles => articles.filter(article => article.id !== deletedArticle.id));
      }
    }
  }, [company, lastMessage, setArticles]);

  useEffect(()=> {
    if (company !== null) {
      fetch('/api/company/'+ company.id +'/articles')
        .then((response)=> response.json())
        .then((articlesJson) => {
          var cs = [];
          for (var article in articlesJson) {
            if (articlesJson.hasOwnProperty(article)) {
              cs.push(articlesJson[article]);
            }
          }
          setIsLoading(false);
          setArticles(cs);
        }).catch((error) => {
          console.error(error);
        });
    }
  }, [company, setArticles]);

  const mutateRow = React.useCallback(
    (article) =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          if (article.name?.trim() === '') {
            reject();
          } else {
            resolve(article);
          }
        }, 200),
      ),
    [],
  );
  const noButtonRef = React.useRef(null);
  const [changeArguments, setChangeArguments] = React.useState(null);
  const [deleteArguments, setDeleteArguments] = React.useState(null);

  const [snackbar, setSnackbar] = React.useState(null);

  const handleCloseSnackbar = () => setSnackbar(null);

  const processRowUpdate = React.useCallback(
    (newRow, oldRow) =>
      new Promise((resolve, reject) => {
        const mutationName = computeMutationName(newRow, oldRow);
        const mutationPrice = computeMutationPricing(newRow, oldRow);
        if (mutationName) {
          // Save the arguments to resolve or reject the promise later
          setChangeArguments({ resolve, reject, newRow, oldRow });
        } else if (mutationPrice) {
          // Save the arguments to resolve or reject the promise later

          if (newRow.purchasePrice !== oldRow.purchasePrice) {
            newRow.sellingPrice = newRow.purchasePrice * (1 + newRow.percentage / 100);
          }
          if (newRow.percentage !== oldRow.percentage) {
            newRow.sellingPrice = newRow.purchasePrice * (1 + newRow.percentage / 100);
          }
          if (newRow.sellingPrice !== oldRow.sellingPrice) {
            newRow.purchasePrice = newRow.sellingPrice / (1 + newRow.percentage / 100);
          }
          setChangeArguments({ resolve, reject, newRow, oldRow });
        } else {
          resolve(oldRow); // Nothing was changed
        }
      }),
    [],
  );

  const handleChangeNo = () => {
    const { oldRow, resolve } = changeArguments;
    resolve(oldRow); // Resolve with the old row to not update the internal state
    setChangeArguments(null);
  };

  const handleChangeYes = async () => {
    const { newRow, oldRow, reject, resolve } = changeArguments;

    try {
      const url = '/api/article/' + newRow.id;
      const body = JSON.stringify(newRow);
      console.log('newrow: ' + body);
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

      const response = await mutateRow(newRow);
      setSnackbar({ children: 'Artikel in Datenbank geändert', severity: 'success' });
      resolve(response);
      setChangeArguments(null);
    } catch (error) {
      setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
      reject(oldRow);
      setChangeArguments(null);
    }
  };

  const handleDeleteNo = () => {
    setDeleteArguments(null);
  };

  const handleDeleteYes = async () => {
    try {
      const url = '/api/article/' + deleteArguments.id;
      await fetch(url, {
        method: 'DELETE',
      });

      setSnackbar({ children: 'Artikel in Datenbank gelöscht', severity: 'success' });
      setDeleteArguments(null);
    } catch (error) {
      setSnackbar({ children: "Artikel konnte nicht gelöscht werden!", severity: 'error' });
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

    const { newRow, oldRow } = changeArguments;
    const mutationName = computeMutationName(newRow, oldRow);
    const mutationPrice = computeMutationPricing(newRow, oldRow);

    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
        open={!!changeArguments}
      >
        <DialogTitle>Artikel wirklich ändern?</DialogTitle>
        <DialogContent dividers>
          {mutationName}
          {mutationPrice}
        </DialogContent>
        <DialogActions>
          <Button ref={noButtonRef} onClick={handleChangeNo}>
            Nein
          </Button>
          <Button onClick={handleChangeYes}>Ja</Button>
        </DialogActions>
      </Dialog>
    );
  };
  const renderConfirmDeleteDialog = () => {
    if (!deleteArguments) {
      return null;
    }

    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
        open={!!deleteArguments}
      >
        <DialogTitle>Artikel wirklich löschen?</DialogTitle>
        <DialogContent dividers>
          Artikel <i><b>{deleteArguments.name}</b></i> wirlich löschen?
        </DialogContent>
        <DialogActions>
          <Button ref={noButtonRef} onClick={handleDeleteNo}>
            Nein
          </Button>
          <Button onClick={handleDeleteYes}>Ja</Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (isOpen) {
    const style = {height: 500, width: '100%'};
    return (
      <div style={style}>
        {renderConfirmChangeDialog()}
        {renderConfirmDeleteDialog()}
        <DataGrid
          rows={articles}
          columns={columns(setDeleteArguments)}
          processRowUpdate={processRowUpdate}
          experimentalFeatures={{ newEditingApi: true }}
        />
        {!!snackbar && (
          <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
            <Alert {...snackbar} onClose={handleCloseSnackbar} />
          </Snackbar>
        )}
      </div>
    );
  } else {
    return (<></>);
  }
}

function columns(setDeleteArguments) {return [
  { field: 'name', flex: 1, align:'center', headerAlign:'center', headerName: 'Name', width: 180, editable: true },
  { field: 'purchasePrice', type: 'number', headerAlign:'center', headerName: 'Einkaufspreis', width: 180, editable: true, valueFormatter: (params) => {
      if (params.value == null) {
        return '';
      }

      const valueFormatted = params.value.toFixed(2).toLocaleString();
      return `${valueFormatted} €`;
    },
  },
  { field: 'percentage', type: 'number', headerAlign:'center', headerName: '%', width: 100, editable: true, valueFormatter: (params) => {
      if (params.value == null) {
        return '';
      }

      const valueFormatted = Number(params.value).toLocaleString();
      return `${valueFormatted} %`;
    },
   },
  { field: 'sellingPrice', type: 'number', headerAlign:'center', headerName: 'Verkaufspreis', width: 180, editable: true, valueFormatter: (params) => {
      if (params.value == null) {
        return '';
      }

      const valueFormatted = params.value.toFixed(2).toLocaleString();
      return `${valueFormatted} €`;
    },
   },
  { field: 'quantity', type: 'number', headerAlign:'center', headerName: 'Stückzahl', width: 180, editable: true },
  { field: 'delete',
    editable: false,
    type: 'action',
    headerName: '',
    align: 'center',
    width: 60,
    sortable: false,
    renderCell: (params) => {
      const onClick = (e) => {
        e.stopPropagation(); // don't select this row after clicking

        const api = params.api;
        const thisRow = {};

        api
          .getAllColumns()
          .filter((c) => c.field !== "__check__" && !!c)
          .forEach(
            (c) => (thisRow[c.field] = params.getValue(params.id, c.field))
          );

        return alert(JSON.stringify(thisRow, null, 4));
      };

      return <IconButton size="small" aria-label="deleteCompany" onClick={()=>{
                 setDeleteArguments(params.row); }}>
               <DeleteIcon fontSize="small" />
             </IconButton>;
    }
  },
];
}

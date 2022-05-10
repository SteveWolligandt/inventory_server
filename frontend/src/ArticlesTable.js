import { DataGrid } from '@mui/x-data-grid';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import useWebSocket from 'react-use-websocket';

import React, { useState, useEffect } from 'react';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i>{oldRow.name}</i> zu <i>{newRow.name}</i> ändern?</>);
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
      console.log(msg);
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
              cs.push({id:articlesJson[article].id, name:articlesJson[article].name});
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
    (company) =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          if (company.name?.trim() === '') {
            reject();
          } else {
            resolve(company);
          }
        }, 200),
      ),
    [],
  );
  const noButtonRef = React.useRef(null);
  const [promiseArguments, setPromiseArguments] = React.useState(null);

  const [snackbar, setSnackbar] = React.useState(null);

  const handleCloseSnackbar = () => setSnackbar(null);

  const processRowUpdate = React.useCallback(
    (newRow, oldRow) =>
      new Promise((resolve, reject) => {
        const mutation = computeMutation(newRow, oldRow);
        if (mutation) {
          // Save the arguments to resolve or reject the promise later
          setPromiseArguments({ resolve, reject, newRow, oldRow });
        } else {
          resolve(oldRow); // Nothing was changed
        }
      }),
    [],
  );

  const handleNo = () => {
    const { oldRow, resolve } = promiseArguments;
    resolve(oldRow); // Resolve with the old row to not update the internal state
    setPromiseArguments(null);
  };

  const handleYes = async () => {
    const { newRow, oldRow, reject, resolve } = promiseArguments;

    try {
      const url = '/api/article/' + newRow.id;
      const body = JSON.stringify(newRow);
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

      const response = await mutateRow(newRow);
      setSnackbar({ children: 'Artikel in Datenbank geändert', severity: 'success' });
      resolve(response);
      setPromiseArguments(null);
    } catch (error) {
      setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
      reject(oldRow);
      setPromiseArguments(null);
    }
  };

  const handleEntered = () => {
    // The `autoFocus` is not used because, if used, the same Enter that saves
    // the cell triggers "No". Instead, we manually focus the "No" button once
    // the dialog is fully open.
    // noButtonRef.current?.focus();
  };

  const renderConfirmDialog = () => {
    if (!promiseArguments) {
      return null;
    }

    const { newRow, oldRow } = promiseArguments;
    const mutation = computeMutation(newRow, oldRow);

    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
        open={!!promiseArguments}
      >
        <DialogTitle>Artikel wirklich ändern?</DialogTitle>
        <DialogContent dividers>
          {mutation}
        </DialogContent>
        <DialogActions>
          <Button ref={noButtonRef} onClick={handleNo}>
            Nein
          </Button>
          <Button onClick={handleYes}>Ja</Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (isOpen) {
    const style = {height: 500, width: '100%'};
    return (
      <div style={style}>
        {renderConfirmDialog()}
        <DataGrid
          rows={articles}
          columns={columns}
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

const columns = [
  { field: 'name', flex: 1, align:'center', headerAlign:'center', headerName: 'Name', width: 180, editable: true },
  { field: 'purchasePrice', headerAlign:'center', headerName: 'Einkaufspreis', width: 180, editable: true },
  { field: 'sellingPercentage', headerAlign:'center', headerName: '%', width: 100, editable: true },
  { field: 'sellingPrice', headerAlign:'center', headerName: 'Verkaufspreis', width: 180, editable: true },
  { field: 'quantity', headerAlign:'center', headerName: 'Stückzahl', width: 180, editable: true },
];

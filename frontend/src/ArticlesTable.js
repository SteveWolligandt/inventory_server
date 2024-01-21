import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Zoom from '@mui/material/Zoom';
import Box from '@mui/material/Box';
import {DataGrid, GridToolbarQuickFilter} from '@mui/x-data-grid';
import React, {useEffect} from 'react';
import fetchWithToken from './jwtFetch.js';

import CreateArticleDialog from './CreateArticleDialog.js';

function computeMutationAmount(newRow, oldRow) {
  if (newRow.amount !== oldRow.amount) {
    return (<>Anzahl von <i><b>{oldRow.amount}</b></i> auf <i><b>{newRow.amount}</b></i> setzen?</>);
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

export default function ArticlesTable({
  open,
  activeCompany,
  activeInventory,
  onBack,
  userToken,
  setUserToken,
  setSnackbar,
  setTopBarContext,
  updateTitle,
  lastMessage
}) {
  var [articles, setArticles] = React.useState([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  var [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const asyncEffect = async () => {
      if (activeCompany != null) {
        const msg = JSON.parse(lastMessage.data);
        let action = msg.action;
        if (action === 'authorized') {
        } else if (action === 'newArticle') {
          let newArticle = msg.data;
          if (newArticle.companyId !== activeCompany.id) { return; }
          const foundArticle = articles.find(article => article.id === newArticle.id);
          if (foundArticle !== undefined) {console.log('stop'); return; }

          const url = '/api/inventory/' + activeInventory.id + '/inventorydata/' +
                      newArticle.id;
          const response = await fetchWithToken(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', token:userToken}
          }, userToken, setUserToken, setSnackbar);
          const inventoryData = await response.json();
          newArticle.purchasePrice = inventoryData.purchasePrice;
          newArticle.percentage    = inventoryData.percentage;
          newArticle.sellingPrice  = inventoryData.sellingPrice;
          newArticle.notes         = inventoryData.notes;
          newArticle.amount        = inventoryData.amount;
          setArticles(articles => articles.concat(newArticle));
        } else if (action === 'updateArticle') {
          let updatedArticle = msg.data;
          setArticles(articles => articles.map((article, j) => {
            return updatedArticle.id === article.id ? updatedArticle : article;
          }));

        } else if (action === 'deleteArticle') {
          let deletedArticle = msg.data;
          setArticles(articles => articles.filter(article => article.id !==
                                                             deletedArticle.id));
        } else if (action === 'updateInventoryData') {
          let updatedInventoryData = msg.data;
          setArticles(articles => articles.map((article, j) => {
            if (updatedInventoryData.inventoryId === activeInventory.id &&
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
    }
    if (lastMessage === null) {
      return;
    }
    asyncEffect()
  }, [lastMessage]);

  // initial get
  const initialGet = () => {
    if (!open)             { setArticles([]); return; }
    if (userToken == null) {return;}
    const load = async () => {
      if (userToken == null) {return;}
      if (activeInventory == null) {return;}
      if (activeCompany == null) {return;}
      try {
        setIsLoading(true);
        const response = await fetchWithToken(activeInventory
                  ? '/api/company/' + activeCompany.id + '/inventory/' + activeInventory.id
                  : '/api/company/' + activeCompany.id + '/articles',
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json',token:userToken },
          }, userToken, setUserToken, setSnackbar
        )
        if (response.status == 401) {
          setSnackbar(
              {children :'Kein Zugriff', severity : 'error'});
          return;
        }
        const articlesJson = await response.json();
              var cs = [];
              for (var article in articlesJson) {
                if (articlesJson.hasOwnProperty(article)) {
                  cs.push(articlesJson[article]);
                }
              }
              setArticles(cs);
        setIsLoading(false);
      } catch (error) {
        setSnackbar(
            {children :'Da lief was schief: ' + error, severity : 'error'});
      }
    }
    load();
  }
  useEffect(initialGet, [open, userToken, activeCompany, activeInventory, setSnackbar]);


  React.useEffect(() => {
    if (open) {
      setTopBarContext([{
        key:'newArticle',
        label:'Neuer Artikel',
        icon:()=>(<AddCircleIcon/>),
        onClick:()=>setDialogOpen(true)}]);
    }
  },[open, setTopBarContext])

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

  const processRowUpdate = React.useCallback(
      (newRow, oldRow) => new Promise((resolve, reject) => {
        const mutationName =
          computeMutationName(newRow, oldRow);
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
                newRow.purchasePrice / (1 - newRow.percentage / 100);
          }
          if (newRow.percentage   !== oldRow.percentage ||
              newRow.sellingPrice !== oldRow.sellingPrice) {
            newRow.purchasePrice =
                newRow.sellingPrice * (1 - newRow.percentage / 100);
            console.log(newRow.sellingPrice + ' * (1 - ' + newRow.percentage + ' / 100 = ' + newRow.purchasePrice);
          }
        }
        if (mutationName || mutationArticleNumber) {
          setChangeArguments({resolve, reject, newRow, oldRow, mutationName, mutationArticleNumber, mutationPrice, mutationAmount, mutationNotes});
        } else if (activeInventory && (mutationAmount || mutationPrice || mutationNotes)) {
          setChangeArguments({resolve, reject, newRow, oldRow, mutationName, mutationArticleNumber, mutationPrice, mutationAmount, mutationNotes});
        } else {
          resolve(oldRow); // Nothing was changed
        }
      }),
      [ activeInventory ],
  );

  const handleChangeNo = () => {
    const {oldRow, resolve} = changeArguments;
    resolve(oldRow); // Resolve with the old row to not update the internal state
    setChangeArguments(null);
  };

  const handleChangeYes = async () => {
    const {newRow, oldRow, reject, resolve, mutationName, mutationArticleNumber, mutationPrice, mutationAmount, mutationNotes} = changeArguments;

    try {
      if (mutationName || mutationArticleNumber) {
        const url = '/api/article/' + newRow.id;
          const body = JSON.stringify({
            articleId     : newRow.id,
            name          : newRow.name,
            articleNumber : newRow.articleNumber,
          });
        await fetchWithToken(url, {
          method : 'PUT',
          headers : {'Content-Type' : 'application/json', token:userToken},
          body : body
        }, userToken, setUserToken, setSnackbar);
      }

      if (activeInventory && (mutationPrice || mutationAmount || mutationNotes)) {
        const url = '/api/inventorydata/';
        const body = JSON.stringify({
          articleId     : newRow.id,
          inventoryId   : activeInventory.id,
          amount        : newRow.amount,
          purchasePrice : newRow.purchasePrice,
          percentage    : newRow.percentage,
          notes         : newRow.notes,
        });
        await fetchWithToken(url, {
          method : 'PUT',
          headers : {'Content-Type' : 'application/json', token:userToken},
          body : body
        }, userToken, setUserToken, setSnackbar);
      }

      const response = await mutateRow(newRow);
      setSnackbar({
        children : 'Artikel geändert',
        severity : 'success'
      });
      resolve(response);
      setChangeArguments(null);
    } catch (error) {
      setSnackbar({children : error, severity : 'error'});
      reject(oldRow);
      setChangeArguments(null);
    }
  };

  const handleDeleteNo = () => { setDeleteArguments(null); };

  const handleDeleteYes = async () => {
    try {
      const url = '/api/article/' + deleteArguments.id;
      await fetchWithToken(url, {
        method : 'DELETE', 
          headers: { 'Content-Type': 'application/json', token:userToken },
        }, userToken, setUserToken, setSnackbar);

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

    const {newRow, oldRow}      = changeArguments;
    const mutationName          = computeMutationName(newRow, oldRow);
    const mutationArticleNumber = computeMutationArticleNumber(newRow, oldRow);
    const mutationAmount        = computeMutationAmount(newRow, oldRow);
    const mutationPrice         = computeMutationPricing(newRow, oldRow);
    const mutationNotes         = computeMutationNotes(newRow, oldRow);

    return (
      <Dialog maxWidth        = "xs"
              TransitionProps = {{onEntered:handleEntered}}
              open            = {!!changeArguments}>
        <DialogTitle>
          Artikel wirklich ändern?
        </DialogTitle>
        <DialogContent dividers>
          {mutationName}
          {mutationArticleNumber}
          {mutationAmount}
          {mutationPrice}
          {mutationNotes}
        </DialogContent>
        <DialogActions>
          <Button ref = {noButtonRef} onClick = {handleChangeNo}>
            Nein
          </Button>
          <Button onClick={handleChangeYes}>
            Ja
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderConfirmDeleteDialog = () => {
    if (!deleteArguments) {
      return null;
    }

    return (
      <Dialog maxWidth = "xs"
              TransitionProps = {{onEntered: handleEntered}}
              open = {!!deleteArguments}>
        <DialogTitle>
          Artikel wirklich löschen?
        </DialogTitle>
        <DialogContent dividers>
          Artikel <i><b>{deleteArguments.name}</b></i> wirlich löschen?
        </DialogContent>
        <DialogActions>
          <Button ref     = {noButtonRef}
                  onClick = {handleDeleteNo}>
            Nein
          </Button>
          <Button onClick={handleDeleteYes}>
            Ja
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (!open) { return null; }
  const renderLoading = () => {
    if (isLoading) {
      return (
        <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
        <CircularProgress /></div>);
    }
    return null;
  };
  const QuickSearchToolbar = () => {
    return (
      <Box
        sx={{
          p: 0.5,
          pb: 0,
        }}
      >
        <GridToolbarQuickFilter />
      </Box>
    );
  }
  const renderDataGrid = () => {
    if (isLoading) { return null; }
    return (
      <DataGrid 
        components           = {{Toolbar:QuickSearchToolbar}}
        rows                 = {articles}
        columns              = {columns(setDeleteArguments, userToken, setUserToken)}
        processRowUpdate     = {processRowUpdate}
        experimentalFeatures = {{newEditingApi: true }}
      />);
  }
  return (<>
    <Paper
      elevation={5}
      sx={{overflow: 'hidden',
           'marginTop':'100px',
           'marginLeft':'20px',
           'marginRight':'20px',
           height:'calc(100vh - 120px)'
         }}>
      {renderConfirmChangeDialog()}
      {renderConfirmDeleteDialog()}
      {renderLoading()}
      {renderDataGrid()}
    </Paper>
    <CreateArticleDialog open={dialogOpen}
                         setOpen={setDialogOpen}
                         userToken={userToken}
                         setUserToken={setUserToken}
                         activeCompany={activeCompany}
                         setSnackbar={setSnackbar}
                         activeInventory={activeInventory}/>
    <Zoom in={open}>
      <Fab color='secondary'
           aria-label="add"
           style={{margin: '0 auto',
                   top: 60,
                   right: 'auto',
                   bottom: 'auto',
                   left: 10,
                   position: 'fixed',
                 }}
           onClick={onBack}>
        <ArrowBackIcon/>
      </Fab>
    </Zoom>
  </>);
}

function columns(setDeleteArguments, userToken, setUserToken) {
  return [
    { field: 'name',
      flex: 1,
      minWidth: 150,
      headerAlign:'center',
      align: 'center',
      headerName: 'Name',
      //width: 200,
      editable: true },
    { field: 'articleNumber',
      flex: 1,
      minWidth: 200,
      headerAlign:'center',
      align: 'center',
      headerName: 'Artikelnummer',
      //width: 200,
      editable: true },
    { field: 'purchasePrice',
      flex: 1,
      minWidth: 100,
      maxWidth: 150,
      type: 'number',
      headerAlign:'center',
      align: 'center',
      headerName: 'EK',
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
      flex: 1,
      minWidth: 100,
      maxWidth: 150,
      type: 'number',
      headerAlign:'center',
      align: 'center',
      headerName: '%',
      //width: 100,
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
      flex: 1,
      minWidth: 100,
      maxWidth: 150,
      type: 'number',
      headerAlign:'center',
      align: 'center',
      headerName: 'VK',
      //width: 80,
      editable: true,
      valueFormatter: (params) => {
        if (params.value == null) {
          return '';
        }

        const valueFormatted = params.value.toFixed(2).toLocaleString();
        return `${valueFormatted} €`;
      },
    },
    { field: 'amount',
      flex: 1,
      type: 'number',
      headerAlign:'center',
      align: 'center',
      headerName: 'Stückzahl',
      //width: 80,
      editable: true },
    { field: 'notes',
      flex: 1,
      headerAlign:'center',
      align: 'center',
      headerName: 'Notizen',
      //width: 100,
      sortable: false,
      editable: true },
    //{ field: 'delete',
    //  editable: false,
    //  //type: 'action',
    //  headerName: '',
    //  align: 'center',
    //  width: 60,
    //  sortable: false,
    //  renderCell: (params) => {
    //    return <IconButton size="small"
    //                       aria-label="deleteCompany"
    //                       onClick={() => { setDeleteArguments(params.row); }}>
    //             <DeleteIcon fontSize = "small" />
    //           </IconButton>;
    //  }
    //},
  ];
}

import websocketAddr from './websocketAddress.js';
import CircularProgress from '@mui/material/CircularProgress';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import { DataGrid } from '@mui/x-data-grid';
import fetchWithToken from './jwtFetch.js';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import React from 'react';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

export default function Companies({
  open,
  onCompanySelected,
  userToken,
  setUserToken,
  setSnackbar,
  setTopBarContext,
  activeInventory
}) {
  var [companies, setCompanies] = React.useState([]);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  var [isLoading, setIsLoading] = React.useState(false);
  
  const ws = React.useRef(new WebSocket(websocketAddr()));
  const authorizeWebSocket = () =>  ws.current.send(JSON.stringify({token:userToken}));
  ws.current.onopen = (event) => authorizeWebSocket();

  ws.current.onmessage =  (event) => { const f = async () => {
    let msg = JSON.parse(event.data);
    let action = msg.action;
    if (action === 'newCompany') {
      let newCompany = msg.data;
      setCompanies(companies => companies.concat(newCompany));
    } else if (action === 'updateCompany') {
      let updatedCompany = msg.data;
      setCompanies(companies => companies.map((company, j) => {
        return updatedCompany.id === company.id ? updatedCompany : company;
      }));
    } else if (action === 'deleteCompany') {
      let deletedCompany = msg.data;
      setCompanies(companies => companies.filter(company => company.id !== deletedCompany.id));
    }
  }; f() };

  React.useEffect(() => {if (ws.readyState === WebSocket.OPEN) {authorizeWebSocket();}}, [userToken]);

  const loadCompanies = () => {
    if (!open)             { setCompanies([]); return; }
    if (userToken == null) {return;}
    if (activeInventory == null) {return;}
    const loadData = async() => {
      setIsLoading(true);
      try {
        const response = await fetchWithToken('/api/companies/value/'+activeInventory.id, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken},
        }, userToken, setUserToken, setSnackbar)
        if (response == null) {return;}
        const companiesJson = await response.json();
        var cs = [];
        for (var i in companiesJson) {
          if (companiesJson.hasOwnProperty(i)) {
            cs.push(companiesJson[i]);
          }
        }
        setCompanies(cs);
      } catch (error) {
        console.error(error);
      }
      setIsLoading(false);
    };
    loadData();
  };
  React.useEffect(loadCompanies, [open, userToken, activeInventory]);
  React.useEffect(() => {
    if (open) {
      setTopBarContext(() =>() => (
        <Button
          color="inherit"
          onClick={()=>setCreateDialogOpen(true)}>
          Neue Firma
        </Button>
      ));
    }
  },[open, setTopBarContext])

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
  const [changeArguments, setChangeArguments] = React.useState(null);
  const [deleteArguments, setDeleteArguments] = React.useState(null);

  const processRowUpdate = React.useCallback(
    (newRow, oldRow) =>
      new Promise((resolve, reject) => {
        const mutation = computeMutation(newRow, oldRow);
        if (mutation) {
          // Save the arguments to resolve or reject the promise later
          setChangeArguments({ resolve, reject, newRow, oldRow });
        } else {
          resolve(oldRow); // Nothing was changed
        }
      }),
    [],
  );
  if (!open) {return null;}

  const handleChangeNo = () => {
    const { oldRow, resolve } = changeArguments;
    resolve(oldRow); // Resolve with the old row to not update the internal state
    setChangeArguments(null);
  };

  const handleChangeYes = async () => {
    const { newRow, oldRow, reject, resolve } = changeArguments;

    try {
      const url = '/api/company/' + newRow.id;
      const body = JSON.stringify({name:newRow.name});
      await fetchWithToken(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', token:userToken },
        body: body
      }, userToken, setUserToken, setSnackbar);

      const response = await mutateRow(newRow);
      setSnackbar({ children: 'Firma in Datenbank geändert', severity: 'success' });
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
      const url = '/api/company/' + deleteArguments.id;
      await fetchWithToken(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', token:userToken }
      }, userToken, setUserToken, setSnackbar);

      setSnackbar({ children: 'Firma in Datenbank gelöscht', severity: 'success' });
      setDeleteArguments(null);
    } catch (error) {
      setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
      setDeleteArguments(null);
    }
  };

  const renderDeleteConfirmDialog = () => {
    if (!deleteArguments) {
      return null;
    }
    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: ()=>{} }}
        open={!!deleteArguments}
      >
        <DialogTitle><div style={{color:'red'}}>Firma wirklich löschen?</div></DialogTitle>
        <DialogContent dividers>
          Diese Aktion löscht die Firma <i><b>{deleteArguments.name}</b></i> und alle Artikel der Firma und dessen Stückzahlen!
        </DialogContent>
        <DialogActions>
          <Button ref={noButtonRef} onClick={handleDeleteNo}>
            <div style={{color:'green'}}>Nein</div>
          </Button>
          <Button onClick={handleDeleteYes}>
            <div style={{color:'red'}}>Ja</div>
          </Button>
        </DialogActions>
      </Dialog>
    );
  };


  const renderChangeConfirmDialog = () => {
    if (!changeArguments) { return null; }
    const { newRow, oldRow } = changeArguments;
    const mutation = computeMutation(newRow, oldRow);
    return (
      <Dialog maxWidth="xs"
              TransitionProps={{ onEntered: ()=>{} }}
              open={!!changeArguments}>
        <DialogTitle>Firma wirklich ändern?</DialogTitle>
        <DialogContent dividers>
          {mutation}
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

  if (!open) { return null; }
  const renderLoading = () => {
    if (!isLoading) { return null; }
    return (
      <div style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100px'}}>
      <CircularProgress /></div>);
  };
  const renderDataGrid = () => {
    if (isLoading) { return null; }
    return (<DataGrid rows={companies}
                      columns={columns(onCompanySelected, setDeleteArguments)}
                      processRowUpdate={processRowUpdate}
                      experimentalFeatures={{ newEditingApi: true }}/>);
  }
  return (<>
    <div style ={{margin: '0 auto', maxWidth: '1000px'}} >
    <div style={{height: 'calc(100vh - 110px)', width: '100%'}}>
    {renderLoading()}
    {renderDataGrid()}
    </div>
    </div>
    {renderChangeConfirmDialog()}
    {renderDeleteConfirmDialog()}
    <CreateCompanyDialog open={createDialogOpen}
                         setOpen={setCreateDialogOpen}
                         userToken={userToken}
                         setUserToken={setUserToken}
                         setSnackbar={setSnackbar}/>
    </>
  );
}

function columns(onCompanySelected, setDeleteArguments) {
  return [
    { field: 'name', align:'center', headerAlign:'center', headerName: 'Name', flex: 1, editable: true },
    { field: 'value', align:'center', headerAlign:'center', headerName: 'Warenwert', flex: 1, editable: false,
      valueFormatter: (params) => {
        if (params.value == null) {
          return '';
        }

        const valueFormatted = params.value.toFixed(2).toLocaleString();
        return `${valueFormatted} €`;
      } },
    { field: 'delete',
      editable: false,
      headerName: '',
      align: 'center',
      width: 60,
      sortable: false,
      renderCell: (params) => {
        const onClick = (e) => {
          e.stopPropagation(); // don't select this row after clicking
          setDeleteArguments(params.row);
        };

        return (<IconButton size="small"
                           aria-label="deleteCompany"
                           onClick={onClick}>
                 <DeleteIcon fontSize="small" />
               </IconButton>);
      }
    },
    { field: 'open',
      editable: false,
      headerName: '',
      align: 'center',
      width: 60,
      sortable: false,
      renderCell: (params) => {
        const onClick = (e) => {
          e.stopPropagation(); // don't select this row after clicking
          const company = params.row;


          onCompanySelected(company);
        };

        return <IconButton size="small"
                           aria-label="gotoCompany"
                           onClick={onClick}>
                 <ArrowForwardIosIcon fontSize="small" />
               </IconButton>;
      }
    }
  ];
}

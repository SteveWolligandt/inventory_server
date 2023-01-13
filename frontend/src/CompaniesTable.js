import websocketAddr from './websocketAddress.js';
import useStickyState from './useStickyState.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import { DataGrid } from '@mui/x-data-grid';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import React from 'react';
import useWebSocket from 'react-use-websocket';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

export default function Companies({open, onCompanySelected, activeCompany, setActiveCompany}) {
  var [companies, setCompanies] = React.useState([]);
  const [messageHistory, setMessageHistory] = React.useState([]);

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

  const lastMessage = useWebSocket(websocketAddr()).lastMessage;

  const handleWebsocket = () => {
    console.log('WEBSOCKET');
    if (lastMessage !== null) {
      console.log(lastMessage);
      let msg = JSON.parse(lastMessage.data);
      let action = msg.action;
      console.log(action);
      if (action === 'newCompany') {
        let newCompany = JSON.parse(msg.data);
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
    }
  };
  React.useEffect(handleWebsocket, [lastMessage, setCompanies]);

  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/companies');
        const companiesJson = await response.json();
        var cs = [];
        for (var company in companiesJson) {
          if (companiesJson.hasOwnProperty(company)) {
            cs.push({id:companiesJson[company].id, name:companiesJson[company].name});
          }
        }
        setCompanies(cs);
      } catch (error) {
        console.error(error);
      }
    }
    loadData();
  }, []);

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

  const [snackbar, setSnackbar] = React.useState(null);

  const handleCloseSnackbar = () => setSnackbar(null);

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
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

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
      await fetch(url, {
        method: 'DELETE',
      });

      setSnackbar({ children: 'Firma in Datenbank gelöscht', severity: 'success' });
      setDeleteArguments(null);
    } catch (error) {
      setSnackbar({ children: "Name darf nicht leer sein!", severity: 'error' });
      setDeleteArguments(null);
    }
  };

  const handleEntered = () => {
    // The `autoFocus` is not used because, if used, the same Enter that saves
    // the cell triggers "No". Instead, we manually focus the "No" button once
    // the dialog is fully open.
    // noButtonRef.current?.focus();
  };

  const renderDeleteConfirmDialog = () => {
    if (!deleteArguments) {
      return null;
    }
    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
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
    if (!changeArguments) {
      return null;
    }
    const { newRow, oldRow } = changeArguments;
    const mutation = computeMutation(newRow, oldRow);
    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: handleEntered }}
        open={!!changeArguments}
      >
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

  if (open) {
    const style = {height: 500, width: '100%'};
    return (
      <div style ={{margin: '0 auto', maxWidth: '1000px'}} >
      <div style={style}>
        {renderChangeConfirmDialog()}
        {renderDeleteConfirmDialog()}
        <DataGrid
          rows={companies}
          columns={columns(onCompanySelected, setDeleteArguments)}
          processRowUpdate={processRowUpdate}
          experimentalFeatures={{ newEditingApi: true }}
        />
        {!!snackbar && (
          <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={6000}>
            <Alert {...snackbar} onClose={handleCloseSnackbar} />
          </Snackbar>
        )}
      <CreateCompanyDialog open={open}/>
      </div>
      </div>
    );
  } else {
    return (<></>);
  }
}

function columns(onCompanySelected, setDeleteArguments) {
  return [
    { field: 'name', align:'center', headerAlign:'center', headerName: 'Name', flex: 1, editable: true },
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
    },
  ];
}

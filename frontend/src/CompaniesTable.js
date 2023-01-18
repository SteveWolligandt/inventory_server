import websocketAddr from './websocketAddress.js';
import CreateCompanyDialog from './CreateCompanyDialog.js';
import { DataGrid } from '@mui/x-data-grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
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

export default function Companies({open, onCompanySelected, userToken, setSnackbar, setTopBarContext}) {
  var [companies, setCompanies] = React.useState([]);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  
  const lastMessage = useWebSocket(websocketAddr()).lastMessage;
  const handleWebsocket = () => {
    if (lastMessage !== null) {
      let msg = JSON.parse(lastMessage.data);
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
    }
  };
  React.useEffect(handleWebsocket, [lastMessage, setCompanies]);

  const loadCompanies = () => {
    if (!open)             { setCompanies([]); return; }
    if (userToken == null) {return;}
    const loadData = async() => {
      try {
        const response = await fetch('/api/companies', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', token:userToken},
        })
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
    };
    loadData();
  };
  React.useEffect(loadCompanies, [open, userToken]);
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
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', token:userToken },
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
        headers: { 'Content-Type': 'application/json', token:userToken }
      });

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
    if (!changeArguments) {
      return null;
    }
    const { newRow, oldRow } = changeArguments;
    const mutation = computeMutation(newRow, oldRow);
    return (
      <Dialog
        maxWidth="xs"
        TransitionProps={{ onEntered: ()=>{} }}
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

  if (!open) { return null; }
  const style = {height: 500, width: '100%'};
  return (<>
    <div style ={{margin: '0 auto', maxWidth: '1000px'}} >
    <div style={style}>
    <DataGrid
      rows={companies}
      columns={columns(onCompanySelected, setDeleteArguments)}
      processRowUpdate={processRowUpdate}
      experimentalFeatures={{ newEditingApi: true }}
    />
    </div>
    </div>
    {renderChangeConfirmDialog()}
    {renderDeleteConfirmDialog()}
    <CreateCompanyDialog open={createDialogOpen}
                         setOpen={setCreateDialogOpen}
                         userToken={userToken}
                         setSnackbar={setSnackbar}/>
    </>
  );
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

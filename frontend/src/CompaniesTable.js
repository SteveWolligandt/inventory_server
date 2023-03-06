import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import {DataGrid} from '@mui/x-data-grid';
import React from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { experimentalStyled as styled } from '@mui/material/styles';

import CreateCompanyDialog from './CreateCompanyDialog.js';
import fetchWithToken from './jwtFetch.js';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

export default function CompaniesTable({
  open,
  onCompanySelected,
  userToken,
  setUserToken,
  setSnackbar,
  setTopBarContext,
  activeInventory,
  lastMessage
}) {
  var [companies, setCompanies] = React.useState([]);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  var [isLoading, setIsLoading] = React.useState(false);
  
  React.useEffect(() => {
    if (lastMessage === null) {
      return;
    }
    const msg = JSON.parse(lastMessage.data);
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
  }, [lastMessage]);

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
      setTopBarContext([{
        key:'newCompany',
        label:'Neue Firma',
        icon:()=>(<AddCircleIcon/>),
        onClick:()=>setCreateDialogOpen(true)}]);
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
    return (
      <DataGrid
        initialState={{
          sorting: {
            sortModel: [{ field: 'name', sort: 'asc' }],
          },
        }}
        rows={companies}
        columns={columns(onCompanySelected, setDeleteArguments)}
        processRowUpdate={processRowUpdate}
        experimentalFeatures={{ newEditingApi: true }}/>);
  }

  //return (
  //  <Paper
  //    elevation={5}
  //    sx={{overflow:'hidden',
  //         'marginLeft':'20px',
  //         'marginRight':'20px',
  //         height:'calc(100vh - 110px)'
  //       }}>
  //  {renderLoading()}
  //  {renderDataGrid()}
  //  {renderChangeConfirmDialog()}
  //  {renderDeleteConfirmDialog()}
  //  <CreateCompanyDialog open={createDialogOpen}
  //                       setOpen={setCreateDialogOpen}
  //                       userToken={userToken}
  //                       setUserToken={setUserToken}
  //                       setSnackbar={setSnackbar}/>
  //  </Paper>
  //);

  const CompanyCard = (props) => {
    const { company } = props;
    return (<Card sx={{p: 1,m: 1, width:'200px'}} >
      <CardHeader
        title={company.name}
        action={
          <IconButton aria-label="settings">
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardMedia
        component="img"
        height="200"
        image="https://upload.wikimedia.org/wikipedia/commons/6/69/WMF-Logo.svg"
        alt="Paella dish"
      />
      <Divider/>
      <CardActions disableSpacing>
        <IconButton 
          sx={{marginLeft: "auto"}}
          onClick={()=>onCompanySelected(company)}
        >
          <KeyboardArrowRightIcon/>
        </IconButton>
      </CardActions>
      </Card>);
  }

  return (
    <><Box sx={{display: 'flex', flexWrap: 'wrap'}}>
      {companies.map(company => { return (<CompanyCard key={company.id} company={company} />)})}
    </Box>

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

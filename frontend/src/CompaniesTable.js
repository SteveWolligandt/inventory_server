import EditCompany from './EditCompany.js';
import color from './colorFromString.js';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
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
import React from 'react';

import Box from '@mui/material/Box';

import CreateCompanyDialog from './CreateCompanyDialog.js';
import fetchWithToken from './jwtFetch.js';

const ITEM_HEIGHT = 48;

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

function Image({company}) {
  const [loading, setLoading] = React.useState(true)
  const [state, setState] = React.useState('image')
  const renderAvatar = () => {
    return (
      <Avatar sx={{ margin:'auto', width:'200px', height:'200px', bgcolor: color(company.name), fontSize: "3rem"}}>
        {company.name[0].toUpperCase()}
      </Avatar>
    );
  }
  const renderLoading = () => {
    if (!loading) { return null; }
    return renderAvatar();
  };
  if (state === 'image') {
    return (<>
      {renderLoading()}
      <img
        alt=''
        onLoad={()=>{setLoading(false)}}
        onError={()=>{setState('avatar')}}
        src={'/api/company/'+company.id+'/logo'}/>
    </>)
  } else {
    return renderAvatar()
  }
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
  const [anchorEl, setAnchorEl] = React.useState(null);
  const sortByName = ()=>(a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
  const sortByValue = ()=>(a, b) => a.value < b.value ? 1 : -1;
  const searched = React.useRef("");
  const [allCompanies, setAllCompanies] = React.useState([]);
  const [filteredCompanies, setFilteredCompanies] = React.useState([]);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [sortingFn, setSortingFn] = React.useState(sortByName);
  const [isLoading, setIsLoading] = React.useState(false);
  const selectedCompany = React.useRef()
  const [companyToEdit, setCompanyToEdit] = React.useState(null);
  const menuOpen = Boolean(anchorEl);
  const handleMenuOpen = (ev, company) => {
    selectedCompany.current = company
    setAnchorEl(ev.currentTarget);
  };
  const handleMenuClose = () => {
    selectedCompany.current = null
    setAnchorEl(null);
  };
  
  React.useEffect(() => {
    if (lastMessage === null) {
      return;
    }
    const msg = JSON.parse(lastMessage.data);
    let action = msg.action;
    if (action === 'newCompany') {
      let newCompany = msg.data;
      setAllCompanies(allCompanies => allCompanies.concat(newCompany));
    } else if (action === 'updateCompany') {
      let updatedCompany = msg.data;
      setAllCompanies(allCompanies => allCompanies.map((company, j) => {
        return updatedCompany.id === company.id ? updatedCompany : company;
      }));
    } else if (action === 'deleteCompany') {
      let deletedCompany = msg.data;
      setAllCompanies(allCompanies => allCompanies.filter(company => company.id !== deletedCompany.id));
    }
  }, [lastMessage]);

  const loadCompanies = () => {
    if (!open)             { setAllCompanies([]); setFilteredCompanies([]); return; }
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
        setAllCompanies(cs);
        setFilteredCompanies(cs);
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


  const CompanyCard = ({company}) => {
    return (<Card sx={{p:1,m:1}} >
      <CardHeader
        title={company.name}
        subheader={`${company.value.toFixed(2).toLocaleString()} €`}
        action={
          <IconButton
            color="inherit"
            id='long-button'
            aria-label="settings"
            aria-controls={menuOpen ? 'long-menu' : undefined}
            aria-expanded={menuOpen ? 'true' : undefined}
            aria-haspopup="true"
            onClick={(ev) => {handleMenuOpen(ev,company)}}>
            <MoreVertIcon />
          </IconButton>
        }
      />
      {
      //<CardMedia
      //  component="img"
      //  height="100"
      //  //image="https://upload.wikimedia.org/wikipedia/commons/6/69/WMF-Logo.svg"
      //  image="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Silit-logo.svg/640px-Silit-logo.svg.png"
      ///>
      }
      <CardContent>
      <Box sx={{margin:'auto'}}>
        <Image company={company}/>
      </Box>
      </CardContent>
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

  const requestSearch = (event) => {
    const filteredItems = allCompanies.filter((company) => {
      return company.name.toUpperCase().includes(searched.current.value.toUpperCase());
    });
    setFilteredCompanies(filteredItems);
  };
  return (<>
    {renderLoading()}
    <Paper sx={{p:1,  width:'90%', margin:"auto"}}>
      <TextField
          sx={{width:'100%'}}
          type="search"
          inputRef={searched}
          onChange={(searchVal) => requestSearch(searchVal)}
          placeholder="Suchen" />
      <Button
        onClick={()=>{setSortingFn(sortByValue)}}
      >Nach Warenwert sortieren</Button>
      <Button
        onClick={()=>{setSortingFn(sortByName)}}
      >Alphabetisch sortieren</Button>
    </Paper>
    <Box sx={{p:1, display: 'flex', flexWrap: 'wrap', alignItems:"center", justifyContent:"center"}}>
      {filteredCompanies
        .sort(sortingFn)
        .map(company => { return (<CompanyCard key={company.id} company={company} />)})}
    </Box>

    <CreateCompanyDialog open={createDialogOpen}
                         setOpen={setCreateDialogOpen}
                         userToken={userToken}
                         setUserToken={setUserToken}
                         setSnackbar={setSnackbar}/>
      <Menu
        id="long-menu"
        MenuListProps={{
          'aria-labelledby': 'long-button',
        }}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => { handleMenuClose() }}
        PaperProps={{
          style: {
            maxHeight: ITEM_HEIGHT * 4.5,
            //width: '20ch',
          },
        }}
      >
        <MenuItem 
          key='edit'
          onClick={()=>{setCompanyToEdit(selectedCompany.current);handleMenuClose()}}>
          Bearbeiten
        </MenuItem>
        <MenuItem
          key='delete'
          onClick={()=>{
              handleMenuClose()
            }
          }>
          Löschen
        </MenuItem>
      </Menu>
      <EditCompany
        open={companyToEdit !== null}
        company={companyToEdit}
        setCompany={setCompanyToEdit}
        userToken={userToken}
        setUserToken={setUserToken}
        setSnackbar={setSnackbar}
      />
    </>
  );
}

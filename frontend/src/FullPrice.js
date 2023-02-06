import { DataGrid } from '@mui/x-data-grid';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import React from 'react';

function computeMutation(newRow, oldRow) {
  if (newRow.name !== oldRow.name) {
    return (<>Von <i><b>{oldRow.name}</b></i> zu <i><b>{newRow.name}</b></i> ändern?</>);
  }
  return null;
}

export default function FullPrice({open, userToken, onBack, setSnackbar, activeInventory}) {
  var [fullPrices, setFullPrices] = React.useState(null);
  
  React.useEffect(() => {
    if (userToken == null) {return;}
    if (open === false) {return;}
    const loadData = async() => {
      try {
        const response = await fetch('/api/inventory/'+activeInventory.id+'/value', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({token:userToken})
        })
        const fullPricesJson = await response.json();
        setFullPrices(fullPricesJson);
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, [open, activeInventory, userToken]);

  if (fullPrices == null) { return null; }
  if (!open)              { return null; }
  const style = {height: 500, width: '100%'};
  return (<>
    <div style ={{margin: '0 auto', maxWidth: '1000px'}} >
    <div style={style}>
    <DataGrid
      rows={fullPrices.companies}
      columns={columns(fullPrices)}
      experimentalFeatures={{ newEditingApi: true }}
    />
    </div>
    </div>
    <Zoom in={open}>
      <Fab color='secondary'
           aria-label="add"
           style={{margin: '0 auto',
                   top: 80,
                   right: 'auto',
                   bottom: 'auto',
                   left: 10,
                   position: 'fixed',
                 }}
           onClick={onBack}>
        <ArrowBackIcon/>
      </Fab>
    </Zoom>
    </>
  );
}

function columns(fullPrices) {
  return [
    { field: 'name', align:'center', headerAlign:'center', headerName: 'Firma', flex: 1, editable: false },
    { field: 'price', align:'center', headerAlign:'center', headerName: 'Preis (gesamt: '+fullPrices.price.toFixed(2).toLocaleString()+'€)', flex: 1, editable: false,
      valueFormatter: (params) => {
        if (params.value == null) {
          return '';
        }
        const valueFormatted = params.value.toFixed(2).toLocaleString();
        return `${valueFormatted} €`;
      },
    }
  ];
}

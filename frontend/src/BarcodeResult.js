import React from 'react'
import BarcodeScannerImpl from './BarcodeScannerImpl.jsx';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import Barcode from 'react-barcode';

export default function BarcodeResult({open, setOpen, barcode}) {
  return (
    <Dialog open={open} onClose={()=>{}}>
      <DialogTitle>
        Barcode
      </DialogTitle>
      <DialogContent>
      {(barcode === null) ? null : <Barcode value={barcode} />}
      </DialogContent>
      <DialogActions>
      <Button onClick={()=>setOpen(false)}>Abbrechen</Button>
      </DialogActions>
    </Dialog>)
}

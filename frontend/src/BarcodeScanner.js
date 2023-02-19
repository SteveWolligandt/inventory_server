import React from 'react'
import BarcodeScannerImpl from './BarcodeScannerImpl.jsx';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';

export default function BarcodeScanner({open, setOpen, setSnackbar, onBarcodeScanned}) {
  const onNewScanResult = (decodedText, decodedResult) => {
    onBarcodeScanned(decodedText)
  };

  return (
    <Dialog open={open}>
    <DialogContent>
      <BarcodeScannerImpl
        fps={10}
        qrbox={250}
        verbose={true}
        disableFlip={false}
        qrCodeSuccessCallback={onNewScanResult}/>
    </DialogContent>
    <DialogActions>
    <Button onClick={()=>setOpen(false)}>Schließen</Button>
    </DialogActions>
    </Dialog>)
}

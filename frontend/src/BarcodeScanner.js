import React from 'react'
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Quagga from 'quagga'

export default function BarcodeScanner({open, setOpen, setSnackbar}) {
  React.useEffect(()=>{
    if (open) {
      Quagga.init(
        {
          locate:false,
          debug: true,
          frequency: 10,
          inputStream : {
            name: "Live",
            type: "LiveStream",
            constraints: {
              width: 640,
              height: 480,
              facingMode: "environment",
            },
            area: { // defines rectangle of the detection/localization area
              top: "10%",    // top offset
              right: "10%",  // right offset
              left: "10%",   // left offset
              bottom: "10%"  // bottom offset
            },
            target:document.querySelector('#BarcodeScanner')    // Or '#yourElement' (optional)
          },
          decoder : {
            readers: [
              'ean_reader',
              'upc_reader',
              //{
              //  format: "ean_reader",
              //  config: {
              //    supplements: [
              //      'ean_5_reader', 'ean_2_reader'
              //    ]
              //  }
              //}
            ],
            debug: {
              drawBoundingBox: true,
              showFrequency: true,
              drawScanline: true,
              showPattern: true
            },
            multiple: false
          },
          numOfWorkers: navigator.hardwareConcurrency,
          locator: {
            halfSample: true,
            patchSize: "medium", // x-small, small, medium, large, x-large
            debug: {
              showCanvas: true,
              showPatches: true,
              showFoundPatches: true,
              showSkeleton: true,
              showLabels: true,
              showPatchLabels: true,
              showRemainingPatchLabels: true,
              boxFromPatches: {
                showTransformed: true,
                showTransformedBox: true,
                showBB: true
              }
            }
          },
        },
        err => {
          if (err) {
            setSnackbar({ children: err, severity: 'success' });
            return
          }
          setSnackbar({ children: "Initialization finished. Ready to start", severity: 'success' });
          Quagga.start();
          Quagga.onDetected(onDetected)
        }
      );
    } else {
      setSnackbar({ children: 'offDetected', severity: 'success' });
      Quagga.offDetected(onDetected)
    }
  }, [open]);

  const [showCameraStream, setShowCameraStream] = React.useState(true);
  const [lastResult, setLastResult] = React.useState(null);
  const onDetected = result => {
    showCameraStream(false);
    setLastResult(result);
    setSnackbar({ children: result.codeResult.code, severity: 'success' });
  }

  const renderCameraStream = () => {
    if (setShowCameraStream) {
      return (<><div id="BarcodeScanner" className="viewport"/></>);
    }
    return null;
  }

  const showResult = () => {
    const open = lastResult !== null && setShowCameraStream === false;
    if (open) { return (
      <Dialog open={open}>
        <DialogTitle>Scanner </DialogTitle>
        <DialogContent>
          lastResult
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>);
    }
    return null;
  }

  return (
    <>
      {renderCameraStream()}
      {showResult()}
    </>)
}

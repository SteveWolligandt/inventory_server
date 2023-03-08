import React, { useState } from "react";
import Cropper from "react-easy-crop";
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

function ImageCropper({ image, onCropDone, onCropCancel, open }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);

  const onCropComplete = (croppedAreaPercentage, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  };

  const onAspectRatioChange = (event) => {
    setAspectRatio(event.target.value);
  };

  return (
    <Dialog open={open}>
      <Box sx={{width:'500px', height:'500px'}}>
        <Cropper
          image={image}
          aspect={aspectRatio}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          minZoom={0.00001}
          showGrid={false}
          onCropComplete={onCropComplete}
          restrictPosition={false}
          style={{
            containerStyle: {
              width: "100%",
              height: "500px",
              backgroundColor: "#ffffff",
            },
          }}
        />
      </Box>

      <DialogActions>
        <Button className="btn btn-outline" onClick={onCropCancel}>
          Cancel
        </Button>

        <Button
          className="btn"
          onClick={() => {
            onCropDone(croppedArea);
          }}
        > Done </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImageCropper;

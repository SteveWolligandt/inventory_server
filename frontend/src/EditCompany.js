import React from 'react';
import ImageCropper from './ImageCropper.js';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

export default function EditCompany({
  open,
  company,
  setCompany
}) {
  const [image, setImage] = React.useState();
  const [currentPage, setCurrentPage] = React.useState("");
  const [imgAfterCrop, setImgAfterCrop] = React.useState();

  React.useEffect(()=>{if (company === null) {setImgAfterCrop(null)}}, [company])

  // Invoked when new image file is selected
  const onImageSelected = (selectedImg) => {
    setImage(selectedImg);
    setCurrentPage("crop-img");
  };

  // Generating Cropped Image When Done Button Clicked
  const onCropDone = (imgCroppedArea) => {
    const canvasEle = document.createElement("canvas");
    canvasEle.width = 200;
    canvasEle.height = 200;

    const context = canvasEle.getContext("2d");

    let imageObj1 = new Image();
    imageObj1.src = image;
    imageObj1.onload = function () {
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, imgCroppedArea.width, imgCroppedArea.height);
      context.drawImage(
        imageObj1,
        imgCroppedArea.x,
        imgCroppedArea.y,
        imgCroppedArea.width,
        imgCroppedArea.height,
        0,
        0,
        200,
        200,
      );

      const dataURL = canvasEle.toDataURL("image/jpeg");

      console.log(dataURL)
      setImgAfterCrop(dataURL);
      setCurrentPage("");
    };
  };

  // Handle Cancel Button Click
  const onCropCancel = () => {
    setCurrentPage("");
    setImage(null);
  };

  const renderImageCropper = () => {
    return (<>
      <ImageCropper
          image={image}
          onCropDone={onCropDone}
          onCropCancel={onCropCancel}
          open={currentPage === "crop-img"}
      />
    </>)
  }
  const renderImage = () => {
    if (imgAfterCrop === null) { return null; }
    return (
      <Box sx={{margin:'auto'}}>
        <img src={imgAfterCrop} alt=''/>
      </Box>)
  }
  const inputRef = React.useRef();
  const handleOnChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(event.target.files[0]);
      reader.onload = function (e) {
        onImageSelected(reader.result);
      };
    }
  };

  const onChooseImg = () => {
    inputRef.current.click();
  };

  if (company === null) { return null; }

  return (<>
    <Dialog open={open}>
      <DialogTitle>
      {company.name} bearbeiten
      </DialogTitle>
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        onChange={handleOnChange}
        style={{ display: "none" }}
      />
      {renderImage()}
      <DialogActions>
        <Button
          onClick={() => {
            setImage(null);
            onChooseImg()
          }}
        >Bild hinzufügen
        </Button>
        <Button
          onClick={async () => {
            //const response = await fetchWithToken(
            const response = await fetch(
              '/api/company/'+company.id+'/logo',{
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                //token:userToken
              },
                body: JSON.stringify({data:imgAfterCrop.substring(imgAfterCrop.indexOf(",") + 1)})}
              //, userToken, setUserToken, setSnackbar
            )
          }}
        >Upload
        </Button>
        <Button
          onClick={() => {
            setCompany(null)
          }}
        >Schließen
        </Button>
      </DialogActions>
    </Dialog>
    {renderImageCropper()}
  </>)
}

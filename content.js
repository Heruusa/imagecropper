let ignoreChange = false;

console.log("Extension loaded on Sakura.fm!");

window.addEventListener("load", () => {
  function attachInputListener() {
    const inputFile = document.querySelector("input[name='imageUri']");
    if (inputFile) {
      console.log("Image input found!", inputFile);
      inputFile.addEventListener("change", function(event) {
        if (ignoreChange) {
          // If the flag is set, ignore this event and reset the flag
          ignoreChange = false;
          return;
        }
        event.stopImmediatePropagation();
        event.preventDefault();
        console.log("Change event intercepted.");
        const file = event.target.files[0];
        if (!file) {
          console.log("No file selected.");
          return;
        }
        console.log("Image detected:", file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log("Image loaded, opening editor...");
          openCropperModal(e.target.result, inputFile);
        };
        reader.readAsDataURL(file);
      }, true);
    } else {
      console.log("Image input not found. Retrying in 1 second...");
      setTimeout(attachInputListener, 1000);
    }
  }
  attachInputListener();
});

function openCropperModal(imageSrc, inputFile) {
  console.log("Creating interactive editor modal...");

  // Remove old modal if it exists
  const existingModal = document.getElementById("custom-cropper-modal");
  if (existingModal) existingModal.remove();

  // Create the modal with improved visuals
  const modal = document.createElement("div");
  modal.id = "custom-cropper-modal";
  modal.style.cssText = "position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); display:flex; flex-direction: column; align-items: center; justify-content: center; z-index:10000;";
  
  modal.innerHTML = `
    <div style="background: #222; padding: 20px; border-radius: 10px; text-align: center; color: #fff; max-width: 90%; max-height: 90%;">
      <canvas id="cropperCanvas" style="border: 1px solid #fff; cursor: grab;"></canvas>
      <br>
      <label style="font-size: 14px; color: #fff;">Zoom:
        <input type="range" id="zoomSlider" min="0.5" max="3" step="0.1" value="1">
      </label>
      <br><br>
      <button id="saveBtn" style="background: #4CAF50; color: #fff; padding: 8px 16px; border: none; border-radius: 4px; margin-right: 10px;">Save</button>
      <button id="cancelBtn" style="background: #f44336; color: #fff; padding: 8px 16px; border: none; border-radius: 4px;">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  const canvas = document.getElementById("cropperCanvas");
  const ctx = canvas.getContext("2d");

  const img = new Image();
  img.src = imageSrc;

  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Fixed canvas size (500x500)
  canvas.width = 500;
  canvas.height = 500;

  img.onload = () => {
    offsetX = (canvas.width - img.width * scale) / 2;
    offsetY = (canvas.height - img.height * scale) / 2;
    drawImage();
    console.log("Image loaded on canvas!");
  };

  function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
  }

  // Enable dragging the image
  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    canvas.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      offsetX += dx;
      offsetY += dy;
      drawImage();
    }
  });
  window.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  // Zoom slider
  const zoomSlider = document.getElementById("zoomSlider");
  zoomSlider.addEventListener("input", (e) => {
    scale = parseFloat(e.target.value);
    offsetX = (canvas.width - img.width * scale) / 2;
    offsetY = (canvas.height - img.height * scale) / 2;
    drawImage();
  });

  // Save button: get the edited image and inject it into the input
  document.getElementById("saveBtn").addEventListener("click", () => {
    console.log("Saving edited image...");
    const editedDataUrl = canvas.toDataURL("image/png");
    const file = dataURLtoFile(editedDataUrl, "edited-image.png");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputFile.files = dataTransfer.files;
    // Force the input to have the dataURL value to avoid null
    Object.defineProperty(inputFile, 'value', {
      configurable: true,
      get: function() { return editedDataUrl; }
    });
    // Before dispatching the change event, mark to ignore this event
    ignoreChange = true;
    inputFile.dispatchEvent(new Event('change', { bubbles: true }));
    modal.remove();
    console.log("Edited image saved and sent to the site!");
  });

  // Cancel button closes the modal
  document.getElementById("cancelBtn").addEventListener("click", () => {
    console.log("Editing canceled.");
    modal.remove();
  });
}

// Helper function to convert dataURL to File
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type: mime});
}

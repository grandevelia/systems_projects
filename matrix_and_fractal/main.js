const screenWidth = 400;
const screenHeight = 300;
let nMaxIterations = 80;

let minX = -2.0;
let maxX = 1.0;
let minY = -1.5;
let maxY = 1.5;

let globalMatrix = null;
let globalRenderer = null;

window.Module = {
    onRuntimeInitialized: function() {
        globalMatrix = new Module.Matrix(screenHeight, screenWidth);
        globalRenderer = new Module.FractalRenderer(nMaxIterations);
        
        runEngine(); 
        setupInteractions();
    }
};

function updateLabels() {
    document.getElementById("label-left").textContent = Number(minX).toExponential(4);
    document.getElementById("label-right").textContent = Number(maxX).toExponential(4);
    document.getElementById("label-top").textContent = Number(minY).toExponential(4) + "i";
    document.getElementById("label-bottom").textContent = Number(maxY).toExponential(4) + "i";

    const currentWidth = maxX - minX;
    document.getElementById("coord-width").textContent = "Width: " + currentWidth.toExponential(4);

    const baseWidth = 3.0;
    const zoomMultiplier = baseWidth / currentWidth;
    
    if (zoomMultiplier < 10000) {
        document.getElementById("zoom-multiplier").textContent = "Zoom: " + Math.round(zoomMultiplier).toLocaleString() + "x";
    } else {
        document.getElementById("zoom-multiplier").textContent = "Zoom: " + zoomMultiplier.toExponential(2) + "x";
    }
    
    const rulerWidthValue = currentWidth / 2;
    document.getElementById("scale-text").textContent = rulerWidthValue.toExponential(3) + " units";
}

function runEngine(){
    globalRenderer.render(globalMatrix, minX, maxX, minY, maxY, nMaxIterations);
    
    const ptr = globalMatrix.data();
    const pixelBuffer = new Uint8ClampedArray(Module.HEAPU8.buffer, ptr, screenWidth * screenHeight * 4);
    const imageData = new ImageData(pixelBuffer, screenWidth, screenHeight);
    
    const canvas = document.getElementById("fractalCanvas");
    const ctx = canvas.getContext("2d");
    
    ctx.putImageData(imageData, 0, 0);
    updateLabels();
}

function setupInteractions(){
    const canvas = document.getElementById("fractalCanvas");
    const iterInput = document.getElementById("iterations-input");

    let activePointers = [];
    let lastPanX = 0;
    let lastPanY = 0;
    let lastPinchDist = 0;
    let renderPending = false;
    
    function requestRender() {
        if (!renderPending) {
            renderPending = true;
            requestAnimationFrame(() => {
                runEngine();
                renderPending = false;
            });
        }
    }
    
    if (iterInput) {
        iterInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 10; 
            
            nMaxIterations = val;
            
            if (globalRenderer && typeof globalRenderer.setMaxIterations === 'function') {
                globalRenderer.setMaxIterations(nMaxIterations);
            } else if (globalRenderer && typeof globalRenderer.set_max_iterations === 'function') {
                globalRenderer.set_max_iterations(nMaxIterations);
            }
            
            requestRender();
        });
    }

    function getDistance(a, b){
        let xDist = b.clientX - a.clientX;
        let yDist = b.clientY - a.clientY;
        return Math.sqrt(xDist * xDist + yDist * yDist);
    };
    
    function getMidpoint(a, b){
        let xDist = b.clientX - a.clientX;
        let yDist = b.clientY - a.clientY;
        return {
            x: xDist / 2,
            y: yDist / 2
        };
    };
    
    canvas.addEventListener('pointerdown', e => {
        canvas.setPointerCapture(e.pointerId);
        activePointers.push(e);
        
        if (activePointers.length == 1){
            lastPanX = activePointers[0].clientX;
            lastPanY = activePointers[0].clientY;
        } else if (activePointers.length == 2){
            lastPinchDist = getDistance(activePointers[0], activePointers[1]);
            const mp = getMidpoint(activePointers[0], activePointers[1]);
            
            lastPanX = mp.x;
            lastPanY = mp.y;
        }
    });
    
    canvas.addEventListener('pointermove', (e) => {
        const index = activePointers.findIndex(p => p.pointerId == e.pointerId);
        if (index < 0){
            return;
        }
        activePointers[index] = e;
        let delX = 0;
        let delY = 0;
        let zoomFactor = 1.0;
        const canvasBounds = canvas.getBoundingClientRect();
        
        if (activePointers.length == 1){
            delX = -(e.clientX - lastPanX) * ((maxX - minX) / screenWidth);
            delY = -(e.clientY - lastPanY) * ((maxY - minY) / screenHeight);
            
            minX += delX;
            maxX += delX;
            
            minY += delY;
            maxY += delY;
            
            lastPanX = e.clientX;
            lastPanY = e.clientY;
        } else {
            const currentPinchDist = getDistance(activePointers[0], activePointers[1])
            zoomFactor = lastPinchDist / currentPinchDist;
            lastPinchDist = currentPinchDist;
             
            const mp = getMidpoint(activePointers[0], activePointers[1]);
            
            const mouseX = mp.x - canvasBounds.left;
            const mouseY = mp.y - canvasBounds.top;
            
            // Midpoint position ito axis values in the rendering
            const reX = minX + (mouseX * (maxX - minX) / screenWidth);
            const imY = minY + (mouseY * (maxY - minY) / screenHeight);
            
            minX = reX + (minX - reX) * zoomFactor;
            maxX = reX + (maxX - reX) * zoomFactor;
            minY = imY + (minY - imY) * zoomFactor;
            maxY = imY + (maxY - imY) * zoomFactor;
        }
        
        requestRender();
    });
    
    const handlePointerUp = e => {
        activePointers = activePointers.filter(p => p.pointerId != e.pointerId);
        if (activePointers.length < 2){
            lastPinchDist = 0;
        }
        if (activePointers.length == 1){
            lastPanX = activePointers[0].clientX;
            lastPanY = activePointers[0].clientY;
        }
    };
    
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const scrollAmt = e.deltaY;
        const zoomFactor = scrollAmt > 0 ? 1.15 : 0.85;
        
        const canvasBounds = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasBounds.left;
        const mouseY = e.clientY - canvasBounds.top;
        
        // Mouse position ito axis values in the rendering
        const reX = minX + (mouseX * (maxX - minX) / screenWidth);
        const imY = minY + (mouseY * (maxY - minY) / screenHeight);
        
        minX = reX + (minX - reX) * zoomFactor;
        maxX = reX + (maxX - reX) * zoomFactor;
        minY = imY + (minY - imY) * zoomFactor;
        maxY = imY + (maxY - imY) * zoomFactor;
        
        requestRender();
    }, { passive: false });
    
}
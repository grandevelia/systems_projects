const screenWidth = 400;
const screenHeight = 300;
const nMaxIterations = 75;

let minX = -2.0;
let maxX = 1.0;
let minY = -1.5;
let maxY = 1.5;

let globalMatrix = null;
let globalRenderer = null;

window.Module = {
    onRuntimeInitialized: function() {
        globalMatrix = new Module.Matrix(screenHeight, screenWidth);
        globalRenderer = new Module.FractalRenderer(screenWidth);
        
        runEngine(); 
        setupInteractions();
    }
};

function runEngine(){
    globalRenderer.render(globalMatrix, minX, maxX, minY, maxY);
    
    const ptr = globalMatrix.data();
    const pixelBuffer = new Uint8ClampedArray(Module.HEAPU8.buffer, ptr, screenWidth * screenHeight * 4);
    const imageData = new ImageData(pixelBuffer, screenWidth, screenHeight);
    
    const canvas = document.getElementById("fractalCanvas");
    const ctx = canvas.getContext("2d");
    
    ctx.putImageData(imageData, 0, 0);
}

function setupInteractions(){
    const canvas = document.getElementById("fractalCanvas");
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
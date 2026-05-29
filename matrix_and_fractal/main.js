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
    let isDragging = false;
    let startX, startY;
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
    
    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging){
            return;
        }
        
        let delX = -(e.clientX - startX) * ((maxX - minX) / screenWidth);
        let delY = -(e.clientY - startY) * ((maxY - minY) / screenHeight);
        
        minX += delX;
        maxX += delX;
        
        minY += delY;
        maxY += delY;
        
        startX = e.clientX;
        startY = e.clientY;
        
        requestRender();
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const scrollAmt = e.deltaY;
        const zoomFactor = scrollAmt > 0 ? 1.15 : 0.85;
        
        const canvasDounds = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasDounds.left;
        const mouseY = e.clientY - canvasDounds.top;
        
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
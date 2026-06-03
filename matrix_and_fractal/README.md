
## Compile 
`emcc fractalRenderer.cpp matrix.cpp -O3 -lembind -o engine.js --bind -std=c++20 -s NO_EXIT_RUNTIME=1 -s EXPORTED_RUNTIME_METHODS=HEAPU8 -s ALLOW_MEMORY_GROWTH=1`

## Run a python test server for the WASM:
`python3 -m http.server 8080`
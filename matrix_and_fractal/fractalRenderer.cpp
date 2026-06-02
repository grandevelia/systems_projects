#include <cstdint>
#include <vector>
#include <emscripten/bind.h>
#include "matrix.h"

uint32_t colorFromHSV(uint8_t val)
{
    uint32_t H {static_cast<uint32_t>(val) * 6}; // map val [0, 255] to [0, 1530] for division by 256
    
    uint32_t sector{H >> 8}; // floor divide by 256 [0, 6]
    uint32_t f{H & 0xFF}; // mod 255 gets remaining angle in sector
    uint32_t f_inv{255 - f}; // to have enough colors 
    
    uint32_t r;
    uint32_t g;
    uint32_t b;
    
    switch (sector)
    {
        case 0: r = 255; g = f; b = 0; break;
        case 1: r = f_inv; g = 255; b = 0; break;
        case 2: r = 0; g = 255; b = f; break;
        case 3: r = 0; g = f_inv; b = 255; break;
        case 4: r = f; g = 0; b = 255; break;
        default: r = 255; g = 0; b = f_inv; break;
    }
    // Web assembly wants reversed bits for colors
    return 0xFF000000 | (b << 16) | (g << 8) | r;
}

class FractalRenderer{
private:
    size_t n_max_iterations;
    std::vector<uint32_t> palette;
    
public:
    explicit FractalRenderer(size_t max_iters) : n_max_iterations(max_iters)
    {
        palette.resize(n_max_iterations + 1);
        for (size_t i = 0; i <= n_max_iterations; ++i)
        {
            palette[i] = colorFromHSV(static_cast<uint8_t>(i * 255 / n_max_iterations));
        }
    }
    
    int calcIters(double cx, double cy) const
    {
        double zx {0.0};
        double zy {0.0};
        double zxSqr {0.0};
        double zySqr {0.0};
        
        int t {0};
        double thresh {4.0};
        
        while ((t < n_max_iterations) && ((zxSqr + zySqr) <= thresh))
        {
            zy = 2.0 * zx * zy + cy;
            zx = zxSqr - zySqr + cx;
            
            zxSqr = zx * zx;
            zySqr = zy * zy;
            ++t;
        }
        return t;
    }
    
    void render(Matrix<uint32_t>& output,
                double min_re, double max_re,
                double min_im, double max_im) const noexcept
    {
        auto* dataAddress{output.data()};
        double xScale {(max_re - min_re) / (static_cast<double>(output.cols() - 1))};
        double yScale {(max_im - min_im) / (static_cast<double>(output.rows() - 1))};
        
        for (size_t i = 0; i < output.rows(); ++i)
        {
            double cy{static_cast<double>(i) * yScale + min_im};
            double cx {min_re};
            for (size_t j = 0; j < output.cols(); ++j)
            {
                *dataAddress++ = palette[calcIters(cx, cy)];
                cx += xScale;
            }
        }
    }
};


EMSCRIPTEN_BINDINGS(fractal_engine) {
    emscripten::class_<Matrix<uint32_t>>("Matrix")
        .constructor<size_t, size_t>()
        .function("rows", &Matrix<uint32_t>::rows)
        .function("cols", &Matrix<uint32_t>::cols)
        .function("data", emscripten::optional_override([](Matrix<uint32_t>& self) -> uintptr_t {
            return reinterpret_cast<uintptr_t>(self.data());
        }));
    
    emscripten::class_<FractalRenderer>("FractalRenderer")
        .constructor<size_t>()
        .function("render", &FractalRenderer::render);
}

int main() {
    return 0;
}
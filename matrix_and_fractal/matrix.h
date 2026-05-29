#include <memory>
#include <utility>
#include <algorithm>
#include <stdexcept>

template <typename T> 
class Matrix
{
    private:
        size_t m_rows;
        size_t m_cols;
        std::unique_ptr<T[]> m_data;
        
    public:
        Matrix(size_t rows, size_t cols) 
          : m_rows(rows), 
            m_cols(cols), 
            m_data(std::make_unique_for_overwrite<T[]>(rows * cols))
        {
        }
        
        friend void swap(Matrix& first, Matrix& second) noexcept
        {
            using std::swap;
            swap(first.m_rows, second.m_rows);
            swap(first.m_cols, second.m_cols);
            swap(first.m_data, second.m_data);
        };
        
        // Rule of Five
        ~Matrix() = default;
        Matrix(const Matrix& other) 
        : 
            m_rows(other.m_rows), 
            m_cols(other.m_cols),
            m_data(std::make_unique_for_overwrite<T[]>(other.m_rows * other.m_cols))
        {
            std::copy(other.m_data.get(), other.m_data.get() + other.m_rows * other.m_cols, m_data.get());
        }
        Matrix& operator=(Matrix other) noexcept
        {
            swap(*this, other);
            return *this;
        }
        Matrix(Matrix&& other) noexcept 
        : 
            m_rows(std::exchange(other.m_rows, 0)), 
            m_cols(std::exchange(other.m_cols, 0)), 
            m_data(std::move(other.m_data))
        {
        }
        
        void checkBounds(size_t row, size_t col) const
        {
            if (row >= m_rows){
                throw std::out_of_range("Requested row out of range");
            }
            if (col >= m_cols){
                throw std::out_of_range("Requested column out of range");
            }
        }
        T& operator()(size_t row, size_t col)
        {
            checkBounds(row, col);
            return m_data[row * m_cols + col];
        };
        const T& operator()(size_t row, size_t col) const
        {
            checkBounds(row, col);
            return m_data[row * m_cols + col];
        }
        
        size_t rows() const noexcept {return m_rows;}
        size_t cols() const noexcept {return m_cols;}
        T* data() noexcept {return m_data.get();}
        const T* data() const noexcept {return m_data.get();}
        
        
};
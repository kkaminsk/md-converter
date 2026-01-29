# Tasks: G - XLSX Hybrid Implementation

## 1. Refactor XLSX Converter Structure

- [x] 1.1 Import PreProcessor from pandoc module
- [x] 1.2 Create convertMarkdownToXlsx function as primary conversion function
- [x] 1.3 Refactor convertToXlsx to delegate to convertMarkdownToXlsx

## 2. Integrate PreProcessor

- [x] 2.1 Use PreProcessor for metadata extraction instead of parseFrontMatter directly
- [x] 2.2 Collect warnings from PreProcessor into result

## 3. Improve Error Handling

- [x] 3.1 Wrap errors in ConversionError for consistent error handling

#!/bin/bash
# Generate reference documents for Pandoc conversion
# Requires Pandoc 3.0+

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Generating reference.docx..."
echo "# Reference Document" | pandoc -o "$SCRIPT_DIR/reference.docx"

echo "Generating reference.pptx..."
echo "# Reference Presentation" | pandoc -o "$SCRIPT_DIR/reference.pptx"

echo "Done! Reference documents created."
echo ""
echo "To customize styles:"
echo "  1. Open reference.docx in Word and modify styles"
echo "  2. Open reference.pptx in PowerPoint and edit Slide Master"
echo "  3. Save both files"

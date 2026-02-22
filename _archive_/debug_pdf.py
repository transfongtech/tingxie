import pdfplumber
import sys

file_path = "/Users/tianluhuang/Library/CloudStorage/OneDrive-TransfongVentures/Documents/Downloads/Antigravity/Tingxie Practice/2026 4A 听写默写.pdf"

print(f"Reading {file_path}")
try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                print(f"--- PAGE {i+1} START ---")
                print(text)
                print(f"--- PAGE {i+1} END ---")
            else:
                print(f"--- PAGE {i+1} IS IMAGE BASED ---")
except Exception as e:
    print(f"Error: {e}")

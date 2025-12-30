from imagekitio import ImageKit
import requests
import os
import io
import base64
import fitz  # PyMuPDF (pip install pymupdf)
from PIL import Image



imagekit = ImageKit(private_key=os.environ.get('IMAGEKIT_PRIVATE_KEY'),
public_key=os.environ.get('IMAGEKIT_PUBLIC_KEY'),
url_endpoint=os.environ.get('IMAGEKIT_URL_ENDPOINT'))



def convert_pdf_to_pil(file_stream):
   
    try:
        print("📄 Converting PDF to Image...")
        # 1. Read file stream into bytes
        file_bytes = file_stream.read()
        
        # 2. Open with PyMuPDF
        pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
        
        # 3. Get First Page
        page = pdf_document.load_page(0)
        
        # 4. Zoom x3 for high resolution (Critical for OCR)
        mat = fitz.Matrix(3, 3)
        pix = page.get_pixmap(matrix=mat)
        
        # 5. Convert to PIL Image
        # pix.samples contains the raw image bytes
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        return img
    except Exception as e:
        print(f"❌ PDF Conversion Error: {e}")
        return None

def upload_pil_image(pil_image, file_name):
    """
    Uploads a PIL Image object directly to ImageKit.
    """
    try:
        print(f"Uploading PIL Image: {file_name}")
        
        # 1. Save PIL image to a BytesIO buffer (In-memory file)
        img_byte_arr = io.BytesIO()
        pil_image.save(img_byte_arr, format='JPEG', quality=90)
        img_byte_arr.seek(0) # Reset pointer to start
        
        # 2. Convert to Base64 (ImageKit likes Base64)
        file_bytes = img_byte_arr.read()
        encoded_string = base64.b64encode(file_bytes).decode('utf-8')
        
        # 3. Upload
        upload = imagekit.upload_file(
            file=encoded_string,
            file_name=file_name
        )

                # Normalize response
        if isinstance(upload, dict):
            return {
                "url": upload.get("url"),
                "fileId": upload.get("fileId")
            }
        else:
            return {
                "url": getattr(upload, "url", None),
                "fileId": getattr(upload, "fileId", None)
            }

    except Exception as e:
        print(f"❌ Error uploading PIL object: {e}")
        return None




def upload_document(file, file_name):
    try:
        file.seek(0)
        encoded_string = base64.b64encode(file.read()).decode('utf-8')

        upload = imagekit.upload_file(
            file=encoded_string,
            file_name=file_name
        )

        # Normalize response
        if isinstance(upload, dict):
            return {
                "url": upload.get("url"),
                "fileId": upload.get("fileId")
            }
        else:
            return {
                "url": getattr(upload, "url", None),
                "fileId": getattr(upload, "fileId", None)
            }

    except Exception as e:
        print(f"Error uploading document: {e}")
        return None

def delete_imagekit_file(file_id):
    try:
        imagekit.delete_file(file_id)
        print(f"🗑️ Deleted ImageKit file: {file_id}")
        return True
    except Exception as e:
        print(f"❌ Failed to delete ImageKit file: {e}")
        return False

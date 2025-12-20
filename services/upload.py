from imagekitio import ImageKit
import requests
import os
import io
import base64
import fitz  # PyMuPDF (pip install pymupdf)
from PIL import Image



imagekit = ImageKit(private_key=os.environ.get('IMAGEKIT_PRIVATE_KEY'),public_key=os.environ.get('IMAGEKIT_PUBLIC_KEY'),url_endpoint=os.environ.get('IMAGEKIT_URL_ENDPOINT'))



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

        # 4. Return URL safely
        if hasattr(upload, 'url'):
            return upload.url
        elif isinstance(upload, dict) and 'url' in upload:
            return upload['url']
        elif hasattr(upload, 'response_metadata'): 
            return upload.response_metadata.get('raw', {}).get('url')
        else:
            return None

    except Exception as e:
        print(f"❌ Error uploading PIL object: {e}")
        return None




def upload_document(file, file_name):
     try:
        
        print(f"Uploading file: {file_name}")
        # 1. Read file bytes
        file.seek(0)
        file_bytes = file.read()

        encoded_string = base64.b64encode(file_bytes).decode('utf-8')
        upload = imagekit.upload_file(
            file=encoded_string,                 # ✅ pass object/bytes directly
            file_name=file_name
        )
        # 3. Handle the response safely
        # Some versions return an object, others a dict. We check both.
        if hasattr(upload, 'url'):
            print(f"Upload Success (Object): {upload.url}")
            return upload.url
        elif isinstance(upload, dict) and 'url' in upload:
            print(f"Upload Success (Dict): {upload['url']}")
            return upload['url']
        elif hasattr(upload, 'response_metadata'): 
            # Fallback for newer SDK versions if .url attribute is missing directly
            return upload.response_metadata.get('raw', {}).get('url')
        else:
            print(f"Unknown response format: {upload}")
            return None

     except Exception as e:
        print(f"Error uploading document: {e}")
        return None


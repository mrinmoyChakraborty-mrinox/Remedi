import google.generativeai as genai
import PIL.Image
import json
import requests
import time
import os
from io import BytesIO

# --- CONFIGURATION ---
# Set your key here or import it from config
API_KEY = os.environ.get("GENAI_API_KEY")
genai.configure(api_key=API_KEY)

# Initialize models globally to avoid re-initializing on every request
primary_model = genai.GenerativeModel("gemini-2.5-flash", generation_config={"response_mime_type": "application/json"})
backup_model = genai.GenerativeModel("gemini-2.5-flash-lite", generation_config={"response_mime_type": "application/json"})

def load_image_from_url(url):
    """Downloads image from URL and converts to PIL Image."""
    try:
        print(f"📥 Downloading: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        # Convert bytes to PIL Image immediately
        return PIL.Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return None

def parse_json_response(raw_text):
    """Cleans AI output to ensure valid JSON."""
    try:
        clean_text = raw_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except json.JSONDecodeError:
        return []

def extract_medicines(image_url):
    """
    Takes a URL, runs AI extraction, and returns a Python List of medicines.
    """
    img = load_image_from_url(image_url)
    
    if not img:
        return []

    # Prompt tuned to match your add_medicine.js fields
    prompt = """
    Role: You are a Senior Clinical Pharmacist specializing in prescription digitization. Your task is to accurately parse medical prescriptions into a structured JSON format for database ingestion.
    Instructions:
    Decode Abbreviations: Translate standard medical shorthand (e.g., "BID" → Morning, Night; "AC" → Before Food; "1-0-1" → Morning, Night).
    Strict Value Mapping: You MUST map input values to the following allowed categories. If the prescription uses a term not listed, pick the closest match or use null.
    times: Array of ["Morning", "Afternoon", "Evening", "Night"].
    food: Must be exactly "Before Food", "After Food", or "No preference" if not recognizable get a general preference by searching the (closest accurate) name of the medicine.
    medium: Must be exactly "Tablet", "Capsule", "Syrup", "Drops", or "Injection". (If the medium is an ointment or inhaler, use null).
    Inference Logic:
    If quantity is not explicitly stated, calculate it: (number of times per day) * (quantity_per_dose) * (duration_days).
    If a value is missing and cannot be inferred, return null for that field.
    Ensure quantity and duration_days are returned as Integers, not strings.
    JSON Output Structure:
    [
        {
            "name": "Full Medicine Name",
            "dosage": "Strength (e.g., 500mg, 10ml, 1.2g)",
            "medium": "Tablet",
            "quantity": 10,
            "quantity_per_dose": 1,
            "food": "After Food",
            "times": ["Morning", "Night"],
            "duration_days": 5,
            "notes": "Any specific instructions like 'dissolve in water' or 'finish the course'"
        }
    ]
    """

    # 1. Try Primary Model
    try:
        print("🚀 Sending to Gemini 2.5 Flash...")
        response = primary_model.generate_content([prompt, img])
        return parse_json_response(response.text)
    except Exception as e:
        print(f"⚠️ Primary failed ({e}). Switching to Backup...")
        
        # 2. Try Backup Model (Hail Mary)
        try:
            time.sleep(1)
            response = backup_model.generate_content([prompt, img])
            return parse_json_response(response.text)
        except Exception as e2:
            print(f"❌ All models failed: {e2}")
            return []

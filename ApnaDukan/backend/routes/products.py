# products.py (routes)
# Handles everything related to product photos on the shop website.
# Upload a photo, choose whether to AI-enhance it, delete a product card.

import os
import uuid
import base64
import json
import requests as http_requests
from flask import Blueprint, request, jsonify, session
from ai.gemini_config import gemini_url, generation_config, extract_text, post_gemini

products_bp = Blueprint("products", __name__)

# Where uploaded images are saved on the server
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE_MB = 10


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ─────────────────────────────────────────
# POST /api/products/upload
# Owner uploads a product photo.
# Returns: { product_id, image_url, name }
# ─────────────────────────────────────────
@products_bp.route("/api/products/upload", methods=["POST"])
def upload_product():
    if "photo" not in request.files:
        return jsonify({"error": "No photo uploaded."}), 400

    file = request.files["photo"]
    name = request.form.get("name", "").strip() or "My Product"

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only JPG, PNG, and WEBP images are allowed."}), 400

    # Check file size
    file.seek(0, 2)
    size_mb = file.tell() / (1024 * 1024)
    file.seek(0)
    if size_mb > MAX_FILE_SIZE_MB:
        return jsonify({"error": f"Image too large. Max size is {MAX_FILE_SIZE_MB}MB."}), 400

    # Save the file with a unique ID
    product_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{product_id}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # Add to session product list
    products = session.get("product_photos", [])
    products.append({
        "id": product_id,
        "name": name,
        "filename": filename,
        "enhanced": False,
        "image_url": f"/uploads/{filename}"
    })
    session["product_photos"] = products
    session.modified = True

    return jsonify({
        "success": True,
        "product_id": product_id,
        "name": name,
        "image_url": f"/uploads/{filename}",
        "enhanced": False,
        "message": "Photo uploaded! Do you want to enhance it with AI?"
    })


# ─────────────────────────────────────────
# POST /api/products/enhance
# Owner chose to AI-enhance their photo.
# Uses Claude vision to analyze the product and generate an enhanced description,
# then applies background removal + clean presentation styling via CSS.
# Returns: { product_id, enhanced_url, description }
# ─────────────────────────────────────────
@products_bp.route("/api/products/enhance", methods=["POST"])
def enhance_product():
    data = request.get_json() or {}
    product_id = data.get("product_id")

    if not product_id:
        return jsonify({"error": "product_id is required."}), 400

    # Find the product in session
    products = session.get("product_photos", [])
    product = next((p for p in products if p["id"] == product_id), None)

    if not product:
        return jsonify({"error": "Product not found. Please upload it first."}), 404

    filepath = os.path.join(UPLOAD_FOLDER, product["filename"])
    if not os.path.exists(filepath):
        return jsonify({"error": "Photo file not found on server."}), 404

    try:
        # Read image and convert to base64 for Claude
        with open(filepath, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        ext = product["filename"].rsplit(".", 1)[1].lower()
        media_type_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
        media_type = media_type_map.get(ext, "image/jpeg")

        # Call Gemini to analyze the product image
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return jsonify({"error": "GEMINI_API_KEY not set in .env"}), 500

        url = gemini_url(gemini_key)

        payload = {
            "contents": [{
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": media_type,
                            "data": image_data
                        }
                    },
                    {
                        "text": """You are a professional product photographer assistant for small Indian shop owners.

Analyze this product photo and respond with ONLY a JSON object, no extra text:
{
  "product_type": "what this product is in 2-3 words",
  "presentation_tip": "one short sentence on best way to display this product on a website",
  "enhanced_name": "a clean, attractive product name for the shop website (in English, max 4 words)",
  "background_style": "white or gradient or warm",
  "emoji": "one relevant emoji for this product category"
}"""
                    }
                ]
            }],
            "generationConfig": generation_config(500)
        }

        resp = post_gemini(url, payload)
        if resp.status_code != 200:
            return jsonify({"error": f"Gemini API error: {resp.status_code}"}), 500

        raw = extract_text(resp.json())
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        analysis = json.loads(raw.strip())

        # Mark product as enhanced in session
        for p in products:
            if p["id"] == product_id:
                p["enhanced"] = True
                p["name"] = analysis.get("enhanced_name", p["name"])
                p["emoji"] = analysis.get("emoji", "✨")
                p["background_style"] = analysis.get("background_style", "white")
                p["presentation_tip"] = analysis.get("presentation_tip", "")
                break

        session["product_photos"] = products
        session.modified = True

        return jsonify({
            "success": True,
            "product_id": product_id,
            "enhanced": True,
            "enhanced_name": analysis.get("enhanced_name", product["name"]),
            "emoji": analysis.get("emoji", "✨"),
            "background_style": analysis.get("background_style", "white"),
            "presentation_tip": analysis.get("presentation_tip", ""),
            "image_url": product["image_url"],
            "message": "AI enhancement done! Your product now looks more presentable."
        })

    except json.JSONDecodeError:
        return jsonify({"error": "AI could not analyze the image. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": f"Enhancement failed: {str(e)}"}), 500


# ─────────────────────────────────────────
# POST /api/products/rename
# Owner edits the product name on the card.
# ─────────────────────────────────────────
@products_bp.route("/api/products/rename", methods=["POST"])
def rename_product():
    data = request.get_json() or {}
    product_id = data.get("product_id")
    new_name = data.get("name", "").strip()

    if not product_id or not new_name:
        return jsonify({"error": "product_id and name are required."}), 400

    products = session.get("product_photos", [])
    for p in products:
        if p["id"] == product_id:
            p["name"] = new_name
            break

    session["product_photos"] = products
    session.modified = True

    return jsonify({"success": True, "product_id": product_id, "name": new_name})


# ─────────────────────────────────────────
# DELETE /api/products/<product_id>
# Owner removes a product card.
# ─────────────────────────────────────────
@products_bp.route("/api/products/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    products = session.get("product_photos", [])
    product = next((p for p in products if p["id"] == product_id), None)

    if not product:
        return jsonify({"error": "Product not found."}), 404

    # Delete the file from disk
    filepath = os.path.join(UPLOAD_FOLDER, product["filename"])
    if os.path.exists(filepath):
        os.remove(filepath)

    # Remove from session
    session["product_photos"] = [p for p in products if p["id"] != product_id]
    session.modified = True

    return jsonify({"success": True, "message": "Product removed."})


# ─────────────────────────────────────────
# GET /api/products
# Returns all product photos for current session.
# ─────────────────────────────────────────
@products_bp.route("/api/products", methods=["GET"])
def get_products():
    products = session.get("product_photos", [])
    return jsonify({"success": True, "products": products, "count": len(products)})

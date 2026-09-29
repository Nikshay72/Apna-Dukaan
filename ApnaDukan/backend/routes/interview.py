# interview.py (routes)
# This Flask route handles the back-and-forth interview between the app and the shop owner.
# The frontend sends voice-transcribed text, and this route returns the next question to ask.

from flask import Blueprint, request, jsonify, session
from ai.extractor import extract_shop_data, merge_shop_data
from ai.interviewer import get_next_question, is_complete, get_missing_fields
from ai.classifier import classify_from_shop_data
from schema import ShopData, empty_shop

interview_bp = Blueprint("interview", __name__)


@interview_bp.route("/api/interview/start", methods=["POST"])
def start_interview():
    """
    Called when the shop owner finishes their initial voice recording.
    Takes the transcript, extracts shop data, and returns the first follow-up question.

    Request JSON: { "transcript": "Mera naam Sharma General Store hai..." }
    Response JSON: { "shop_data": {...}, "next_question": "...", "is_complete": false, "progress": 57 }
    """
    data = request.get_json()
    if not data or "transcript" not in data:
        return jsonify({"error": "Transcript is required"}), 400

    transcript = data["transcript"].strip()
    if len(transcript) < 10:
        return jsonify({"error": "Transcript too short. Please speak more about your shop."}), 400

    try:
        # Extract shop info from the transcript
        shop_data = extract_shop_data(transcript)

        # Classify the shop type (food/clothing/services/general)
        shop_type = classify_from_shop_data(shop_data)
        shop_data["shop_type"] = shop_type

        # Check if we have everything, or need to ask more
        if is_complete(shop_data):
            next_question = "COMPLETE"
        else:
            next_question = get_next_question(shop_data)

        # Save shop_data to session so we can update it with follow-up answers
        session["shop_data"] = shop_data

        return jsonify({
            "shop_data": shop_data,
            "next_question": next_question,
            "is_complete": is_complete(shop_data),
            "missing_fields": get_missing_fields(shop_data),
            "progress": ShopData.from_dict(shop_data).completion_percentage()
        })

    except Exception as e:
        return jsonify({"error": f"Could not process transcript: {str(e)}"}), 500


@interview_bp.route("/api/interview/answer", methods=["POST"])
def submit_answer():
    """
    Called when the shop owner answers a follow-up question.
    Merges the new answer into existing shop data, then returns the next question.

    Request JSON: { "answer": "Hum 9 baje se 9 baje tak khule rehte hain", "field": "opening_time" }
    Response JSON: { "shop_data": {...}, "next_question": "...", "is_complete": false, "progress": 71 }
    """
    data = request.get_json()
    if not data or "answer" not in data:
        return jsonify({"error": "Answer is required"}), 400

    answer = data["answer"].strip()
    field_hint = data.get("field", "general")

    # Get existing shop data from session
    existing_shop_data = session.get("shop_data", empty_shop())

    try:
        # Merge the new answer into existing shop data
        updated_shop_data = merge_shop_data(existing_shop_data, answer, field_hint)

        # Re-classify in case new info changes the shop type
        shop_type = classify_from_shop_data(updated_shop_data)
        updated_shop_data["shop_type"] = shop_type

        # Get the next question
        if is_complete(updated_shop_data):
            next_question = "COMPLETE"
        else:
            next_question = get_next_question(updated_shop_data)

        # Update session
        session["shop_data"] = updated_shop_data

        return jsonify({
            "shop_data": updated_shop_data,
            "next_question": next_question,
            "is_complete": is_complete(updated_shop_data),
            "missing_fields": get_missing_fields(updated_shop_data),
            "progress": ShopData.from_dict(updated_shop_data).completion_percentage()
        })

    except Exception as e:
        return jsonify({"error": f"Could not process answer: {str(e)}"}), 500


@interview_bp.route("/api/interview/status", methods=["GET"])
def get_status():
    """
    Returns the current state of the interview — what data we have so far.
    The frontend uses this to update the live preview.

    Response JSON: { "shop_data": {...}, "progress": 71 }
    """
    shop_data = session.get("shop_data", empty_shop())
    return jsonify({
        "shop_data": shop_data,
        "is_complete": is_complete(shop_data),
        "missing_fields": get_missing_fields(shop_data),
        "progress": ShopData.from_dict(shop_data).completion_percentage()
    })


@interview_bp.route("/api/interview/reset", methods=["POST"])
def reset_interview():
    """
    Clears all session data so the shop owner can start over.
    """
    session.clear()
    return jsonify({"message": "Interview reset. Ready to start again."})

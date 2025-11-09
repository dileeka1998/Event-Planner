from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, spacy
import re

MODEL = os.environ.get("SPACY_MODEL", "en_core_web_sm")
try:
    nlp = spacy.load(MODEL)
except OSError:
    from spacy.cli import download
    download(MODEL)
    nlp = spacy.load(MODEL)

app = FastAPI(title="Event AI Service", version="0.2.0")

# Add CORS middleware - allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Brief(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL}

def extract_number_with_context(text, pattern, context_words, multiplier=1):
    """Extract a number that appears near specific context words."""
    matches = list(re.finditer(pattern, text, re.IGNORECASE))
    for match in matches:
        num_str = match.group(1).replace(",", "").replace(" ", "")
        try:
            num = int(num_str)
            # Check context around the number (50 chars before and after)
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 50)
            context = text[start:end].lower()
            
            # Check if any context word appears near this number
            for word in context_words:
                if word in context:
                    # Check proximity - word should be within 30 chars of the number
                    word_pos = context.find(word)
                    num_pos_in_context = match.start() - start
                    if word_pos != -1 and abs(word_pos - num_pos_in_context) < 30:
                        return num * multiplier
        except ValueError:
            continue
    return None

@app.post("/parse-brief")
def parse_brief(b: Brief):
    try:
        doc = nlp(b.text)
        audience = None
        budget = None
        tracks = None
        title = None
        text = b.text
        low = text.lower()
        
        # Extract title - look for event name patterns
        # Try to find capitalized phrases or event-type keywords
        sentences = [s.text.strip() for s in doc.sents]
        event_keywords = ['summit', 'conference', 'workshop', 'seminar', 'meetup', 'event', 'festival', 'expo', 'exhibition']
        
        if sentences:
            # First, try to find a sentence with event keywords
            for sent in sentences[:3]:
                sent_low = sent.lower()
                if any(keyword in sent_low for keyword in event_keywords):
                    # Clean up the sentence to use as title
                    title = sent.strip()
                    # Remove common prefixes
                    for prefix in ['a ', 'an ', 'the ', 'this ', 'that ', 'our ', 'my ']:
                        if title.lower().startswith(prefix):
                            title = title[len(prefix):].strip()
                    # Limit length
                    if len(title) > 80:
                        # Try to find a good break point
                        words = title.split()
                        title = ' '.join(words[:12])
                    break
            
            # If no event keyword found, use first meaningful sentence
            if not title:
                for sent in sentences[:2]:
                    if len(sent.split()) <= 12 and len(sent) > 10:
                        title = sent.strip()
                        # Remove common prefixes
                        for prefix in ['a ', 'an ', 'the ', 'this ', 'that ']:
                            if title.lower().startswith(prefix):
                                title = title[len(prefix):].strip()
                        break
        
        # Extract audience - look for numbers near audience-related words
        audience_pattern = r'\b(\d{1,6}(?:,\d{3})*)\s*(?:people|attendees?|participants?|guests?|delegates?|visitors?)\b'
        audience_words = ['people', 'attendees', 'attendee', 'participants', 'participant', 'guests', 'guest', 'delegates', 'visitors']
        
        # Try regex pattern first
        audience_match = re.search(audience_pattern, low)
        if audience_match:
            try:
                audience = int(audience_match.group(1).replace(",", ""))
            except ValueError:
                pass
        
        # Fallback: look for numbers with context
        if audience is None:
            audience = extract_number_with_context(
                text,
                r'\b(\d{1,6}(?:,\d{3})*)\b',
                audience_words
            )
        
        # Extract budget - look for currency and budget-related patterns
        # Pattern 1: "250k LKR", "250k", "250 thousand", "1.5 million"
        budget_patterns = [
            r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*million\s*(?:lkr|rs|rupees?)?\b',  # 1.5 million LKR
            r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*k\s*(?:lkr|rs|rupees?)?\b',  # 250k LKR
            r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*(?:thousand|k)\s*(?:lkr|rs|rupees?)?\b',  # 250 thousand LKR
            r'budget[:\s]+(?:of\s+)?(?:lkr|rs|rupees?)?\s*(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand|million)?',  # budget: 250k
            r'(?:lkr|rs|rupees?)\s*(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand|million)?',  # LKR 250k
        ]
        
        for pattern in budget_patterns:
            budget_match = re.search(pattern, low)
            if budget_match:
                try:
                    num_str = budget_match.group(1).replace(",", "")
                    budget = float(num_str)
                    # Check what multiplier to use based on context
                    match_context = low[max(0, budget_match.start()-10):min(len(low), budget_match.end()+10)]
                    if 'million' in match_context:
                        budget = int(budget * 1000000)
                    elif 'k' in match_context or 'thousand' in match_context:
                        budget = int(budget * 1000)
                    else:
                        budget = int(budget)
                    break
                except (ValueError, IndexError):
                    continue
        
        # Fallback: look for numbers near budget keywords
        if budget is None:
            budget = extract_number_with_context(
                text,
                r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\b',
                ['budget', 'cost', 'price', 'spending', 'expense'],
                multiplier=1
            )
            # Check if "million", "k", or "thousand" appears near the budget number
            if budget:
                budget_keywords = ['budget', 'cost', 'price']
                for keyword in budget_keywords:
                    if keyword in low:
                        keyword_pos = low.find(keyword)
                        # Check for million first
                        million_pos = low.find('million', keyword_pos, keyword_pos + 60)
                        if million_pos != -1 and abs(million_pos - keyword_pos) < 60:
                            budget = int(budget * 1000000)
                            break
                        # Then check for k or thousand
                        k_pos = low.find('k', keyword_pos, keyword_pos + 50)
                        thousand_pos = low.find('thousand', keyword_pos, keyword_pos + 60)
                        if (k_pos != -1 and abs(k_pos - keyword_pos) < 50) or (thousand_pos != -1 and abs(thousand_pos - keyword_pos) < 60):
                            budget = int(budget * 1000)
                            break
        
        # Extract tracks - look for various track patterns
        track_patterns = [
            r'\b(\d+)\s*tracks?\b',
            r'\b(\d+)\s*sessions?\b',
            r'\b(\d+)\s*streams?\b',
            r'track[s]?\s*(?:of\s+)?(\d+)',
            r'session[s]?\s*(?:of\s+)?(\d+)',
        ]
        
        for pattern in track_patterns:
            track_match = re.search(pattern, low)
            if track_match:
                try:
                    tracks = int(track_match.group(1))
                    break
                except (ValueError, IndexError):
                    continue
        
        # Fallback: check for written numbers
        if tracks is None:
            written_numbers = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
            }
            for word, num in written_numbers.items():
                if f'{word} track' in low or f'{word} session' in low:
                    tracks = num
                    break
        
        return {
            "title": title,
            "estimatedAudience": audience, 
            "budgetLkr": budget, 
            "tracks": tracks
        }
    except Exception as e:
        # Return error response instead of crashing
        return {
            "title": None,
            "estimatedAudience": None,
            "budgetLkr": None,
            "tracks": None,
            "error": str(e)
        }

class TextReq(BaseModel): text: str

@app.post("/nlp/entities")
def nlp_entities(req: TextReq):
    doc = nlp(req.text)
    return [{"text": ent.text, "label": ent.label_} for ent in doc.ents]

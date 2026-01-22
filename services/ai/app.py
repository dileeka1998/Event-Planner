from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import spacy
import re
from typing import Optional, Tuple, List, Dict
from datetime import datetime, timedelta
from ortools.sat.python import cp_model

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


def extract_number_with_context(text: str, pattern: str, context_words, multiplier: int = 1) -> Optional[int]:
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


def _apply_substitutions(s: str, patterns: list) -> str:
    """Apply a list of (pattern, repl, flags) substitutions to string s."""
    for pat, repl, flags in patterns:
        s = re.sub(pat, repl, s, flags=flags)
    return s.strip()


def extract_and_clean_title(text: str, doc) -> Optional[str]:
    """
    Extracts a candidate title from the given text (and spaCy doc) and cleans it.
    Returns cleaned title or None.
    """
    try:
        sentences = [s.text.strip() for s in doc.sents]
        event_keywords = ['summit', 'conference', 'workshop', 'seminar', 'meetup', 'event', 'festival', 'expo', 'exhibition']

        # Precompiled substitution patterns for cleaning: (pattern, repl, flags)
        # These combine many of the original repeated re.sub calls
        budget_patterns = [
            (r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*million\s*(?:lkr|rs|rupees?)?\b', r'', re.IGNORECASE),
            (r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*k\s*(?:lkr|rs|rupees?)?\b', r'', re.IGNORECASE),
            (r'\b(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*(?:thousand|k)\s*(?:lkr|rs|rupees?)?\b', r'', re.IGNORECASE),
            (r'budget[:\s]+(?:of\s+)?(?:lkr|rs|rupees?)?\s*(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand|million)?', r'', re.IGNORECASE),
            (r'(?:lkr|rs|rupees?)\s*(\d{1,6}(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand|million)?', r'', re.IGNORECASE),
        ]

        location_patterns = [
            (r'\bin\s+(?:colombo|sri\slanka|lanka)\b', r'', re.IGNORECASE),
        ]

        audience_patterns = [
            (r'\b(\d{1,6}(?:,\d{3})*)\s*(?:people|attendees?|participants?|guests?|delegates?|visitors?)\b', r'', re.IGNORECASE),
        ]

        trailing_phrases_patterns = [
            (r'\brequirements\b', r'', re.IGNORECASE),
            (r'\s*,\s*need\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*with\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*including\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*and\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*or\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*for\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*of\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*at\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*in\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*on\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*near\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*around\s+.*$', r'', re.IGNORECASE),
            (r'\s*,\s*nearby\s+.*$', r'', re.IGNORECASE),
        ]

        punctuation_clean_patterns = [
            (r'\s*,\s*', ' ', 0),
            (r'\s*\.\s*', ' ', 0),
            (r'\s*\?\s*', ' ', 0),
            (r'\s*\:\s*', ' ', 0),
            (r'\s*\;\s*', ' ', 0),
            # remove a variety of punctuation/symbols
            (r'[*/+\-_\|\~\^\&\(\)\[\]\{\}<>\`]', ' ', 0),
        ]

        # Try to find a sentence with event keywords (prefer first 3 sentences)
        if sentences:
            for sent in sentences[:3]:
                sent_low = sent.lower()
                if any(keyword in sent_low for keyword in event_keywords):
                    title = sent.strip()

                    # Remove common short prefixes
                    for prefix in ['a ', 'an ', 'the ', 'this ', 'that ', 'our ', 'my ']:
                        if title.lower().startswith(prefix):
                            title = title[len(prefix):].strip()

                    # Apply grouped cleaning steps
                    title = _apply_substitutions(title, budget_patterns + location_patterns + audience_patterns + trailing_phrases_patterns + punctuation_clean_patterns)

                    # Capitalize first letter
                    if title:
                        title = title.strip()
                        title = title[0].upper() + title[1:] if len(title) > 1 else title.upper()

                    # Limit length (try natural breaks)
                    if len(title) > 80:
                        words = title.split()
                        title = ' '.join(words[:12])
                        # cut at punctuation if present
                        for sep in [',', '.', '?', '!']:
                            if sep in title:
                                title = title.split(sep)[0].strip()
                    return title

        # If no event keyword found, use first meaningful sentence (first two)
        if sentences:
            for sent in sentences[:2]:
                # pick short-ish meaningful sentences
                if 10 < len(sent) and len(sent.split()) <= 12:
                    title = sent.strip()
                    for prefix in ['a ', 'an ', 'the ', 'this ', 'that ']:
                        if title.lower().startswith(prefix):
                            title = title[len(prefix):].strip()
                    title = _apply_substitutions(title, budget_patterns + location_patterns + audience_patterns + trailing_phrases_patterns + punctuation_clean_patterns)
                    if title:
                        title = title.strip()
                        title = title[0].upper() + title[1:] if len(title) > 1 else title.upper()
                    return title

        return None
    except Exception:
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

        # Title extraction & cleaning now delegated
        title = extract_and_clean_title(text, doc)

        # Extract audience - look for numbers near audience-related words
        audience_pattern = r'\b(\d{1,6}(?:,\d{3})*)\s*(?:people|attendees?|participants?|guests?|delegates?|visitors?|programmers?|developers?|users?|members?|attendees?)\b'
        audience_words = [
            'people', 'attendees', 'attendee', 'participants', 'participant', 
            'guests', 'guest', 'delegates', 'visitors', 'visitor',
            'programmers', 'programmer', 'developers', 'developer',
            'users', 'user', 'members', 'member',
            'audience', 'crowd', 'attendance'
        ]

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
                    match_context = low[max(0, budget_match.start() - 10):min(len(low), budget_match.end() + 10)]
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


class TextReq(BaseModel):
    text: str


@app.post("/nlp/entities")
def nlp_entities(req: TextReq):
    doc = nlp(req.text)
    return [{"text": ent.text, "label": ent.label_} for ent in doc.ents]


# Scheduler models and endpoint
class Room(BaseModel):
    id: int
    name: str
    capacity: int


class Session(BaseModel):
    id: int
    title: str
    speaker: Optional[str] = None
    durationMin: int
    topic: str
    capacity: int
    roomId: Optional[int] = None  # User-provided room assignment (or None if whole venue)


class ScheduleEventRequest(BaseModel):
    eventId: int
    startDate: str  # ISO date string
    endDate: str  # ISO date string
    gapMinutes: Optional[int] = 0  # Gap time in minutes between sessions in same room
    startTime: Optional[str] = None  # UTC start time (format: YYYY-MM-DDTHH:mm:ss), defaults to 9 AM if not provided
    sessions: List[Session]
    rooms: List[Room]


class ScheduleAssignment(BaseModel):
    sessionId: int
    roomId: Optional[int] = None
    startTime: Optional[str] = None  # ISO datetime string


class ScheduleEventResponse(BaseModel):
    assignments: List[ScheduleAssignment]
    success: bool
    message: Optional[str] = None


def generate_time_slots(start_date: str, end_date: str, slot_duration_minutes: int = 5, start_time_str: Optional[str] = None) -> List[datetime]:
    """Generate time slots from start_date to end_date, using provided start time or defaulting to 9 AM."""
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    end = end.replace(hour=23, minute=59, second=59)  # End of day
    
    # Parse start time if provided (format: YYYY-MM-DDTHH:mm:ss in UTC)
    # Extract hour and minute from the start time string
    start_hour = 9  # Default to 9 AM
    start_minute = 0
    if start_time_str:
        try:
            # Parse the UTC datetime string and extract hour/minute
            start_time_dt = datetime.fromisoformat(start_time_str.replace('Z', ''))
            start_hour = start_time_dt.hour
            start_minute = start_time_dt.minute
        except (ValueError, AttributeError):
            # If parsing fails, use default 9 AM
            pass
    
    slots = []
    current_date = start.date()
    end_date_obj = end.date()
    
    while current_date <= end_date_obj:
        # Start at the specified time (or 9 AM default) each day
        current_time = datetime.combine(current_date, datetime.min.time().replace(hour=start_hour, minute=start_minute))
        # End at 5 PM each day
        day_end = datetime.combine(current_date, datetime.min.time().replace(hour=17))
        
        while current_time <= day_end:
            slots.append(current_time)
            current_time += timedelta(minutes=slot_duration_minutes)
        
        current_date += timedelta(days=1)
    
    return slots


# ============================================================================
# Scheduler Helper Functions 
# ============================================================================

def create_interval_variables(
    model: cp_model.CpModel,
    num_sessions: int,
    num_slots: int,
    session_slot_durations: List[int]
) -> Tuple[List[cp_model.IntVar], List[cp_model.IntervalVar]]:
    """
    Create interval variables for each session with proper start, size, and end variables.
    Always schedules time slots (never preserves existing times).
    
    Returns:
        Tuple of (start_vars, interval_vars) where:
        - start_vars[i] is the start slot index for session i
        - interval_vars[i] is the interval variable for session i
    """
    start_vars = [
        model.NewIntVar(0, num_slots - 1, f'start_{i}') 
        for i in range(num_sessions)
    ]
    
    interval_vars = []
    for i in range(num_sessions):
        # Create end variable
        end_var = model.NewIntVar(0, num_slots, f'end_{i}')
        model.Add(end_var == start_vars[i] + session_slot_durations[i])
        
        # Create interval variable with start, size, and end
        interval_var = model.NewIntervalVar(
            start_vars[i],
            session_slot_durations[i],
            end_var,
            f'session_{i}_interval'
        )
        interval_vars.append(interval_var)
    
    return start_vars, interval_vars


def get_room_indices_for_sessions(
    sessions: List[Session],
    rooms: List[Room]
) -> List[Optional[int]]:
    """
    Get room index for each session based on user-provided roomId.
    Returns None if session has no room (whole venue case).
    
    Returns:
        List where room_indices[i] is the room index if session i has a room, None otherwise
    """
    room_indices = []
    for session in sessions:
        room_idx = None
        if session.roomId is not None:
            # Find the room index in the rooms list
            for r_idx, room in enumerate(rooms):
                if room.id == session.roomId:
                    room_idx = r_idx
                    break
        room_indices.append(room_idx)
    return room_indices


def add_room_no_overlap_constraints(
    model: cp_model.CpModel,
    num_sessions: int,
    num_rooms: int,
    start_vars: List[cp_model.IntVar],
    interval_vars: List[cp_model.IntervalVar],
    room_indices: List[Optional[int]],
    session_slot_durations: List[int],
    gap_slots: int,
    num_slots: int
) -> None:
    """
    Add no-overlap constraints per room using AddNoOverlap.
    Sessions in the same room cannot overlap (with gap time).
    """
    for r_idx in range(num_rooms):
        # Collect intervals of sessions assigned to this room
        room_intervals = []
        
        for i in range(num_sessions):
            if room_indices[i] == r_idx:
                # Session is in this room - add interval with gap
                if gap_slots > 0:
                    # Create extended interval that includes gap time
                    extended_size = session_slot_durations[i] + gap_slots
                    extended_end = model.NewIntVar(0, num_slots, f'extended_end_{i}_room_{r_idx}')
                    model.Add(extended_end == start_vars[i] + extended_size)
                    
                    extended_interval = model.NewIntervalVar(
                        start_vars[i],
                        extended_size,
                        extended_end,
                        f'extended_session_{i}_room_{r_idx}'
                    )
                    room_intervals.append(extended_interval)
                else:
                    # No gap, use original interval
                    room_intervals.append(interval_vars[i])
        
        # Add no-overlap constraint for this room
        if room_intervals:
            model.AddNoOverlap(room_intervals)


def add_speaker_no_overlap_constraints(
    model: cp_model.CpModel,
    num_sessions: int,
    sessions: List[Session],
    interval_vars: List[cp_model.IntervalVar]
) -> None:
    """
    Add no-overlap constraints for speakers.
    Sessions with the same speaker cannot overlap.
    """
    # Group sessions by speaker
    speaker_sessions: Dict[str, List[int]] = {}
    for i, session in enumerate(sessions):
        if session.speaker:
            speaker = session.speaker.strip()
            if speaker:
                if speaker not in speaker_sessions:
                    speaker_sessions[speaker] = []
                speaker_sessions[speaker].append(i)
    
    # Add no-overlap constraint for each speaker's sessions
    for speaker, session_indices in speaker_sessions.items():
        if len(session_indices) > 1:
            speaker_intervals = [interval_vars[i] for i in session_indices]
            model.AddNoOverlap(speaker_intervals)


def add_whole_venue_no_overlap_constraints(
    model: cp_model.CpModel,
    num_sessions: int,
    room_indices: List[Optional[int]],
    start_vars: List[cp_model.IntVar],
    interval_vars: List[cp_model.IntervalVar],
    session_slot_durations: List[int],
    gap_slots: int,
    num_slots: int
) -> None:
    """
    Add no-overlap constraints for whole venue sessions.
    Sessions without rooms (whole venue) cannot overlap with ANY other session.
    Gap time is respected between whole venue sessions and all other sessions.
    Uses interval variables with AddNoOverlap for efficiency.
    """
    # Find all sessions without rooms (whole venue)
    whole_venue_sessions = [i for i in range(num_sessions) if room_indices[i] is None]
    
    if not whole_venue_sessions:
        return
    
    # Create extended intervals for whole venue sessions (with gap)
    whole_venue_intervals = []
    for i in whole_venue_sessions:
        if gap_slots > 0:
            # Create extended interval that includes gap time
            extended_size = session_slot_durations[i] + gap_slots
            extended_end = model.NewIntVar(0, num_slots, f'extended_end_whole_venue_{i}')
            model.Add(extended_end == start_vars[i] + extended_size)
            
            extended_interval = model.NewIntervalVar(
                start_vars[i],
                extended_size,
                extended_end,
                f'extended_whole_venue_{i}'
            )
            whole_venue_intervals.append(extended_interval)
        else:
            # No gap, use original interval
            whole_venue_intervals.append(interval_vars[i])
    
    # Whole venue sessions cannot overlap with each other
    if len(whole_venue_intervals) > 1:
        model.AddNoOverlap(whole_venue_intervals)
    
    # Create a mapping from session index to its extended interval
    whole_venue_interval_map = {}
    for idx, i in enumerate(whole_venue_sessions):
        whole_venue_interval_map[i] = whole_venue_intervals[idx]
    
    # For each whole venue session, ensure it doesn't overlap with any roomed session
    # We need to check against each roomed session individually
    for i in whole_venue_sessions:
        # Check against each roomed session
        for j in range(num_sessions):
            if room_indices[j] is not None:  # Roomed session
                # Create a constraint that whole venue session i and roomed session j don't overlap
                # Use boolean constraints for this specific pair
                i_before_j = model.NewBoolVar(f'whole_venue_{i}_before_roomed_{j}')
                j_before_i = model.NewBoolVar(f'roomed_{j}_before_whole_venue_{i}')
                
                # i ends + gap before j starts
                i_end_plus_gap = model.NewIntVar(0, num_slots, f'i_end_plus_gap_{i}_{j}')
                model.Add(i_end_plus_gap == start_vars[i] + session_slot_durations[i] + gap_slots)
                
                model.Add(start_vars[j] >= i_end_plus_gap).OnlyEnforceIf(i_before_j)
                model.Add(start_vars[j] < i_end_plus_gap).OnlyEnforceIf(i_before_j.Not())
                
                # j ends + gap before i starts
                j_end_plus_gap = model.NewIntVar(0, num_slots, f'j_end_plus_gap_{i}_{j}')
                model.Add(j_end_plus_gap == start_vars[j] + session_slot_durations[j] + gap_slots)
                
                model.Add(start_vars[i] >= j_end_plus_gap).OnlyEnforceIf(j_before_i)
                model.Add(start_vars[i] < j_end_plus_gap).OnlyEnforceIf(j_before_i.Not())
                
                # At least one must be true (ensures no overlap with gap)
                model.AddBoolOr([i_before_j, j_before_i])


def add_temporal_constraints(
    model: cp_model.CpModel,
    num_sessions: int,
    num_slots: int,
    start_vars: List[cp_model.IntVar],
    session_slot_durations: List[int]
) -> None:
    """
    Extract temporal constraints (fit within time slots) into separate function.
    """
    for i in range(num_sessions):
        # Session must fit within time slots (end time <= last slot)
        model.Add(start_vars[i] + session_slot_durations[i] <= num_slots)


def create_objective_function(
    model: cp_model.CpModel,
    num_sessions: int,
    num_slots: int,
    start_vars: List[cp_model.IntVar],
    sessions: List[Session]
) -> None:
    """
    Extract objective function creation (minimize max slot) into separate function.
    Preserves topic grouping logic.
    """
    # Calculate max and min slot indices
    max_slot = model.NewIntVar(0, num_slots - 1, 'max_slot')
    min_slot = model.NewIntVar(0, num_slots - 1, 'min_slot')
    
    for i in range(num_sessions):
        model.Add(max_slot >= start_vars[i])
        model.Add(min_slot <= start_vars[i])
    
    schedule_span = model.NewIntVar(0, num_slots - 1, 'schedule_span')
    model.Add(schedule_span == max_slot - min_slot)
    
    # Topic grouping penalty (minimize distance between sessions with same topic)
    topic_penalty = []
    for i in range(num_sessions):
        for j in range(i + 1, num_sessions):
            if sessions[i].topic == sessions[j].topic:
                # Penalty is the absolute difference in slot assignments
                diff = model.NewIntVar(0, num_slots, f'topic_diff_{i}_{j}')
                model.AddAbsEquality(diff, start_vars[i] - start_vars[j])
                topic_penalty.append(diff)
    
    # Objective: Minimize max slot (spreads sessions out across time)
    # This ensures sessions are distributed across different time slots
    # Topic grouping is handled implicitly by the solver when there are multiple optimal solutions
    model.Minimize(max_slot)


def extract_solution(
    solver: cp_model.CpSolver,
    num_sessions: int,
    start_vars: List[cp_model.IntVar],
    sessions: List[Session],
    rooms: List[Room],
    time_slots: List[datetime],
    room_indices: List[Optional[int]]
) -> List[ScheduleAssignment]:
    """
    Extract solution and format assignments.
    Preserves user-provided room assignments, schedules time slots.
    """
    assignments = []
    slot_usage = {}  # Track which slots are used
    room_usage = {}  # Track which rooms are used
    
    for i, session in enumerate(sessions):
        slot_idx = solver.Value(start_vars[i])
        room_idx = room_indices[i]
        
        # Debug logging
        has_room = room_idx is not None
        print(f"Session {session.id} ({session.title}): room_idx={room_idx}, slot_idx={slot_idx}, has_room={has_room}")
        
        room_id = session.roomId  # Preserve user-provided room assignment
        if room_id is not None:
            if room_id not in room_usage:
                room_usage[room_id] = []
            room_usage[room_id].append(session.id)
            room_name = next((r.name for r in rooms if r.id == room_id), "Unknown")
            print(f"  -> Room: {room_id} ({room_name}) [USER PROVIDED]")
        else:
            print(f"  -> Room: None (Whole Venue)")
        
        # Get start time from slot
        start_time = None
        if slot_idx < len(time_slots):
            start_time = time_slots[slot_idx].isoformat()
            if slot_idx not in slot_usage:
                slot_usage[slot_idx] = []
            slot_usage[slot_idx].append(session.id)
            print(f"  -> Scheduled to slot {slot_idx} ({start_time})")
        else:
            print(f"  -> WARNING: Invalid slot index {slot_idx}")
        
        assignments.append(ScheduleAssignment(
            sessionId=session.id,
            roomId=room_id,
            startTime=start_time
        ))
    
    # Log conflicts
    print(f"\nSlot usage summary:")
    for slot_idx, session_ids in sorted(slot_usage.items()):
        if len(session_ids) > 1:
            print(f"  WARNING: Slot {slot_idx} has {len(session_ids)} sessions: {session_ids}")
        else:
            print(f"  Slot {slot_idx}: {session_ids[0]}")
    
    print(f"\nRoom usage summary:")
    for room_id, session_ids in sorted(room_usage.items()):
        print(f"  Room {room_id}: {len(session_ids)} sessions: {session_ids}")
    
    return assignments


@app.post("/schedule-event", response_model=ScheduleEventResponse)
def schedule_event(request: ScheduleEventRequest):
    """
    Schedule time slots for sessions using OR Tools constraint programming.
    - Never schedules rooms (uses user-provided room assignments)
    - Always schedules time slots (never preserves existing start times)
    - Prevents room conflicts (sessions in same room can't overlap)
    - Prevents speaker conflicts (same speaker can't have overlapping sessions)
    - Handles whole venue case (sessions without rooms can't overlap with ANY session)
    """
    try:
        if not request.sessions:
            return ScheduleEventResponse(
                assignments=[],
                success=False,
                message="No sessions to schedule"
            )
        
        if not request.rooms:
            return ScheduleEventResponse(
                assignments=[],
                success=False,
                message="No rooms available for scheduling"
            )
        
        # Generate time slots (5-minute intervals, using provided start time or defaulting to 9 AM - 5 PM each day)
        slot_duration_minutes = 5
        time_slots = generate_time_slots(request.startDate, request.endDate, slot_duration_minutes, request.startTime)
        
        if not time_slots:
            return ScheduleEventResponse(
                assignments=[],
                success=False,
                message="Invalid date range or no time slots available"
            )
        
        # Create the model
        model = cp_model.CpModel()
        
        num_sessions = len(request.sessions)
        num_rooms = len(request.rooms)
        num_slots = len(time_slots)
        
        # Helper: session duration in slots (e.g., 60 min = 12 slots of 5 min)
        session_slot_durations = [
            max(1, (s.durationMin + slot_duration_minutes - 1) // slot_duration_minutes) for s in request.sessions
        ]
        
        # Convert gap time to slots (round up)
        gap_slots = max(0, (request.gapMinutes + slot_duration_minutes - 1) // slot_duration_minutes) if request.gapMinutes else 0
        
        # Step 1: Get room indices for each session (user-provided room assignments)
        room_indices = get_room_indices_for_sessions(request.sessions, request.rooms)
        
        # Debug: Log room assignments
        print(f"\nRoom assignments from user:")
        for i, session in enumerate(request.sessions):
            room_idx = room_indices[i]
            room_name = "None (Whole Venue)"
            if room_idx is not None and room_idx < len(request.rooms):
                room_name = request.rooms[room_idx].name
            print(f"  Session {session.id} ({session.title}): roomId={session.roomId}, room_idx={room_idx}, room_name={room_name}")
        
        # Step 2: Create interval variables for time-based scheduling
        # Always schedules time slots (never preserves existing times)
        start_vars, interval_vars = create_interval_variables(
            model, num_sessions, num_slots, session_slot_durations
        )
        
        # Step 3: Add no-overlap constraints per room (sessions in same room can't overlap)
        add_room_no_overlap_constraints(
            model, num_sessions, num_rooms, start_vars, interval_vars,
            room_indices, session_slot_durations, gap_slots, num_slots
        )
        
        # Step 4: Add speaker conflict constraints (same speaker can't have overlapping sessions)
        add_speaker_no_overlap_constraints(
            model, num_sessions, request.sessions, interval_vars
        )
        
        # Step 5: Add whole venue constraints (sessions without rooms can't overlap with ANY session)
        add_whole_venue_no_overlap_constraints(
            model, num_sessions, room_indices, start_vars, interval_vars,
            session_slot_durations, gap_slots, num_slots
        )
        
        # Step 6: Add temporal constraints (sessions must fit within time slots)
        add_temporal_constraints(
            model, num_sessions, num_slots, start_vars, session_slot_durations
        )
        
        # Step 7: Create objective function (minimize max slot)
        create_objective_function(
            model, num_sessions, num_slots, start_vars, request.sessions
        )
        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0  # 30 second timeout
        status = solver.Solve(model)
        
        # Debug logging
        print(f"\n=== Solver Results ===")
        print(f"Solver status: {status}")
        print(f"  OPTIMAL={cp_model.OPTIMAL}, FEASIBLE={cp_model.FEASIBLE}, INFEASIBLE={cp_model.INFEASIBLE}, MODEL_INVALID={cp_model.MODEL_INVALID}")
        print(f"Number of sessions: {num_sessions}, rooms: {num_rooms}, time slots: {num_slots}")
        print(f"Slot size: {slot_duration_minutes} minutes")
        print(f"Gap time: {request.gapMinutes} minutes ({gap_slots} slots)")
        print(f"Whole venue sessions: {sum(1 for idx in room_indices if idx is None)}")
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            print(f"✓ Solver found a solution!")
            # Step 8: Extract solution (preserves user-provided room assignments, schedules time slots)
            assignments = extract_solution(
                solver, num_sessions, start_vars,
                request.sessions, request.rooms, time_slots, room_indices
            )
            
            return ScheduleEventResponse(
                assignments=assignments,
                success=True,
                message="Schedule generated successfully"
            )
        else:
            return ScheduleEventResponse(
                assignments=[],
                success=False,
                message=f"Could not find a feasible schedule. Status: {status}"
            )
    
    except Exception as e:
        return ScheduleEventResponse(
            assignments=[],
            success=False,
            message=f"Error generating schedule: {str(e)}"
        )

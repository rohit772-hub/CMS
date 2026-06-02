"""AI Chatbot endpoints for student doubt-solving.

Uses the Emergent LLM key + emergentintegrations.LlmChat library.
Model: gemini-3-flash-preview (fast + cheap, suitable for K-12 doubts).
Conversations are persisted in Mongo (`chat_messages` collection) so the student
can reload the page and resume their thread per session_id.
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Lazy import — emergentintegrations is fairly heavy; only load when used.
_LlmChat = None
_UserMessage = None
def _load_llm():
    global _LlmChat, _UserMessage
    if _LlmChat is None:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore
        _LlmChat = LlmChat
        _UserMessage = UserMessage
    return _LlmChat, _UserMessage


SYSTEM_PROMPT = (
    "You are 'Spark' — a friendly, patient AI study buddy for K-12 students on the "
    "Create Mind Studio LMS. You explain concepts clearly using short paragraphs, "
    "bullet points and tiny examples a 12-year-old can follow. You love analogies. "
    "When a student asks a math/coding/science question, walk through the reasoning "
    "step by step, then give the final answer. If a question is off-topic (gossip, "
    "personal info, things outside school subjects), politely steer the student back "
    "to learning. Keep replies under 200 words unless the student asks for more depth. "
    "Use **bold** sparingly for important terms. Never make up facts — if unsure, say "
    "'I'm not certain about that — please double-check with your teacher.'"
)


class ChatMessageIn(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=4000)
    context: Optional[str] = None  # e.g. course/subject/chapter title hint


class ChatMessageOut(BaseModel):
    session_id: str
    reply: str
    created_at: str


def attach(api_router, db: AsyncIOMotorDatabase, get_current_user):
    """Wire endpoints into the parent api router."""

    @api_router.post("/chat/send", response_model=ChatMessageOut)
    async def chat_send(payload: ChatMessageIn, user: dict = Depends(get_current_user)):
        key = os.environ.get("EMERGENT_LLM_KEY")
        if not key:
            raise HTTPException(status_code=503, detail="Chat is temporarily unavailable. Missing EMERGENT_LLM_KEY.")

        LlmChat, UserMessage = _load_llm()
        session_id = (payload.session_id or "").strip() or f"chat_{user['user_id']}_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc).isoformat()

        # Persist the user message first so it appears even if the LLM call fails.
        await db.chat_messages.insert_one({
            "id": f"msg_{uuid.uuid4().hex[:12]}",
            "session_id": session_id,
            "user_id": user["user_id"],
            "role": "user",
            "content": payload.message,
            "created_at": now,
        })

        system = SYSTEM_PROMPT
        if payload.context:
            system += f"\n\nThe student is currently on: {payload.context}. Tailor your help to that topic when relevant."

        try:
            chat = LlmChat(api_key=key, session_id=session_id, system_message=system).with_model("gemini", "gemini-3-flash-preview")
            reply = await chat.send_message(UserMessage(text=payload.message))
            reply_text = reply if isinstance(reply, str) else str(reply)
        except Exception as e:
            logger.exception("LLM call failed")
            reply_text = "I'm having trouble thinking right now. Please try again in a moment."

        await db.chat_messages.insert_one({
            "id": f"msg_{uuid.uuid4().hex[:12]}",
            "session_id": session_id,
            "user_id": user["user_id"],
            "role": "assistant",
            "content": reply_text,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return ChatMessageOut(session_id=session_id, reply=reply_text, created_at=now)

    @api_router.get("/chat/history")
    async def chat_history(session_id: str, user: dict = Depends(get_current_user)):
        if not session_id:
            return {"messages": []}
        msgs = await db.chat_messages.find(
            {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        return {"messages": msgs, "session_id": session_id}

    @api_router.get("/chat/sessions")
    async def chat_sessions(user: dict = Depends(get_current_user)):
        """List the current user's recent chat sessions for a left-side history pane."""
        pipeline = [
            {"$match": {"user_id": user["user_id"]}},
            {"$sort": {"created_at": -1}},
            {"$group": {
                "_id": "$session_id",
                "last_message": {"$first": "$content"},
                "last_at": {"$first": "$created_at"},
            }},
            {"$sort": {"last_at": -1}},
            {"$limit": 30},
            {"$project": {"_id": 0, "session_id": "$_id", "last_message": 1, "last_at": 1}},
        ]
        items = await db.chat_messages.aggregate(pipeline).to_list(30)
        return {"sessions": items}

    @api_router.delete("/chat/session/{session_id}")
    async def chat_delete(session_id: str, user: dict = Depends(get_current_user)):
        await db.chat_messages.delete_many({"session_id": session_id, "user_id": user["user_id"]})
        return {"ok": True}

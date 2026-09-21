from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..core.security import decode_access_token
from ..database.connection import SessionLocal
from ..services.realtime_service import realtime_manager
from ..services.support_service import can_view_ticket, get_ticket
from ..services.user_service import get_user_by_id


router = APIRouter(tags=["Realtime"])


def authenticate_websocket(token: str, db: Session):
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = get_user_by_id(db, int(user_id))
        if not user or not user.is_active or user.must_change_password:
            return None
        return user
    except Exception:
        return None


@router.websocket("/ws/notifications")
async def notifications_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = authenticate_websocket(token, db)
        if not user:
            await websocket.close(code=1008)
            return

        await realtime_manager.connect_user(user.id, websocket)
        await websocket.send_json({"type": "connected", "channel": "notifications"})

        try:
            while True:
                # Client can send ping/keepalive; no application message is required.
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            await realtime_manager.disconnect_user(user.id, websocket)
    finally:
        db.close()


@router.websocket("/ws/support/{ticket_id}")
async def support_websocket(websocket: WebSocket, ticket_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = authenticate_websocket(token, db)
        if not user:
            await websocket.close(code=1008)
            return

        ticket = get_ticket(db, ticket_id)
        if not ticket or not can_view_ticket(ticket, user, db):
            await websocket.close(code=1008)
            return

        await realtime_manager.connect_ticket(ticket_id, websocket)
        await websocket.send_json({"type": "connected", "channel": "support", "ticket_id": ticket_id})

        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            await realtime_manager.disconnect_ticket(ticket_id, websocket)
    finally:
        db.close()

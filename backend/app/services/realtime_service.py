import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class RealtimeManager:
    """In-process WebSocket manager for realtime notifications and support chat."""

    def __init__(self):
        self.user_connections: dict[int, set[WebSocket]] = defaultdict(set)
        self.ticket_connections: dict[int, set[WebSocket]] = defaultdict(set)
        self.loop: asyncio.AbstractEventLoop | None = None
        self._lock = asyncio.Lock()

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self.loop = loop

    async def connect_user(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.user_connections[user_id].add(websocket)

    async def connect_ticket(self, ticket_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.ticket_connections[ticket_id].add(websocket)

    async def disconnect_user(self, user_id: int, websocket: WebSocket):
        async with self._lock:
            connections = self.user_connections.get(user_id)
            if connections:
                connections.discard(websocket)
                if not connections:
                    self.user_connections.pop(user_id, None)

    async def disconnect_ticket(self, ticket_id: int, websocket: WebSocket):
        async with self._lock:
            connections = self.ticket_connections.get(ticket_id)
            if connections:
                connections.discard(websocket)
                if not connections:
                    self.ticket_connections.pop(ticket_id, None)

    async def _broadcast(self, connections: set[WebSocket], payload: dict[str, Any]):
        dead = []
        for websocket in list(connections):
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            connections.discard(websocket)

    async def broadcast_user(self, user_id: int, payload: dict[str, Any]):
        async with self._lock:
            connections = self.user_connections.get(user_id)
            if not connections:
                return
            await self._broadcast(connections, payload)

    async def broadcast_ticket(self, ticket_id: int, payload: dict[str, Any]):
        async with self._lock:
            connections = self.ticket_connections.get(ticket_id)
            if not connections:
                return
            await self._broadcast(connections, payload)

    def publish_user(self, user_id: int, payload: dict[str, Any]):
        self._submit(self.broadcast_user(user_id, payload))

    def publish_ticket(self, ticket_id: int, payload: dict[str, Any]):
        self._submit(self.broadcast_ticket(ticket_id, payload))

    async def broadcast_all(self, payload: dict[str, Any]):
        async with self._lock:
            all_connections = set()
            for connections in self.user_connections.values():
                all_connections.update(connections)
            if not all_connections:
                return
            await self._broadcast(all_connections, payload)

    def publish_all(self, payload: dict[str, Any]):
        self._submit(self.broadcast_all(payload))

    def _submit(self, coroutine):
        loop = self.loop
        if loop is None or loop.is_closed():
            return
        try:
            asyncio.run_coroutine_threadsafe(coroutine, loop)
        except Exception as exc:
            print(f"[Realtime] Publish error: {exc}")


realtime_manager = RealtimeManager()

from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    details: dict | list | str | int | float | bool | None
    created_at: datetime

    class Config:
        from_attributes = True

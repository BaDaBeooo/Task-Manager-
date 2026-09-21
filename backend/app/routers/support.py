from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..routers.auth import get_current_user
from ..schemas.support import (
    SupportTicketAssign,
    SupportTicketCommentCreate,
    SupportTicketCommentResponse,
    SupportTicketCreate,
    SupportTicketDetailResponse,
    SupportTicketResponse,
    SupportTicketStatusUpdate,
    SupportTicketUpdate,
)
from ..services.support_service import (
    add_comment,
    assign_ticket,
    claim_ticket,
    can_manage_ticket,
    can_view_ticket,
    create_ticket,
    get_activities,
    get_comments,
    get_ticket,
    get_tickets,
    update_ticket,
    update_ticket_status,
)


router = APIRouter(
    prefix="/support",
    tags=["Support"],
)


# =========================================================
# CREATE TICKET
# =========================================================

@router.post(
    "/tickets",
    response_model=SupportTicketDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_support_ticket(
    data: SupportTicketCreate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    try:

        return create_ticket(
            db=db,
            current_user=current_user,
            title=data.title,
            description=data.description,
            category=data.category,
            priority=data.priority,
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# =========================================================
# LIST TICKETS
# =========================================================

@router.get(
    "/tickets",
    response_model=list[SupportTicketResponse],
)
def list_support_tickets(
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return get_tickets(
        db=db,
        current_user=current_user,
    )


# =========================================================
# DETAIL
# =========================================================

@router.get(
    "/tickets/{ticket_id}",
    response_model=SupportTicketDetailResponse,
)
def get_support_ticket(
    ticket_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    if not can_view_ticket(
        ticket,
        current_user,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xem yêu cầu này.",
        )

    return ticket


# =========================================================
# UPDATE
# =========================================================

@router.put(
    "/tickets/{ticket_id}",
    response_model=SupportTicketDetailResponse,
)
def update_support_ticket(
    ticket_id: int,
    data: SupportTicketUpdate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    if not can_manage_ticket(
        ticket,
        current_user,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền cập nhật yêu cầu này.",
        )

    try:

        return update_ticket(
            db=db,
            ticket=ticket,
            current_user=current_user,
            data=data,
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# =========================================================
# ASSIGN
# =========================================================

@router.put(
    "/tickets/{ticket_id}/assign",
    response_model=SupportTicketDetailResponse,
)
def assign_support_ticket(
    ticket_id: int,
    data: SupportTicketAssign,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    from ..services.permissions import role_code, leader_team_ids
    role = role_code(current_user)
    allowed = role in {"admin", "supervisor"} or (role == "leader" and ticket.team_id in leader_team_ids(db, current_user.id))
    if not allowed:

        raise HTTPException(status_code=403, detail="Bạn không có quyền phân công ticket này.")

    try:

        return assign_ticket(
            db=db,
            ticket=ticket,
            current_user=current_user,
            assignee_id=data.assignee_id,
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# =========================================================
# CLAIM
# =========================================================

@router.put(
    "/tickets/{ticket_id}/claim",
    response_model=SupportTicketDetailResponse,
)
def claim_support_ticket(
    ticket_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu hỗ trợ.")
    try:
        return claim_ticket(db, ticket, current_user)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


# =========================================================
# STATUS
# =========================================================

@router.put(
    "/tickets/{ticket_id}/status",
    response_model=SupportTicketDetailResponse,
)
def update_support_ticket_status(
    ticket_id: int,
    data: SupportTicketStatusUpdate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    if not can_manage_ticket(
        ticket,
        current_user,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền cập nhật trạng thái.",
        )

    try:

        return update_ticket_status(
            db=db,
            ticket=ticket,
            current_user=current_user,
            status=data.status,
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# =========================================================
# ADD COMMENT
# =========================================================

@router.post(
    "/tickets/{ticket_id}/comments",
    response_model=SupportTicketCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_support_ticket_comment(
    ticket_id: int,
    data: SupportTicketCommentCreate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    if not can_view_ticket(
        ticket,
        current_user,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền trao đổi trong ticket này.",
        )

    try:

        return add_comment(
            db=db,
            ticket=ticket,
            current_user=current_user,
            content=data.content,
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# =========================================================
# COMMENTS
# =========================================================

@router.get(
    "/tickets/{ticket_id}/comments",
    response_model=list[
        SupportTicketCommentResponse
    ],
)
def list_support_ticket_comments(
    ticket_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    if not can_view_ticket(
        ticket,
        current_user,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xem ticket này.",
        )

    return get_comments(
        db,
        ticket_id,
    )


# =========================================================
# ACTIVITIES
# =========================================================

@router.get(
    "/tickets/{ticket_id}/activities",
)
def list_support_ticket_activities(
    ticket_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    ticket = get_ticket(
        db,
        ticket_id,
    )

    if not ticket:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy yêu cầu hỗ trợ.",
        )

    if not can_view_ticket(
        ticket,
        current_user,
        db,
    ):

        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xem ticket này.",
        )

    return get_activities(
        db,
        ticket_id,
    )
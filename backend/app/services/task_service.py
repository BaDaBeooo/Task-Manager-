from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models.task import Subtask, Task, TaskSupporter
from ..schemas.task import TaskCreate, TaskUpdate


# =========================================================
# CREATE TASK
# =========================================================

def create_task(
    db: Session,
    task_data: TaskCreate,
    creator_id: int,
) -> Task:

    task = Task(
        title=task_data.title,
        description=task_data.description,
        creator_id=creator_id,
        assignee_id=task_data.assignee_id,
        priority=task_data.priority,
        deadline=task_data.deadline,
        status="todo",
        progress=0,
    )

    for subtask_data in task_data.subtasks:

        task.subtasks.append(
            Subtask(
                title=subtask_data.title,
            )
        )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


# =========================================================
# GET SINGLE TASK
# =========================================================

def get_task(
    db: Session,
    task_id: int,
) -> Task | None:

    return db.get(
        Task,
        task_id,
    )


# =========================================================
# GET TASKS
# =========================================================

def get_tasks(
    db: Session,
    current_user=None,
    mine: bool = False,
) -> list[Task]:

    statement = select(Task)


    # -----------------------------------------------------
    # MY TASKS
    #
    # Một task được xem là "Việc của tôi" nếu:
    #
    # 1. User là người phụ trách chính
    # OR
    # 2. User là người hỗ trợ
    # -----------------------------------------------------

    if mine:

        statement = statement.where(

            or_(

                Task.assignee_id
                == current_user.id,

                Task.supporter_links.any(
                    TaskSupporter.user_id
                    == current_user.id
                ),

            )

        )


    statement = statement.order_by(
        Task.created_at.desc()
    )


    return list(
        db.scalars(statement).all()
    )


# =========================================================
# UPDATE TASK
# =========================================================

def update_task(
    db: Session,
    task: Task,
    task_data: TaskUpdate,
) -> Task:

    update_data = task_data.model_dump(
        exclude_unset=True
    )


    for field, value in update_data.items():

        setattr(
            task,
            field,
            value,
        )


    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return task


# =========================================================
# DELETE TASK
# =========================================================

def delete_task(
    db: Session,
    task: Task,
) -> None:

    db.delete(task)

    db.commit()


# =========================================================
# UPDATE SUBTASK
# =========================================================

def update_subtask(
    db: Session,
    subtask: Subtask,
    completed: bool,
) -> Subtask:

    subtask.completed = completed


    if completed:

        subtask.completed_at = (
            datetime.utcnow()
        )

    else:

        subtask.completed_at = None


    db.commit()
    db.refresh(subtask)

    return subtask


# =========================================================
# RECALCULATE TASK PROGRESS
# =========================================================

def recalculate_task_progress(
    db: Session,
    task: Task,
) -> Task:

    total_subtasks = len(
        task.subtasks
    )


    completed_subtasks = sum(

        1

        for subtask in task.subtasks

        if subtask.completed

    )


    # -----------------------------------------------------
    # PROGRESS
    # -----------------------------------------------------

    if total_subtasks == 0:

        task.progress = 0

    else:

        task.progress = round(

            (
                completed_subtasks
                / total_subtasks
            )
            * 100

        )


    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    if total_subtasks > 0:

        if (
            completed_subtasks
            == total_subtasks
        ):

            task.status = "completed"


        elif completed_subtasks > 0:

            task.status = "in_progress"


        else:

            task.status = "todo"


    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)

    return task
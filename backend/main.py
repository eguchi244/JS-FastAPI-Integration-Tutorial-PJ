"""
タスク管理API（FastAPI + SQLAlchemy + SQLite）
"""
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, Column, DateTime, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# ==========================================
# DB設定（SQLite）
#
# NOTE: SQLiteは既定で「作成したスレッドからのみ利用可」だが無効にすること!!
# FastAPIはリクエストごとに別スレッドで処理するため、"check_same_thread": False を指定する必要がある
# ==========================================

DATABASE_URL = "sqlite:///./tasks.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# 起動時にテーブルを自動生成
Base.metadata.create_all(bind=engine)

# ==========================================
# Pydanticモデル
# ==========================================

class TaskCreate(BaseModel):
    """タスク作成時のリクエストモデル"""
    title: str = Field(..., min_length=1, max_length=255)
    completed: bool = False

class TaskUpdate(BaseModel):
    """タスク更新時のリクエストモデル"""
    title: str | None = Field(None, min_length=1, max_length=255)
    completed: bool | None = None

class Task(BaseModel):
    """タスク情報のレスポンスモデル"""
    id: int
    title: str
    completed: bool
    created_at: datetime

    # DBから取得したデータをそのままPydanticのモデルでも変換を許可する
    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 依存関数
# ==========================================

def get_db():
    """
    データベースセッションを生成・管理する依存関数

    リクエストごとに新しいセッションを作成して、API処理の終了後に
    成否を問わず必ずセッションをクローズ（切断）します。

    Returns:
        DB操作のためのセッションオブジェクト（API処理の終了後に閉じる）
    """
    # セッション（接続窓口）を新しく作成する
    db = SessionLocal()
    try:
        # 作成したセッションを呼び出し元に渡し、処理が終わるまで待機する
        yield db
    finally:
        # 正常終了・エラー発生に関わらず、必ずセッションを閉じる
        db.close()

# ==========================================
# ヘルパー関数
# ==========================================

def get_task(task_id: int, db: Session) -> TaskModel:
    """
    指定されたIDのタスクを取得する

    Args:
        task_id : 検索対象のタスクID
        db      : DB操作のためのセッションオブジェクト

    Returns:
        見つかったタスクオブジェクト

    Raises:
        HTTPException : タスクが見つからない場合（404 Task Not Found）。
    """
    task = db.get(TaskModel, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# ==========================================
# エンドポイント
# ==========================================

app = FastAPI(title="タスク管理API", version="1.0.0")

@app.get("/tasks", response_model=list[Task])
def read_tasks(completed: bool | None = None, db: Session = Depends(get_db)):
    """
    タスク一覧（?completed=true/false で絞り込み可）

    Args:
    - completed: 完了状態での絞り込み（省略時は全件）
    - db: DB操作のためのセッションオブジェクト

    Returns:
    - タスク一覧（ID順のJSON配列）
    """
    query = db.query(TaskModel)

    # 絞り込みがある場合（?completed=true/false）はcompletedが一致するものだけ格納する　
    # NOTE: 絞り込みがない場合（?completed=None, 省略）はこの処理をスキップして全リストを返す
    if completed is not None:
        query = query.filter(TaskModel.completed == completed)

    # タスク一覧をID順に並び変えて返す
    return query.order_by(TaskModel.id).all()

@app.get("/tasks/{task_id}", response_model=Task)
def read_task(task_id: int, db: Session = Depends(get_db)):
    """
    タスク１件を取得

    Args:
    - task_id: 取得対象のタスクID
    - db: DB操作のためのセッションオブジェクト

    Returns:
    - タスク1件（JSON）

    Raises:
    - HTTPException: タスクが見つからない場合は404
    """
    return get_task(task_id, db)

@app.post("/tasks", response_model=Task, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    """
    タスクを新規作成

    Args:
    - payload: 検証済みの入力（不正な入力は422）
    - db: DB操作のためのセッションオブジェクト

    Returns:
    - 登録したタスク（201）
    """
    task = TaskModel(title=payload.title, completed=payload.completed)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    """
    タスクを更新（渡された項目のみ反映する部分更新）

    Args:
    - task_id: 更新対象のタスクID
    - payload: 検証済みの入力（None の項目は変更しない。不正な入力は422）
    - db: DB操作のためのセッションオブジェクト

    Returns:
    - 更新したタスク

    Raises:
    - HTTPException: タスクが見つからない場合は404
    """
    task = get_task(task_id, db)

    if payload.title is not None:
        task.title = payload.title
    if payload.completed is not None:
        task.completed = payload.completed

    db.commit()
    db.refresh(task)
    return task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """
    タスクを削除

    Args:
    - task_id: 削除対象のタスクID
    - db: DB操作のためのセッションオブジェクト

    Returns:
    - 削除できたことを示す {"ok": true}

    Raises:
    - HTTPException: タスクが見つからない場合は404
    """
    task = get_task(task_id, db)
    db.delete(task)
    db.commit()
    return {"ok": True}

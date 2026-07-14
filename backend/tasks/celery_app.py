from celery import Celery
from app.config import settings

celery_app = Celery(
    "rag_multimodal",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.document_tasks"],
)

print("===============================")
print(settings.REDIS_URL)
print("================================")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_soft_time_limit=540,
    task_time_limit=600,
    worker_prefetch_multiplier=1,
)

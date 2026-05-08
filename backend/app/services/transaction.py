from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from datetime import datetime

def create_transaction(db: Session, transaction: TransactionCreate):
    db_transaction = Transaction(
        product_id=transaction.product_id,
        quantity=transaction.quantity,
        transaction_type=transaction.transaction_type,
        total_price=transaction.total_price,
        user_id=transaction.user_id,
        created_at=datetime.utcnow()
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def get_transactions(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Transaction).offset(skip).limit(limit).all()

def get_transaction_by_id(db: Session, transaction_id: int):
    return db.query(Transaction).filter(Transaction.id == transaction_id).first()


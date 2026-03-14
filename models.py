from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    designs = db.relationship('Design', backref='user', lazy=True, cascade='all, delete-orphan')

class Design(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Room state
    room_width = db.Column(db.Float, default=20)
    room_length = db.Column(db.Float, default=20)
    room_height = db.Column(db.Float, default=8)
    wall_color = db.Column(db.String(10), default='#f2ede8')
    wall_style = db.Column(db.String(20), default='plain')
    floor_color = db.Column(db.String(10), default='#dcd5c8')
    roof_color = db.Column(db.String(10), default='#f8f6f2')
    furniture_items = db.relationship('Furniture', backref='design', lazy=True, cascade='all, delete-orphan')

class Furniture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    design_id = db.Column(db.Integer, db.ForeignKey('design.id'), nullable=False)
    type = db.Column(db.String(50))
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    z = db.Column(db.Float)
    rotation = db.Column(db.Float, default=0)
    scale = db.Column(db.Float, default=1.0)


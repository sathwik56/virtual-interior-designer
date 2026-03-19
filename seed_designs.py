"""
Seed realistic room designs for user Sathwik.
Run once: python seed_designs.py
"""
from app import app, db
from models import User, Design, Furniture
from datetime import datetime

DESIGNS = {}

# ── BEDROOM ──────────────────────────────────────────────────────────────────
DESIGNS['bedroom'] = {
    'name': 'Cozy Bedroom',
    'room': dict(width=12, length=10, height=3, wall_color='#f0e8df', wall_style='plain', floor_color='#b89a72', roof_color='#faf7f4'),
    'furniture': [
        dict(type='bed',        x=0,    y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='nightstand', x=-1.4, y=0,   z=-3.5, rotation=0,       scale=0.9),
        dict(type='nightstand', x=1.4,  y=0,   z=-3.5, rotation=0,       scale=0.9),
        dict(type='wardrobe',   x=-4.5, y=0,   z=0,    rotation=1.5708,  scale=1.0),
        dict(type='dresser',    x=4.5,  y=0,   z=1.0,  rotation=-1.5708, scale=1.0),
        dict(type='armchair',   x=3.0,  y=0,   z=3.5,  rotation=3.1416,  scale=0.95),
        dict(type='lamp',       x=3.8,  y=0,   z=3.5,  rotation=0,       scale=0.85),
        dict(type='mirror',     x=4.5,  y=0.8, z=-1.0, rotation=-1.5708, scale=1.0),
        dict(type='rug',        x=0,    y=0,   z=-1.5, rotation=0,       scale=1.1),
        dict(type='curtain',    x=0,    y=0.9, z=-4.8, rotation=0,       scale=1.0),
        dict(type='plantpot',   x=-3.5, y=0,   z=3.5,  rotation=0,       scale=1.0),
    ]
}

# ── LIVING ROOM ───────────────────────────────────────────────────────────────
DESIGNS['livingroom'] = {
    'name': 'Modern Living Room',
    'room': dict(width=14, length=12, height=3.2, wall_color='#e8e0d8', wall_style='plain', floor_color='#c4a882', roof_color='#f5f3f0'),
    'furniture': [
        dict(type='sofa',        x=0,    y=0,   z=-2.0, rotation=0,       scale=1.1),
        dict(type='armchair',    x=-3.5, y=0,   z=0.5,  rotation=1.5708,  scale=1.0),
        dict(type='armchair',    x=3.5,  y=0,   z=0.5,  rotation=-1.5708, scale=1.0),
        dict(type='coffeetable', x=0,    y=0,   z=1.5,  rotation=0,       scale=1.0),
        dict(type='tvstand',     x=0,    y=0,   z=-5.5, rotation=0,       scale=1.1),
        dict(type='bookshelf',   x=-6.0, y=0,   z=-2.0, rotation=1.5708,  scale=1.0),
        dict(type='lamp',        x=-5.5, y=0,   z=3.5,  rotation=0,       scale=1.0),
        dict(type='lamp',        x=5.5,  y=0,   z=3.5,  rotation=0,       scale=1.0),
        dict(type='rug',         x=0,    y=0,   z=0.5,  rotation=0,       scale=1.3),
        dict(type='plantpot',    x=5.5,  y=0,   z=-4.0, rotation=0,       scale=1.1),
        dict(type='curtain',     x=-4.0, y=0.9, z=-5.8, rotation=0,       scale=1.0),
        dict(type='curtain',     x=4.0,  y=0.9, z=-5.8, rotation=0,       scale=1.0),
        dict(type='mirror',      x=-6.5, y=0.8, z=1.0,  rotation=1.5708,  scale=1.0),
    ]
}

# ── KITCHEN ───────────────────────────────────────────────────────────────────
DESIGNS['kitchen'] = {
    'name': 'Modern Kitchen',
    'room': dict(width=10, length=9, height=2.8, wall_color='#f5f0eb', wall_style='tile', floor_color='#d4c4b0', roof_color='#fafafa'),
    'furniture': [
        dict(type='kitchencounter', x=-3.5, y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='kitchencounter', x=0,    y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='kitchencounter', x=3.5,  y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='kitchencounter', x=-4.5, y=0,   z=-1.5, rotation=1.5708,  scale=1.0),
        dict(type='kitchencounter', x=-4.5, y=0,   z=0.5,  rotation=1.5708,  scale=1.0),
        dict(type='stove',          x=3.5,  y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='fridge',         x=-4.5, y=0,   z=-3.5, rotation=1.5708,  scale=1.0),
        dict(type='kitchenisland',  x=0,    y=0,   z=1.0,  rotation=0,       scale=1.0),
        dict(type='chair',          x=-1.0, y=0,   z=2.5,  rotation=0,       scale=0.9),
        dict(type='chair',          x=1.0,  y=0,   z=2.5,  rotation=0,       scale=0.9),
        dict(type='plantpot',       x=4.0,  y=0,   z=3.5,  rotation=0,       scale=0.8),
    ]
}

# ── BATHROOM ──────────────────────────────────────────────────────────────────
DESIGNS['bathroom'] = {
    'name': 'Clean Bathroom',
    'room': dict(width=6, length=7, height=2.6, wall_color='#eef4f7', wall_style='tile', floor_color='#c8d8e0', roof_color='#f8fbfc'),
    'furniture': [
        dict(type='bathtub',  x=0,    y=0,   z=-2.5, rotation=0,       scale=1.0),
        dict(type='toilet',   x=2.0,  y=0,   z=-2.5, rotation=0,       scale=1.0),
        dict(type='sink',     x=-2.0, y=0,   z=-2.5, rotation=0,       scale=1.0),
        dict(type='mirror',   x=-2.0, y=1.0, z=-3.3, rotation=0,       scale=0.8),
        dict(type='plantpot', x=2.0,  y=0,   z=2.5,  rotation=0,       scale=0.7),
        dict(type='curtain',  x=0,    y=0.9, z=-3.3, rotation=0,       scale=0.9),
    ]
}

# ── WORKSTATION ───────────────────────────────────────────────────────────────
DESIGNS['workstation'] = {
    'name': 'Home Workstation',
    'room': dict(width=9, length=8, height=2.8, wall_color='#e8edf2', wall_style='plain', floor_color='#b0b8c4', roof_color='#f4f6f8'),
    'furniture': [
        dict(type='desk',           x=0,    y=0,   z=-3.0, rotation=0,       scale=1.0),
        dict(type='chair',          x=0,    y=0,   z=-1.8, rotation=0,       scale=1.0),
        dict(type='bookshelf',      x=-3.5, y=0,   z=-1.0, rotation=1.5708,  scale=1.0),
        dict(type='bookshelf',      x=-3.5, y=0,   z=1.0,  rotation=1.5708,  scale=1.0),
        dict(type='filingcabinet',  x=3.5,  y=0,   z=-2.5, rotation=-1.5708, scale=1.0),
        dict(type='lamp',           x=1.5,  y=0,   z=-3.0, rotation=0,       scale=0.8),
        dict(type='plantpot',       x=-3.5, y=0,   z=3.0,  rotation=0,       scale=0.9),
        dict(type='rug',            x=0,    y=0,   z=-1.0, rotation=0,       scale=1.0),
        dict(type='curtain',        x=0,    y=0.9, z=-3.8, rotation=0,       scale=1.0),
    ]
}

# ── CONFERENCE ROOM ───────────────────────────────────────────────────────────
DESIGNS['conference'] = {
    'name': 'Conference Room',
    'room': dict(width=14, length=10, height=3.0, wall_color='#e4e8ec', wall_style='plain', floor_color='#a8b0b8', roof_color='#f2f4f6'),
    'furniture': [
        dict(type='table',          x=0,    y=0,   z=0,    rotation=0,       scale=1.4),
        dict(type='chair',          x=-2.5, y=0,   z=-1.5, rotation=0,       scale=0.9),
        dict(type='chair',          x=0,    y=0,   z=-1.5, rotation=0,       scale=0.9),
        dict(type='chair',          x=2.5,  y=0,   z=-1.5, rotation=0,       scale=0.9),
        dict(type='chair',          x=-2.5, y=0,   z=1.5,  rotation=3.1416,  scale=0.9),
        dict(type='chair',          x=0,    y=0,   z=1.5,  rotation=3.1416,  scale=0.9),
        dict(type='chair',          x=2.5,  y=0,   z=1.5,  rotation=3.1416,  scale=0.9),
        dict(type='chair',          x=-4.5, y=0,   z=0,    rotation=1.5708,  scale=0.9),
        dict(type='chair',          x=4.5,  y=0,   z=0,    rotation=-1.5708, scale=0.9),
        dict(type='whiteboard',     x=0,    y=0,   z=-4.8, rotation=0,       scale=1.2),
        dict(type='officepartition',x=-6.5, y=0,   z=0,    rotation=1.5708,  scale=1.0),
        dict(type='plantpot',       x=6.0,  y=0,   z=-4.0, rotation=0,       scale=1.0),
        dict(type='plantpot',       x=-6.0, y=0,   z=-4.0, rotation=0,       scale=1.0),
    ]
}

# ── RECEPTION ─────────────────────────────────────────────────────────────────
DESIGNS['reception'] = {
    'name': 'Office Reception',
    'room': dict(width=14, length=12, height=3.2, wall_color='#e8e4f0', wall_style='plain', floor_color='#9898a8', roof_color='#f4f2f8'),
    'furniture': [
        dict(type='desk',           x=0,    y=0,   z=-4.0, rotation=0,       scale=1.2),
        dict(type='chair',          x=0,    y=0,   z=-3.0, rotation=0,       scale=1.0),
        dict(type='sofa',           x=-4.0, y=0,   z=2.0,  rotation=1.5708,  scale=1.0),
        dict(type='sofa',           x=4.0,  y=0,   z=2.0,  rotation=-1.5708, scale=1.0),
        dict(type='coffeetable',    x=0,    y=0,   z=2.5,  rotation=0,       scale=1.0),
        dict(type='displayshelf',   x=-6.0, y=0,   z=-2.0, rotation=1.5708,  scale=1.0),
        dict(type='displayshelf',   x=6.0,  y=0,   z=-2.0, rotation=-1.5708, scale=1.0),
        dict(type='plantpot',       x=-5.5, y=0,   z=4.5,  rotation=0,       scale=1.2),
        dict(type='plantpot',       x=5.5,  y=0,   z=4.5,  rotation=0,       scale=1.2),
        dict(type='lamp',           x=-5.5, y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='lamp',           x=5.5,  y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='rug',            x=0,    y=0,   z=2.0,  rotation=0,       scale=1.2),
        dict(type='mirror',         x=0,    y=0.8, z=-5.8, rotation=0,       scale=1.1),
    ]
}

# ── RESTAURANT ────────────────────────────────────────────────────────────────
DESIGNS['restaurant'] = {
    'name': 'Fine Dining Restaurant',
    'room': dict(width=16, length=14, height=3.5, wall_color='#f0e8e0', wall_style='brick', floor_color='#8c6e50', roof_color='#f8f4f0'),
    'furniture': [
        dict(type='table',    x=-4.0, y=0,   z=-4.0, rotation=0,       scale=0.9),
        dict(type='chair',    x=-4.0, y=0,   z=-2.8, rotation=3.1416,  scale=0.85),
        dict(type='chair',    x=-4.0, y=0,   z=-5.2, rotation=0,       scale=0.85),
        dict(type='chair',    x=-5.2, y=0,   z=-4.0, rotation=1.5708,  scale=0.85),
        dict(type='chair',    x=-2.8, y=0,   z=-4.0, rotation=-1.5708, scale=0.85),
        dict(type='table',    x=4.0,  y=0,   z=-4.0, rotation=0,       scale=0.9),
        dict(type='chair',    x=4.0,  y=0,   z=-2.8, rotation=3.1416,  scale=0.85),
        dict(type='chair',    x=4.0,  y=0,   z=-5.2, rotation=0,       scale=0.85),
        dict(type='chair',    x=2.8,  y=0,   z=-4.0, rotation=1.5708,  scale=0.85),
        dict(type='chair',    x=5.2,  y=0,   z=-4.0, rotation=-1.5708, scale=0.85),
        dict(type='table',    x=0,    y=0,   z=1.5,  rotation=0,       scale=0.9),
        dict(type='chair',    x=0,    y=0,   z=2.7,  rotation=3.1416,  scale=0.85),
        dict(type='chair',    x=0,    y=0,   z=0.3,  rotation=0,       scale=0.85),
        dict(type='chair',    x=-1.2, y=0,   z=1.5,  rotation=1.5708,  scale=0.85),
        dict(type='chair',    x=1.2,  y=0,   z=1.5,  rotation=-1.5708, scale=0.85),
        dict(type='lamp',     x=-4.0, y=0,   z=-4.0, rotation=0,       scale=0.7),
        dict(type='lamp',     x=4.0,  y=0,   z=-4.0, rotation=0,       scale=0.7),
        dict(type='plantpot', x=-7.0, y=0,   z=5.5,  rotation=0,       scale=1.1),
        dict(type='plantpot', x=7.0,  y=0,   z=5.5,  rotation=0,       scale=1.1),
        dict(type='rug',      x=0,    y=0,   z=0,    rotation=0,       scale=1.5),
        dict(type='curtain',  x=-5.0, y=0.9, z=-6.8, rotation=0,       scale=1.0),
        dict(type='curtain',  x=5.0,  y=0.9, z=-6.8, rotation=0,       scale=1.0),
    ]
}

# ── CAFE ──────────────────────────────────────────────────────────────────────
DESIGNS['cafe'] = {
    'name': 'Cozy Cafe',
    'room': dict(width=12, length=11, height=3.0, wall_color='#f5ede0', wall_style='wood panel', floor_color='#a07850', roof_color='#faf5ee'),
    'furniture': [
        dict(type='cashcounter', x=0,    y=0,   z=-4.5, rotation=0,       scale=1.0),
        dict(type='table',       x=-3.5, y=0,   z=-1.5, rotation=0,       scale=0.75),
        dict(type='chair',       x=-3.5, y=0,   z=-0.5, rotation=3.1416,  scale=0.8),
        dict(type='chair',       x=-3.5, y=0,   z=-2.5, rotation=0,       scale=0.8),
        dict(type='table',       x=3.5,  y=0,   z=-1.5, rotation=0,       scale=0.75),
        dict(type='chair',       x=3.5,  y=0,   z=-0.5, rotation=3.1416,  scale=0.8),
        dict(type='chair',       x=3.5,  y=0,   z=-2.5, rotation=0,       scale=0.8),
        dict(type='table',       x=0,    y=0,   z=2.5,  rotation=0,       scale=0.75),
        dict(type='chair',       x=-1.0, y=0,   z=2.5,  rotation=1.5708,  scale=0.8),
        dict(type='chair',       x=1.0,  y=0,   z=2.5,  rotation=-1.5708, scale=0.8),
        dict(type='sofa',        x=-4.5, y=0,   z=3.5,  rotation=1.5708,  scale=0.9),
        dict(type='coffeetable', x=-3.0, y=0,   z=3.5,  rotation=0,       scale=0.8),
        dict(type='displayshelf',x=4.5,  y=0,   z=0,    rotation=-1.5708, scale=1.0),
        dict(type='plantpot',    x=-5.0, y=0,   z=-4.0, rotation=0,       scale=1.0),
        dict(type='plantpot',    x=5.0,  y=0,   z=-4.0, rotation=0,       scale=1.0),
        dict(type='lamp',        x=-4.5, y=0,   z=1.5,  rotation=0,       scale=0.9),
        dict(type='rug',         x=0,    y=0,   z=1.5,  rotation=0,       scale=1.1),
    ]
}

# ── SHOP ──────────────────────────────────────────────────────────────────────
DESIGNS['shop'] = {
    'name': 'Retail Shop',
    'room': dict(width=14, length=12, height=3.2, wall_color='#f0f0f0', wall_style='plain', floor_color='#c0c0c0', roof_color='#fafafa'),
    'furniture': [
        dict(type='cashcounter',  x=0,    y=0,   z=-5.0, rotation=0,       scale=1.1),
        dict(type='displayshelf', x=-5.5, y=0,   z=-2.0, rotation=1.5708,  scale=1.0),
        dict(type='displayshelf', x=-5.5, y=0,   z=0.5,  rotation=1.5708,  scale=1.0),
        dict(type='displayshelf', x=-5.5, y=0,   z=3.0,  rotation=1.5708,  scale=1.0),
        dict(type='displayshelf', x=5.5,  y=0,   z=-2.0, rotation=-1.5708, scale=1.0),
        dict(type='displayshelf', x=5.5,  y=0,   z=0.5,  rotation=-1.5708, scale=1.0),
        dict(type='displayshelf', x=5.5,  y=0,   z=3.0,  rotation=-1.5708, scale=1.0),
        dict(type='displayshelf', x=0,    y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='mirror',       x=-6.5, y=0.8, z=4.5,  rotation=1.5708,  scale=1.1),
        dict(type='mirror',       x=6.5,  y=0.8, z=4.5,  rotation=-1.5708, scale=1.1),
        dict(type='plantpot',     x=-6.0, y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='plantpot',     x=6.0,  y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='rug',          x=0,    y=0,   z=-2.0, rotation=0,       scale=1.2),
    ]
}

# ── CLASSROOM ─────────────────────────────────────────────────────────────────
DESIGNS['classroom'] = {
    'name': 'Classroom',
    'room': dict(width=14, length=12, height=3.2, wall_color='#eef2e8', wall_style='plain', floor_color='#b0b890', roof_color='#f5f7f2'),
    'furniture': [
        dict(type='whiteboard',  x=0,    y=0,   z=-5.8, rotation=0,       scale=1.3),
        dict(type='desk',        x=0,    y=0,   z=-4.0, rotation=0,       scale=1.0),
        dict(type='chair',       x=0,    y=0,   z=-3.0, rotation=0,       scale=1.0),
        dict(type='table',       x=-4.0, y=0,   z=-1.5, rotation=0,       scale=0.85),
        dict(type='chair',       x=-4.0, y=0,   z=-0.5, rotation=0,       scale=0.85),
        dict(type='table',       x=-1.5, y=0,   z=-1.5, rotation=0,       scale=0.85),
        dict(type='chair',       x=-1.5, y=0,   z=-0.5, rotation=0,       scale=0.85),
        dict(type='table',       x=1.5,  y=0,   z=-1.5, rotation=0,       scale=0.85),
        dict(type='chair',       x=1.5,  y=0,   z=-0.5, rotation=0,       scale=0.85),
        dict(type='table',       x=4.0,  y=0,   z=-1.5, rotation=0,       scale=0.85),
        dict(type='chair',       x=4.0,  y=0,   z=-0.5, rotation=0,       scale=0.85),
        dict(type='table',       x=-4.0, y=0,   z=1.5,  rotation=0,       scale=0.85),
        dict(type='chair',       x=-4.0, y=0,   z=2.5,  rotation=0,       scale=0.85),
        dict(type='table',       x=-1.5, y=0,   z=1.5,  rotation=0,       scale=0.85),
        dict(type='chair',       x=-1.5, y=0,   z=2.5,  rotation=0,       scale=0.85),
        dict(type='table',       x=1.5,  y=0,   z=1.5,  rotation=0,       scale=0.85),
        dict(type='chair',       x=1.5,  y=0,   z=2.5,  rotation=0,       scale=0.85),
        dict(type='table',       x=4.0,  y=0,   z=1.5,  rotation=0,       scale=0.85),
        dict(type='chair',       x=4.0,  y=0,   z=2.5,  rotation=0,       scale=0.85),
        dict(type='bookshelf',   x=-6.5, y=0,   z=0,    rotation=1.5708,  scale=1.0),
        dict(type='plantpot',    x=6.0,  y=0,   z=4.5,  rotation=0,       scale=1.0),
    ]
}

# ── GYM ───────────────────────────────────────────────────────────────────────
DESIGNS['gym'] = {
    'name': 'Fitness Gym',
    'room': dict(width=16, length=14, height=4.0, wall_color='#e8e8e8', wall_style='concrete', floor_color='#606060', roof_color='#f0f0f0'),
    'furniture': [
        dict(type='treadmill',   x=-5.0, y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='treadmill',   x=-2.5, y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='treadmill',   x=0,    y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='treadmill',   x=2.5,  y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='treadmill',   x=5.0,  y=0,   z=-5.0, rotation=0,       scale=1.0),
        dict(type='bench',       x=-5.0, y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='bench',       x=-2.5, y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='bench',       x=0,    y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='bench',       x=2.5,  y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='bench',       x=5.0,  y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='mirror',      x=-7.5, y=0.8, z=0,    rotation=1.5708,  scale=1.3),
        dict(type='mirror',      x=7.5,  y=0.8, z=0,    rotation=-1.5708, scale=1.3),
        dict(type='plantpot',    x=-7.0, y=0,   z=6.0,  rotation=0,       scale=1.1),
        dict(type='plantpot',    x=7.0,  y=0,   z=6.0,  rotation=0,       scale=1.1),
        dict(type='rug',         x=0,    y=0,   z=3.5,  rotation=0,       scale=1.5),
    ]
}

# ── LIBRARY ───────────────────────────────────────────────────────────────────
DESIGNS['library'] = {
    'name': 'Reading Library',
    'room': dict(width=16, length=14, height=3.5, wall_color='#f0ebe0', wall_style='wood panel', floor_color='#9c7c58', roof_color='#f8f4ec'),
    'furniture': [
        dict(type='bookshelf', x=-7.0, y=0,   z=-4.0, rotation=1.5708,  scale=1.1),
        dict(type='bookshelf', x=-7.0, y=0,   z=-1.5, rotation=1.5708,  scale=1.1),
        dict(type='bookshelf', x=-7.0, y=0,   z=1.0,  rotation=1.5708,  scale=1.1),
        dict(type='bookshelf', x=-7.0, y=0,   z=3.5,  rotation=1.5708,  scale=1.1),
        dict(type='bookshelf', x=7.0,  y=0,   z=-4.0, rotation=-1.5708, scale=1.1),
        dict(type='bookshelf', x=7.0,  y=0,   z=-1.5, rotation=-1.5708, scale=1.1),
        dict(type='bookshelf', x=7.0,  y=0,   z=1.0,  rotation=-1.5708, scale=1.1),
        dict(type='bookshelf', x=7.0,  y=0,   z=3.5,  rotation=-1.5708, scale=1.1),
        dict(type='bookshelf', x=-2.5, y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='bookshelf', x=2.5,  y=0,   z=0,    rotation=0,       scale=1.0),
        dict(type='desk',      x=0,    y=0,   z=-5.5, rotation=0,       scale=1.0),
        dict(type='chair',     x=0,    y=0,   z=-4.5, rotation=0,       scale=1.0),
        dict(type='armchair',  x=-4.5, y=0,   z=5.0,  rotation=0,       scale=1.0),
        dict(type='armchair',  x=-2.5, y=0,   z=5.0,  rotation=0,       scale=1.0),
        dict(type='armchair',  x=2.5,  y=0,   z=5.0,  rotation=0,       scale=1.0),
        dict(type='armchair',  x=4.5,  y=0,   z=5.0,  rotation=0,       scale=1.0),
        dict(type='coffeetable',x=0,   y=0,   z=5.5,  rotation=0,       scale=1.0),
        dict(type='lamp',      x=-4.5, y=0,   z=5.0,  rotation=0,       scale=0.9),
        dict(type='lamp',      x=4.5,  y=0,   z=5.0,  rotation=0,       scale=0.9),
        dict(type='plantpot',  x=-6.5, y=0,   z=6.0,  rotation=0,       scale=1.1),
        dict(type='plantpot',  x=6.5,  y=0,   z=6.0,  rotation=0,       scale=1.1),
        dict(type='rug',       x=0,    y=0,   z=4.5,  rotation=0,       scale=1.3),
    ]
}

# ── COMPLETE HOME (open floor plan, no room type) ─────────────────────────────
DESIGNS['complete_home'] = {
    'name': 'Complete Home Design',
    'room': dict(width=24, length=20, height=3.2, wall_color='#f2ede8', wall_style='plain', floor_color='#c8b89a', roof_color='#f8f6f2'),
    'furniture': [
        # --- LIVING AREA (front-center) ---
        dict(type='sofa',        x=0,    y=0,   z=5.0,  rotation=3.1416,  scale=1.1),
        dict(type='armchair',    x=-3.5, y=0,   z=3.5,  rotation=1.5708,  scale=1.0),
        dict(type='armchair',    x=3.5,  y=0,   z=3.5,  rotation=-1.5708, scale=1.0),
        dict(type='coffeetable', x=0,    y=0,   z=3.0,  rotation=0,       scale=1.0),
        dict(type='tvstand',     x=0,    y=0,   z=7.5,  rotation=3.1416,  scale=1.1),
        dict(type='rug',         x=0,    y=0,   z=4.0,  rotation=0,       scale=1.3),
        dict(type='lamp',        x=-5.0, y=0,   z=6.5,  rotation=0,       scale=1.0),
        dict(type='plantpot',    x=5.0,  y=0,   z=7.0,  rotation=0,       scale=1.1),
        dict(type='curtain',     x=-3.0, y=0.9, z=9.8,  rotation=0,       scale=1.0),
        dict(type='curtain',     x=3.0,  y=0.9, z=9.8,  rotation=0,       scale=1.0),
        # --- DINING AREA (right side) ---
        dict(type='table',       x=7.0,  y=0,   z=4.0,  rotation=0,       scale=1.0),
        dict(type='chair',       x=7.0,  y=0,   z=2.8,  rotation=0,       scale=0.9),
        dict(type='chair',       x=7.0,  y=0,   z=5.2,  rotation=3.1416,  scale=0.9),
        dict(type='chair',       x=5.8,  y=0,   z=4.0,  rotation=1.5708,  scale=0.9),
        dict(type='chair',       x=8.2,  y=0,   z=4.0,  rotation=-1.5708, scale=0.9),
        dict(type='lamp',        x=7.0,  y=0,   z=4.0,  rotation=0,       scale=0.75),
        # --- KITCHEN AREA (right-back) ---
        dict(type='kitchencounter', x=9.5,  y=0,   z=7.0,  rotation=-1.5708, scale=1.0),
        dict(type='kitchencounter', x=9.5,  y=0,   z=5.0,  rotation=-1.5708, scale=1.0),
        dict(type='kitchencounter', x=7.5,  y=0,   z=9.5,  rotation=3.1416,  scale=1.0),
        dict(type='stove',          x=5.5,  y=0,   z=9.5,  rotation=3.1416,  scale=1.0),
        dict(type='fridge',         x=9.5,  y=0,   z=9.0,  rotation=-1.5708, scale=1.0),
        dict(type='kitchenisland',  x=7.0,  y=0,   z=7.0,  rotation=0,       scale=0.9),
        # --- BEDROOM AREA (left-back) ---
        dict(type='bed',         x=-6.0, y=0,   z=7.5,  rotation=3.1416,  scale=1.0),
        dict(type='nightstand',  x=-7.5, y=0,   z=7.5,  rotation=0,       scale=0.9),
        dict(type='nightstand',  x=-4.5, y=0,   z=7.5,  rotation=0,       scale=0.9),
        dict(type='wardrobe',    x=-9.5, y=0,   z=5.5,  rotation=1.5708,  scale=1.0),
        dict(type='dresser',     x=-9.5, y=0,   z=8.5,  rotation=1.5708,  scale=1.0),
        dict(type='mirror',      x=-9.5, y=0.8, z=7.0,  rotation=1.5708,  scale=1.0),
        dict(type='rug',         x=-6.0, y=0,   z=6.0,  rotation=0,       scale=1.1),
        dict(type='curtain',     x=-6.0, y=0.9, z=9.8,  rotation=0,       scale=1.0),
        dict(type='lamp',        x=-3.5, y=0,   z=9.0,  rotation=0,       scale=0.9),
        # --- BATHROOM AREA (left-front) ---
        dict(type='bathtub',     x=-7.5, y=0,   z=1.5,  rotation=0,       scale=1.0),
        dict(type='toilet',      x=-9.0, y=0,   z=-1.0, rotation=1.5708,  scale=1.0),
        dict(type='sink',        x=-9.0, y=0,   z=1.5,  rotation=1.5708,  scale=1.0),
        dict(type='mirror',      x=-9.5, y=1.0, z=1.5,  rotation=1.5708,  scale=0.8),
        # --- STUDY CORNER (center-left) ---
        dict(type='desk',        x=-4.0, y=0,   z=-1.0, rotation=1.5708,  scale=1.0),
        dict(type='chair',       x=-2.8, y=0,   z=-1.0, rotation=1.5708,  scale=1.0),
        dict(type='bookshelf',   x=-4.5, y=0,   z=-3.5, rotation=0,       scale=1.0),
        dict(type='lamp',        x=-4.0, y=0,   z=-2.5, rotation=0,       scale=0.85),
        # --- ENTRYWAY (front) ---
        dict(type='plantpot',    x=-9.0, y=0,   z=-8.5, rotation=0,       scale=1.1),
        dict(type='plantpot',    x=9.0,  y=0,   z=-8.5, rotation=0,       scale=1.1),
        dict(type='mirror',      x=0,    y=0.8, z=-9.8, rotation=0,       scale=1.1),
        dict(type='rug',         x=0,    y=0,   z=-7.5, rotation=0,       scale=1.0),
    ]
}

# ── INSERT INTO DATABASE ──────────────────────────────────────────────────────
def seed():
    with app.app_context():
        user = User.query.filter(User.username.ilike('Sathwik')).first()
        if not user:
            print("ERROR: User 'Sathwik' not found. Please create the account first via the app.")
            return

        inserted = 0
        skipped = 0
        for room_type, data in DESIGNS.items():
            design_name = data['name']
            # Skip if already exists
            existing = Design.query.filter_by(user_id=user.id, name=design_name).first()
            if existing:
                print(f"  SKIP (already exists): {design_name}")
                skipped += 1
                continue

            room = data['room']
            design = Design(
                user_id=user.id,
                name=design_name,
                room_width=room['width'],
                room_length=room['length'],
                room_height=room['height'],
                wall_color=room['wall_color'],
                wall_style=room['wall_style'],
                floor_color=room['floor_color'],
                roof_color=room['roof_color'],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.session.add(design)
            db.session.flush()  # get design.id

            for item in data['furniture']:
                f = Furniture(
                    design_id=design.id,
                    type=item['type'],
                    x=item['x'],
                    y=item['y'],
                    z=item['z'],
                    rotation=item.get('rotation', 0),
                    scale=item.get('scale', 1.0),
                )
                db.session.add(f)

            db.session.commit()
            print(f"  CREATED: {design_name} ({len(data['furniture'])} items)")
            inserted += 1

        print(f"\nDone! {inserted} designs created, {skipped} skipped.")

if __name__ == '__main__':
    seed()

from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///design.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'your-secret-key-change-in-production'

# Session configuration for security
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # Session expires after 7 days

# Import models after app configuration
from models import db, User, Design, Furniture

db.init_app(app)

# Create tables if they don't exist
with app.app_context():
    try:
        db.create_all()
        
        # Create a default test user if it doesn't exist
        if not User.query.filter_by(username='user').first():
            user = User(
                username='user',
                password=generate_password_hash('user123')
            )
            db.session.add(user)
            db.session.commit()
            print("Database initialized successfully!")
            print("Test user created: user / user123")
        else:
            print("Database already initialized")
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.session.rollback()

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/editor")
def editor():
    return render_template("index.html")

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # Validation: Check if fields are provided
        if not username or not password:
            return jsonify({"success": False, "message": "Username and password required"}), 400
        
        # Professional Username Validation
        import re
        
        # Username length (4-30 characters for professional use)
        if len(username) < 4:
            return jsonify({"success": False, "message": "Username must be at least 4 characters long"}), 400
        
        if len(username) > 30:
            return jsonify({"success": False, "message": "Username must be less than 30 characters"}), 400
        
        # Username must start with a letter (professional requirement)
        if not re.match(r'^[a-zA-Z]', username):
            return jsonify({"success": False, "message": "Username must start with a letter"}), 400
        
        # Username format: letters, numbers, underscore, hyphen (no consecutive special chars)
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z]$', username):
            return jsonify({"success": False, "message": "Username can only contain letters, numbers, underscore, and hyphen. Cannot end with special characters."}), 400
        
        # No consecutive special characters
        if re.search(r'[_-]{2,}', username):
            return jsonify({"success": False, "message": "Username cannot contain consecutive special characters"}), 400
        
        # Cannot be all numbers (like "123")
        if username.isdigit():
            return jsonify({"success": False, "message": "Username cannot be all numbers"}), 400
        
        # Professional Password Validation
        if len(password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters long"}), 400
        
        if len(password) > 128:
            return jsonify({"success": False, "message": "Password must be less than 128 characters"}), 400
        
        # Password must contain at least 3 of 4 character types
        char_types = 0
        if re.search(r'[a-z]', password):  # lowercase
            char_types += 1
        if re.search(r'[A-Z]', password):  # uppercase
            char_types += 1
        if re.search(r'[0-9]', password):  # numbers
            char_types += 1
        if re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):  # special chars
            char_types += 1
        
        if char_types < 3:
            return jsonify({"success": False, "message": "Password must contain at least 3 of: lowercase letters, uppercase letters, numbers, special characters"}), 400
        
        # Password cannot be common weak passwords
        weak_passwords = ['password', '12345678', 'qwerty123', 'abc12345', 'password123', '123456789']
        if password.lower() in weak_passwords:
            return jsonify({"success": False, "message": "Password is too common. Please choose a stronger password"}), 400
        
        # Password cannot contain username
        if username.lower() in password.lower():
            return jsonify({"success": False, "message": "Password cannot contain your username"}), 400
        
        # Validation: Check if username already exists (case-insensitive)
        existing_user = User.query.filter(User.username.ilike(username)).first()
        if existing_user:
            return jsonify({"success": False, "message": "Username already exists"}), 400
        
        # Validation: Prevent reserved usernames
        reserved_usernames = ['admin', 'root', 'system', 'administrator', 'moderator', 'mod']
        if username.lower() in reserved_usernames:
            return jsonify({"success": False, "message": "This username is reserved"}), 400
        
        # Create new user
        new_user = User(
            username=username,
            password=generate_password_hash(password, method='pbkdf2:sha256')
        )
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Account created successfully! You can now login."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Registration failed. Please try again."}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # Validation: Check if fields are provided
        if not username or not password:
            return jsonify({"success": False, "message": "Username and password required"}), 400
        
        # Validation: Basic input sanitization
        if len(username) > 50 or len(password) > 100:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401
        
        # Find user (case-insensitive username)
        user = User.query.filter(User.username.ilike(username)).first()
        
        # Verify password
        if user and check_password_hash(user.password, password):
            # Create session
            session['user_id'] = user.id
            session['username'] = user.username
            session.permanent = True  # Make session persistent
            
            return jsonify({
                "success": True,
                "username": user.username
            })
        else:
            # Generic error message for security (don't reveal if username exists)
            return jsonify({"success": False, "message": "Invalid username or password"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": "Login failed. Please try again."}), 500

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/check_session")
def check_session():
    if 'user_id' in session:
        return jsonify({
            "logged_in": True,
            "username": session.get('username')
        })
    return jsonify({"logged_in": False})

@app.route("/save", methods=["POST"])
def save():
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Please login to save designs"}), 401
    
    try:
        data = request.json
        furniture_data = data.get('furniture', [])
        design_name = data.get('name', f"Design {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        user_id = session['user_id']
        
        # Check if design with this name already exists for this user
        existing_design = Design.query.filter_by(user_id=user_id, name=design_name).first()
        
        if existing_design:
            # Update existing design
            # Delete old furniture items
            Furniture.query.filter_by(design_id=existing_design.id).delete()
            
            # Add new furniture items
            for item in furniture_data:
                furniture = Furniture(
                    design_id=existing_design.id,
                    type=item.get('type'),
                    x=item.get('x'),
                    y=item.get('y'),
                    z=item.get('z'),
                    rotation=item.get('rotation', 0)
                )
                db.session.add(furniture)
            
            existing_design.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "Design updated successfully!",
                "design_id": existing_design.id,
                "design_name": existing_design.name
            })
        else:
            # Create new design
            new_design = Design(
                user_id=user_id,
                name=design_name
            )
            db.session.add(new_design)
            db.session.flush()  # Get the design ID
            
            # Add furniture items
            for item in furniture_data:
                furniture = Furniture(
                    design_id=new_design.id,
                    type=item.get('type'),
                    x=item.get('x'),
                    y=item.get('y'),
                    z=item.get('z'),
                    rotation=item.get('rotation', 0)
                )
                db.session.add(furniture)
            
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "Design saved successfully!",
                "design_id": new_design.id,
                "design_name": new_design.name
            })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/load")
def load():
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Please login to load designs"}), 401
    
    try:
        user_id = session['user_id']
        design_id = request.args.get('design_id', type=int)
        
        if design_id:
            # Load specific design (only user's own designs)
            design = Design.query.filter_by(id=design_id, user_id=user_id).first()
            
            if not design:
                return jsonify({"success": False, "message": "Design not found"}), 404
            
            furniture_items = Furniture.query.filter_by(design_id=design.id).all()
            furniture_data = [{
                'type': item.type,
                'x': item.x,
                'y': item.y,
                'z': item.z,
                'rotation': item.rotation
            } for item in furniture_items]
            
            return jsonify({
                "success": True,
                "design_name": design.name,
                "furniture": furniture_data
            })
        else:
            # Load most recent design
            latest_design = Design.query.filter_by(user_id=user_id).order_by(Design.updated_at.desc()).first()
            
            if not latest_design:
                return jsonify({"success": False, "message": "No saved designs found"}), 404
            
            furniture_items = Furniture.query.filter_by(design_id=latest_design.id).all()
            furniture_data = [{
                'type': item.type,
                'x': item.x,
                'y': item.y,
                'z': item.z,
                'rotation': item.rotation
            } for item in furniture_items]
            
            return jsonify({
                "success": True,
                "design_name": latest_design.name,
                "furniture": furniture_data
            })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/designs")
def get_designs():
    # Get all designs for the logged-in user
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Please login"}), 401
    
    try:
        user_id = session['user_id']
        designs = Design.query.filter_by(user_id=user_id).order_by(Design.updated_at.desc()).all()
        
        designs_list = [{
            'id': design.id,
            'name': design.name,
            'created_at': design.created_at.strftime('%Y-%m-%d %H:%M'),
            'updated_at': design.updated_at.strftime('%Y-%m-%d %H:%M'),
            'furniture_count': len(design.furniture_items)
        } for design in designs]
        
        return jsonify({
            "success": True,
            "designs": designs_list
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/delete_design/<int:design_id>", methods=["DELETE"])
def delete_design(design_id):
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({"success": False, "message": "Please login"}), 401
    
    try:
        user_id = session['user_id']
        design = Design.query.filter_by(id=design_id, user_id=user_id).first()
        
        if not design:
            return jsonify({"success": False, "message": "Design not found"}), 404
        
        db.session.delete(design)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Design deleted successfully"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)

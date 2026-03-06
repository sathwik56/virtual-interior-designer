# 🏠 Virtual Interior Designer

A professional 3D interior design web application built with Flask and Three.js. Design and visualize your home in 3D with an intuitive drag-and-drop interface.

## ✨ Features

- **3D Room Designer**: Interactive 3D environment with realistic furniture
- **Extensive Furniture Library**: 20+ furniture items including beds, sofas, tables, chairs, and more
- **Architectural Elements**: Interior walls, doors, windows, glass walls, and staircases
- **Customization**: Change wall and floor colors, adjust room dimensions
- **Session Management**: Auto-save your work, continue where you left off
- **User Accounts**: Save and manage multiple design projects
- **Professional Tools**: Undo/Redo, camera controls, export images
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Live Demo

[Add your deployed URL here]

## 🛠️ Technologies Used

- **Backend**: Flask, SQLAlchemy, SQLite
- **Frontend**: Three.js, Tailwind CSS
- **3D Graphics**: Three.js with OrbitControls
- **Authentication**: Werkzeug password hashing

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/virtual-interior-designer.git
cd virtual-interior-designer
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

## 🎨 Usage

1. **Start Designing**: Click "START" on the home page
2. **Add Furniture**: Select items from the sidebar and add to your room
3. **Customize**: Change colors, rotate objects, adjust room size
4. **Save Your Work**: Sign in to save and manage multiple projects
5. **Export**: Capture screenshots of your designs

## 🔐 Security Features

- Professional username validation (must start with letter, 4-30 characters)
- Strong password requirements (8+ characters, mixed case, numbers, special chars)
- Password hashing with Werkzeug
- Session management with secure cookies
- Protection against common weak passwords

## 📱 Mobile Access

The application is fully responsive and works on mobile devices. Access it from any device on your network.

## 🎓 College Project

This project was developed as a college assignment to demonstrate:
- Full-stack web development skills
- 3D graphics programming
- Database design and management
- User authentication and security
- Responsive UI/UX design

## 📄 License

This project is open source and available for educational purposes.

## 👨‍💻 Developer

Developed by [Your Name]

## 🙏 Acknowledgments

- Three.js for 3D graphics library
- Flask for the web framework
- Tailwind CSS for styling

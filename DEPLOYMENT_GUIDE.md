# 🚀 Deployment Guide - Virtual Interior Designer

## Option 1: Deploy to Render.com (Recommended - FREE)

### Step 1: Push to GitHub

1. **Create a GitHub account** (if you don't have one):
   - Go to https://github.com
   - Sign up for free

2. **Create a new repository**:
   - Click "New repository"
   - Name: `virtual-interior-designer`
   - Make it Public
   - Don't initialize with README (we already have one)
   - Click "Create repository"

3. **Push your code to GitHub**:
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Virtual Interior Designer"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/virtual-interior-designer.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render.com

1. **Create Render account**:
   - Go to https://render.com
   - Sign up with your GitHub account (FREE)

2. **Create new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `virtual-interior-designer`

3. **Configure the service**:
   - **Name**: virtual-interior-designer
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: Free

4. **Click "Create Web Service"**

5. **Wait for deployment** (2-3 minutes)

6. **Get your URL**:
   - You'll get a URL like: `https://virtual-interior-designer.onrender.com`
   - Share this with anyone!

### Important Notes for Render.com:
- ⚠️ Free tier sleeps after 15 minutes of inactivity
- First load after sleep takes ~30 seconds
- Perfect for college projects and demos
- Automatic HTTPS included

---

## Option 2: Deploy to PythonAnywhere (Always-On FREE)

### Step 1: Create Account
1. Go to https://www.pythonanywhere.com
2. Sign up for FREE Beginner account

### Step 2: Upload Code
1. Click "Files" tab
2. Upload your project files
3. Or use Git to clone your repository

### Step 3: Setup Web App
1. Go to "Web" tab
2. Click "Add a new web app"
3. Choose "Flask"
4. Python version: 3.10
5. Set path to your app.py

### Step 4: Configure
1. Edit WSGI configuration file
2. Point to your Flask app
3. Reload web app

### Your URL:
- `https://yourusername.pythonanywhere.com`

---

## Option 3: Deploy to Railway.app (FREE $5/month credit)

### Step 1: Create Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Deploy
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway auto-detects Flask app
5. Click "Deploy"

### Your URL:
- Railway provides a custom URL
- Can add custom domain for free

---

## Option 4: ngrok (Temporary Public URL)

For quick testing and demos:

1. **Download ngrok**:
   - Go to https://ngrok.com
   - Sign up (free)
   - Download for Windows

2. **Run your Flask app**:
```bash
python app.py
```

3. **In another terminal, run ngrok**:
```bash
ngrok http 5000
```

4. **Get your public URL**:
   - ngrok gives you a URL like: `https://abc123.ngrok.io`
   - Share this URL with anyone
   - Valid for 8 hours (free tier)

---

## 📱 Accessing on Your Phone

Once deployed, simply:
1. Open any browser on your phone
2. Go to your deployment URL
3. Works on any device, anywhere!

---

## 🎯 Recommended for College Project

**Best Choice: Render.com**
- ✅ Free forever
- ✅ Easy GitHub integration
- ✅ Professional URL
- ✅ HTTPS included
- ✅ Good for demos and presentations

**Alternative: PythonAnywhere**
- ✅ Always-on (doesn't sleep)
- ✅ Good for continuous access
- ✅ Easy to setup

---

## 🔧 Troubleshooting

### Database Issues
If you get database errors on deployment:
- The SQLite database will be created automatically
- Default user: `user` / `user123` (for testing)

### Port Issues
- Render/Railway handle ports automatically
- No need to change `0.0.0.0:5000` in app.py

### Static Files
- All static files (CSS, JS) are served correctly
- Three.js loads from CDN (no issues)

---

## 📞 Need Help?

If you face any issues:
1. Check deployment logs on your platform
2. Ensure all files are committed to GitHub
3. Verify requirements.txt has all dependencies
4. Check that app.py runs locally first

---

## 🎉 Success!

Once deployed, you can:
- Access from any device
- Share with friends and professors
- Demo your college project
- Add the URL to your resume/portfolio

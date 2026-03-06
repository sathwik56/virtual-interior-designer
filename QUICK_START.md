# 🚀 Quick Start - Deploy in 5 Minutes!

## Step 1: Push to GitHub (2 minutes)

Open terminal in your project folder and run:

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Virtual Interior Designer - College Project"

# Create repository on GitHub first, then:
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/virtual-interior-designer.git

# Push
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Render.com (3 minutes)

1. Go to https://render.com
2. Sign up with GitHub (FREE)
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
6. Click "Create Web Service"
7. Wait 2-3 minutes
8. Done! You'll get a URL like: `https://your-app.onrender.com`

## 🎉 That's it!

Your app is now live and accessible from any device, anywhere in the world!

Share the URL with:
- Your phone
- Friends
- Professors
- Anyone!

## 📱 Access on Phone

Just open the Render URL in your phone's browser. No app installation needed!

## ⚠️ Important Note

Free tier sleeps after 15 min of inactivity. First load takes ~30 seconds to wake up. Perfect for demos and college projects!

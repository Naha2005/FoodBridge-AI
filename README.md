<div align="center">

<!-- Hero Banner / Mascot -->
<img src="/C:/Users/User/.gemini/antigravity-ide/brain/5df454a4-4ff7-4f38-ab70-bd1ee4730491/naha_mascot_hero_1791215419202.jpg" alt="FoodBridge AI Developer Mascot" width="100%" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />

<br/><br/>

<!-- Logo and Title -->
<img src="/C:/Users/User/.gemini/antigravity-ide/brain/5df454a4-4ff7-4f38-ab70-bd1ee4730491/naha_nm_logo_1791215433946.jpg" width="120" style="border-radius: 25px; box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);" />

# ⚡ FoodBridge AI ⚡
### `[ SDG 2: Zero Hunger Platform ]`
#### Developed by **Naha Mondal**

<!-- Animated Typing Text -->
<a href="https://github.com/nahamondal">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&pause=1000&color=00FFFF&center=true&vCenter=true&width=500&lines=AI-powered+food+redistribution+%F0%9F%8D%94;Connecting+donors+with+NGOs+via+ML;Smart+Rescue+Agent+%7C+Spoilage+Prediction;Turning+ideas+into+full-stack+reality+%F0%9F%9A%80" alt="Typing SVG" />
</a>

<br/>

<a href="https://linkedin.com/in/nahamondal"><img src="https://img.shields.io/badge/Developer-Naha_Mondal-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" /></a>
<a href="mailto:naha@example.com"><img src="https://img.shields.io/badge/Email-Contact_Me-EA4335?style=for-the-badge&logo=gmail&logoColor=white" /></a>

<br/><br/>

---

## 🛠️ Tech Stack & Skills Used
<br/>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit_Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" />
</p>

</div>

---

## 🚀 Project Overview (Dashboard)
<br/>

| **🤖 Smart Rescue Agent** | **📈 ML Demand Forecast** |
| :---: | :---: |
| Analyses a donation, runs the spoilage ML model, ranks eligible NGOs by a composite score, and generates an AI explanation via Groq LLM before matching. | Random Forest Regressor model predicting 7-day food demand (portions) for NGOs based on historical data. |
| `LLM` `Flask` `Python` | `Scikit-Learn` `XGBoost` |

| **🗺️ Live Heatmap & Routing** | **♻️ Waste Analytics & Spoilage** |
| :---: | :---: |
| Interactive Leaflet map displaying active donation locations, community hotspots, and NGO recipients. | XGBoost model predicting exact spoilage risk levels for all active food donations. |
| `React-Leaflet` `MapTiler` | `Data Science` `Pandas` |

<br/>

---

## 📸 Screenshots

*Below are some glimpses into the application interface:*

<div align="center">
  <img src="/C:/Users/User/.gemini/antigravity-ide/brain/5df454a4-4ff7-4f38-ab70-bd1ee4730491/.user_uploaded/media_1791209376728.png" width="48%" style="border-radius: 10px;" />
  <img src="/C:/Users/User/.gemini/antigravity-ide/brain/5df454a4-4ff7-4f38-ab70-bd1ee4730491/.user_uploaded/media_1791210613703.png" width="48%" style="border-radius: 10px;" />
</div>
<br/>
<div align="center">
  <img src="/C:/Users/User/.gemini/antigravity-ide/brain/5df454a4-4ff7-4f38-ab70-bd1ee4730491/.user_uploaded/media_1791210681656.png" width="48%" style="border-radius: 10px;" />
  <img src="/C:/Users/User/.gemini/antigravity-ide/brain/5df454a4-4ff7-4f38-ab70-bd1ee4730491/.user_uploaded/media_1791211232806.png" width="48%" style="border-radius: 10px;" />
</div>

---

## 🏗️ Architecture

```
client/          React + Vite + TailwindCSS v4 frontend
backend/         Flask + PyMongo REST API
backend/ml/      Pre-trained scikit-learn models (.joblib)
data/            Raw and processed datasets
```

---

## 📥 How to Download & Run (Step-by-Step)

Follow these exact steps to download the code from GitHub and run it on your local machine.

### 1. Download the Code
You can either clone the repository using Git or download it as a ZIP file:
- **Using Git:** Open your terminal and run:
  ```bash
  git clone https://github.com/nahamondal/foodbridge-ai.git
  cd foodbridge-ai
  ```
- **Using ZIP:** Click the green **Code** button on GitHub, select **Download ZIP**, and extract the folder on your computer.

### 2. Configure Environment Variables
You need to set up your `.env` files for both the backend and frontend.

**Backend (`backend/.env`):**
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/foodbridge
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000
VITE_MAPTILER_API_KEY=your_maptiler_key_here
```

### 3. Install & Start Backend
Open a terminal, navigate to the `backend` folder, and run:
```bash
cd backend
python -m venv venv
# Activate virtual environment:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*(The backend will now be running at `http://localhost:5000`)*

### 4. Install & Start Frontend
Open a **new** terminal window, navigate to the `client` folder, and run:
```bash
cd client
npm install
npm run dev
```
*(The frontend will open in your browser at `http://localhost:5173`)*

---

## 🤖 ML Models Overview

Three pre-trained models are included in `backend/ml/`:
1. `spoilage_model.joblib`: Predicts spoilage risk (Low / Medium / High).
2. `demand_model.joblib`: Forecasts daily food demand for 7 days.
3. `matching_model.joblib`: Scores donor–NGO compatibility.

*(Run `python ml/train_model.py` to retrain).*

---

## 🔌 Technical Specifications & APIs

### User Roles
| Role | Home | Can Do |
|------|------|--------|
| `donor` | `/dashboard` | Post donations, run Smart Rescue, view own stats |
| `ngo` | `/ngo/dashboard` | Browse available food, accept/reject donations, manage needs |
| `volunteer` | `/volunteer/dashboard` | Mark pickup + delivery for accepted donations |
| `admin` | `/admin` | Manage all users, verify NGOs, cancel any donation |

### Core API Endpoints
- `POST /api/auth/register` - User Registration
- `POST /api/auth/login` - User Login
- `POST /api/food/` - Create a new donation
- `GET /api/food/` - List active donations
- `POST /api/food/<id>/accept` - NGO accepts donation
- `POST /api/ml/predict-spoilage` - Run Spoilage Model
- `GET /api/ml/forecast-week` - 7-Day Demand Forecast

### Database Collections (MongoDB)
- `users`: Accounts, encrypted passwords, roles
- `food_listings`: Donations, lifecycle statuses, locations
- `needs`: NGO demand requirements
- `agent_recommendations`: Logs for Smart Rescue AI decisions
- `audit_log`: System-wide transition events

---

<div align="center">
  <br/>
  <img src="https://komarev.com/ghpvc/?username=nahamondal&color=8A2BE2&style=flat-square&label=PROJECT+VIEWS" alt="Profile Views" />
</div>

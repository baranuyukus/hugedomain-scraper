@echo off
echo =======================================
echo     HugeDomains Tracker - Baslatiyor...
echo =======================================

echo.
echo [1/2] Backend (FastAPI) Baslatiliyor...
cd backend
start "HugeDomains - Backend" cmd /k ".\venv\Scripts\activate && uvicorn main:app --reload --port 8000"
cd ..

echo.
echo [2/2] Frontend (React) Baslatiliyor...
cd frontend
start "HugeDomains - Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Islem tamam! Tarayicinizda http://localhost:5173 adresine gidebilirsiniz.
echo Sunuculari kapatmak icin acilan siyah komut pencerelerini kapatiniz.
pause

@echo off
title ReferHub Rewards
py -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python app.py
pause

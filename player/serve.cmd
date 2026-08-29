@echo off
rem Serves the deck on http://localhost:8000 and opens it.
rem The parts under deck\ are loaded by fetch, which file:// forbids, so
rem opening index.html directly shows an empty stage instead of the deck.
cd /d "%~dp0"
start "" http://localhost:8000/index.html
python -m http.server 8000

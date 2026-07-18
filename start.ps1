# Kopiert .env und startet die App (Windows)
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Created .env from .env.example"
}
npm install
npm run dev

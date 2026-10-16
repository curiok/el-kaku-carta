@echo off
title EL KAKU - Servicio de Publicacion y Gestion
chcp 65001 > nul
cls

echo ====================================================================
echo             EL KAKU - SERVICIO DE PUBLICACION
echo             Carta Digital PWA - curiok/el-kaku-carta
echo ====================================================================
echo.

cd /d "%~dp0"

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no se detecta en el sistema.
    echo Por favor instale Node.js o verifique el PATH.
    pause
    exit /b 1
)

echo [1/2] Verificando configuracion en backend/.env...
echo [2/2] Iniciando backend de publicacion en http://127.0.0.1:3145...
echo.
echo ====================================================================
echo  El panel de administracion puede publicar directamente en gh-pages.
echo  Presione Ctrl + C para detener el servicio.
echo ====================================================================
echo.

node backend/server.js
pause


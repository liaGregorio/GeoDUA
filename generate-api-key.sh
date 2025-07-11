#!/bin/bash

# Script para gerar uma API Key segura
# Uso: ./generate-api-key.sh

echo "🔐 Gerador de API Key para GeoDUA"
echo "=================================="
echo

# Gerar uma chave aleatória de 32 caracteres
VITE_API_KEY="gd_sk_$(openssl rand -hex 16)"

echo "📋 Sua nova API Key:"
echo "VITE_API_KEY=$VITE_API_KEY"
echo

echo "📝 Instruções:"
echo "1. Copie a linha acima"
echo "2. Cole no seu arquivo .env"
echo "3. Compartilhe apenas com pessoas autorizadas"
echo "4. Nunca commite esta chave no repositório"
echo

echo "⚠️  IMPORTANTE: Guarde esta chave em local seguro!"
echo "   Esta chave não será exibida novamente."

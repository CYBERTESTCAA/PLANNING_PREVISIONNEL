#!/bin/bash
# Generate a self-signed certificate for HTTPS on the local network
# Usage: bash scripts/generate-cert.sh [IP_ADDRESS]

IP="${1:-192.168.13.51}"
CERT_DIR="/opt/planning/certs"

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 3650 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/selfsigned.key" \
  -out "$CERT_DIR/selfsigned.crt" \
  -subj "/C=FR/ST=France/L=Paris/O=CAA/CN=$IP" \
  -addext "subjectAltName=IP:$IP"

echo "✅ Certificat auto-signé généré dans $CERT_DIR/"
echo "   - $CERT_DIR/selfsigned.crt"
echo "   - $CERT_DIR/selfsigned.key"
echo "   Valide 10 ans pour IP: $IP"

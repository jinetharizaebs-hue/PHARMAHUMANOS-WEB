#!/bin/bash
# Script para comprimir y preparar documentación para entregar al cliente

echo "🎯 Preparando paquete de documentación para cliente..."
echo ""

# Ir a la carpeta del proyecto
cd /Users/edwinmarin/pedido-ebs-web

# Crear fecha de hoy
FECHA=$(date +"%d_%m_%Y")

# Nombre del archivo ZIP
ZIP_NAME="DOCUMENTACION_EBS_Cliente_${FECHA}.zip"

# Crear ZIP
echo "📦 Creando archivo ZIP: $ZIP_NAME"
zip -r "$ZIP_NAME" DOCUMENTACION_CLIENTE/ -q

# Verificar que se creó
if [ -f "$ZIP_NAME" ]; then
    SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')
    echo "✅ ZIP creado exitosamente"
    echo "📊 Tamaño: $SIZE"
    echo ""
    echo "📁 Ubicación: /Users/edwinmarin/pedido-ebs-web/$ZIP_NAME"
else
    echo "❌ Error al crear el ZIP"
    exit 1
fi

# Mostrar contenido
echo ""
echo "📋 Contenido del paquete:"
unzip -l "$ZIP_NAME" | grep -E "\.md$|\.pptx$" | awk '{print "   " $4}'

echo ""
echo "✅ ¡Paquete listo para enviar al cliente!"
echo ""
echo "💡 Próximo paso: Enviar por email a:"
echo "   Asunto: 'Propuesta Sistema de Gestión Comercial - e-business store(EBS)'"
echo "   Adjunto: $ZIP_NAME"

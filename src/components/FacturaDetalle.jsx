import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuth } from '../App';
import './FacturaDetalle.css';

const getLocalDateForInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateAsLocal = (value) => {
  if (!value || typeof value !== 'string') return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
};

const getNotaClienteFactura = (facturaData) => {
  if (!facturaData?.productos || !Array.isArray(facturaData.productos)) return '';

  const nota = facturaData.productos.find(
    (producto) => typeof producto?.nota_cliente === 'string' && producto.nota_cliente.trim()
  )?.nota_cliente;

  return nota ? nota.trim() : '';
};

const FacturaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [factura, setFactura] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [abonos, setAbonos] = useState([]);
  const [nuevoAbono, setNuevoAbono] = useState({
    monto: '',
    fecha: getLocalDateForInput(),
    metodo: 'Efectivo',
    nota: ''
  });
  const [editandoAbono, setEditandoAbono] = useState(null);
  const [mostrarFormAbono, setMostrarFormAbono] = useState(false);

  // Función para convertir números a letras
  const convertirNumeroALetras = (numero) => {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (numero === 0) return 'CERO PESOS';
    if (numero > 999999999) return 'NÚMERO DEMASIADO GRANDE';

    let letras = '';

    // Convertir millones
    if (numero >= 1000000) {
      const millones = Math.floor(numero / 1000000);
      if (millones === 1) {
        letras += 'UN MILLÓN ';
      } else {
        letras += convertirGrupo(millones) + ' MILLONES ';
      }
      numero %= 1000000;
    }

    // Convertir miles
    if (numero >= 1000) {
      const miles = Math.floor(numero / 1000);
      if (miles === 1) {
        letras += 'MIL ';
      } else {
        letras += convertirGrupo(miles) + ' MIL ';
      }
      numero %= 1000;
    }

    // Convertir centenas, decenas y unidades
    if (numero > 0) {
      letras += convertirGrupo(numero);
    }

    return letras.trim() + ' PESOS';

    function convertirGrupo(n) {
      let grupo = '';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;

      // Centenas
      if (c > 0) {
        if (n === 100) {
          grupo += 'CIEN';
        } else {
          grupo += centenas[c] + ' ';
        }
      }

      // Decenas y unidades
      if (d > 0) {
        if (d === 1) {
          if (u === 0) {
            grupo += 'DIEZ';
          } else {
            grupo += especiales[u];
          }
          return grupo;
        } else if (d === 2 && u > 0) {
          grupo += 'VEINTI' + unidades[u].toLowerCase();
        } else {
          grupo += decenas[d];
          if (u > 0) {
            grupo += ' Y ' + unidades[u];
          }
        }
      } else if (u > 0) {
        grupo += unidades[u];
      }

      return grupo.trim();
    }
  };

  // Cargar factura y abonos desde Supabase
  useEffect(() => {
    const cargarFacturaYAbonos = async () => {
      try {
        setCargando(true);
        
        // Cargar factura
        const { data: facturaData, error: facturaError } = await supabase
          .from('facturas')
          .select('*')
          .eq('id', id)
          .single();
        
        if (facturaError) throw facturaError;
        setFactura(facturaData);
        
        // Cargar abonos
        const { data: abonosData, error: abonosError } = await supabase
          .from('abonos')
          .select('*')
          .eq('factura_id', id)
          .order('fecha', { ascending: false });
        
        if (abonosError) throw abonosError;
        setAbonos((abonosData || []).map(abono => ({
          ...abono,
          nota: abono.nota || abono.observaciones || '',
          metodo: abono.metodo || abono.metodo_pago || 'Efectivo'
        })));
        
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarFacturaYAbonos();
  }, [id]);

  const copiarDatos = () => {
    const utilidadTotal = (factura.productos || []).reduce((sum, p) => {
      const utilidadLinea = p.utilidad_total ?? (((p.precio || 0) - (p.costo_compra || 0)) * (p.cantidad || 0));
      return sum + (utilidadLinea || 0);
    }, 0);

    const datos = `
      Cuenta de Cobro #${factura.id}
      Cliente: ${factura.cliente}
      Fecha: ${new Date(factura.fecha).toLocaleDateString()}
      Total: $${factura.total.toFixed(2)}
      Utilidad Total: $${utilidadTotal.toFixed(2)}
      Total en letras: ${convertirNumeroALetras(Math.round(factura.total))}
      ${getNotaClienteFactura(factura) ? `Notas del cliente: ${getNotaClienteFactura(factura)}` : ''}
      Saldo Pendiente: $${(factura.total - calcularTotalAbonado()).toFixed(2)}
      Productos: ${factura.productos.map(p => `\n  - ${p.nombre} (${p.cantidad} x $${p.precio.toFixed(2)}) | Utilidad: $${(p.utilidad_total ?? ((p.precio - (p.costo_compra || 0)) * p.cantidad)).toFixed(2)}`).join('')}
      Abonos: ${abonos.length > 0 ? abonos.map(a => `\n  - $${a.monto.toFixed(2)} (${formatearFecha(a.fecha)})`).join('') : ' Ninguno'}
    `;
    navigator.clipboard.writeText(datos);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const imprimirFactura = () => {
    // Abrir ventana de impresión con el diseño específico para papel oficio horizontal
    const ventanaImpresion = window.open('', '_blank', 'width=1000,height=800');
    const logoFacturaUrl = `${window.location.origin}/logo-maranatha.png`;
    const notaClienteFactura = getNotaClienteFactura(factura);
    
    const contenidoImpresion = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cuenta de Cobro #${factura.id.toString().padStart(6, '0')}</title>
          <style>
            @page {
              size: letter landscape; /* Tamaño oficio en horizontal */
              margin: 0.5cm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 10px;
              line-height: 1.2;
            }
            .pagina-oficio {
              width: 27.94cm; /* Ancho oficio en horizontal */
              height: 21.59cm; /* Alto oficio en horizontal */
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.5cm;
              page-break-after: always;
            }
            .seccion-cuenta {
              border: 1px solid #000;
              padding: 0.3cm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              height: 100%;
            }
            .seccion-transparente {
              border: none;
              background: transparent;
              visibility: hidden;
            }
            .titulo-seccion {
              text-align: center;
              font-weight: bold;
              margin-bottom: 0.2cm;
              border-bottom: 1px solid #000;
              padding-bottom: 0.08cm;
              font-size: 10px;
            }
            .encabezado {
              display: flex;
              justify-content: space-between;
              margin-bottom: 0.15cm;
              align-items: flex-start;
            }
            .numero-cuenta {
              font-weight: bold;
              font-size: 15px !important;
              margin-bottom: 0.2cm;
              text-align: center;
              margin-top: -0.05cm;
            }
            .fecha {
              font-size: 9px;
              font-weight: 700;
            }
            .fecha-wrapper {
              text-align: right;
              display: flex;
              flex-direction: column;
              gap: 0.05cm;
              align-items: flex-end;
            }
            .plazo {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              line-height: 1.2;
              display: flex;
              align-items: center;
            }
            .plazo-contado {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              line-height: 1.1;
              display: flex;
              align-items: center;
            }
            .info-cliente-vendedor {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 0.15cm;
              margin-bottom: 0.35cm;
            }
            .info-item h4 {
              margin: 0 0 0.02cm 0;
              font-size: 13px !important;
              font-weight: normal;
            }
            .info-item p {
              margin: 0;
              border-bottom: 1px solid #ddd;
              padding-bottom: 0.02cm;
              min-height: 0.3cm;
              font-size: 7px;
            }
            .cliente-nombre,
            .vendedor-nombre,
            .direccion-dato,
            .telefono-dato {
              font-size: 12px !important;
              font-weight: normal;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .numero-cuenta {
              font-size: 15px !important;
              font-weight: 900;
            }
            .tabla-productos {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0.2cm;
              table-layout: fixed;
              flex-grow: 1;
              min-height: auto;
            }
            .tabla-productos th, .tabla-productos td {
              border: 1px solid #000;
              padding: 0.12cm 0.1cm;
              text-align: left;
              font-size: 9px;
              word-wrap: break-word;
              height: auto;
              vertical-align: middle;
              line-height: 1.2;
            }
            .tabla-productos th {
              background-color: #f0f0f0;
              font-weight: bold;
              height: auto;
              padding: 0.12cm 0.1cm;
              font-size: 8px;
            }
            .tabla-productos tbody tr {
              height: auto;
            }
            .tabla-productos .col-producto {
              width: 50%;
            }
            .tabla-productos .col-cantidad {
              width: 15%;
              text-align: center;
            }
            .tabla-productos .col-precio {
              width: 18%;
              text-align: right;
            }
            .tabla-productos .col-subtotal {
              width: 17%;
              text-align: right;
            }
            .total-letras {
              margin: 0.12cm 0;
              padding: 0.1cm;
              border: 1px solid #000;
              background-color: #f9f9f9;
              font-size: 8px;
              text-align: center;
              font-weight: bold;
              line-height: 1;
            }
            .nota-cliente-impresion {
              margin-top: 0.08cm;
              border: 1px dashed #000;
              padding: 0.08cm;
              font-size: 7px;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .resumen-total {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr;
              gap: 0.1cm;
              margin-top: 0.12cm;
              margin-bottom: 0.12cm;
              font-weight: bold;
              text-align: center;
              font-size: 7px;
            }
            .resumen-item {
              border: 1px solid #000;
              padding: 0.06cm 0.05cm;
              background-color: #f0f0f0;
              line-height: 1;
            }
            .resumen-item.resumen-saldo {
              background-color: #ffecec;
              border: 1px solid #000;
            }
            .saldo-valor {
              font-size: 10px;
              font-weight: 900;
            }
            .estado {
              text-align: center;
              margin-top: 0.1cm;
              font-weight: bold;
              font-size: 8px;
              padding: 0.07cm;
              border: 1px solid #000;
              background-color: ${estaPagada() ? '#d4edda' : '#fff3cd'};
              color: ${estaPagada() ? '#155724' : '#856404'};
              line-height: 1;
            }
            .estado-firma {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 0.2cm;
              margin-top: 0.1cm;
            }
            .firma {
              flex: 1;
              display: flex;
              justify-content: flex-start;
            }
            .firma-linea {
              width: 100%;
              max-width: 12cm;
              border-top: 1px solid #000;
              text-align: center;
              padding-top: 0.7cm;
              font-size: 7px;
            }
            .check-box {
              width: 0.35cm;
              height: 0.35cm;
              border: 1px solid #000;
              display: inline-block;
              margin-left: 0.12cm;
              box-sizing: border-box;
            }
            .footer {
              text-align: center;
              margin-top: 0.1cm;
              font-size: 6px;
              border-top: 1px solid #000;
              padding-top: 0.05cm;
              line-height: 1.1;
            }
            .footer-payment {
              margin-top: 0.05cm;
              font-size: 7px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .llave-nequi {
              font-size: 9px;
              font-weight: 900;
            }
            .logo {
              font-weight: bold;
              margin-top: 0.02cm;
              font-size: 7px;
            }
            .empresa-info {
              text-align: left;
            }
            .empresa-logo-wrap {
              margin-bottom: 0.08cm;
              display: flex;
              align-items: center;
            }
            .empresa-logo {
              width: 2.9cm;
              max-height: 1.7cm;
              object-fit: contain;
              display: block;
            }
            .empresa-nombre {
              font-size: 14px !important;
              font-weight: 800;
              line-height: 1.05;
            }
            .empresa-detalle {
              font-size: 9px !important;
              font-weight: 700;
              line-height: 1.15;
              margin-top: 0.02cm;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .pagina-oficio {
                height: 100%;
                width: 100%;
              }
              .seccion-cuenta {
                border: 1px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <div class="pagina-oficio">
              <!-- COPIA - PARA EL CLIENTE -->
            <div class="seccion-cuenta">
              <div class="titulo-seccion">COPIA - PARA EL CLIENTE</div>
              <div class="encabezado">
                <div class="empresa-info">
                  <div class="empresa-logo-wrap">
                    <img class="empresa-logo" src="${logoFacturaUrl}" alt="Logo Maranatha" onerror="this.style.display='none'" />
                  </div>
                  <div class="empresa-nombre"><strong>PHARMAHUMANOS</strong></div>
                  <div class="empresa-detalle">NIT. 80741957-3</div>
                  <div class="empresa-detalle">Bogotá Cel. 301 601 7182</div>
                  <div class="empresa-detalle">Soacha Cel. 319 209 1629</div>
                </div>
                <div class="fecha-wrapper">
                  <div class="fecha">${formatearFecha(factura.fecha)}</div>
                  <div class="plazo">Credito<span class="check-box"></span></div>
                  <div class="plazo-contado">De contado<span class="check-box"></span></div>
                </div>
              </div>
              
              <div class="numero-cuenta"> #${factura.id.toString().padStart(6, '0')}</div>
              
              <div class="info-cliente-vendedor">
                <div class="info-item">
                  <h4>CLIENTE:</h4>
                  <p class="cliente-nombre">${factura.cliente}</p>
                  <h4>DIRECCIÓN:</h4>
                  <p class="direccion-dato">${factura.direccion || 'NO ESPECIFICADO'}</p>
                </div>
                <div class="info-item">
                  <h4>VENDEDOR:</h4>
                  <p class="vendedor-nombre">${factura.vendedor}</p>
                  <h4>TELÉFONO:</h4>
                  <p class="telefono-dato">${factura.telefono || 'NO ESPECIFICADO'}</p>
                </div>
              </div>
              
              <table class="tabla-productos">
                <thead>
                  <tr>
                    <th class="col-producto">PRODUCTO</th>
                    <th class="col-cantidad">CANT</th>
                    <th class="col-precio">PRECIO UNIT.</th>
                    <th class="col-subtotal">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${factura.productos.map(producto => `
                    <tr>
                      <td class="col-producto">${producto.nombre}</td>
                      <td class="col-cantidad">${producto.cantidad}</td>
                      <td class="col-precio">${formatearMonedaImpresion(producto.precio)}</td>
                      <td class="col-subtotal">${formatearMonedaImpresion(producto.cantidad * producto.precio)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>              <div class="total-letras">
                <strong>SON: ${convertirNumeroALetras(Math.round(factura.total))}</strong>
              </div>
              ${notaClienteFactura ? `<div class="nota-cliente-impresion"><strong>NOTAS DEL CLIENTE:</strong> ${notaClienteFactura}</div>` : ''}
              
              <div class="resumen-total">
                <div class="resumen-item">
                  <div>PRODUCTOS</div>
                  <div>${factura.productos.length}</div>
                </div>
                <div class="resumen-item">
                  <div>TOTAL</div>
                  <div>${formatearMonedaImpresion(factura.total)}</div>
                </div>
                <div class="resumen-item">
                  <div>ABONADO</div>
                  <div>${formatearMonedaImpresion(calcularTotalAbonado())}</div>
                </div>
                <div class="resumen-item resumen-saldo">
                  <div>SALDO</div>
                  <div class="saldo-valor">${formatearMonedaImpresion(calcularSaldoPendiente())}</div>
                </div>
              </div>
              
              <div class="estado-firma">
                <div class="firma">
                  <div class="firma-linea">Firma del cliente</div>
                </div>
                <div class="estado">ESTADO: ${estaPagada() ? 'PAGADA' : 'PENDIENTE'}</div>
              </div>
              
              <div class="footer">
                <div>Gracias por su preferencia.</div>
                <div class="footer-payment">NEQUI Y DAVIPLATA: <span class="llave-nequi">3016017182</span></div>
                <div class="footer-payment">BREVE: <span class="llave-nequi">80741957</span></div>
                <div class="footer-payment">BANCOLOMBIA AHORROS: <span class="llave-nequi">09414650365</span></div>
                <div class="logo">PHARMAHUMANOS</div>
              </div>
            </div>
            
              <!-- MITAD DERECHA OCULTA PARA CONSERVAR FORMATO -->
            <div class="seccion-cuenta seccion-transparente" aria-hidden="true">
              <div class="titulo-seccion">COPIA - PARA EL CLIENTE</div>
              <div class="encabezado">
                <div class="empresa-info">
                  <div class="empresa-logo-wrap">
                    <img class="empresa-logo" src="${logoFacturaUrl}" alt="Logo PHARMAHUMANOS" onerror="this.style.display='none'" />
                  </div>
                  <div class="empresa-nombre"><strong>PHARMAHUMANOS</strong></div>
                  <div class="empresa-detalle">NIT. -</div>
                  <div class="empresa-detalle">Bogotá Cel. 301 1232 601 </div>
                  <div class="empresa-detalle">Soacha Cel. 319 209 1234</div>
                </div>
                <div class="fecha-wrapper">
                  <div class="fecha">${formatearFecha(factura.fecha)}</div>
                  <div class="plazo">Credito<span class="check-box"></span></div>
                  <div class="plazo-contado">De contado<span class="check-box"></span></div>
                </div>
              </div>
              
              <div class="numero-cuenta">#${factura.id.toString().padStart(6, '0')}</div>
              
              <div class="info-cliente-vendedor">
                <div class="info-item">
                  <h4>CLIENTE:</h4>
                  <p class="cliente-nombre">${factura.cliente}</p>
                  <h4>DIRECCIÓN:</h4>
                  <p class="direccion-dato">${factura.direccion || 'NO ESPECIFICADO'}</p>
                </div>
                <div class="info-item">
                  <h4>VENDEDOR:</h4>
                  <p class="vendedor-nombre">${factura.vendedor}</p>
                  <h4>TELÉFONO:</h4>
                  <p class="telefono-dato">${factura.telefono || 'NO ESPECIFICADO'}</p>
                </div>
              </div>
              
              <table class="tabla-productos">
                <thead>
                  <tr>
                    <th class="col-producto">PRODUCTO</th>
                    <th class="col-cantidad">CANT</th>
                    <th class="col-precio">PRECIO UNIT.</th>
                    <th class="col-subtotal">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${factura.productos.map(producto => `
                    <tr>
                      <td class="col-producto">${producto.nombre}</td>
                      <td class="col-cantidad">${producto.cantidad}</td>
                      <td class="col-precio">${formatearMonedaImpresion(producto.precio)}</td>
                      <td class="col-subtotal">${formatearMonedaImpresion(producto.cantidad * producto.precio)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>              <div class="total-letras">
                <strong>SON: ${convertirNumeroALetras(Math.round(factura.total))}</strong>
              </div>
              ${notaClienteFactura ? `<div class="nota-cliente-impresion"><strong>NOTAS DEL CLIENTE:</strong> ${notaClienteFactura}</div>` : ''}
              
              <div class="resumen-total">
                <div class="resumen-item">
                  <div>PRODUCTOS</div>
                  <div>${factura.productos.length}</div>
                </div>
                <div class="resumen-item">
                  <div>TOTAL</div>
                  <div>${formatearMonedaImpresion(factura.total)}</div>
                </div>
                <div class="resumen-item">
                  <div>ABONADO</div>
                  <div>${formatearMonedaImpresion(calcularTotalAbonado())}</div>
                </div>
                <div class="resumen-item resumen-saldo">
                  <div>SALDO</div>
                  <div class="saldo-valor">${formatearMonedaImpresion(calcularSaldoPendiente())}</div>
                </div>
              </div>
              
              <div class="estado-firma">
                <div class="firma">
                  <div class="firma-linea">Firma del cliente</div>
                </div>
                <div class="estado">ESTADO: ${estaPagada() ? 'PAGADA' : 'PENDIENTE'}</div>
              </div>
              
              <div class="footer">
                <div>Gracias por su preferencia.</div>
                <div class="footer-payment">NEQUI Y DAVIPLATA: <span class="llave-nequi">xxxxxxx</span></div>
                <div class="footer-payment">BREVE: <span class="llave-nequi">xxxxxxxxx</span></div>
                <div class="footer-payment">BANCOLOMBIA AHORROS: <span class="llave-nequi">xxxxxxxxx</span></div>
                <div class="logo">PHARMAHUMANOS</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    ventanaImpresion.document.write(contenidoImpresion);
    ventanaImpresion.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    ventanaImpresion.onload = function() {
      setTimeout(() => {
        ventanaImpresion.print();
        // Opcional: cerrar la ventana después de imprimir
        // ventanaImpresion.close();
      }, 500);
    };
  };

  const calcularTotalAbonado = () => {
    return abonos.reduce((total, abono) => total + abono.monto, 0);
  };

  const calcularSaldoPendiente = () => {
    return factura ? factura.total - calcularTotalAbonado() : 0;
  };

  const estaPagada = () => {
    return Math.abs(calcularSaldoPendiente()) < 0.01;
  };

  const handleInputAbonoChange = (e) => {
    const { name, value } = e.target;
    setNuevoAbono(prev => ({
      ...prev,
      [name]: name === 'monto' ? parseFloat(value) || 0 : value
    }));
  };

  const validarAbono = () => {
    if (nuevoAbono.monto <= 0) {
      alert('El monto debe ser positivo');
      return false;
    }
    
    if (nuevoAbono.monto > calcularSaldoPendiente()) {
      alert('El monto no puede ser mayor al saldo pendiente');
      return false;
    }
    
    return true;
  };

  const agregarAbono = async () => {
    if (!validarAbono()) return;

    try {
      setCargando(true);
      
      const observaciones = [nuevoAbono.metodo, nuevoAbono.nota]
        .filter(text => text && text.toString().trim() !== '')
        .join(' | ');

      const abonoData = {
        factura_id: Number(id),
        monto: nuevoAbono.monto,
        fecha: nuevoAbono.fecha || getLocalDateForInput(),
        observaciones: observaciones || null
      };

      const { data, error } = await supabase
        .from('abonos')
        .insert([abonoData])
        .select();
      
      if (error) throw error;

      const abonoCreado = {
        ...data[0],
        nota: nuevoAbono.nota || data[0].observaciones || '',
        metodo: nuevoAbono.metodo
      };

      // Actualizar estado local primero
      const nuevosAbonos = [abonoCreado, ...abonos];
      setAbonos(nuevosAbonos);
      
      // 🔔 Enviar notificación por WhatsApp con el cálculo correcto
      const totalAbonado = nuevosAbonos.reduce((sum, a) => sum + (a.monto || 0), 0);
      const saldoPendiente = factura.total - totalAbonado;
      
      const numerosWhatsApp = ['573002945085', '573004583117'];

      let mensaje = `NUEVO ABONO REGISTRADO\n\n`;
      mensaje += `Factura: #${factura.id}\n`;
      mensaje += `Cliente: ${factura.cliente}\n`;
      mensaje += `Total Factura: ${formatearMoneda(factura.total)}\n\n`;
      mensaje += `Abono Agregado: ${formatearMoneda(abonoCreado.monto)}\n`;
      mensaje += `Fecha Abono: ${formatearFecha(abonoCreado.fecha)}\n`;
      mensaje += `Método: ${abonoCreado.metodo}\n`;
      if (abonoCreado.nota) {
        mensaje += `Nota: ${abonoCreado.nota}\n`;
      }
      mensaje += `\nTotal Abonado: ${formatearMoneda(totalAbonado)}\n`;
      mensaje += `Saldo Pendiente: ${formatearMoneda(saldoPendiente)}\n\n`;

      if (saldoPendiente <= 0) {
        mensaje += `¡FACTURA PAGADA COMPLETAMENTE!\n\n`;
      }

      mensaje += `Notificación automática del sistema`;

      const mensajeCodificado = encodeURIComponent(mensaje);

      // Enviar a los números de WhatsApp
      numerosWhatsApp.forEach((numero, index) => {
        const url = `https://wa.me/${numero}?text=${mensajeCodificado}`;
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 500);
      });
      
      // Resetear formulario
      setNuevoAbono({
        monto: '',
        fecha: getLocalDateForInput(),
        metodo: 'Efectivo',
        nota: ''
      });
      setMostrarFormAbono(false);
      
    } catch (error) {
      console.error("Error agregando abono:", error);
      alert('Error al agregar el abono');
    } finally {
      setCargando(false);
    }
  };

  const editarAbono = async () => {
    if (!validarAbono()) return;

    // Solicitar contraseña para editar
    const password = prompt('Ingrese la contraseña para editar el abono:');
    if (password !== 'edwin' && password !== 'Maranatha0425') {
      alert('❌ Contraseña incorrecta. No se puede editar el abono.');
      return;
    }

    try {
      setCargando(true);
      
      const observaciones = [nuevoAbono.metodo, nuevoAbono.nota]
        .filter(text => text && text.toString().trim() !== '')
        .join(' | ');

      const abonoData = {
        monto: nuevoAbono.monto,
        fecha: nuevoAbono.fecha,
        observaciones: observaciones || null
      };

      const { data, error } = await supabase
        .from('abonos')
        .update(abonoData)
        .eq('id', editandoAbono.id)
        .select();
      
      if (error) throw error;

      const abonoActualizado = {
        ...data[0],
        nota: nuevoAbono.nota || data[0].observaciones || '',
        metodo: nuevoAbono.metodo
      };

      // Actualizar estado local
      setAbonos(abonos.map(abono => 
        abono.id === editandoAbono.id ? abonoActualizado : abono
      ));
      
      // Resetear formulario
      setEditandoAbono(null);
      setNuevoAbono({
        monto: '',
        fecha: getLocalDateForInput(),
        metodo: 'Efectivo',
        nota: ''
      });
      setMostrarFormAbono(false);
      
    } catch (error) {
      console.error("Error editando abono:", error);
      alert('Error al editar el abono');
    } finally {
      setCargando(false);
    }
  };

  const eliminarAbono = async (idAbono) => {
    if (!window.confirm('¿Estás seguro de eliminar este abono?')) return;

    // Solicitar contraseña para eliminar
    const password = prompt('Ingrese la contraseña para eliminar el abono:');
    if (password !== 'edwin' && password !== 'Maranatha0425') {
      alert('❌ Contraseña incorrecta. No se puede eliminar el abono.');
      return;
    }

    try {
      setCargando(true);
      
      const { error } = await supabase
        .from('abonos')
        .delete()
        .eq('id', idAbono);
      
      if (error) throw error;

      // Actualizar estado local
      setAbonos(abonos.filter(abono => abono.id !== idAbono));
      
    } catch (error) {
      console.error("Error eliminando abono:", error);
      alert('Error al eliminar el abono');
    } finally {
      setCargando(false);
    }
  };

  const iniciarEdicionAbono = (abono) => {
    setEditandoAbono(abono);
    setNuevoAbono({
      monto: abono.monto,
      fecha: abono.fecha,
      metodo: abono.metodo || 'Efectivo',
      nota: abono.nota || ''
    });
    setMostrarFormAbono(true);
  };

  const cancelarEdicion = () => {
    setEditandoAbono(null);
    setNuevoAbono({
      monto: '',
      fecha: getLocalDateForInput(),
      metodo: 'Efectivo',
      nota: ''
    });
    setMostrarFormAbono(false);
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  const formatearMonedaImpresion = (monto) => {
    return `$ ${new Intl.NumberFormat('es-CO', { 
      minimumFractionDigits: 0
    }).format(monto)}`;
  };

  const formatearFecha = (fecha) => {
    const localDate = parseDateAsLocal(fecha) || new Date(fecha);
    return localDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro'];

  if (cargando) {
    return (
      <div className="cargando-detalle">
        <div className="spinner"></div>
        <p>Cargando cuenta de cobro...</p>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="factura-no-encontrada">
        <h2>Cuenta de cobro no encontrada</h2>
        <button 
          className="button primary-button"
          onClick={() => navigate('/facturas')}
        >
          Volver al listado
        </button>
      </div>
    );
  }

  const totalAbonado = calcularTotalAbonado();
  const saldoPendiente = calcularSaldoPendiente();

  return (
    <div className="factura-detalle-container">
      <div className="factura-actions-bar">
        <button 
          className="button secondary-button"
          onClick={() => navigate('/facturas')}
        >
          &larr; Volver
        </button>
        
        <div className="action-buttons">
          <button 
            className="button icon-button"
            onClick={copiarDatos}
            title="Copiar datos"
          >
            {copiado ? '✓ Copiado' : '⎘ Copiar'}
          </button>
          <button 
            className="button icon-button"
            onClick={imprimirFactura}
            title="Imprimir"
          >
            ⎙ Imprimir
          </button>
        </div>
      </div>

      <div className="factura-header">
        <div className="header-info">
          <h1>Cuenta de Cobro #{factura.id.toString().padStart(6, '0')}</h1>
          <p className="fecha-emision">
            Emitida el {new Date(factura.fecha).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div className="header-total">
          <span>Total Cuenta de Cobro</span>
          <h2>{formatearMoneda(factura.total)}</h2>
        </div>
      </div>

      {/* Mostrar total en letras en la vista normal también */}
      <div className="total-letras-container">
        <div className="total-letras">
          <strong>SON: {convertirNumeroALetras(Math.round(factura.total))}</strong>
        </div>
        {getNotaClienteFactura(factura) && (
          <div className="nota-cliente-factura">
            <strong>NOTAS DEL CLIENTE:</strong> {getNotaClienteFactura(factura)}
          </div>
        )}
      </div>

      <div className="factura-info-grid">
        <div className="info-card cliente-info">
          <h3>Cliente</h3>
          <p>{factura.cliente}</p>
          {factura.telefono && <p>Tel: {factura.telefono}</p>}
          {factura.correo && <p>Email: {factura.correo}</p>}
        </div>
        
        <div className="info-card vendedor-info">
          <h3>Vendedor</h3>
          <p>{factura.vendedor}</p>
          {factura.direccion && (
            <div className="direccion-info">
              <h4>Dirección</h4>
              <p>{factura.direccion}</p>
            </div>
          )}
        </div>
      </div>

      <div className="productos-table-container">
        <h3>Productos</h3>
        <table className="productos-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Costo Unitario</th>
              <th>Precio Unitario</th>
              <th>Utilidad</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {factura.productos.map((producto, index) => (
              <tr key={index}>
                <td>{producto.nombre}</td>
                <td>{producto.cantidad}</td>
                <td>{formatearMoneda(producto.costo_compra || 0)}</td>
                <td>{formatearMoneda(producto.precio)}</td>
                <td>{formatearMoneda(producto.utilidad_total ?? ((producto.precio - (producto.costo_compra || 0)) * producto.cantidad))}</td>
                <td>{formatearMoneda(producto.cantidad * producto.precio)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" className="total-label">Total</td>
              <td className="total-value">{formatearMoneda(factura.total)}</td>
            </tr>
            <tr>
              <td colSpan="5" className="total-label">Utilidad Total</td>
              <td className="total-value">
                {formatearMoneda((factura.productos || []).reduce((sum, producto) => {
                  const utilidadLinea = producto.utilidad_total ?? ((producto.precio - (producto.costo_compra || 0)) * producto.cantidad);
                  return sum + (utilidadLinea || 0);
                }, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sección de Abonos */}
      <div className="abonos-section">
        <div className="abonos-header">
          <h3>Abonos</h3>
          <div className="abonos-summary">
            <div className="summary-item">
              <span>Total Abonado:</span>
              <strong>{formatearMoneda(totalAbonado)}</strong>
            </div>
            <div className="summary-item">
              <span>Saldo Pendiente:</span>
              <strong className={saldoPendiente <= 0 ? 'pagado' : 'pendiente'}>
                {formatearMoneda(saldoPendiente)}
                {estaPagada() && <span className="badge-pagado">PAGADO</span>}
              </strong>
            </div>
          </div>
          {!mostrarFormAbono && user?.role === 'admin' && (
            <button 
              className="button primary-button"
              onClick={() => setMostrarFormAbono(true)}
              disabled={estaPagada()}
            >
              + Agregar Abono
            </button>
          )}
        </div>

        {mostrarFormAbono && user?.role === 'admin' && (
          <div className="abono-form">
            <h4>{editandoAbono ? 'Editar Abono' : 'Nuevo Abono'}</h4>
            <div className="form-group">
              <label>Monto:</label>
              <input
                type="number"
                name="monto"
                value={nuevoAbono.monto}
                onChange={handleInputAbonoChange}
                min="0.01"
                step="0.01"
                max={saldoPendiente}
              />
            </div>
            <div className="form-group">
              <label>Fecha:</label>
              <input
                type="date"
                name="fecha"
                value={nuevoAbono.fecha}
                onChange={handleInputAbonoChange}
              />
            </div>
            <div className="form-group">
              <label>Método de pago:</label>
              <select
                name="metodo"
                value={nuevoAbono.metodo}
                onChange={handleInputAbonoChange}
              >
                {metodosPago.map(metodo => (
                  <option key={metodo} value={metodo}>{metodo}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nota (opcional):</label>
              <textarea
                name="nota"
                value={nuevoAbono.nota}
                onChange={handleInputAbonoChange}
                rows="2"
              />
            </div>
            <div className="form-actions">
              <button 
                className="button secondary-button"
                onClick={cancelarEdicion}
                disabled={cargando}
              >
                Cancelar
              </button>
              <button 
                className="button primary-button"
                onClick={editandoAbono ? editarAbono : agregarAbono}
                disabled={cargando}
              >
                {cargando ? 'Procesando...' : (editandoAbono ? 'Guardar Cambios' : 'Agregar Abono')}
              </button>
            </div>
          </div>
        )}

        {abonos.length > 0 ? (
          <div className="abonos-table-container">
            <table className="abonos-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Nota</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {abonos.map((abono) => (
                  <tr key={abono.id}>
                    <td>{formatearFecha(abono.fecha)}</td>
                    <td>{formatearMoneda(abono.monto)}</td>
                    <td>{abono.metodo || 'Efectivo'}</td>
                    <td>{abono.nota || '-'}</td>
                    <td className="acciones-cell">
                      {user?.role === 'admin' && (
                        <>
                          <button 
                            className="button icon-button small"
                            onClick={() => iniciarEdicionAbono(abono)}
                            title="Editar"
                            disabled={cargando}
                          >
                            ✏️
                          </button>
                          <button 
                            className="button icon-button small danger"
                            onClick={() => eliminarAbono(abono.id)}
                            title="Eliminar"
                            disabled={cargando}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sin-abonos">
            <p>No se han registrado abonos para esta cuenta de cobro.</p>
          </div>
        )}
      </div>

      <div className="factura-footer">
        <p className="footer-nota">
          Gracias por su preferencia. Para cualquier aclaración, presentar esta cuenta de cobro.
        </p>
        <div className="footer-logo">
          <span>e-business store(EBS)</span>
          <small>E-business Store Marin</small>
        </div>
      </div>
    </div>
  );
};

export default FacturaDetalle;
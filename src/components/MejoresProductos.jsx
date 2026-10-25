import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { obtenerTodasLasFilas } from '../lib/consultas';
import { fechaDia, fechaLocal, diaSiguiente } from '../lib/fechas';

// Todas las facturas del rango (incluye completo el último día)
const obtenerFacturasRango = (desde, hasta) => obtenerTodasLasFilas(() => supabase
  .from('facturas')
  .select('id, productos')
  .gte('fecha', desde)
  .lt('fecha', diaSiguiente(hasta)));
import * as XLSX from 'xlsx';
import { Bar, Pie } from 'react-chartjs-2';
import './MejoresProductos.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function MejoresProductos() {
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [periodo, setPeriodo] = useState('mes');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState('lista'); // 'lista', 'barras', 'torta'
  const [comparativa, setComparativa] = useState(false);
  const [periodoAnterior, setPeriodoAnterior] = useState([]);

  // Establecer fechas por defecto
  useEffect(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    setFechaInicio(fechaDia(primerDiaMes));
    setFechaFin(fechaDia(ultimoDiaMes));
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      obtenerProductosMasVendidos();
    }
  }, [periodo, fechaInicio, fechaFin, comparativa]);

  const obtenerProductosMasVendidos = async () => {
    try {
      setCargando(true);
      
      // Obtener facturas del período seleccionado
      const facturas = await obtenerFacturasRango(fechaInicio, fechaFin);
      
      // Procesar productos vendidos
      const ventasPorProducto = {};
      
      facturas.forEach(factura => {
        if (factura.productos && Array.isArray(factura.productos)) {
          factura.productos.forEach(producto => {
            if (!ventasPorProducto[producto.nombre]) {
              ventasPorProducto[producto.nombre] = {
                nombre: producto.nombre,
                cantidad: 0,
                totalVentas: 0,
                vecesVendido: 0
              };
            }
            
            const cantidad = Number(producto.cantidad) || 0;
            ventasPorProducto[producto.nombre].cantidad += cantidad;
            ventasPorProducto[producto.nombre].totalVentas += cantidad * (Number(producto.precio) || 0);
            ventasPorProducto[producto.nombre].vecesVendido += 1;
          });
        }
      });
      
      // Convertir a array y ordenar
      const productosArray = Object.values(ventasPorProducto);
      productosArray.sort((a, b) => b.cantidad - a.cantidad);
      
      setProductosMasVendidos(productosArray.slice(0, 10)); // Top 10 productos
      
      // Obtener datos del período anterior si se solicita comparativa
      if (comparativa) {
        await obtenerDatosPeriodoAnterior();
      } else {
        setPeriodoAnterior([]);
      }
      
    } catch (error) {
      console.error('Error obteniendo productos más vendidos:', error);
    } finally {
      setCargando(false);
    }
  };

  const obtenerDatosPeriodoAnterior = async () => {
    try {
      // Calcular período anterior
      const inicioDate = fechaLocal(fechaInicio);
      const finDate = fechaLocal(fechaFin);
      const diffTime = finDate - inicioDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const inicioAnterior = new Date(inicioDate);
      inicioAnterior.setDate(inicioDate.getDate() - diffDays);
      
      const finAnterior = new Date(inicioDate);
      finAnterior.setDate(inicioDate.getDate() - 1);
      
      // Obtener facturas del período anterior
      const facturasAnterior = await obtenerFacturasRango(fechaDia(inicioAnterior), fechaDia(finAnterior));
      
      // Procesar productos vendidos del período anterior
      const ventasPorProductoAnterior = {};
      
      facturasAnterior.forEach(factura => {
        if (factura.productos && Array.isArray(factura.productos)) {
          factura.productos.forEach(producto => {
            if (!ventasPorProductoAnterior[producto.nombre]) {
              ventasPorProductoAnterior[producto.nombre] = {
                nombre: producto.nombre,
                cantidad: 0,
                totalVentas: 0,
                vecesVendido: 0
              };
            }
            
            const cantidad = Number(producto.cantidad) || 0;
            ventasPorProductoAnterior[producto.nombre].cantidad += cantidad;
            ventasPorProductoAnterior[producto.nombre].totalVentas += cantidad * (Number(producto.precio) || 0);
            ventasPorProductoAnterior[producto.nombre].vecesVendido += 1;
          });
        }
      });
      
      // Convertir a array y ordenar
      const productosArrayAnterior = Object.values(ventasPorProductoAnterior);
      setPeriodoAnterior(productosArrayAnterior);
      
    } catch (error) {
      console.error('Error obteniendo datos del período anterior:', error);
    }
  };

  const exportarPDF = () => {
    // Crear contenido HTML para el PDF
    const contenido = `
      <h1>Reporte de Productos Más Vendidos</h1>
      <p>Período: ${fechaInicio} al ${fechaFin}</p>
      <table border="1" cellpadding="5" cellspacing="0" width="100%">
        <thead>
          <tr>
            <th>#</th>
            <th>Producto</th>
            <th>Cantidad Vendida</th>
            <th>Total Ventas</th>
            <th>Veces Vendido</th>
          </tr>
        </thead>
        <tbody>
          ${productosMasVendidos.map((producto, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${producto.nombre}</td>
              <td>${producto.cantidad}</td>
              <td>$${producto.totalVentas.toLocaleString()}</td>
              <td>${producto.vecesVendido}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Crear ventana para imprimir
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head>
          <title>Reporte Productos Más Vendidos</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${contenido}
        </body>
      </html>
    `);
    ventana.document.close();
    
    // Imprimir como PDF
    ventana.print();
  };

  const exportarCSV = () => {
    // Preparar datos para CSV
    const datosCSV = productosMasVendidos.map((producto, index) => ({
      'Posición': index + 1,
      'Producto': producto.nombre,
      'Cantidad Vendida': producto.cantidad,
      'Total Ventas': producto.totalVentas,
      'Veces Vendido': producto.vecesVendido
    }));
    
    // Crear libro de trabajo y hoja
    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(datosCSV);
    
    // Añadir hoja al libro
    XLSX.utils.book_append_sheet(libro, hoja, 'Productos Más Vendidos');
    
    // Descargar archivo
    XLSX.writeFile(libro, `productos_mas_vendidos_${fechaInicio}_a_${fechaFin}.xlsx`);
  };

  // Preparar datos para gráficos
  const datosGraficoBarras = {
    labels: productosMasVendidos.map(p => p.nombre),
    datasets: [
      {
        label: 'Cantidad Vendida',
        data: productosMasVendidos.map(p => p.cantidad),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const datosGraficoTorta = {
    labels: productosMasVendidos.map(p => p.nombre),
    datasets: [
      {
        data: productosMasVendidos.map(p => p.cantidad),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#36A2EB'
        ],
        borderWidth: 1,
      },
    ],
  };

  const opcionesGrafico = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Productos Más Vendidos',
      },
    },
  };

  return (
    <div className="mejores-productos-container">
      <div className="mejores-header">
        <div>
          <h2>🏆 Productos Más Vendidos</h2>
          <p className="mejores-subtitle">Analiza el rendimiento por período y exporta resultados</p>
        </div>
        
        <div className="mejores-actions">
          <button
            onClick={exportarCSV}
            className="btn-excel"
          >
            📊 Excel
          </button>
          <button
            onClick={exportarPDF}
            className="btn-pdf"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtro-group">
          <label>Fecha Inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        
        <div className="filtro-group">
          <label>Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        
        <div className="filtro-group">
          <label>Vista</label>
          <select
            value={vista}
            onChange={(e) => setVista(e.target.value)}
          >
            <option value="lista">Lista</option>
            <option value="barras">Gráfico de Barras</option>
            <option value="torta">Gráfico de Torta</option>
          </select>
        </div>
        
        <div className="filtro-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={comparativa}
              onChange={(e) => setComparativa(e.target.checked)}
            />
            <span>Comparar con período anterior</span>
          </label>
        </div>
      </div>

      {cargando ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      ) : productosMasVendidos.length > 0 ? (
        <>
          {/* Selector de vista */}
          {vista === 'lista' && (
            <div className="mejores-productos-list">
              {productosMasVendidos.map((producto, index) => {
                // Encontrar datos del período anterior para comparación
                const productoAnterior = periodoAnterior.find(p => p.nombre === producto.nombre);
                const diferencia = productoAnterior ? producto.cantidad - productoAnterior.cantidad : null;
                
                return (
                  <div key={index} className="mejores-producto-item">
                    <div className="mejores-producto-info">
                      <div className="mejores-producto-posicion">
                        {index + 1}
                      </div>
                      <div className="mejores-producto-details">
                        <h3>{producto.nombre}</h3>
                        <p>{producto.vecesVendido} ventas</p>
                        {comparativa && diferencia !== null && (
                          <p className={`mejores-comparativa-text ${diferencia > 0 ? 'positive' : 'negative'}`}>
                            {diferencia > 0 ? '↑' : '↓'} {Math.abs(diferencia)} unidades vs. período anterior
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mejores-producto-stats">
                      <p className="mejores-stats-cantidad">{producto.cantidad} unidades</p>
                      <p className="mejores-stats-valor">${producto.totalVentas.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {vista === 'barras' && (
            <div className="chart-container">
              <Bar data={datosGraficoBarras} options={opcionesGrafico} />
            </div>
          )}
          
          {vista === 'torta' && (
            <div className="chart-container">
              <Pie data={datosGraficoTorta} options={opcionesGrafico} />
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          No hay datos de ventas para el período seleccionado.
        </div>
      )}
    </div>
  );
}
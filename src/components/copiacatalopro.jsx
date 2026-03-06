import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CatalogoProductos.css';

const CloudinaryUpload = ({ onImageUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo y tamaño de archivo
    if (!file.type.match('image.*')) {
      alert('Por favor, selecciona un archivo de imagen (JPEG, PNG, etc.)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('La imagen es demasiado grande (máximo 5MB)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      alert('Faltan variables de Cloudinary (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).');
      return;
    }

    formData.append('upload_preset', cloudinaryUploadPreset);

    try {
      setUploading(true);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      onImageUpload({
        imagenUrl: response.data.secure_url,
        imagenPublicId: response.data.public_id
      });
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="cloudinary-upload">
      <label className="upload-button">
        {uploading ? `Subiendo... ${progress}%` : '📤 Subir Imagen'}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
};

const ImportExportActions = ({ productos, productosFiltrados, setProductos }) => {
  const fileInputRef = React.useRef(null);

  // Función para formatear precio (similar a la del componente principal)
  const formatPrecio = (precio) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  const exportarProductos = (tipoExportacion = 'todos') => {
    let productosAExportar = [...productos];
    
    // Filtrar según el tipo de exportación
    if (tipoExportacion === 'activos') {
      productosAExportar = productosAExportar.filter(p => p.activo);
    } else if (tipoExportacion === 'filtrados') {
      productosAExportar = productosFiltrados;
    }

    // Crear objeto con metadatos
    const exportData = {
      metadata: {
        fechaExportacion: new Date().toISOString(),
        cantidadProductos: productosAExportar.length,
        version: '1.0'
      },
      productos: productosAExportar
    };

    // Crear archivo JSON
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    // Generar nombre de archivo
    const fecha = new Date();
    const nombreArchivo = `productos_${tipoExportacion}_${fecha.getFullYear()}-${(fecha.getMonth()+1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}.json`;
    
    // Crear elemento para descarga
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', nombreArchivo);
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);
  };

  // Nueva función para exportar a CSV/Excel
  const exportarAExcel = (tipoExportacion = 'todos') => {
    let productosAExportar = [...productos];
    
    if (tipoExportacion === 'activos') {
      productosAExportar = productosAExportar.filter(p => p.activo);
    } else if (tipoExportacion === 'filtrados') {
      productosAExportar = productosFiltrados;
    }

    // Encabezados del CSV
    let csvContent = "Código,Nombre,Categoría,Precio,Stock,Descripción,Estado,Última Actualización\n";
    
    // Agregar cada producto
    productosAExportar.forEach(producto => {
      const row = [
        producto.codigo || 'N/A',
        `"${producto.nombre.replace(/"/g, '""')}"`,
        producto.categoria || 'Sin categoría',
        formatPrecio(producto.precio).replace(/[^\d,]/g, ''),
        producto.stock || 0,
        `"${(producto.descripcion || 'Sin descripción').replace(/"/g, '""')}"`,
        producto.activo ? 'Activo' : 'Inactivo',
        new Date().toLocaleDateString()
      ].join(',');
      
      csvContent += row + '\n';
    });

    // Crear archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fecha = new Date();
    const nombreArchivo = `inventario_final_${fecha.getFullYear()}-${(fecha.getMonth()+1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importarProductos = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.name.endsWith('.json')) {
      alert('Por favor, selecciona un archivo JSON válido');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validar estructura básica
        if (!data.productos || !Array.isArray(data.productos)) {
          throw new Error('El archivo no contiene una lista válida de productos');
        }

        // Validar cada producto
        const productosImportados = data.productos.map((p, index) => {
          // Validaciones básicas
          if (!p.nombre || typeof p.nombre !== 'string') {
            throw new Error(`Producto en posición ${index} no tiene un nombre válido`);
          }
          
          if (!p.precio || isNaN(parseFloat(p.precio))) {
            throw new Error(`Producto "${p.nombre}" no tiene un precio válido`);
          }

          // Asignar ID nuevo si no existe o si ya existe en nuestros productos
          const idExistente = productos.find(prod => prod.id === p.id);
          return {
            ...p,
            id: idExistente ? Date.now() + index : p.id,
            precio: parseFloat(p.precio),
            stock: parseInt(p.stock) || 0,
            activo: p.activo !== undefined ? p.activo : true,
            imagenUrl: p.imagenUrl || '',
            imagenPublicId: p.imagenPublicId || ''
          };
        });

        // Mostrar resumen antes de aplicar cambios
        const confirmacion = window.confirm(
          `Se importarán ${productosImportados.length} productos.\n` +
          `Nuevos: ${productosImportados.filter(p => !productos.some(existing => existing.id === p.id)).length}\n` +
          `Actualizados: ${productosImportados.filter(p => productos.some(existing => existing.id === p.id)).length}\n\n` +
          `¿Deseas continuar?`
        );

        if (confirmacion) {
          // Combinar productos existentes con los importados
          const productosActualizados = [
            ...productos.filter(p => !productosImportados.some(imp => imp.id === p.id)),
            ...productosImportados
          ];

          localStorage.setItem('productos', JSON.stringify(productosActualizados));
          setProductos(productosActualizados);
          alert('Importación completada con éxito');
        }
      } catch (error) {
        console.error('Error importando productos:', error);
        alert(`Error al importar: ${error.message}`);
      }
    };

    reader.onerror = () => {
      alert('Error al leer el archivo');
    };

    reader.readAsText(file);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="import-export-actions">
      <div className="dropdown">
        <button className="button info-button">
          <i className="fas fa-file-export"></i> Exportar ▼
        </button>
        <div className="dropdown-content">
          <button onClick={() => exportarProductos('todos')}>JSON - Todos</button>
          <button onClick={() => exportarProductos('activos')}>JSON - Activos</button>
          <button onClick={() => exportarProductos('filtrados')}>JSON - Filtrados</button>
          <div className="dropdown-divider"></div>
          <button onClick={() => exportarAExcel('todos')}>Excel - Todos</button>
          <button onClick={() => exportarAExcel('activos')}>Excel - Activos</button>
          <button onClick={() => exportarAExcel('filtrados')}>Excel - Filtrados</button>
        </div>
      </div>
      
      <button 
        className="button warning-button"
        onClick={handleImportClick}
      >
        <i className="fas fa-file-import"></i> Importar
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={importarProductos}
        accept=".json"
        style={{ display: 'none' }}
      />
    </div>
  );
};

const CatalogoProductos = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoProducto, setNuevoProducto] = useState({
    codigo: '',
    nombre: '',
    precio: '',
    categoria: '',
    stock: '',
    descripcion: '',
    activo: true,
    imagenUrl: '',
    imagenPublicId: ''
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [editandoId, setEditandoId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activos');

  const categorias = ['Toallas', 'Bloqueadores', 'Pañales', 'Alimentos', 'Desodorantes','Medicamentos ',  'Otros'];

  // Cargar productos desde localStorage
  useEffect(() => {
    const cargarProductos = () => {
      try {
        const productosGuardados = JSON.parse(localStorage.getItem('productos')) || [];
        const productosConEstado = productosGuardados.map(p => ({
          ...p,
          activo: p.activo !== undefined ? p.activo : true,
          imagenUrl: p.imagenUrl || '',
          imagenPublicId: p.imagenPublicId || ''
        }));
        setProductos(productosConEstado);
      } catch (error) {
        console.error("Error cargando productos:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarProductos();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoProducto({
      ...nuevoProducto,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Validar datos del producto
  const validarProducto = () => {
    if (!nuevoProducto.nombre || !nuevoProducto.precio) {
      alert('⚠️ Nombre y precio son campos obligatorios');
      return false;
    }
    return true;
  };

  // Guardar producto (nuevo o edición)
  const guardarProducto = () => {
    if (!validarProducto()) return;

    let productosActualizados = [...productos];
    
    if (editandoId) {
      productosActualizados = productosActualizados.map(p => 
        p.id === editandoId ? { ...p, ...nuevoProducto } : p
      );
    } else {
      const producto = {
        id: Date.now(),
        ...nuevoProducto,
        precio: parseFloat(nuevoProducto.precio),
        stock: parseInt(nuevoProducto.stock) || 0,
        activo: true
      };
      productosActualizados.push(producto);
    }

    localStorage.setItem('productos', JSON.stringify(productosActualizados));
    setProductos(productosActualizados);
    
    // Resetear formulario
    setNuevoProducto({
      codigo: '',
      nombre: '',
      precio: '',
      categoria: '',
      stock: '',
      descripcion: '',
      activo: true,
      imagenUrl: '',
      imagenPublicId: ''
    });
    setEditandoId(null);
    setMostrarFormulario(false);
  };

  // Eliminar producto
  const eliminarProducto = (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    const productosActualizados = productos.filter(p => p.id !== id);
    localStorage.setItem('productos', JSON.stringify(productosActualizados));
    setProductos(productosActualizados);
  };

  // Activar/Desactivar producto
  const toggleEstadoProducto = (id) => {
    const productosActualizados = productos.map(p => 
      p.id === id ? { ...p, activo: !p.activo } : p
    );
    localStorage.setItem('productos', JSON.stringify(productosActualizados));
    setProductos(productosActualizados);
    
    const producto = productos.find(p => p.id === id);
    alert(`Producto "${producto.nombre}" ha sido ${producto.activo ? 'desactivado' : 'activado'}`);
  };

  // Editar producto
  const editarProducto = (producto) => {
    setNuevoProducto({
      codigo: producto.codigo || '',
      nombre: producto.nombre || '',
      precio: producto.precio.toString() || '',
      categoria: producto.categoria || '',
      stock: producto.stock?.toString() || '',
      descripcion: producto.descripcion || '',
      activo: producto.activo !== undefined ? producto.activo : true,
      imagenUrl: producto.imagenUrl || '',
      imagenPublicId: producto.imagenPublicId || ''
    });
    setEditandoId(producto.id);
    setMostrarFormulario(true);
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const coincideBusqueda = producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                            producto.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'Todas' || producto.categoria === categoriaFiltro;
    
    if (filtroEstado === 'activos') return coincideBusqueda && coincideCategoria && producto.activo;
    if (filtroEstado === 'inactivos') return coincideBusqueda && coincideCategoria && !producto.activo;
    return coincideBusqueda && coincideCategoria;
  });

  // Formatear precio
  const formatPrecio = (precio) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  return (
    <div className="catalogo-container">
      <header className="catalogo-header">
        <h1><i className="fas fa-boxes"></i> Catálogo de Productos</h1>
        <div className="header-actions">
          <ImportExportActions 
            productos={productos}
            productosFiltrados={productosFiltrados}
            setProductos={setProductos}
          />
          <button 
            className="button success-button"
            onClick={() => {
              setMostrarFormulario(true);
              setEditandoId(null);
            }}
          >
            <i className="fas fa-plus"></i> Nuevo Producto
          </button>
          <button 
            className="button secondary-button"
            onClick={() => navigate('/')}
          >
            <i className="fas fa-arrow-left"></i> Volver
          </button>
        </div>
      </header>

      {/* Resumen de productos */}
      <div className="resumen-productos">
        <span><i className="fas fa-check-circle"></i> Activos: {productos.filter(p => p.activo).length}</span>
        <span><i className="fas fa-ban"></i> Inactivos: {productos.filter(p => !p.activo).length}</span>
        <span><i className="fas fa-boxes"></i> Total: {productos.length}</span>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="filtros-avanzados">
          <select 
            value={categoriaFiltro} 
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="Todas">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span>Mostrando {productosFiltrados.length} de {productos.length}</span>
        </div>
      </div>

      {/* Pestañas de estado */}
      <div className="tabs-container">
        <button 
          className={`tab-button ${filtroEstado === 'activos' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('activos')}
        >
          Activos ({productos.filter(p => p.activo).length})
        </button>
        <button 
          className={`tab-button ${filtroEstado === 'inactivos' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('inactivos')}
        >
          Inactivos ({productos.filter(p => !p.activo).length})
        </button>
        <button 
          className={`tab-button ${filtroEstado === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('todos')}
        >
          Todos ({productos.length})
        </button>
      </div>

      {/* Formulario de producto (modal) */}
      {mostrarFormulario && (
        <div className="modal-overlay">
          <div className="producto-form">
            <h2>{editandoId ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h2>
            
            <div className="form-group">
              <label>Código (opcional):</label>
              <input
                type="text"
                name="codigo"
                value={nuevoProducto.codigo}
                onChange={handleInputChange}
                placeholder="Código interno"
              />
            </div>
            
            <div className="form-group">
              <label>Nombre *:</label>
              <input
                type="text"
                name="nombre"
                value={nuevoProducto.nombre}
                onChange={handleInputChange}
                placeholder="Nombre del producto"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Precio *:</label>
                <input
                  type="number"
                  name="precio"
                  value={nuevoProducto.precio}
                  onChange={handleInputChange}
                  placeholder="Precio"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Stock:</label>
                <input
                  type="number"
                  name="stock"
                  value={nuevoProducto.stock}
                  onChange={handleInputChange}
                  placeholder="Inventario"
                  min="0"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Categoría:</label>
              <select
                name="categoria"
                value={nuevoProducto.categoria}
                onChange={handleInputChange}
              >
                <option value="">Seleccione...</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Descripción:</label>
              <textarea
                name="descripcion"
                value={nuevoProducto.descripcion}
                onChange={handleInputChange}
                placeholder="Detalles del producto"
                rows="3"
              />
            </div>

            {/* Upload de imagen con Cloudinary */}
            <div className="form-group">
              <label>Imagen:</label>
              <CloudinaryUpload 
                onImageUpload={({imagenUrl, imagenPublicId}) => {
                  setNuevoProducto({
                    ...nuevoProducto,
                    imagenUrl,
                    imagenPublicId
                  });
                }}
              />
              {nuevoProducto.imagenUrl && (
                <div className="image-preview">
                  <img src={nuevoProducto.imagenUrl} alt="Vista previa" />
                  <button 
                    className="button small-button danger-button"
                    onClick={() => setNuevoProducto({
                      ...nuevoProducto,
                      imagenUrl: '',
                      imagenPublicId: ''
                    })}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
            
            {editandoId && (
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="activo"
                    checked={nuevoProducto.activo}
                    onChange={handleInputChange}
                  />
                  Producto activo
                </label>
              </div>
            )}
            
            <div className="form-actions">
              <button 
                className="button secondary-button"
                onClick={() => {
                  setMostrarFormulario(false);
                  setEditandoId(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="button primary-button"
                onClick={guardarProducto}
              >
                {editandoId ? 'Guardar Cambios' : 'Agregar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estados de carga */}
      {cargando ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      ) : productos.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open"></i>
          <h3>No hay productos</h3>
          <p>Agrega tu primer producto</p>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-search"></i>
          <h3>No se encontraron resultados</h3>
          <p>Prueba con otros filtros</p>
        </div>
      ) : (
        <div className="productos-grid">
          {productosFiltrados.map(producto => (
            <div key={producto.id} className={`producto-card ${!producto.activo ? 'inactivo' : ''}`}>
              {!producto.activo && <span className="inactive-badge">INACTIVO</span>}
              
              {producto.imagenUrl && (
                <div className="producto-imagen">
                  <img src={producto.imagenUrl} alt={producto.nombre} />
                </div>
              )}
              
              <div className="producto-header">
                <h3>{producto.nombre}</h3>
                {producto.codigo && <span className="codigo">#{producto.codigo}</span>}
              </div>
              
              <div className="producto-body">
                <div className="producto-precio">
                  {formatPrecio(producto.precio)}
                </div>
                
                {producto.categoria && (
                  <div className="producto-categoria">
                    <i className="fas fa-tag"></i> {producto.categoria}
                  </div>
                )}
                
                {producto.stock !== undefined && (
                  <div className="producto-stock">
                    <i className="fas fa-boxes"></i> Stock: {producto.stock}
                  </div>
                )}
                
                {producto.descripcion && (
                  <p className="producto-descripcion">
                    {producto.descripcion}
                  </p>
                )}
              </div>
              
              <div className="producto-actions">
                <button 
                  className="action-button toggle-button"
                  onClick={() => toggleEstadoProducto(producto.id)}
                >
                  <i className={`fas ${producto.activo ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {producto.activo ? 'si hay' : 'no hay'}
                </button>
                
                <button 
                  className="action-button edit-button"
                  onClick={() => editarProducto(producto)}
                >
                  <i className="fas fa-edit"></i> Editar
                </button>
                
                <button 
                  className="action-button delete-button"
                  onClick={() => eliminarProducto(producto.id)}
                >
                  <i className="fas fa-trash"></i> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogoProductos;
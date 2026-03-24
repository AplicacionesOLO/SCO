import { useState, useEffect } from 'react';
import { 
  ingestPDFFromFile, 
  getCostBotChunksStats, 
  listCostBotDocuments,
  deleteCostBotDocument 
} from '../../services/costbotIngestService';
import { useNotification } from '../../hooks/useNotification';
import Sidebar from '../feature/Sidebar';
import TopBar from '../feature/TopBar';
import ConfirmationDialog from '../base/ConfirmationDialog';
import { supabase } from '../../lib/supabase';
import type { CostBotChunksStats } from '../../types/costbot';

export default function CostBotAdmin() {
  const { showNotification } = useNotification();
  
  const [stats, setStats] = useState<CostBotChunksStats | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roles, setRoles] = useState<{ id: number; nombre: string }[]>([]);
  
  // Estados para diálogos de confirmación
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    sourceId: string;
    documentName: string;
  }>({
    isOpen: false,
    sourceId: '',
    documentName: ''
  });
  
  // Formulario de ingesta
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [roleScope, setRoleScope] = useState<string>('public');
  const [pageScope, setPageScope] = useState('general');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, nombre')
        .order('nombre');
      if (!error && data) {
        setRoles(data);
      }
    } catch {
      // roles no críticos, continuar con lista vacía
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, docsData] = await Promise.all([
        getCostBotChunksStats(),
        listCostBotDocuments()
      ]);
      
      setStats(statsData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification('error', 'Error al cargar datos de CostBot');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showNotification('error', 'Solo se permiten archivos PDF');
        return;
      }
      setSelectedFile(file);
      
      // Auto-generar sourceId desde el nombre del archivo
      if (!sourceId) {
        const fileName = file.name.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        setSourceId(fileName);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !sourceId) {
      showNotification('error', 'Selecciona un archivo y proporciona un ID de documento');
      return;
    }

    setUploading(true);
    try {
      const result = await ingestPDFFromFile(
        selectedFile,
        sourceId,
        roleScope,
        pageScope,
        {
          description,
          version: '1.0'
        }
      );

      showNotification('success', `PDF ingestado: ${result.chunksInserted} fragmentos creados`);
      
      // Limpiar formulario
      setSelectedFile(null);
      setSourceId('');
      setDescription('');
      
      // Recargar datos
      loadData();
      
    } catch (error: any) {
      console.error('Error al ingestar PDF:', error);
      showNotification('error', error.message || 'Error al ingestar PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (docSourceId: string) => {
    setDeleteDialog({
      isOpen: true,
      sourceId: docSourceId,
      documentName: docSourceId
    });
  };

  const confirmDelete = async () => {
    const { sourceId: docSourceId } = deleteDialog;
    
    setDeleteDialog({ isOpen: false, sourceId: '', documentName: '' });

    try {
      const deletedCount = await deleteCostBotDocument(docSourceId);
      showNotification('success', `Documento eliminado: ${deletedCount} fragmentos eliminados`);
      loadData();
    } catch (error: any) {
      console.error('Error al eliminar documento:', error);
      showNotification('error', error.message || 'Error al eliminar documento');
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, sourceId: '', documentName: '' });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="ri-robot-2-line text-2xl text-blue-600"></i>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Administración de CostBot</h2>
                    <p className="text-sm text-gray-600">Gestiona documentos y conocimiento del asistente</p>
                  </div>
                </div>

                {/* Estadísticas */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Total Fragmentos</p>
                          <p className="text-2xl font-bold text-blue-900">{stats.total_chunks}</p>
                        </div>
                        <i className="ri-file-text-line text-3xl text-blue-400"></i>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Documentos</p>
                          <p className="text-2xl font-bold text-green-900">{stats.sources_count}</p>
                        </div>
                        <i className="ri-folder-line text-3xl text-green-400"></i>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Roles</p>
                          <p className="text-2xl font-bold text-purple-900">
                            {Object.keys(stats.role_scopes || {}).length}
                          </p>
                        </div>
                        <i className="ri-shield-user-line text-3xl text-purple-400"></i>
                      </div>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Contextos</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {Object.keys(stats.page_scopes || {}).length}
                          </p>
                        </div>
                        <i className="ri-pages-line text-3xl text-orange-400"></i>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulario de ingesta */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="ri-upload-cloud-line text-blue-600"></i>
                  Ingestar Nuevo Documento PDF
                </h3>

                <div className="space-y-4">
                  {/* Selector de archivo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Archivo PDF
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <div className="text-center">
                          {selectedFile ? (
                            <>
                              <i className="ri-file-pdf-line text-3xl text-red-500 mb-1"></i>
                              <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
                              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </>
                          ) : (
                            <>
                              <i className="ri-upload-cloud-2-line text-3xl text-gray-400 mb-1"></i>
                              <p className="text-sm text-gray-600">Haz clic para seleccionar un PDF</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      
                      {selectedFile && (
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ID del documento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID del Documento *
                    </label>
                    <input
                      type="text"
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      placeholder="ej: manual_optimizador_v1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Identificador único para este documento (sin espacios)
                    </p>
                  </div>

                  {/* Alcance por rol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alcance por Rol
                    </label>
                    <select
                      value={roleScope}
                      onChange={(e) => setRoleScope(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
                    >
                      <option value="public">Público (todos los usuarios)</option>
                      {roles.map((rol) => (
                        <option key={rol.id} value={rol.nombre}>
                          {rol.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Alcance por página */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contexto de Página
                    </label>
                    <select
                      value={pageScope}
                      onChange={(e) => setPageScope(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    >
                      <option value="general">General (todas las páginas)</option>
                      <option value="dashboard">Dashboard</option>
                      <option value="optimizador_cortes">Optimizador de Cortes</option>
                      <option value="bom">BOM / Productos</option>
                      <option value="inventario">Inventario</option>
                      <option value="cotizaciones">Cotizaciones</option>
                      <option value="pedidos">Pedidos</option>
                      <option value="facturacion">Facturación</option>
                      <option value="tareas">Tareas</option>
                    </select>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descripción del contenido del documento..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Botón de ingesta */}
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || !sourceId || uploading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium cursor-pointer whitespace-nowrap"
                  >
                    {uploading ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Procesando PDF...
                      </>
                    ) : (
                      <>
                        <i className="ri-upload-line"></i>
                        Ingestar Documento
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lista de documentos */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <i className="ri-file-list-line text-blue-600"></i>
                    Documentos Ingestados
                  </h3>
                  <button
                    onClick={loadData}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`}></i>
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <i className="ri-loader-4-line text-3xl text-blue-600 animate-spin"></i>
                    <p className="text-sm text-gray-600 mt-2">Cargando documentos...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-file-forbid-line text-4xl text-gray-400 mb-2"></i>
                    <p className="text-sm text-gray-600">No hay documentos ingestados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.source_id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <i className="ri-file-pdf-line text-xl text-red-500"></i>
                              <h4 className="font-semibold text-gray-900">{doc.source_id}</h4>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {doc.chunks_count} fragmentos
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                Rol: {doc.role_scope}
                              </span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Contexto: {doc.page_scope}
                              </span>
                            </div>

                            {doc.metadata?.description && (
                              <p className="text-sm text-gray-600">{doc.metadata.description}</p>
                            )}
                            
                            {doc.metadata?.filename && (
                              <p className="text-xs text-gray-500 mt-1">
                                Archivo: {doc.metadata.filename}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteClick(doc.source_id)}
                            className="ml-4 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                            title="Eliminar documento"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <i className="ri-information-line"></i>
                  Instrucciones de Uso
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-line text-blue-600 mt-0.5"></i>
                    <span>Sube documentos PDF con información relevante para CostBot</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-line text-blue-600 mt-0.5"></i>
                    <span>Configura el alcance por rol para controlar quién puede ver cada documento</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-line text-blue-600 mt-0.5"></i>
                    <span>Asigna un contexto de página para que CostBot use el documento en secciones específicas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-line text-blue-600 mt-0.5"></i>
                    <span>Los documentos se dividen automáticamente en fragmentos y se generan embeddings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="ri-checkbox-circle-line text-blue-600 mt-0.5"></i>
                    <span>CostBot usará estos documentos para responder preguntas de forma contextual</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        type="danger"
        title="Eliminar Documento"
        message={`¿Está seguro que desea eliminar el documento "${deleteDialog.documentName}"? Esta acción eliminará todos los fragmentos asociados y no se puede deshacer.`}
        confirmText="Sí, Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default function ColaboradorNoEncontrado() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 flex items-center justify-center bg-amber-100 rounded-2xl mx-auto mb-5">
          <i className="ri-user-search-line text-4xl text-amber-600"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          No estás registrado como colaborador
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Para usar el Reporte del Día, tu correo electrónico debe estar registrado en la lista de colaboradores del sistema.
          Comunícate con un encargado o administrador para que te agreguen.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
            <i className="ri-information-line"></i>
            ¿Qué debe hacer el administrador?
          </p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
            <li>Ir al módulo de <strong>Tareas</strong></li>
            <li>Abrir la configuración de Colaboradores</li>
            <li>Agregar tu nombre y correo electrónico</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

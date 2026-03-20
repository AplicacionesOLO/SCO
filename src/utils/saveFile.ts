export const SAVEFILE_BUILD_ID = 'SAVEFILE_' + new Date().toISOString();

import { downloadBlob } from './downloadBlob';
import { showAlert } from '../utils/dialog';

export async function saveXlsxFile(blob: Blob, filename: string): Promise<void> {
  const anyWin = window as any;

  if (!anyWin?.showSaveFilePicker) {
    showAlert(
      'Tu navegador/entorno no permite controlar el nombre en "Guardar como". El archivo se descargará con nombre automático.',
      { type: 'warning' }
    );
    downloadBlob(blob, filename);
    return;
  }

  try {
    const handle = await anyWin.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'Excel',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (error: any) {
    if (error.name === 'AbortError') return;
    
    showAlert(
      `Error al guardar archivo: ${error.name} - ${error.message}. Solución: Desactiva "Preguntar dónde guardar cada archivo" en Configuración de Chrome/Edge`,
      { type: 'error' }
    );
    
    downloadBlob(blob, filename);
  }
}

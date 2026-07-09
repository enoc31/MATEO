import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompression';

interface UploadResponse {
  url: string;
  path: string;
}

export const uploadToGCS = async (file: File): Promise<UploadResponse> => {
  try {
    // 1. Comprimir la imagen antes de subirla
    const compressedFile = await compressImage(file);

    // 2. Pedir la URL de subida y el Token a nuestra Edge Function
    const { data, error } = await supabase.functions.invoke('gcs-signed-url', {
      body: {
        fileName: compressedFile.name,
        contentType: compressedFile.type,
      },
    });

    if (error) {
      console.error('Error pidiendo URL firmada:', error);
      throw new Error(`Error en la Edge Function: ${error.message}`);
    }

    if (!data.uploadUrl || !data.gcpAccessToken) {
      throw new Error('No se recibió la URL de subida de GCS');
    }

    // 3. Hacer el PUT directo a Google Cloud Storage
    const uploadRes = await fetch(data.uploadUrl, {
      method: 'POST', // la api /upload/... usa POST
      headers: {
        Authorization: `Bearer ${data.gcpAccessToken}`,
        'Content-Type': compressedFile.type,
      },
      body: compressedFile,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Error subiendo a GCS:', errText);
      throw new Error(`Error al subir la imagen a GCS: ${uploadRes.statusText}`);
    }

    // Devolvemos la ruta pública esperada si el bucket no fuera público,
    // pero guardaremos la ruta gs:// o el link público
    const publicUrl = `https://storage.googleapis.com/${data.bucket}/${data.objectPath}`;

    // 4. Registrar en base de datos el documento adjunto (Fase 1)
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;

    if (userId) {
      await supabase.from('documentos_adjuntos').insert([
        {
          usuario_id: userId,
          url_archivo_gcs: publicUrl,
          tipo_documento: 'COMPROBANTE',
          estado_revision: 'PENDIENTE',
        },
      ]);
    }

    return { url: publicUrl, path: data.objectPath };
  } catch (error) {
    console.error('Excepción en uploadToGCS:', error);
    throw error;
  }
};

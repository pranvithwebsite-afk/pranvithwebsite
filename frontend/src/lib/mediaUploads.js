import {
  uploadAdminFile,
  uploadAdminImageToR2,
  createAdminDirectVideoUpload,
  uploadFileToSignedUrl,
  finalizeAdminDirectVideoUpload,
} from './api';
import {
  validateImageUploadFile,
  validateVideoUploadFile,
  isVideoUploadFile,
  formatUploadError,
} from './mediaUpload';

/**
 * Uploads multiple files, handling different file types and reporting progress.
 *
 * @param {Object} params
 * @param {File[]} params.files - Array of files to upload.
 * @param {string} params.purpose - The purpose of the upload (e.g., 'media-library-image').
 * @param {function} params.onProgress - Progress callback.
 *   Receives ({ overallProgress, fileProgress, currentFile, totalFiles, currentFileName, stage })
 * @returns {Promise<Array>} A promise that resolves with an array of successful upload results.
 */
export const uploadMultipleFiles = async ({ files, purpose, onProgress }) => {
  const totalFiles = files.length;
  const results = [];
  const errors = [];

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const currentFile = i + 1;
    const currentFileName = file.name;

    try {
      onProgress({
        overallProgress: (i / totalFiles) * 100,
        fileProgress: 0,
        currentFile,
        totalFiles,
        currentFileName,
        stage: 'starting',
      });

      let result;
      if (isVideoUploadFile(file)) {
        const videoError = validateVideoUploadFile(file);
        if (videoError) throw new Error(videoError);

        onProgress({
          overallProgress: (i / totalFiles) * 100,
          fileProgress: 0,
          currentFile,
          totalFiles,
          currentFileName,
          stage: 'presign',
        });

        const signed = await createAdminDirectVideoUpload({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          purpose,
        });

        onProgress({
          overallProgress: (i / totalFiles) * 100,
          fileProgress: 0,
          currentFile,
          totalFiles,
          currentFileName,
          stage: 'uploading',
        });

        await uploadFileToSignedUrl({
          uploadUrl: signed.upload_url,
          file,
          headers: signed.required_headers || signed.headers || {},
          onUploadProgress: (event) => {
            const total = event.total || file.size || 1;
            const progress = Math.min(100, Math.round((event.loaded / total) * 100));
            onProgress({
              overallProgress: (i / totalFiles) * 100 + progress / totalFiles,
              fileProgress: progress,
              currentFile,
              totalFiles,
              currentFileName,
              stage: 'uploading',
            });
          },
        });

        onProgress({
          overallProgress: (i / totalFiles) * 100 + 99 / totalFiles,
          fileProgress: 99,
          currentFile,
          totalFiles,
          currentFileName,
          stage: 'completing',
        });

        result = await finalizeAdminDirectVideoUpload({
          key: signed.key,
          url: signed.public_url,
          filename: file.name,
          contentType: file.type,
          size: file.size,
          purpose,
          title: file.name,
        });
      } else if (String(file.type || '').startsWith('image/')) {
        const imageError = validateImageUploadFile(file);
        if (imageError) throw new Error(imageError);

        result = await uploadAdminImageToR2({
          file,
          purpose: purpose,
          onUploadProgress: (event) => {
            const total = event.total || file.size || 1;
            const progress = Math.min(100, Math.round((event.loaded / total) * 100));
             onProgress({
              overallProgress: (i / totalFiles) * 100 + progress / totalFiles,
              fileProgress: progress,
              currentFile,
              totalFiles,
              currentFileName,
              stage: 'uploading',
            });
          },
        });
      } else {
        result = await uploadAdminFile(file, (event) => {
          const total = event.total || file.size || 1;
          const progress = Math.min(100, Math.round((event.loaded / total) * 100));
          onProgress({
            overallProgress: (i / totalFiles) * 100 + progress / totalFiles,
            fileProgress: progress,
            currentFile,
            totalFiles,
            currentFileName,
            stage: 'uploading',
          });
        });
      }

      const uploadedUrl = result?.url || result?.media?.public_url || result?.media?.url;
      if (!uploadedUrl) {
        throw new Error('Upload completed but no media URL was returned');
      }
      results.push(result);
    } catch (error) {
      console.warn(`[mediaUploads] failed to upload ${currentFileName}`, error);
      errors.push({ file: currentFileName, error: formatUploadError(error) });
    }
  }

  onProgress({ overallProgress: 100, fileProgress: 100, currentFile: totalFiles, totalFiles, stage: 'finished' });

  return { results, errors };
};

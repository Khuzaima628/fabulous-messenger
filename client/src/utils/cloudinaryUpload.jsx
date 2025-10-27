import { useState } from 'react';
import axios from 'axios';

const cloudName = 'dwrimjhbm';
const uploadPreset = 'yvsxthlo';

const useCloudinaryUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadMedia = async (file) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'allowlist');

    // Detect file type: image, video, or raw (for documents)
    let fileType = 'raw';
    if (file.type.startsWith('image/')) fileType = 'image';
    else if (file.type.startsWith('video/')) fileType = 'video';

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/${fileType}/upload`,
        formData
      );

      setUploading(false);
      return { url: response.data.secure_url, name: file.name };
    } catch (err) {
      setUploading(false);
      setError(err);
      console.error('Upload failed:', err);
      return null;
    }
  };

  return { uploadMedia, uploading, error };
};

export default useCloudinaryUpload;

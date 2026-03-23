import { useState } from 'react'
import api from '../api/strapi'
import { mediaUrl } from '../api/media'

export default function MediaUpload({ onUpload, label = 'Upload Media', multiple = false, current = null }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const handleFile = async (e) => {
    const files = e.target.files
    if (!files.length) return

    setUploading(true)
    try {
      const formData = new FormData()
      if (multiple) {
        Array.from(files).forEach(file => formData.append('files', file))
      } else {
        formData.append('files', files[0])
        setPreview(URL.createObjectURL(files[0]))
      }

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      onUpload(multiple ? res.data : res.data[0])
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const currentUrl = current?.url
    ? mediaUrl(current.url)
    : null

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>

      {(preview || currentUrl) && current && (
        <div className="mb-2">
          {(current?.mime || '').startsWith('video/') ? (
            <video src={preview || currentUrl} controls className="w-full max-h-40 rounded-lg" />
          ) : (
            <img src={preview || currentUrl} alt="preview" className="w-full max-h-40 object-cover rounded-lg" />
          )}
        </div>
      )}

      <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 transition ${uploading ? 'opacity-50' : ''}`}>
        <span className="text-2xl">📎</span>
        <span className="text-sm text-gray-500">
          {uploading ? 'Uploading...' : `Click to ${current ? 'change' : 'upload'} ${multiple ? 'files' : 'file'}`}
        </span>
        <input
          type="file"
          className="hidden"
          multiple={multiple}
          accept="image/*,video/*"
          onChange={handleFile}
          disabled={uploading}
        />
      </label>

      {current && (
        <button
          type="button"
          onClick={() => {
            setPreview(null)
            onUpload(null)
          }}
          className="text-red-500 text-xs mt-1 hover:underline"
        >
          Remove media
        </button>
      )}
    </div>
  )
}
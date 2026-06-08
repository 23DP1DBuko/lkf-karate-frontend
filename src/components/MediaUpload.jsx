import { useState } from 'react'
import api from '../api/strapi'
import { mediaUrl } from '../api/media'

export default function MediaUpload({ onUpload, label = 'Upload Media', multiple = false, current = null, mediaType = 'image' }) {
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

      const uploaded = multiple ? res.data : res.data[0]
      onUpload(
        multiple
          ? uploaded.map(file => ({ type: mediaType, file }))
          : { type: mediaType, file: uploaded }
      )
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  const currentUrl = current?.file?.url
  ? mediaUrl(current.file.url)
  : current?.url
    ? mediaUrl(current.url)
    : null

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>

      {(preview || currentUrl) && current && (
        <div className="mb-2">
          {(current?.file?.mime || current?.mime || '').startsWith('video/') || mediaType === 'video' ? (
            <video src={preview || currentUrl} controls className="w-full max-h-40 rounded-lg" />
          ) : (
            <img src={preview || currentUrl} alt="preview" className="w-full max-h-40 object-cover rounded-lg" />
          )}
        </div>
      )}

      <label
        className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition ${
          uploading ? 'opacity-50' : 'hover:border-blue-400'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.currentTarget.classList.add('border-blue-400')}
        onDragLeave={(e) => e.currentTarget.classList.remove('border-blue-400')}
        onDrop={async (e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-blue-400')
          if (uploading) return
          const files = e.dataTransfer.files
          if (!files.length) return
          const fakeEvent = { target: { files } }
          handleFile(fakeEvent)
        }}
      >
        <span className="text-2xl">📎</span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {uploading ? 'Uploading...' : `Click or drag to ${current ? 'change' : 'upload'} ${multiple ? 'files' : 'file'}`}
        </span>
         <input
          type="file"
          accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/mp4,video/*' : 'image/*,video/*'}
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
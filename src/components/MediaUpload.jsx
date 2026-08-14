import { useState } from 'react'
import api from '../api/strapi'
import { mediaUrl } from '../api/media'
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'
import FileDropzone from './FileDropzone'

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

  const isVideo =
    (current?.file?.mime || current?.mime || '').startsWith('video/') || mediaType === 'video'
  const hasPreview = Boolean(preview || currentUrl)

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>

      {/* Preview */}
      {hasPreview && (
        <div className="mb-3">
          <div
            className="relative rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--border)' }}
          >
            {isVideo ? (
              <video
                src={preview || currentUrl}
                controls
                className="w-full max-h-52 object-contain bg-black"
              />
            ) : (
              <img
                src={preview || currentUrl}
                alt="Uploaded media preview"
                className="w-full max-h-52 object-contain"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              />
            )}
          </div>
          {current && (
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                onUpload(null)
              }}
              className="mt-1.5 text-xs text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 transition"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Remove media
            </button>
          )}
        </div>
      )}

      {/* Dropzone */}
      <FileDropzone
        icon={
          uploading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUpTrayIcon className="w-6 h-6" />
          )
        }
        title={(dragging) =>
          uploading
            ? 'Uploading…'
            : dragging
              ? 'Drop to upload'
              : `Drag & drop ${multiple ? 'files' : 'an image'} here`
        }
        disabled={uploading}
        accept={
          mediaType === 'image'
            ? 'image/*'
            : mediaType === 'video'
              ? 'video/mp4,video/*'
              : 'image/*,video/*'
        }
        multiple={multiple}
        ariaLabel={`Upload ${multiple ? 'files' : 'file'}`}
        onFiles={(files) => handleFile({ target: { files } })}
      />
    </div>
  )
}

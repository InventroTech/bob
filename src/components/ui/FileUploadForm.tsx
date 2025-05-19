import React, { useRef, useState } from 'react'
import { FaFileAlt, FaImage } from 'react-icons/fa'

const FileUploadForm = () => {
  const [link, setLink] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const pdfInputRef = useRef(null)
  const imageInputRef = useRef(null)

  const handleUpload = async () => {
    const formData = new FormData()
    formData.append('link', link)
    if (pdfFile) formData.append('pdf', pdfFile)
    if (imageFile) formData.append('image', imageFile)

    try {
      const res = await fetch('https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/upload-file', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      console.log('Upload success:', result)
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }

  return (
    <div className="space-y-2">
      <label className="font-semibold text-gray-800">Attachment</label>
      <div className="flex items-center border rounded-lg px-4 py-2 gap-4 w-full">
        <input
          type="text"
          placeholder="Paste link here"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="flex-grow outline-none bg-transparent"
        />

        {/* PDF Upload */}
        <div
          onClick={() => pdfInputRef.current.click()}
          className="flex items-center gap-2 text-gray-700 cursor-pointer hover:text-blue-600"
        >
          <FaFileAlt className="text-xl" />
          <span className="text-sm">Add File</span>
          <input
            type="file"
            accept="application/pdf"
            ref={pdfInputRef}
            onChange={(e) => setPdfFile(e.target.files[0])}
            className="hidden"
          />
        </div>

        {/* Image Upload */}
        <div
          onClick={() => imageInputRef.current.click()}
          className="flex items-center gap-2 text-gray-700 cursor-pointer hover:text-blue-600"
        >
          <FaImage className="text-xl" />
          <span className="text-sm">Add Image</span>
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            onChange={(e) => setImageFile(e.target.files[0])}
            className="hidden"
          />
        </div>
      </div>

      <button
        onClick={handleUpload}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Upload
      </button>
    </div>
  )
}

export default FileUploadForm
